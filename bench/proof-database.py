#!/usr/bin/env python3
"""Checked database optimisations across JS/Wasm/WebGPU and matched Rust/Wasm.

Prepare separately from timing; serve browser.html for headed measurements.
Canonical observations are confined to this report's copy of the proof store.
"""
import argparse
import hashlib
import http.server
import json
import math
import os
import random
import shutil
import statistics
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'bench/proof-database'
REPORT = ROOT / 'reports/proof-database-2026-10-10'
CASES = ['repeat_subtract','repeat_product','scaled_sum','zero_sum','mapped_count','true_filter_sum','false_filter_count','fused_filter']
ALL_CASES=CASES+['gpu_repeat_subtract']
MASK = 2**32-1
sys.path.insert(0,str(ROOT/'bench'))
import methodology as M


def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def run(command, commands):
    command = list(map(str,command)); start=time.perf_counter()
    p=subprocess.run(command,cwd=ROOT,text=True,capture_output=True)
    commands.append(dict(argv=command,seconds=time.perf_counter()-start,exit_code=p.returncode,stdout=p.stdout,stderr=p.stderr))
    if p.returncode: raise RuntimeError(f'{command}: {p.stderr}\n{p.stdout}')
    return p.stdout.strip()


def reference(name,xs,seed,factor):
    # Literal source interpretation, independent of the closed forms in Rust.
    if name in ('repeat_subtract','repeat_product'):
        acc=seed
        for _ in range(4096): acc=(acc-factor if name=='repeat_subtract' else acc+(factor*factor&MASK))&MASK
        return acc
    if name=='scaled_sum': return sum((x*factor)&MASK for x in xs)&MASK
    if name=='zero_sum': return sum(0 for _ in xs)
    if name=='mapped_count': return len([(x*x+7)&MASK for x in xs])
    if name=='true_filter_sum': return sum(x for x in xs if True)&MASK
    if name=='false_filter_count': return len([x for x in xs if False])
    if name=='fused_filter': return [x for x in [x for x in xs if x<factor] if x>seed]
    if name=='gpu_repeat_subtract':
        out=[]
        for x in xs:
            for _ in range(32):x=(x-factor)&MASK
            out.append(x)
        return out
    raise ValueError(name)


def observation(value):
    if not isinstance(value,list):return str(value),int(value)
    total=sum(value)&MASK;weighted=sum((i+1)*x for i,x in enumerate(value))&MASK
    return f'array:{len(value)}:{total}:{weighted}',(total+(weighted<<32)+len(value))%(2**64)


def fixtures(args):
    rng=random.Random(args.seed); inputs=[]; cells=[]
    def add(name,xs,seed,factor):
        expected={c:reference(c,xs,seed,factor) for c in CASES}
        item=dict(id=name,xs=xs,seed=seed,factor=factor,expected={c:v if isinstance(v,list) else str(v) for c,v in expected.items()})
        inputs.append(item);return len(inputs)-1
    add('boundary-empty',[],MASK,MASK)
    add('boundary-words',[0,1,2,MASK,MASK-1,2**31,2**31-1],MASK-1,2**31+1)
    add('random-odd',[rng.getrandbits(32) for _ in range(129)],rng.getrandbits(32),rng.getrandbits(32))
    for distribution in ['small','full']:
        seed,factor=(123,777) if distribution=='small' else (2**31,MASK-3)
        i=add(f'{distribution}-scalar',[],seed,factor)
        cells.extend(dict(case=c,input=i) for c in CASES if c in ['repeat_subtract','repeat_product'])
        for n in args.sizes:
            xs=[rng.randrange(1024) if distribution=='small' else rng.getrandbits(32) for _ in range(n)]
            i=add(f'{distribution}-{n}',xs,seed,factor)
            cells.extend(dict(case=c,input=i) for c in CASES if c not in ['repeat_subtract','repeat_product'])
    return dict(cases=CASES,parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),
        inputs=inputs,cells=cells,scope='Warm complete calls over resident typed U32 input. Every implementation captures input once: old Ink inside its runtime, trusted native JS and handwritten controls in the common driver, CPU/GPU in their transport. Wasm copies, result conversion, common checksum consumption and backend checks are timed. Direct compiled JS is separate from complete runtime calls. Original-source JS/Rust controls retain loops and materialised stages; matched controls use checked shortcuts. Normal JIT/release optimisation is enabled. Startup and shader preparation are separate. Wasm memory is exported linear-memory highwater, excluding JS/GPU/RSS.',direct_program=args.direct_program,before_report=bool(args.before_report))


def prepare(args):
    if any((REPORT/name).exists() for name in ['node-results.json','browser-results.json']):
        raise ValueError('archived measurements already exist; use --report with a fresh directory')
    REPORT.mkdir(parents=True,exist_ok=True);commands=[]
    compiler=args.compiler.resolve(); original=sha(compiler)
    knowledge=args.knowledge.resolve()
    for name in ['kernels.ink','matched.mjs','matched.rs','literal.mjs','literal-typed.mjs','literal.rs','runner.mjs','node.mjs','browser.html']:
        shutil.copy2(ASSETS/name,REPORT/name)
    before_metadata=None
    if args.before_report:
        previous=args.before_report.resolve()
        before_metadata=json.loads((previous/'metadata.json').read_text())
        for kind in ['baseline','checked']:
            destination=REPORT/f'before-{kind}';destination.mkdir(exist_ok=True)
            for path in (previous/kind).iterdir():
                if path.is_file():shutil.copy2(path,destination/path.name)
        shutil.copy2(previous/'selection.json',REPORT/'before-selection.json')
        shutil.copy2(previous/'metadata.json',REPORT/'before-metadata.json')
    (REPORT/'fixtures.json').write_text(json.dumps(fixtures(args),separators=(',',':'))+'\n')
    # Compile only the explicitly requested task definitions. Historical report
    # modules remain immutable when the active fixture gains new workloads.
    text=(ASSETS/'kernels.ink').read_text();blocks=text.split('\npub fn ')
    source=blocks[0]+''.join('\npub fn '+b for b in blocks[1:] if b.split('(',1)[0] in CASES)
    (REPORT/'kernels.ink').write_text(source)
    run([compiler,'emit-core',REPORT/'kernels.ink','-o',REPORT/'core.json'],commands)
    run(['python3',ROOT/'planner/plan.py','--compiler',compiler,'--core',REPORT/'core.json',
        '--knowledge-root',knowledge,'--snapshot',knowledge/'store/snapshot.json','--budget','4096','-o',REPORT/'selection.json'],commands)
    checked=json.loads(run([compiler,'check-selection',REPORT/'core.json',REPORT/'selection.json'],commands))
    selection=json.loads((REPORT/'selection.json').read_text())
    functions={a['function'] for a in selection['applications']}
    if functions!=set(CASES): raise ValueError(f'expected checked optimisation for every task; selected {functions}')
    (REPORT/'selection-check.json').write_text(json.dumps(checked,indent=2)+'\n')
    for kind in ['baseline','checked']:
        extra=['--selection',REPORT/'selection.json'] if kind=='checked' else []
        run([compiler,'build',REPORT/'kernels.ink','--target','webgpu','--zig',args.zig,*extra,'-o',REPORT/kind],commands)
        manifest=json.loads((REPORT/kind/'manifest.json').read_text())
        for f in manifest['functions']:
            if f['name']=='gpu_repeat_subtract' and not f.get('shader'):raise ValueError(f'GPU workload ineligible: {f}')
        # Read-only highwater accessor added only to the generated report host.
        # It changes no computation, allocation or timer and is archived/hashed.
        host=REPORT/kind/'ink-gpu.mjs'; text=host.read_text()
        if '    manifest,' not in text:raise ValueError('unexpected scalar host')
        memory='cpu.memory' if manifest['schema']==2 else 'instance.exports.memory'
        host.write_text(text.replace('    manifest,',f'    manifest,\n    benchmarkMemoryBytes(){{return {memory}.buffer.byteLength;}},',1))
    for source,artifact in [('matched.rs','rust.wasm'),('literal.rs','rust-literal.wasm')]:
        run(['rustc','--edition=2021','--crate-type=cdylib','--target','wasm32-unknown-unknown','-C','opt-level=3',
            '-C','panic=abort','-C','target-feature=+simd128','-C','link-arg=--strip-all',REPORT/source,'-o',REPORT/artifact],commands)
    # Isolated store authenticates the selected entries but receives only
    # performance evidence. The upstream knowledge pointer is never changed.
    sys.path.insert(0,str(ROOT/'knowledge'))
    from ink_knowledge import Store
    selected_store=Store(knowledge)
    store=Store.publish(REPORT/'report-store',[selected_store.object(i) for i in sorted(selected_store.members())])
    store.rebuild()
    if store.snapshot_id!=selected_store.snapshot_id:raise ValueError('report proof pin changed')
    env=M.environment()
    for name in ['planner','runtime']:
        rev=run(['git','-C',ROOT/name,'rev-parse','HEAD'],commands)
        dirty=run(['git','-C',ROOT/name,'status','--porcelain'],commands)
        env['git'][name]=dict(commit=rev,dirty=bool(dirty))
    if sha(compiler)!=original:raise ValueError('compiler changed during preparation')
    tracked=[]
    for folder in ['core','src','planner','runtime','lowerings','knowledge/ink_knowledge']:
        tracked.extend(p for p in (ROOT/folder).rglob('*') if p.is_file() and not any(v in p.parts for v in ['target','__pycache__','.git','node_modules','build']))
    metadata=dict(schema=1,environment=env,node=run(['node','--version'],commands),zig=run([args.zig,'version'],commands),
        compiler_path=str(compiler),compiler_sha256=original,knowledge_root=str(knowledge),snapshot=store.snapshot_id,
        program_sha256=sha(REPORT/'core.json'),selection_sha256=sha(REPORT/'selection.json'),
        selected_laws=sorted({a['law'] for a in selection['applications']}),commands=commands,
        source_hashes={str(p.relative_to(ROOT)):sha(p) for p in tracked},
        artifact_hashes={str(p.relative_to(REPORT)):sha(p) for p in REPORT.rglob('*') if p.is_file() and 'report-store' not in p.parts and p.name!='metadata.json'},
        comparison_controls={
            'js_literal':dict(source='literal.mjs',source_sha256=sha(REPORT/'literal.mjs'),algorithm='original source; materialised Array stages; ordinary JavaScript JIT'),
            'js_literal_typed':dict(source='literal-typed.mjs',source_sha256=sha(REPORT/'literal-typed.mjs'),algorithm='original source; materialised Uint32Array map/filter stages; ordinary JavaScript JIT'),
            'rust_literal_wasm':dict(source='literal.rs',source_sha256=sha(REPORT/'literal.rs'),artifact='rust-literal.wasm',artifact_sha256=sha(REPORT/'rust-literal.wasm'),algorithm='original source; materialised Vec stages; ordinary rustc release optimisation'),
            'js_matched':dict(source='matched.mjs',source_sha256=sha(REPORT/'matched.mjs'),algorithm='handwritten checked algebraic shortcuts'),
            'rust_matched_wasm':dict(source='matched.rs',source_sha256=sha(REPORT/'matched.rs'),artifact='rust.wasm',artifact_sha256=sha(REPORT/'rust.wasm'),algorithm='handwritten checked algebraic shortcuts')},
        parameters=vars(args)|{'compiler':str(compiler),'knowledge':str(knowledge),'zig':str(args.zig)},
        scope=json.loads((REPORT/'fixtures.json').read_text())['scope'])
    if before_metadata:
        if before_metadata['program_sha256']!=metadata['program_sha256']:raise ValueError('before/after source core differs')
        if before_metadata['selected_laws']!=metadata['selected_laws']:raise ValueError('before/after proof laws differ')
        metadata['before_compiler_sha256']=before_metadata['compiler_sha256']
        metadata['before_selection_sha256']=before_metadata['selection_sha256']
        metadata['output_bytes']={kind:{name:(REPORT/kind/name).stat().st_size for name in ['program.mjs','cpu.wasm','ink-gpu.mjs']} for kind in ['baseline','checked','before-baseline','before-checked']}
    (REPORT/'metadata.json').write_text(json.dumps(metadata,indent=2,default=str)+'\n')
    print(f'Prepared {len(CASES)} tasks; {len(selection["applications"])} checked applications; compiler unchanged {original}',flush=True)


def summarise(host):
    source=REPORT/f'{host}-results.json'; data=json.loads(source.read_text())
    if data['status']!='passed':raise ValueError(data)
    metadata=json.loads((REPORT/'metadata.json').read_text()); fixtures=json.loads((REPORT/'fixtures.json').read_text())
    if sha(Path(metadata['compiler_path']))!=metadata['compiler_sha256']:raise ValueError('compiler hash changed')
    for relative,identity in metadata['artifact_hashes'].items():
        if sha(REPORT/relative)!=identity:raise ValueError(f'measured artifact changed: {relative}')
    inputs={v['id']:v for v in fixtures['inputs']}; expected_cells={(c['case'],fixtures['inputs'][c['input']]['id']) for c in fixtures['cells']}
    groups={};seen=set()
    for row in data['samples']:
        key=(row['case'],row['input'],row['variant'],row['round'])
        if key in seen:raise ValueError('duplicate sample')
        seen.add(key)
        if key[:2] not in expected_cells:raise ValueError('unexpected cell')
        if not 0<=row['round']<data['parameters']['repeats']:raise ValueError('unexpected round')
        if not math.isfinite(row['seconds']) or row['seconds']<=0 or row['iterations']<=0:raise ValueError('invalid timing')
        oracle,code=observation(inputs[row['input']]['expected'][row['case']])
        if row['single']!=oracle or row['checksum']!=str(code*row['iterations']%(2**64)):raise ValueError('wrong output')
        if not math.isclose(row['ns_per_call'],row['seconds']*1e9/row['iterations'],rel_tol=1e-9):raise ValueError('invalid normalization')
        groups.setdefault(key[:2],{}).setdefault(row['variant'],[]).append(row)
    required={'ink_baseline_js','ink_checked_js','ink_baseline_wasm','ink_checked_wasm','rust_matched_wasm','js_matched'}
    # Archived runs predate the original-source controls and stay readable.
    literal_controls='literal.mjs' in metadata['artifact_hashes']
    if literal_controls:required|={'js_literal','rust_literal_wasm'}
    typed_control='literal-typed.mjs' in metadata['artifact_hashes']
    if typed_control:required.add('js_literal_typed')
    if metadata['parameters'].get('direct_program'):required|={'ink_baseline_direct_js','ink_checked_direct_js'}
    if metadata['parameters'].get('before_report'):required|={f'ink_before_{kind}_{backend}' for kind in ['baseline','checked'] for backend in ['js','wasm']}
    if set(groups)!=expected_cells or any(not required<=set(v) for v in groups.values()):raise ValueError('incomplete matrix')
    if host=='browser':
        for key,variants in groups.items():
            if key[0]!='gpu_repeat_subtract':continue
            gpu_variants={'ink_baseline_gpu','ink_checked_gpu'}
            if not gpu_variants<=set(variants):raise ValueError('missing actual GPU comparison')
            for variant in gpu_variants:
                actual=[v for v in data['availability'] if (v['case'],v['input'],v['variant'])==(*key,variant)]
                if len(actual)!=1 or actual[0]['actual_backend']!='gpu':raise ValueError('GPU comparison used fallback')
    if any(len(rows)!=data['parameters']['repeats'] for variants in groups.values() for rows in variants.values()):raise ValueError('incomplete rounds')
    measurements=[]; observations=[]
    sys.path.insert(0,str(ROOT/'knowledge'));from ink_knowledge import Store
    store=Store(REPORT/'report-store');pin=store.snapshot_id
    selection=json.loads((REPORT/'selection.json').read_text())
    for (case,input_id),variants in groups.items():
        for v,rows in variants.items():
            if len(rows)!=data['parameters']['repeats']:raise ValueError('incomplete rounds')
            rows.sort(key=lambda x:x['round'])
        values={v:[r['ns_per_call'] for r in rows] for v,rows in variants.items()}
        med={v:statistics.median(x) for v,x in values.items()}; ratios={}
        for backend in ['js','wasm','gpu']:
            base=f'ink_baseline_{backend}';check=f'ink_checked_{backend}'
            if base in values and check in values:ratios[f'baseline_over_checked_{backend}']=M.ratio_ci(values[base],values[check])
        for backend,comparison in [('js','js_matched'),('wasm','rust_matched_wasm')]:
            checked=f'ink_checked_{backend}'
            if checked in values and comparison in values:ratios[f'checked_over_{comparison}']=M.ratio_ci(values[checked],values[comparison])
        for backend,comparison in [('js','js_literal'),('js','js_literal_typed'),('wasm','rust_literal_wasm')]:
            for kind in ['baseline','checked']:
                ink=f'ink_{kind}_{backend}'
                if ink in values and comparison in values:ratios[f'{kind}_over_{comparison}']=M.ratio_ci(values[ink],values[comparison])
        for backend in ['js','wasm']:
            before=f'ink_before_checked_{backend}';after=f'ink_checked_{backend}'
            if before in values:ratios[f'before_over_after_{backend}']=M.ratio_ci(values[before],values[after])
        for control in ['js_matched','js_literal','js_literal_typed']:
            if 'ink_checked_direct_js' in values:ratios[f'checked_direct_over_{control}']=M.ratio_ci(values['ink_checked_direct_js'],values[control])
        measurements.append(dict(case=case,input=input_id,median_ns=med,paired_ratios_95pct=ratios))
        for variant,rows in variants.items():
            if rows[0]['linear_memory_bytes'] is None:continue
            before=variant.startswith('ink_before_')
            checked=variant.startswith('ink_checked') or variant.startswith('ink_before_checked')
            plan=metadata['before_selection_sha256'] if before and checked else metadata['selection_sha256'] if checked else metadata['artifact_hashes']['rust-literal.wasm' if variant=='rust_literal_wasm' else 'rust.wasm'] if variant.startswith('rust') else metadata['artifact_hashes']['before-baseline/cpu.wasm' if before else 'baseline/cpu.wasm']
            # Canonical memory metric is the observed maximum accessible Wasm
            # linear-memory bytes, explicitly scoped in target.driver.
            obs=dict(schema=1,program=metadata['program_sha256'],
                entries=metadata['selected_laws'] if checked else [],
                plan=plan,
                target=dict(hardware=str(metadata['environment']['cpu']),driver=f'{host}: {data["host"]}; peak_bytes=maximum exported Wasm linear memory only; JS host/GPU excluded',
                    toolchain=json.dumps(dict(rustc=metadata['environment']['rustc'],zig=metadata['zig'],ink_compiler=metadata.get('before_compiler_sha256') if before else metadata['compiler_sha256']),sort_keys=True),
                    backend=variant,bridge='typed U32 host capture + input copy + result return; common runner.mjs '+sha(REPORT/'runner.mjs')),
                workload=dict(shape=dict(case=case,length=len(inputs[input_id]['xs']),seed=inputs[input_id]['seed'],factor=inputs[input_id]['factor']),distribution=input_id,concurrency=1,residency='host-resident typed input; warm Wasm modules'),
                metrics=dict(complete_call_ns=[str(round(r['ns_per_call'])) for r in rows],peak_bytes=max(r['linear_memory_bytes'] for r in rows)))
            identity=store.observe(obs);observations.append(dict(id=identity,variant=variant,case=case,input=input_id))
    if store.snapshot_id!=pin:raise ValueError('performance changed proof pin')
    summary=dict(status='passed',host=host,cells=len(measurements),samples=len(data['samples']),validation=data['validation'],
        observations=len(observations),proof_snapshot_unchanged=pin,measurements=measurements,availability=data['availability'],
        warnings=metadata['environment']['warnings'],scope=data['scope'],
        memory_scope='Wasm linear-memory highwater only, measured via read-only accessor; JS/GPU timings retained but no canonical observations because their memory peaks are unmeasured')
    (REPORT/f'{host}-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    (REPORT/f'{host}-observations.json').write_text(json.dumps(observations,indent=2)+'\n')
    lines=[f'# Ink web proof benchmark ({host})','',data['scope'],'',
        f'{len(CASES)} source tasks, {len(measurements)} cells, {len(data["samples"])} timed samples; {data["validation"]["comparisons"]} oracle comparisons. '+
        f'{len(observations)} canonical Wasm observations saved without changing proof snapshot `{pin}`.','',
        'All ratios include paired bootstrap 95% intervals. Cells whose interval crosses 1 have no measured difference.']
    if metadata['parameters'].get('direct_program'):
        lines+=['','Lean output: before / after above 1 means the runtime change is faster. Direct / matched JS above 1 means compiled direct JS is slower. Input capture and checksum costs are common to direct and handwritten controls.','',
            '| Task | Input | Before / after JS runtime | Before / after Wasm runtime | Direct checked / matched JS | Direct checked / original typed JS |','|---|---|---:|---:|---:|---:|']
        for c in measurements:
            r=c['paired_ratios_95pct'];fmt=lambda k:M.fmt_ci(*r[k]) if k in r else 'unavailable'
            lines.append(f'| {c["case"]} | {c["input"]} | {fmt("before_over_after_js")} | {fmt("before_over_after_wasm")} | {fmt("checked_direct_over_js_matched")} | {fmt("checked_direct_over_js_literal_typed")} |')
    if literal_controls:
        lines+=['','Original-source comparison: handwritten JavaScript and Rust/Wasm translate the original loops and materialised collection stages. Rust release optimisation and JavaScript JIT optimisation remain enabled. Every ratio below is Ink / literal control: above 1 means Ink is slower; below 1 means Ink is faster.','',
            '| Task | Input | Original Ink JS / literal JS | Checked Ink JS / literal JS | Original Ink Wasm / literal Rust Wasm | Checked Ink Wasm / literal Rust Wasm |',
            '|---|---|---:|---:|---:|---:|']
        for c in measurements:
            r=c['paired_ratios_95pct'];fmt=lambda k:M.fmt_ci(*r[k])
            lines.append(f'| {c["case"]} | {c["input"]} | {fmt("baseline_over_js_literal")} | {fmt("checked_over_js_literal")} | {fmt("baseline_over_rust_literal_wasm")} | {fmt("checked_over_rust_literal_wasm")} |')
    if typed_control:
        lines+=['','Additional original-source JavaScript comparison uses native Uint32Array.map/filter stages and converts final list results to ordinary Arrays. Every source stage still materialises. Ratios are Ink / typed literal JS: above 1 means Ink is slower.','',
            '| Task | Input | Original Ink JS / typed literal JS | Checked Ink JS / typed literal JS |','|---|---|---:|---:|']
        for c in measurements:
            r=c['paired_ratios_95pct']
            lines.append(f'| {c["case"]} | {c["input"]} | {M.fmt_ci(*r["baseline_over_js_literal_typed"])} | {M.fmt_ci(*r["checked_over_js_literal_typed"])} |')
    lines+=['','Proof effect and optimised-algorithm controls: baseline / checked above 1 means the proof made Ink faster. Checked Ink / algorithm-matched Rust above 1 means Ink is slower. The algorithm-matched controls use hand-derived shortcuts selected by the checked laws.','',
        '| Task | Input | JS baseline / checked | Wasm baseline / checked | Checked / matched Rust Wasm |','|---|---|---:|---:|---:|']
    for c in measurements:
        r=c['paired_ratios_95pct'];fmt=lambda k:M.fmt_ci(*r[k]) if k in r else 'unavailable'
        lines.append(f'| {c["case"]} | {c["input"]} | {fmt("baseline_over_checked_js")} | {fmt("baseline_over_checked_wasm")} | {fmt("checked_over_rust_matched_wasm")} |')
    gpu_measurements=[c for c in measurements if 'baseline_over_checked_gpu' in c['paired_ratios_95pct']]
    if gpu_measurements:
        lines+=['','GPU timings include upload, dispatch, readback, result conversion and output consumption. Both variants executed on the actual GPU; first calls are archived separately.','',
            '| Task | Input | GPU baseline / checked |','|---|---|---:|']
        for c in gpu_measurements:
            lines.append(f'| {c["case"]} | {c["input"]} | {M.fmt_ci(*c["paired_ratios_95pct"]["baseline_over_checked_gpu"])} |')
    lines+=['','Compilation/planning subprocess durations and code identities: `metadata.json`. Raw trials, calibration, warmups and exact outputs: '+source.name+'.',
        'Literal controls preserve original source operations; algorithm-matched controls implement selected algebraic shortcuts. All timings include each implementation’s host wrapper, which differs across Ink and handwritten controls. Rust controls share the same captured typed input, host-to-Wasm copy and array result conversion. JS controls share typed input capture. Ordinary-array literal filters first convert typed input to ordinary arrays; typed literal map/filter stages materialise Uint32Arrays and convert final list results to ordinary arrays. Module startup and GPU first-call setup are excluded from steady-state medians and reported separately.',
        'Wasm `peak_bytes` means linear-memory highwater; JS/GPU memory was not measured. GPU availability records actual backend and fallback reasons for every cell.','']
    lines.extend('Warning: '+w for w in summary['warnings'])
    (REPORT/f'{host}-REPORT.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k not in ['measurements','availability']},indent=2),flush=True)


def preparation_costs():
    if (REPORT/'preparation-costs.json').exists():raise ValueError('archived preparation timings already exist; use a fresh report directory')
    metadata=json.loads((REPORT/'metadata.json').read_text());compiler=Path(metadata['compiler_path'])
    if sha(compiler)!=metadata['compiler_sha256']:raise ValueError('compiler changed')
    out=REPORT/'preparation-costs';out.mkdir(exist_ok=True);commands=[];rows=[]
    rng=random.Random(20261010)
    names=['planner_search','selection_replay','javascript_baseline','javascript_checked','wasm_baseline','wasm_checked']
    for repeat in range(3):
        order=list(names);rng.shuffle(order)
        for name in order:
            if name=='planner_search':
                command=['python3',ROOT/'planner/plan.py','--compiler',compiler,'--core',REPORT/'core.json','--knowledge-root',REPORT/'report-store',
                    '--snapshot',REPORT/'report-store/store/snapshot.json','--budget','4096','-o',out/'selection.json']
            elif name=='selection_replay':command=[compiler,'check-selection',REPORT/'core.json',REPORT/'selection.json']
            else:
                target,kind=name.split('_');target='wasm32' if target=='wasm' else target
                command=[compiler,'build',REPORT/'kernels.ink','--target',target,'-o',out/(name+('.wasm' if target=='wasm32' else '.mjs'))]
                if kind=='checked':command+=['--selection',REPORT/'selection.json']
                if target=='wasm32':command+=['--zig',metadata['parameters']['zig']]
            run(command,commands);rows.append(dict(mode=name,repeat=repeat,seconds=commands[-1]['seconds']))
    costs=dict(samples=rows,median_seconds={name:statistics.median(r['seconds'] for r in rows if r['mode']==name) for name in names},commands=commands,
        scope='Fresh child processes, warm filesystem and toolchain cache. Includes process startup, parsing/checking/I/O. Planner search includes independent candidate replay; compilation does not include proof production or browser/Node JIT startup. Three shuffled rounds; descriptive medians, no compiler ranking.')
    (REPORT/'preparation-costs.json').write_text(json.dumps(costs,indent=2)+'\n')
    print(json.dumps(costs['median_seconds'],indent=2),flush=True)


def serve(args):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self,*a,**kw):super().__init__(*a,directory=str(REPORT),**kw)
        def do_POST(self):
            if self.path!='/browser-results.json':self.send_error(404);return
            if (REPORT/'browser-results.json').exists():self.send_error(409,'archived browser measurements already exist; use a fresh report directory');return
            n=int(self.headers.get('Content-Length','0'))
            if not 0<n<20000000:self.send_error(413);return
            result=json.loads(self.rfile.read(n))
            (REPORT/'browser-results.json').write_text(json.dumps(result,indent=2)+'\n')
            self.send_response(200);self.end_headers();self.wfile.write(b'saved')
            if result.get('status')=='passed':summarise('browser')
            else:print('Browser failure: '+json.dumps(result),flush=True)
    print(f'Browser: http://127.0.0.1:{args.port}/browser.html',flush=True)
    http.server.ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()


def main():
    global REPORT,CASES
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',type=Path,default=REPORT)
    parser.add_argument('--cases',nargs='+',choices=ALL_CASES,default=CASES)
    parser.add_argument('--compiler',type=Path,default=ROOT/'target/release/ink')
    parser.add_argument('--knowledge',type=Path,default=ROOT/'knowledge/research/performance-laws')
    parser.add_argument('--before-report',type=Path)
    parser.add_argument('--direct-program',action='store_true')
    parser.add_argument('--zig',type=Path)
    parser.add_argument('--repeats',type=int,default=7);parser.add_argument('--warmup',type=int,default=1)
    parser.add_argument('--seconds',type=float,default=.015);parser.add_argument('--seed',type=int,default=20261010)
    parser.add_argument('--sizes',type=int,nargs='+',default=[32,4096,65536])
    parser.add_argument('--port',type=int,default=8765)
    parser.add_argument('--prepare',action='store_true');parser.add_argument('--node',action='store_true');parser.add_argument('--validate',action='store_true')
    parser.add_argument('--costs',action='store_true')
    parser.add_argument('--serve',action='store_true');parser.add_argument('--summarise',choices=['node','browser'])
    args=parser.parse_args()
    REPORT=args.report.resolve()
    CASES=args.cases
    if not 3<=args.repeats<=128 or not 1<=args.warmup<=10 or not 0<args.seconds<=1 or any(not 0<n<=1000000 for n in args.sizes):parser.error('invalid benchmark parameters')
    if args.prepare:
        if not args.zig:parser.error('--prepare requires --zig')
        prepare(args)
    if args.node:
        if (REPORT/'node-results.json').exists():raise ValueError('node measurements already exist; use a fresh prepared --report directory')
        run(['node',ASSETS/'node.mjs',REPORT],[]);summarise('node')
    if args.validate:print(run(['node',ASSETS/'node.mjs',REPORT,'--validate'],[]),flush=True)
    if args.costs:preparation_costs()
    if args.summarise:summarise(args.summarise)
    if args.serve:serve(args)
    if not any([args.prepare,args.node,args.validate,args.costs,args.serve,args.summarise]):parser.error('choose --prepare, --node, --validate, --costs, --serve or --summarise')


if __name__=='__main__':main()
