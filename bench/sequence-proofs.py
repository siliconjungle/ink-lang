#!/usr/bin/env python3
"""General ordered concat proofs: pinned prior catalogue vs explicit checked candidates.

Preparation, oracle validation and timing are separate commands. GPU results
come from the headed browser runner; fallbacks never count as GPU measurements.
"""
import argparse
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
ASSETS=ROOT/'bench/sequence-proofs'
REPORT=ROOT/'reports/sequence-semantics-2026-10-10'
CASES=['concat_count','concat_fold','concat_sum','concat_empty','concat_map']
LAWS=dict(concat_count='concat_count_u32',concat_fold='concat_ordered_fold_u32',concat_sum='concat_sum_u32',concat_empty='concat_empty_right_u32',concat_map='concat_map_fusion_u32')
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

def literal(name,xs,ys,seed,factor):
    # Independent source-stage Python implementation, not the emitted helpers.
    if name=='concat_empty':return list(xs)+[x for x in ys if False]
    if name=='concat_map':return [(x*factor)&MASK for x in xs]+[(x*factor)&MASK for x in ys]
    joined=list(xs)+list(ys)
    if name=='concat_count':return len(joined)
    if name=='concat_sum':
        a=0
        for x in joined:a=(a+x)&MASK
        return a
    if name=='concat_fold':
        a=seed
        for x in reversed(joined):a=(x-a)&MASK
        return a
    raise ValueError(name)

def oracle(name,xs,ys,seed,factor):
    if name=='concat_count':return len(xs)+len(ys)
    if name=='concat_sum':return (sum(xs)+sum(ys))&MASK
    if name=='concat_empty':return list(xs)
    if name=='concat_map':return [(x*factor)&MASK for x in [*xs,*ys]]
    if name=='concat_fold':
        values=[*xs,*ys]
        return (sum((1 if i%2==0 else -1)*x for i,x in enumerate(values))+(1 if len(values)%2==0 else -1)*seed)&MASK
    raise ValueError(name)

def observation(value):
    if not isinstance(value,list):return str(value),int(value)
    total=sum(value)&MASK;weighted=sum((i+1)*x for i,x in enumerate(value))&MASK
    return f'array:{len(value)}:{total}:{weighted}',(total+(weighted<<32)+len(value))%(2**64)

def fixtures(args):
    rng=random.Random(args.seed);inputs=[];cells=[];literal_checks=0
    def add(identifier,xs,ys,seed,factor):
        nonlocal literal_checks
        expected={name:oracle(name,xs,ys,seed,factor) for name in args.cases}
        for name in args.cases:
            if literal(name,xs,ys,seed,factor)!=expected[name]:raise ValueError('Python literal/oracle disagreement')
            literal_checks+=1
        inputs.append(dict(id=identifier,xs=xs,ys=ys,seed=seed,factor=factor,expected=expected));return len(inputs)-1
    words=[0,1,2,MASK,MASK-1,2**31,2**31-1]
    add('boundary-empty',[],[],MASK,MASK)
    add('boundary-left-empty',[],words,MASK-1,MASK-2)
    add('boundary-right-empty',words,[],MASK-1,MASK-2)
    add('boundary-odd',words,[MASK,3,0,7],MASK-1,2**31+1)
    for distribution in ['small','full']:
        seed,factor=(512,7) if distribution=='small' else (2**31,MASK-2)
        for n in args.sizes:
            values=lambda length:[rng.randrange(1024) if distribution=='small' else rng.getrandbits(32) for _ in range(length)]
            i=add(f'{distribution}-{n}',values(n),values(n//2+1),seed,factor)
            cells.extend(dict(case=c,input=i) for c in args.cases)
    return dict(cases=args.cases,inputs=inputs,cells=cells,python_literal_checks=literal_checks,
        parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),
        scope='Warm complete runtime calls over two resident typed U32 inputs. xs lengthN, ys length floor(N/2)+1; all fullcall implementations capture both once. Wasm copies, result conversion, checksum consumption and available GPU upload/dispatch/readback included. Direct compiledJS and originalJS use the same two input snapshots/checksum. Python arbitrary-integer closed-form oracle is independently corroborated by literal source-stage evaluation for every complete fixture. Startup and first-call preparation separate. peak_bytes means exported Wasm linear-memory highwater only; host/GPU memory unmeasured. Explicit checked sequence candidates are measured; current structural planner did not establish their profitability.')

def prepare(args):
    report=args.report
    if (report/'metadata.json').exists():raise ValueError('prepared report exists; choose fresh --report')
    report.mkdir(parents=True,exist_ok=True);commands=[];compiler=args.compiler.resolve();initial=sha(compiler)
    prior_source=Store(args.knowledge,args.prior_snapshot);current_source=Store(args.knowledge)
    if len(prior_source.members())!=700:raise ValueError('expected pinned prior700-entry catalogue')
    if current_source.snapshot_id==prior_source.snapshot_id:raise ValueError('publish sequence batch before preparation')
    stores={}
    for label,source in [('prior-store',prior_source),('report-store',current_source)]:
        stores[label]=Store.publish(report/label,[source.object(i) for i in sorted(source.members())]);stores[label].rebuild()
        if stores[label].snapshot_id!=source.snapshot_id:raise ValueError('proof copy changed snapshot')
    shutil.copy2(Path(__file__).resolve(),report/'harness.py')
    for name in ['literal.mjs','runner.mjs','node.mjs','browser.html']:shutil.copy2(ASSETS/name,report/name)
    blocks=(ASSETS/'kernels.ink').read_text().split('\npub fn ')
    source=blocks[0]+''.join('\npub fn '+b for b in blocks[1:] if b.split('(',1)[0] in args.cases)
    (report/'kernels.ink').write_text(source)
    (report/'fixtures.json').write_text(json.dumps(fixtures(args),separators=(',',':'))+'\n')
    run([compiler,'emit-core',report/'kernels.ink','-o',report/'core.json'],commands)
    selections={}
    for kind,label in [('prior','prior-store'),('checked','report-store')]:
        store=stores[label];selected=report/f'{kind}-selection.json'
        if kind=='prior':
            run([sys.executable,ROOT/'planner/plan.py','--compiler',compiler,'--core',report/'core.json','--knowledge-root',store.root,'--snapshot',store.data/'snapshot.json','--budget',4096,'-o',selected],commands)
        else:
            command=[sys.executable,ROOT/'knowledge/producers/select_sequence_laws.py','--compiler',compiler,'--core',report/'core.json','--knowledge-root',store.root]
            for name in args.cases:command+=['--function-law',name+':'+LAWS[name]]
            command+=['-o',selected];run(command,commands)
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
    changed={name:prior_bodies[name]!=new_bodies[name] for name in args.cases}
    if not all(changed.values()):raise ValueError('new catalogue did not change some prior-selected function')
    gpu_manifest={}
    for kind in ['prior','checked']:
        extra=['--selection',report/f'{kind}-selection.json']
        run([compiler, 'build', report / 'kernels.ink', '--target', 'webgpu', *extra, '-o', report / kind],commands)
        manifest=json.loads((report/kind/'manifest.json').read_text());gpu_manifest[kind]={f['name']:dict(shader=f.get('shader'),reason=f.get('fallback_reason',f.get('gpu_reason'))) for f in manifest['functions']}
        host=report/kind/'ink-gpu.mjs';text=host.read_text()
        if '    manifest,' not in text:raise ValueError('host accessor insertion changed')
        memory='cpu.memory' if manifest['schema']==2 else 'instance.exports.memory'
        host.write_text(text.replace('    manifest,',f'    manifest,\n    benchmarkMemoryBytes(){{return {memory}.buffer.byteLength;}},',1))
    if sha(compiler)!=initial:raise ValueError('compiler changed')
    metadata=dict(schema=1,compiler_path=str(compiler),compiler_sha256=initial,prior_snapshot=prior_source.snapshot_id,new_snapshot=current_source.snapshot_id,
        new_laws_per_function={name:sorted(set(ids)&new_members) for name,ids in per_function.items()},selected_laws_per_function=per_function,prior_to_new_core_changed=changed,
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
        groups.setdefault(key[:2],{}).setdefault(row['variant'],[]).append(row)
    required={f'ink_{kind}_{backend}' for kind in ['prior','checked'] for backend in ['js','wasm','direct_js']}|{'js_literal'}
    if set(groups)!=cells:raise ValueError('incomplete cells')
    allowed=required|({f'ink_{kind}_gpu' for kind in ['prior','checked']} if host=='browser' else set())
    for key,variants in groups.items():
        if not set(variants)<=allowed:raise ValueError('unexpected variant')
        if not required<=set(variants):raise ValueError('missing CPU/control variant')
        if any(len(rows)!=fixtures_data['parameters']['repeats'] for rows in variants.values()):raise ValueError('missing round')
        if host=='browser':
            for kind in ['prior','checked']:
                variant=f'ink_{kind}_gpu';available=[a for a in data['availability'] if (a['case'],a['input'],a['variant'])==(*key,variant)]
                if len(available)!=1:raise ValueError('missing GPU availability')
                eligible=bool(metadata['gpu_manifest'][kind][key[0]]['shader'])
                if eligible and (available[0]['actual_backend']!='gpu' or variant not in variants):raise ValueError('eligible shader fell back')
                if variant in variants and available[0]['actual_backend']!='gpu':raise ValueError('fallback counted as GPU')
    return metadata,fixtures_data,data,inputs,groups

def summarise(report,host):
    metadata,fixture,data,inputs,groups=audit(report,host);measurements=[];observations=[];store=Store(report/'report-store');pin=store.snapshot_id
    for (case,input_id),variants in groups.items():
        for rows in variants.values():rows.sort(key=lambda r:r['round'])
        values={name:[r['ns_per_call'] for r in rows] for name,rows in variants.items()};ratios={}
        for backend in ['js','wasm','gpu','direct_js']:
            for numerator,denominator in [('prior','checked')]:
                a,b=f'ink_{numerator}_{backend}',f'ink_{denominator}_{backend}'
                if a in values and b in values:ratios[f'{numerator}_over_{denominator}_{backend}']=M.ratio_ci(values[a],values[b])
        for ink,control in [('ink_checked_js','js_literal'),('ink_checked_direct_js','js_literal')]:ratios[f'{ink}_over_{control}']=M.ratio_ci(values[ink],values[control])
        measurements.append(dict(case=case,input=input_id,median_ns={v:statistics.median(x) for v,x in values.items()},paired_ratios_95pct=ratios))
        for variant,rows in variants.items():
            if rows[0]['linear_memory_bytes'] is None:continue
            kind='checked' if variant.startswith('ink_checked') else 'prior' if variant.startswith('ink_prior') else 'prior'
            plan=metadata['selections'][kind]['sha256']
            entries=sorted({a['law'] for a in json.loads((report/f'{kind}-selection.json').read_text())['applications'] if a['function']==case})
            obj=dict(schema=1,program=metadata['artifact_hashes']['core.json'],entries=entries,plan=plan,
                target=dict(hardware=str(metadata['environment']['cpu']),driver=f'{host}: {data["host"]}; peak_bytes=exported Wasm linear-memory highwater only; host/GPU excluded',toolchain=json.dumps(dict(rustc=metadata['environment']['rustc'],zig=metadata['zig'],ink=metadata['compiler_sha256']),sort_keys=True),backend=variant,bridge='U32 snapshot/input copy/result return; runner '+sha(report/'runner.mjs')),
                workload=dict(shape=dict(case=case,length=len(inputs[input_id]['xs']),right_length=len(inputs[input_id]['ys']),seed=inputs[input_id]['seed'],factor=inputs[input_id]['factor']),distribution=input_id,concurrency=1,residency='host-resident typed U32 input; warm modules'),
                metrics=dict(complete_call_ns=[str(round(r['ns_per_call'])) for r in rows],peak_bytes=max(r['linear_memory_bytes'] for r in rows)))
            observations.append(dict(id=store.observe(obj),variant=variant,case=case,input=input_id))
    if store.snapshot_id!=pin:raise ValueError('observation altered proof snapshot')
    summary=dict(status='passed',cells=len(groups),samples=len(data['samples']),validation=data['validation'],python_literal_checks=fixture['python_literal_checks'],observations=len(observations),prior_snapshot=metadata['prior_snapshot'],new_snapshot=pin,measurements=measurements,availability=data['availability'],scope=data['scope'],gpu_adapter=data.get('gpu_adapter'))
    (report/f'{host}-summary.json').write_text(json.dumps(summary,indent=2)+'\n');(report/f'{host}-observations.json').write_text(json.dumps(observations,indent=2)+'\n')
    lines=[f'# Ordered sequence proof benchmark ({host})','',data['scope'],'',f'{len(groups)} cells; {len(data["samples"])} paired samples; {data["validation"]["comparisons"]} exact backend oracle comparisons; {fixture["python_literal_checks"]} independent literal Python checks.','',f'Prior catalogue `{metadata["prior_snapshot"]}`; new catalogue `{pin}`; same compiler `{metadata["compiler_sha256"]}`.','', 'Ratios prior/new above1 mean the NEW proofs improved performance beyond the old catalogue. Both prior and explicitly checked candidates use the same new compiler. All intervals are paired bootstrap95%; intervals crossing1 do not establish a difference.','', '| Task | Input | Prior/new JS | Prior/new Wasm | Prior/new GPU | Direct newJS/originalJS |','|---|---|---:|---:|---:|---:|']
    for row in measurements:
        ratios=row['paired_ratios_95pct'];fmt=lambda key:M.fmt_ci(*ratios[key]) if key in ratios else 'unavailable/fallback'
        lines.append(f'| {row["case"]} | {row["input"]} | {fmt("prior_over_checked_js")} | {fmt("prior_over_checked_wasm")} | {fmt("prior_over_checked_gpu")} | {fmt("ink_checked_direct_js_over_js_literal")} |')
    lines+=['','DirectJS/originalJS ratios above1 mean Ink is slower. OriginalJS follows original concat stages with normal engine optimisation. All fullcall variants pay one snapshot capture; directJS and handwritten JS use the same snapshot/consumption driver. Native runtime wrappers and transport costs differ and are included.','', 'GPU fallback records are retained but never become GPU timed samples. Startup, first calls, shader manifests, raw trials, calibration, warmup and memory records are archived. GPU-only eligibility gains cannot establish prior/new GPU speedups when prior used fallback. Wasm observations carry linear-memory highwater only; JS/GPU memory unmeasured, therefore no fabricated canonical memory entries.','']
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
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--report',type=Path,default=REPORT);p.add_argument('--compiler',type=Path,default=ROOT/'target/release/ink');p.add_argument('--knowledge',type=Path,default=ROOT/'knowledge');p.add_argument('--prior-snapshot',type=Path,default=ROOT/'knowledge/store/snapshots/691db17c0c7d916a1cf54280d7482da97011be1293e977df241517083cb02dd3.json');p.add_argument('--zig',type=Path)
    p.add_argument('--cases',nargs='+',choices=CASES,default=CASES);p.add_argument('--sizes',nargs='+',type=int,default=[32,4096,65536]);p.add_argument('--seed',type=int,default=20261010);p.add_argument('--seconds',type=float,default=.015);p.add_argument('--warmup',type=int,default=1);p.add_argument('--repeats',type=int,default=7);p.add_argument('--port',type=int,default=8768)
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
