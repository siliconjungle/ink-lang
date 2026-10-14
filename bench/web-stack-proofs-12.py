#!/usr/bin/env python3
"""New database proofs: baseline vs pinned prior catalogue vs current catalogue.

Preparation, oracle validation and timing are separate commands. GPU results
come from the headed browser runner; fallbacks never count as GPU measurements.
"""
import argparse
import ast
from functools import lru_cache
import hashlib
import http.server
import json
import math
from pathlib import Path
import random
import shutil
import statistics
import subprocess
import sys
import time
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'bench/web-stack-proofs-12'
REPORT=ROOT/'reports/web-stack-proofs-12-2026-10-10'
PRIOR='42bb207446a7ea92fc099ef27d611201f39a1d660c36b147bd11f68fa61a3e90'
CASES=['cubic_odd_difference', 'quartic_odd_difference', 'quintic_odd_difference', 'gated_mapped_left', 'gated_mapped_right', 'mode_selected_pair']
SCALAR_CASES=set()
MASK=2**32-1
sys.path.insert(0,str(ROOT/'bench'))
import methodology as M
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def run(command,commands):
    command=list(map(str,command));start=time.perf_counter()
    result=subprocess.run(command,cwd=ROOT,capture_output=True,text=True)
    commands.append(dict(argv=command,seconds=time.perf_counter()-start,exit_code=result.returncode,stdout=result.stdout,stderr=result.stderr))
    if result.returncode:raise RuntimeError(f'{command}: {result.stderr}\n{result.stdout}')
    return result.stdout

ODD_DEGREES={'cubic_odd_difference':3,'quartic_odd_difference':4,'quintic_odd_difference':5}

@lru_cache(None)
def source_expression(name):
    # Preserve the original left-associated source operation association.
    for line in (ASSETS/'kernels.ink').read_text().splitlines():
        if line.startswith('pub fn '+name+'('):
            return ast.parse(line.split('fn(x)=>',1)[1].split(');}',1)[0],mode='eval').body
    raise ValueError(name)

def literal(name,xs,seed,k):
    add=lambda a,b:(a+b)&MASK
    sub=lambda a,b:(a-b)&MASK
    mul=lambda a,b:(a*b)&MASK
    if name in ODD_DEGREES:
        tree=source_expression(name)
        def evaluate(node,env):
            if isinstance(node,ast.Name):return env[node.id]
            if isinstance(node,ast.Constant):return node.value
            return {ast.Add:add,ast.Sub:sub,ast.Mult:mul}[type(node.op)](evaluate(node.left,env),evaluate(node.right,env))
        return [evaluate(tree,dict(x=x,seed=seed,k=k)) for x in xs]
    mapped=[add(mul(x,x),seed) for x in xs]
    if name=='gated_mapped_left':
        zipped=[a if b<seed else b for a,b in zip(mapped,xs)]
        return [add(mul(x,k),seed) for x in zipped]
    if name=='gated_mapped_right':
        zipped=[a if a<seed else b for a,b in zip(xs,mapped)]
        return [add(mul(x,k),seed) for x in zipped]
    if name=='mode_selected_pair':
        right=[sub(mul(x,k),seed) for x in xs]
        zipped=[a if seed<k else b for a,b in zip(mapped,right)]
        return [add(x,seed) for x in zipped]
    raise ValueError(name)

def oracle(name,xs,seed,k):
    # Independent unbounded odd-binomial expansion BEFORE modular reduction.
    if name in ODD_DEGREES:
        n=ODD_DEGREES[name]
        return [(2*sum(math.comb(n,j)*x**(n-j)*k**j for j in range(1,n+1,2))+seed)&MASK for x in xs]
    if name=='gated_mapped_left':return [(((x*x+seed)&MASK)*k+seed if x<seed else x*k+seed)&MASK for x in xs]
    if name=='gated_mapped_right':return [(x*k+seed if x<seed else ((x*x+seed)&MASK)*k+seed)&MASK for x in xs]
    if name=='mode_selected_pair':return [(x*x+2*seed if seed<k else x*k)&MASK for x in xs]
    raise ValueError(name)

def observation(value):
    if not isinstance(value,list):return str(value),int(value)
    total=sum(value)&MASK;weighted=sum((i+1)*x for i,x in enumerate(value))&MASK
    return f'array:{len(value)}:{total}:{weighted}',(total+(weighted<<32)+len(value))%(2**64)

def fixtures(args):
    if args.reuse_fixtures:
        original=json.loads(args.reuse_fixtures.read_text())
        if not set(args.cases)<=set(original['cases']):raise ValueError('repeat cases absent from original fixture')
        kept=[];checks=0
        for old in original['inputs']:
            item={**old,'expected':{name:old['expected'][name] for name in args.cases}}
            for name in args.cases:
                sample=item['xs'] if item['id'].startswith('boundary') else item['xs'][:4]
                if literal(name,sample,item['seed'],item['factor'])!=item['expected'][name][:len(sample)]:raise ValueError('repeat literal oracle mismatch')
                if oracle(name,item['xs'],item['seed'],item['factor'])!=item['expected'][name]:raise ValueError('repeat independent oracle mismatch')
                checks+=len(sample)
            kept.append(item)
        cells=[c for c in original['cells'] if c['case'] in args.cases and len(kept[c['input']]['xs']) in args.sizes]
        if len(cells)!=2*len(args.sizes)*len(args.cases):raise ValueError('repeat shape missing')
        return {**original,'cases':args.cases,'inputs':kept,'cells':cells,'python_literal_checks':checks,
            'parameters':dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),
            'scope':original['scope']+' Independent repeat reuses byte-identical original word arrays, scalar parameters and expected outputs; only timed cells are narrowed. No timings are pooled.'}
    rng=random.Random(args.seed);inputs=[];cells=[];literal_checks=0
    def add(identifier,xs,seed,k,boundary=False):
        nonlocal literal_checks
        expected={name:oracle(name,xs,seed,k) for name in args.cases}
        for name in args.cases:
            if name in SCALAR_CASES:
                if literal(name,xs,seed,k)!=expected[name]:raise ValueError('Python scalar oracle disagreement')
                literal_checks+=1
            else:
                sample=xs if boundary else xs[:4]
                if literal(name,sample,seed,k)!=expected[name][:len(sample)]:raise ValueError('Python source-stage oracle disagreement')
                literal_checks+=len(sample)
        inputs.append(dict(id=identifier,xs=xs,seed=seed,factor=k,expected=expected));return len(inputs)-1
    add('boundary-empty',[],MASK,MASK,True)
    add('boundary-words',[0,1,2,MASK,MASK-1,2**31,2**31-1],MASK-1,2**31+1,True)
    add('random-odd',[rng.getrandbits(32) for _ in range(17)],rng.getrandbits(32),rng.getrandbits(32))
    add('boundary-singleton',[MASK],1,2**31+1,True)
    add('boundary-zero-seed',[0,1,MASK,2**31],0,MASK,True)
    add('boundary-unit-factor',[0,1,2],MASK,1,True)
    add('boundary-zero-factor',[1,MASK,2**31],MASK,0,True)
    for distribution in ['small','full']:
        seed,k=(509,7) if distribution=='small' else (0x9e3779b9,MASK-2)
        for n in args.sizes:
            i=add(f'{distribution}-{n}',[rng.randrange(1024) if distribution=='small' else rng.getrandbits(32) for _ in range(n)],seed,k)
            cells.extend(dict(case=c,input=i) for c in args.cases)
    return dict(cases=args.cases,inputs=inputs,cells=cells,python_literal_checks=literal_checks,
        parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),
        scope='Warm complete runtime calls over resident typed U32 input; one snapshot capture per implementation, Wasm copy, output conversion, checksum consumption and GPU upload/dispatch/readback included. Direct compiled JS measured separately, with same input snapshot/checksum as original JS controls. Startup/first-call shader preparation separate. Python unbounded odd-binomial expansion and collection closed forms validate every result; literal stages corroborate all boundary elements and first four elements of each other vector fixture. Original controls retain left-associated unrolled odd-power differences and distinct eager map/conditional-zip/postmap collection stages; normal JIT/release optimizations are allowed. No artificial repeat loops are used. Basis words cover arbitrary U32 values; factors are 7 and 2^32-3. Timed representative outputs remain input-dependent. This is wrapping-ring arithmetic with no word division or floating-point accuracy claim. Every implementation captures the full input once. Only actual eligible shaders are timed; unsupported pipeline shapes retain fallback records. Typed proof coverage and U32 performance scope are separate. Rust output destination is preallocated/reused; intermediate Vec stages keep normal release/library optimization. Wasm peak bytes means exported linear-memory highwater only; host/GPU memory unmeasured. No general language ranking.')

def prepare(args):
    report=args.report
    if (report/'metadata.json').exists():raise ValueError('prepared report exists; choose fresh --report')
    report.mkdir(parents=True,exist_ok=True);commands=[];compiler=args.compiler.resolve();initial=sha(compiler)
    prior_source=Store(args.knowledge,args.prior_snapshot);current_source=Store(args.knowledge)
    if prior_source.snapshot_id!=PRIOR:raise ValueError('unexpected prior catalogue')
    if current_source.snapshot_id==PRIOR:raise ValueError('publish new batch before preparation')
    stores={}
    for label,source in [('prior-store',prior_source),('report-store',current_source)]:
        stores[label]=Store.publish(report/label,[source.object(i) for i in sorted(source.members())]);stores[label].rebuild()
        if stores[label].snapshot_id!=source.snapshot_id:raise ValueError('proof copy changed snapshot')
    shutil.copy2(Path(__file__),report/'harness.py')
    for name in ['literal.mjs','literal.rs','runner.mjs','node.mjs','browser.html','analyse.py','README.md']:shutil.copy2(ASSETS/name,report/name)
    blocks=(ASSETS/'kernels.ink').read_text().split('\npub fn ')
    source=blocks[0]+''.join('\npub fn '+b for b in blocks[1:] if b.split('(',1)[0] in args.cases)
    (report/'kernels.ink').write_text(source)
    (report/'fixtures.json').write_text(json.dumps(fixtures(args),separators=(',',':'))+'\n')
    run([compiler,'emit-core',report/'kernels.ink','-o',report/'core.json'],commands)
    selections={}
    for kind,label in [('prior','prior-store'),('checked','report-store')]:
        store=stores[label];selected=report/f'{kind}-selection.json'
        run([sys.executable,ROOT/'planner/plan.py','--compiler',compiler,'--core',report/'core.json','--knowledge-root',store.root,'--snapshot',store.data/'snapshot.json','--budget',4096,'-o',selected],commands)
        receipt=json.loads(run([compiler,'check-selection',report/'core.json',selected],commands));selections[kind]=json.loads(selected.read_text())
        (report/f'{kind}-selection-check.json').write_text(json.dumps(receipt,indent=2)+'\n')
        run([compiler,'emit-core',report/'kernels.ink','--selection',selected,'-o',report/f'{kind}-selected.core.json'],commands)
    new_members=set(current_source.members())-set(prior_source.members())
    per_function={name:sorted({a['law'] for a in selections['checked']['applications'] if a['function']==name}) for name in args.cases}
    missing=[name for name,ids in per_function.items() if not set(ids)&new_members]
    if missing:raise ValueError(f'new proof application missing: {missing}')
    prior_core=json.loads((report/'prior-selected.core.json').read_text())['program']['functions']
    new_core=json.loads((report/'checked-selected.core.json').read_text())['program']['functions']
    prior_bodies={f['name']:f['body'] for f in prior_core};new_bodies={f['name']:f['body'] for f in new_core}
    original_core=json.loads((report/'core.json').read_text())['program']['functions']
    original_bodies={f['name']:f['body'] for f in original_core}
    prior_unchanged={name:prior_bodies[name]==original_bodies[name] for name in args.cases}
    if selections['prior']['applications'] or not all(prior_unchanged.values()):raise ValueError('prior catalogue already rewrites a benchmark source')
    changed={name:prior_bodies[name]!=new_bodies[name] for name in args.cases}
    if not all(changed.values()):raise ValueError('new catalogue did not change some prior-selected function')
    gpu_manifest={}
    for kind in ['baseline','prior','checked']:
        extra=[] if kind=='baseline' else ['--selection',report/f'{kind}-selection.json']
        run([compiler, 'build', report / 'kernels.ink', '--target', 'webgpu', *extra, '-o', report / kind],commands)
        manifest=json.loads((report/kind/'manifest.json').read_text());gpu_manifest[kind]={f['name']:dict(shader=f.get('shader'),reason=f.get('fallback_reason',f.get('gpu_reason'))) for f in manifest['functions']}
        host=report/kind/'ink-gpu.mjs';text=host.read_text()
        if '    manifest,' not in text:raise ValueError('host accessor insertion changed')
        memory='cpu.memory' if manifest['schema']==2 else 'instance.exports.memory'
        host.write_text(text.replace('    manifest,',f'    manifest,\n    benchmarkMemoryBytes(){{return {memory}.buffer.byteLength;}},',1))
    run(['rustc','--edition=2021','--crate-type=cdylib','--target','wasm32-unknown-unknown','-C','opt-level=3','-C','panic=abort','-C','target-feature=+simd128','-C','link-arg=--strip-all',report/'literal.rs','-o',report/'rust-literal.wasm'],commands)
    if sha(compiler)!=initial:raise ValueError('compiler changed')
    metadata=dict(schema=1,compiler_path=str(compiler),compiler_sha256=initial,prior_snapshot=PRIOR,new_snapshot=current_source.snapshot_id,
        new_laws_per_function={name:sorted(set(ids)&new_members) for name,ids in per_function.items()},selected_laws_per_function=per_function,prior_to_new_core_changed=changed,prior_core_equals_original=prior_unchanged,
        selections={kind:dict(sha256=sha(report/f'{kind}-selection.json'),laws=sorted({a['law'] for a in package['applications']}),applications=len(package['applications'])) for kind,package in selections.items()},
        environment=M.environment(),zig=run([args.zig,'version'],commands).strip(),node=run(['node','--version'],commands).strip(),commands=commands,gpu_manifest=gpu_manifest,
        methodology_sha256=sha(ROOT/'bench/methodology.py'),
        artifact_hashes={str(p.relative_to(report)):sha(p) for p in report.rglob('*') if p.is_file() and p.suffix!='.log' and not any(part in p.parts for part in ['report-store','prior-store'])},
        parameters={k:str(v) if isinstance(v,Path) else v for k,v in vars(args).items()})
    (report/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(f'Prepared {len(args.cases)} tasks; {len(json.loads((report/"fixtures.json").read_text())["cells"])} cells; compiler {initial}',flush=True)

def audit(report,host):
    metadata=json.loads((report/'metadata.json').read_text());fixtures_data=json.loads((report/'fixtures.json').read_text());data=json.loads((report/f'{host}-results.json').read_text())
    if data['status']!='passed':raise ValueError('runner did not pass')
    if sha(metadata['compiler_path'])!=metadata['compiler_sha256']:raise ValueError('compiler changed since preparation')
    if sha(ROOT/'bench/methodology.py')!=metadata['methodology_sha256']:raise ValueError('methodology changed')
    for path,h in metadata['artifact_hashes'].items():
        if sha(report/path)!=h:raise ValueError('artifact changed '+path)
    inputs={x['id']:x for x in fixtures_data['inputs']};cells={(c['case'],fixtures_data['inputs'][c['input']]['id']) for c in fixtures_data['cells']};groups={};seen=set()
    for row in data['samples']:
        key=(row['case'],row['input'],row['variant'],row['round'])
        if key in seen or key[:2] not in cells:raise ValueError('duplicate/unexpected sample')
        seen.add(key)
        if not 0<=row['round']<fixtures_data['parameters']['repeats']:raise ValueError('invalid round')
        if not math.isfinite(row['seconds']) or row['seconds']<=0 or row['iterations']<=0:raise ValueError('invalid sample')
        single,code=observation(inputs[row['input']]['expected'][row['case']])
        if row['single']!=single or row['checksum']!=str(code*row['iterations']%(2**64)):raise ValueError('oracle mismatch')
        if not math.isclose(row['ns_per_call'],row['seconds']*1e9/row['iterations'],rel_tol=1e-9):raise ValueError('normalization mismatch')
        if row['variant'].endswith('_gpu'):
            x=inputs[row['input']];expected=dict(dispatches=row['iterations'],upload_bytes=(len(x['xs'])*4+24)*row['iterations'],readback_bytes=(len(x['expected'][row['case']]) if isinstance(x['expected'][row['case']],list) else 1)*4*row['iterations'])
            if row['gpu_counters']!=expected:raise ValueError('GPU counter evidence mismatch')
        groups.setdefault(key[:2],{}).setdefault(row['variant'],[]).append(row)
    # Independently audit archived calibration/warmup values as well as trials.
    for phase in ('warmups','calibration'):
        for row in data[phase]:
            if (row['case'],row['input']) not in cells or row['iterations']<=0 or not math.isfinite(row['seconds']) or row['seconds']<=0:raise ValueError('invalid '+phase+' sample')
            single,code=observation(inputs[row['input']]['expected'][row['case']])
            if row['single']!=single or row['checksum']!=str(code*row['iterations']%(2**64)):raise ValueError(phase+' oracle mismatch')
            if not math.isclose(row['ns_per_call'],row['seconds']*1e9/row['iterations'],rel_tol=1e-9):raise ValueError(phase+' normalization mismatch')
            if row['variant'].endswith('_gpu'):
                x=inputs[row['input']];expected=dict(dispatches=row['iterations'],upload_bytes=(len(x['xs'])*4+24)*row['iterations'],readback_bytes=(len(x['expected'][row['case']]) if isinstance(x['expected'][row['case']],list) else 1)*4*row['iterations'])
                if row['gpu_counters']!=expected:raise ValueError(phase+' GPU counters mismatch')
    required={f'ink_{kind}_{backend}' for kind in ['baseline','prior','checked'] for backend in ['js','wasm','direct_js']}|{'js_literal','rust_literal_wasm'}
    if set(groups)!=cells:raise ValueError('incomplete cells')
    allowed=required|({f'ink_{kind}_gpu' for kind in ['baseline','prior','checked']} if host=='browser' else set())
    for key,variants in groups.items():
        if not set(variants)<=allowed:raise ValueError('unexpected variant')
        if not required<=set(variants):raise ValueError('missing CPU/control variant')
        if any(len(rows)!=fixtures_data['parameters']['repeats'] for rows in variants.values()):raise ValueError('missing round')
        if host=='browser':
            for kind in ['baseline','prior','checked']:
                variant=f'ink_{kind}_gpu';available=[a for a in data['availability'] if (a['case'],a['input'],a['variant'])==(*key,variant)]
                if len(available)!=1:raise ValueError('missing GPU availability')
                eligible=bool(metadata['gpu_manifest'][kind][key[0]]['shader'])
                if eligible and (available[0]['actual_backend']!='gpu' or variant not in variants):raise ValueError('eligible shader fell back')
                if variant in variants and available[0]['actual_backend']!='gpu':raise ValueError('fallback counted as GPU')
                if variant in variants:
                    x=inputs[key[1]];expected=dict(dispatches=1,upload_bytes=len(x['xs'])*4+24,readback_bytes=(len(x['expected'][key[0]]) if isinstance(x['expected'][key[0]],list) else 1)*4)
                    if any(available[0]['counters'].get(k)!=v for k,v in expected.items()):raise ValueError('GPU availability counters mismatch')
    return metadata,fixtures_data,data,inputs,groups

def summarise(report,host):
    metadata,fixture,data,inputs,groups=audit(report,host);measurements=[];observations=[];store=Store(report/'report-store');pin=store.snapshot_id
    for (case,input_id),variants in groups.items():
        for rows in variants.values():rows.sort(key=lambda r:r['round'])
        values={name:[r['ns_per_call'] for r in rows] for name,rows in variants.items()};ratios={}
        for backend in ['js','wasm','gpu','direct_js']:
            for numerator,denominator in [('baseline','checked'),('prior','checked')]:
                a,b=f'ink_{numerator}_{backend}',f'ink_{denominator}_{backend}'
                if a in values and b in values:ratios[f'{numerator}_over_{denominator}_{backend}']=M.ratio_ci(values[a],values[b])
        for ink,control in [('ink_checked_js','js_literal'),('ink_checked_direct_js','js_literal'),('ink_checked_wasm','rust_literal_wasm')]:ratios[f'{ink}_over_{control}']=M.ratio_ci(values[ink],values[control])
        if 'ink_checked_gpu' in values:
            for previous in ['ink_prior_js','ink_prior_wasm','ink_checked_js','ink_checked_wasm']:
                ratios[f'{previous}_over_ink_checked_gpu']=M.ratio_ci(values[previous],values['ink_checked_gpu'])
        measurements.append(dict(case=case,input=input_id,median_ns={v:statistics.median(x) for v,x in values.items()},paired_ratios_95pct=ratios))
        for variant,rows in variants.items():
            if rows[0]['linear_memory_bytes'] is None:continue
            kind='checked' if variant.startswith('ink_checked') else 'prior' if variant.startswith('ink_prior') else 'baseline'
            plan=metadata['selections'][kind]['sha256'] if kind in ['prior','checked'] else metadata['artifact_hashes']['rust-literal.wasm' if variant=='rust_literal_wasm' else 'baseline/cpu.wasm']
            entries=sorted({a['law'] for a in json.loads((report/f'{kind}-selection.json').read_text())['applications'] if a['function']==case}) if kind in ['prior','checked'] else []
            obj=dict(schema=1,program=metadata['artifact_hashes']['core.json'],entries=entries,plan=plan,
                target=dict(hardware=str(metadata['environment']['cpu']),driver=f'{host}: {data["host"]}; peak_bytes=exported Wasm linear-memory highwater only; host/GPU excluded',toolchain=json.dumps(dict(rustc=metadata['environment']['rustc'],zig=metadata['zig'],ink=metadata['compiler_sha256']),sort_keys=True),backend=variant,bridge='U32 snapshot/input copy/result return; runner '+sha(report/'runner.mjs')),
                workload=dict(shape=dict(case=case,length=len(inputs[input_id]['xs']),seed=inputs[input_id]['seed'],factor=inputs[input_id]['factor']),distribution=input_id,concurrency=1,residency='host-resident typed U32 input; warm modules'),
                metrics=dict(complete_call_ns=[str(round(r['ns_per_call'])) for r in rows],peak_bytes=max(r['linear_memory_bytes'] for r in rows)))
            observations.append(dict(id=store.observe(obj),variant=variant,case=case,input=input_id))
    if store.snapshot_id!=pin:raise ValueError('observation altered proof snapshot')
    summary=dict(status='passed',cells=len(groups),samples=len(data['samples']),validation=data['validation'],python_literal_checks=fixture['python_literal_checks'],observations=len(observations),prior_snapshot=PRIOR,new_snapshot=pin,measurements=measurements,availability=data['availability'],scope=data['scope'],gpu_adapter=data.get('gpu_adapter'))
    (report/f'{host}-summary.json').write_text(json.dumps(summary,indent=2)+'\n');(report/f'{host}-observations.json').write_text(json.dumps(observations,indent=2)+'\n')
    lines=[f'# Web stack new-proof benchmark ({host})','',data['scope'],'',f'{len(groups)} cells; {len(data["samples"])} paired samples; {data["validation"]["comparisons"]} exact backend oracle comparisons; {fixture["python_literal_checks"]} independent literal Python checks.','',f'Prior catalogue `{PRIOR}`; new catalogue `{pin}`; same compiler `{metadata["compiler_sha256"]}`.','', 'Ratios prior/new above1 mean the NEW proofs improved performance beyond the old catalogue. Baseline/new measures the whole database effect. All intervals are paired bootstrap95%; intervals crossing1 do not establish a difference.','', '| Task | Input | Prior/new JS | Prior/new Wasm | Prior/new GPU | Baseline/new GPU | Direct newJS/originalJS | NewWasm/originalRustWasm |','|---|---|---:|---:|---:|---:|---:|---:|']
    for row in measurements:
        ratios=row['paired_ratios_95pct'];fmt=lambda key:M.fmt_ci(*ratios[key]) if key in ratios else 'unavailable/fallback'
        lines.append(f'| {row["case"]} | {row["input"]} | {fmt("prior_over_checked_js")} | {fmt("prior_over_checked_wasm")} | {fmt("prior_over_checked_gpu")} | {fmt("baseline_over_checked_gpu")} | {fmt("ink_checked_direct_js_over_js_literal")} | {fmt("ink_checked_wasm_over_rust_literal_wasm")} |')
    lines+=['','DirectJS/originalJS and newWasm/originalRustWasm ratios above1 mean Ink is slower. Rust source follows original operations with normal release optimisation. All fullcall variants pay one snapshot capture; directJS and handwritten JS use the same snapshot/consumption driver. Native runtime wrappers and transport costs differ and are included.','', 'GPU fallback records are retained but never become GPU timed samples. Startup, first calls, shader manifests, raw trials, calibration, warmup and memory records are archived. GPU-only eligibility gains cannot establish prior/new GPU speedups when prior used fallback. Wasm observations carry linear-memory highwater only; JS/GPU memory unmeasured, therefore no fabricated canonical memory entries.','']
    (report/f'{host}-REPORT.md').write_text('\n'.join(lines)+'\n');print(json.dumps({k:summary[k] for k in ['status','cells','samples','validation','observations']},indent=2),flush=True)

def serve(args):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self,*a,**kw):super().__init__(*a,directory=str(args.report),**kw)
        def do_POST(self):
            if self.path!='/browser-results.json':self.send_error(404);return
            target=args.report/'browser-results.json'
            if target.exists():self.send_error(409,'archived browser results exist');return
            length=int(self.headers.get('Content-Length',0))
            if not 0<length<20000000:self.send_error(413);return
            result=json.loads(self.rfile.read(length));target.write_text(json.dumps(result,indent=2)+'\n')
            self.send_response(200);self.end_headers();self.wfile.write(b'saved')
            if result.get('status')=='passed':summarise(args.report,'browser')
            else:print('Browser failure: '+json.dumps(result),flush=True)
    print(f'Browser: http://127.0.0.1:{args.port}/browser.html',flush=True)
    http.server.ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--report',type=Path,default=REPORT);p.add_argument('--compiler',type=Path,default=ROOT.parent/'toolchain/ink-sequence-proofs');p.add_argument('--knowledge',type=Path,default=ROOT/'knowledge');p.add_argument('--prior-snapshot',type=Path,default=ROOT/f'knowledge/store/snapshots/{PRIOR}.json');p.add_argument('--zig',type=Path)
    p.add_argument('--reuse-fixtures',type=Path);p.add_argument('--cases',nargs='+',choices=CASES,default=CASES);p.add_argument('--sizes',nargs='+',type=int,default=[32,4096,65536]);p.add_argument('--seed',type=int,default=20261017);p.add_argument('--seconds',type=float,default=.015);p.add_argument('--warmup',type=int,default=1);p.add_argument('--repeats',type=int,default=7);p.add_argument('--port',type=int,default=8788)
    for name in ['prepare','node','validate','serve']:p.add_argument('--'+name,action='store_true')
    p.add_argument('--summarise',choices=['node','browser']);p.add_argument('--audit',choices=['node','browser']);a=p.parse_args();a.report=a.report.resolve();a.compiler=a.compiler.resolve();a.knowledge=a.knowledge.resolve();a.prior_snapshot=a.prior_snapshot.resolve()
    if not 3<=a.repeats<=128 or not 1<=a.warmup<=10 or not 0<a.seconds<=1 or any(not 0<n<=100000 for n in a.sizes):p.error('invalid parameters')
    if a.prepare:
        a.zig=a.zig.resolve();prepare(a)
    if a.node:
        if (a.report/'node-results.json').exists():raise ValueError('archive exists; use fresh report')
        print(run(['node',a.report/'node.mjs',a.report],[]),flush=True);summarise(a.report,'node')
    if a.validate:print(run(['node',a.report/'node.mjs',a.report,'--validate'],[]),flush=True)
    if a.summarise:summarise(a.report,a.summarise)
    if a.audit:audit(a.report,a.audit);print('audit passed')
    if a.serve:serve(a)
    if not any([a.prepare,a.node,a.validate,a.summarise,a.audit,a.serve]):p.error('choose preparation, validation, timing, server, summary or audit')
if __name__=='__main__':main()
