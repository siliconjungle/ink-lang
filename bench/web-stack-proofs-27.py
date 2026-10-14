#!/usr/bin/env python3
"""Reusable proof recipes against staged AND expert controls, per-task bundles.

Source generation, mathematical validation, compilation and timing are separate.
Preparation never runs timed workloads. The parent owns publication/imports.
"""
import argparse, hashlib, http.server, importlib.util, json, math, shutil, statistics, subprocess, sys, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'bench/web-stack-proofs-27'
REPORT=ROOT/'reports/web-stack-proofs-27-2026-10-11'
PRIOR='a2a756dc7174ab62c2806e09dd0e3769e507f4ed5e455d687346c544cd788abd'
sys.path.insert(0,str(ASSETS));sys.path.insert(0,str(ROOT/'bench'));sys.path.insert(0,str(ROOT/'knowledge'))
from spec import TASKS, source, public_spec, kernel_source
from fixtures import make_fixtures, observation
from instrument import instrument
from compact_selection22 import plan as compact_plan
from ink_knowledge import Store
import methodology as M
CASES=[t['name'] for t in TASKS]
KINDS=['old_prior','old_checked','new_prior','new_checked']
BASE_VARIANTS={f'ink_{k}_{b}' for k in KINDS for b in ['js','wasm','borrowed_js']}|{'js_expert','js_expert_borrowed','rust_expert_wasm'}
VALIDATION_ONLY={'js_literal','rust_literal_wasm'}
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def run(command,commands):
    command=list(map(str,command));start=time.perf_counter();r=subprocess.run(command,cwd=ROOT,capture_output=True,text=True)
    commands.append(dict(argv=command,seconds=time.perf_counter()-start,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
    if r.returncode:raise RuntimeError(str(command)+'\n'+r.stderr+'\n'+r.stdout)
    return r.stdout

def prepare(args):
    report=args.report
    if (report/'metadata.json').exists():raise ValueError('immutable prepared report exists')
    report.mkdir(parents=True,exist_ok=True);commands=[];compiler=args.old_compiler.resolve();compilers={'old':compiler,'new':args.compiler.resolve()};initials={k:sha(v) for k,v in compilers.items()}
    input_preparation=json.loads((args.input_preparation/'preparation.json').read_text())
    if input_preparation['status']!='passed' or input_preparation['historical_snapshot']!=PRIOR:raise ValueError('input/parity preparation invalid')
    old=Store(input_preparation['prior_overlay']);new=Store(args.knowledge)
    if old.snapshot_id!=input_preparation['effective_prior_snapshot'] or new.snapshot_id in [PRIOR,old.snapshot_id]:raise ValueError('catalogue pins invalid; parent must publish first')
    if not set(old.members())<=set(new.members()):raise ValueError('current catalogue omits shared prior support')
    # Pinned discovery stores remain external; no duplicated catalogue trees.
    stores={'prior-store':old,'report-store':new}
    shutil.copy2(Path(__file__),report/'harness.py')
    for model,label in [(args.cost_model,'cpu-cost-model.json'),(args.gpu_cost_model,'gpu-cost-model.json')]:
        if model.resolve()!=(report/label).resolve():shutil.copy2(model,report/label)
    for p in ASSETS.iterdir():
        if p.is_file():
            if p.name=='donor-fixtures.json':
                dest=report/p.name
                if dest.exists():
                    if sha(dest)!=sha(p):raise ValueError('immutable donor drift')
                else:__import__('os').link(p,dest)
            else:shutil.copy2(p,report/p.name)
    spec=public_spec();spec['tasks']=[t for t in spec['tasks'] if t['name'] in args.cases]
    (report/'spec.json').write_text(json.dumps(spec,indent=2)+'\n')
    (report/'kernels.ink').write_text(kernel_source())
    fixture=make_fixtures(args);fixture_text=json.dumps(fixture,separators=(',',':'))+'\n'
    fixture_path=report/'fixtures.json'
    if fixture_path.exists():
        if fixture_path.read_text()!=fixture_text:raise ValueError('immutable fixture drift')
    else:fixture_path.write_text(fixture_text)
    (report/'fixture-profile.json').write_text(json.dumps(dict(status='frozen',profiles=fixture['profiles'],scope='Preset small/full distributions and captured parameters fixed across sizes. Three independent two-list recipes use3N/4 ys from a distinct immutable donor; all declared inputs captured. Two fresh nested zips and six helper/backend references; callbacks fixed before timing.'),indent=2)+'\n')
    tasks={};gpu={};gpu_aliases={};fresh=set(new.members())-set(old.members())
    for task in spec['tasks']:
        name=task['name'];td=report/'tasks'/name;td.mkdir(parents=True,exist_ok=True)
        definition=next(t for t in TASKS if t['name']==name)
        src=td/'source.ink';src.write_text('module Recipe;\n'+source(definition)+'\n')
        input_row=next(x for x in input_preparation['sources'] if x['task']==name)
        core=td/'core.json';shutil.copy2(input_row['input_core'],core)
        if sha(core)!=input_row['input_core_sha256']:raise ValueError('prepared input core changed')
        original=json.loads(core.read_text())['program']['functions'][0]['body'];selections={};bodies={};selected_cores={}
        for proof,label in [('prior','prior-store'),('checked','report-store')]:
            st=stores[label];selected=td/f'{proof}-selection.json'
            receipt=compact_plan(compiler,core,st,args.cost_model,selected,budget=4096);commands.append(receipt)
            package=json.loads(selected.read_text());selected_core=td/f'{proof}-selected.core.json'
            run([compiler,'emit-core',core,'--core','--selection',selected,'-o',selected_core],commands)
            selected_cores[proof]=selected_core;bodies[proof]=json.loads(selected_core.read_text())['program']['functions'][0]['body']
            selections[proof]=dict(sha256=sha(selected),path=str(selected.relative_to(report)),laws=sorted({a['law'] for a in package['applications']}),applications=len(package['applications']),compact_receipt_sha256=sha(selected.with_suffix('.receipt.json')),selected_core_sha256=sha(selected_core),selected_core_path=str(selected_core.relative_to(report)))
        new_ids=set(selections['checked']['laws'])&fresh
        if task['fresh_proof_required'] and (not new_ids or bodies['checked']==bodies['prior']):raise ValueError('fresh law has no effect '+name)
        tasks[name]=dict(core_sha256=sha(core),source_sha256=sha(src),selections=selections,new_laws=sorted(new_ids),prior_equals_original=bodies['prior']==original,checked_changes_prior=bodies['checked']!=bodies['prior'],fresh_proof_required=task['fresh_proof_required'],cohort=task['cohort'],list_input_count=len(task['list_inputs']),output_kind=task['output_kind'],input_provenance=input_row,matrix_bundles={})
        seen_gpu={};aliases={}
        for backend,tool in compilers.items():
            for proof in ['prior','checked']:
                target=report/backend/proof/name;selected_core=selected_cores[proof]
                # Neither proof selection nor expression is recomputed for new backend.
                run([tool, 'build', selected_core, '--core', '--target', 'webgpu', '-o', target],commands)
                manifest=json.loads((target/'manifest.json').read_text());fn=next(f for f in manifest['functions'] if f['name']==name)
                if manifest['schema']==1:instrument(target)
                host=target/'ink-gpu.mjs';text=host.read_text()
                if '    manifest,' not in text:raise ValueError('host accessor insertion anchor differs')
                mem='cpu.memory' if manifest['schema']==2 else 'instance.exports.memory'
                host.write_text(text.replace('    manifest,',f'    manifest,\n    benchmarkMemoryBytes(){{return {mem}.buffer.byteLength;}},',1))
                bundle=f'{backend}/{proof}/{name}'
                tasks[name]['matrix_bundles'][backend+'_'+proof]=dict(bundle=bundle,selected_core_sha256=sha(selected_core),manifest_sha256=sha(target/'manifest.json'),program_sha256=sha(target/'program.mjs'))
                eligible=bool(fn.get('gpu')) if manifest['schema']==1 else bool(fn.get('shader'))
                descriptor=dict(schema=manifest['schema'],shader=fn.get('shader'),stages=(fn.get('gpu') or {}).get('stages'),aggregate=(fn.get('gpu') or {}).get('aggregate'),parameter_count=len(task['params']),reason=fn.get('fallback_reason',fn.get('gpu_reason',fn.get('cpu_reason'))),timing_eligible=eligible,bundle=bundle,policy='same frozen CPU-selected core; task proof role and actual bytes determine fresh/reference attribution')
                fingerprint_files={str(f.relative_to(target)):sha(f) for f in target.rglob('*') if f.is_file() and (f.suffix=='.wgsl' or f.name in ['ink-device.mjs','ink-gpu.mjs'])}
                descriptor['fingerprint_inputs']=dict(files=fingerprint_files,abi=dict(schema=manifest['schema'],parameters=fn.get('params',fn.get('parameters')),result=fn.get('result'),shader=fn.get('shader'),gpu=fn.get('gpu')))
                descriptor['fingerprint']=hashlib.sha256(json.dumps(descriptor['fingerprint_inputs'],sort_keys=True,separators=(',',':')).encode()).hexdigest()
                variant=f'ink_{backend}_{proof}_gpu'
                if eligible:
                    if descriptor['fingerprint'] in seen_gpu:aliases[variant]=seen_gpu[descriptor['fingerprint']]
                    else:seen_gpu[descriptor['fingerprint']]=variant;gpu.setdefault(variant,{})[name]=descriptor
                elif backend=='old' and proof=='prior':gpu.setdefault(variant,{})[name]=descriptor
                else:aliases[variant]='ineligible (canonical old_prior fallback validation)'
        gpu_aliases[name]=aliases
    for mode in ['literal','expert']:
        run(['rustc','--edition=2021','--crate-type=cdylib','--target','wasm32-unknown-unknown','-C','opt-level=3','-C','panic=abort','-C','target-feature=+simd128','-C','link-arg=--strip-all',report/f'{mode}.rs','-o',report/f'rust-{mode}.wasm'],commands)
    if any(sha(compilers[k])!=v for k,v in initials.items()):raise ValueError('compiler changed during preparation')
    metadata=dict(schema=2,compiler_path=str(compilers['new']),compiler_sha256=initials['new'],compiler_paths={k:str(v) for k,v in compilers.items()},compiler_hashes=initials,compilers={k:dict(path=str(v),sha256=initials[k]) for k,v in compilers.items()},prior_snapshot=PRIOR,effective_prior_snapshot=old.snapshot_id,shared_old_witness_ids=input_preparation['shared_old_witness_ids'],input_preparation_sha256=sha(args.input_preparation/'preparation.json'),cost_model_sha256=sha(args.cost_model),gpu_cost_model_sha256=sha(args.gpu_cost_model),knowledge_root=str(new.root),new_snapshot=new.snapshot_id,tasks=tasks,gpu_manifest=gpu,gpu_aliases=gpu_aliases,gpu_reference_scope="Deduplicated exact ABI/host/device/WGSL fingerprints of frozen CPU cores; identical replicas not timed. Fresh/reference and actual/fallback scope follows task role and emitted manifest.",
        new_laws_per_function={n:t['new_laws'] for n,t in tasks.items()},selected_laws_per_function={n:t['selections']['checked']['laws'] for n,t in tasks.items()},
        prior_core_equals_original={n:t['prior_equals_original'] for n,t in tasks.items()},prior_to_new_core_changed={n:t['checked_changes_prior'] for n,t in tasks.items()},
        environment=M.environment(),zig=run([args.zig,'version'],commands).strip(),node=run(['node','--version'],commands).strip(),commands=commands,
        planner_policy_sha256=sha(ROOT/'planner/ink_planner/semantic_search.py') if (ROOT/'planner/ink_planner/semantic_search.py').exists() else None,
        methodology_sha256=sha(ROOT/'bench/methodology.py'),parameters={k:str(v) if isinstance(v,Path) else v for k,v in vars(args).items()},
        artifact_hashes={str(p.relative_to(report)):sha(p) for p in report.rglob('*') if p.is_file() and p.suffix!='.log' and not p.name.startswith(('performance-review.','code-shape-review.','catalogue-review.')) and not any(part in p.parts for part in ['prior-store','report-store','historical-store','prior-overlay','initial-preparation'])})
    (report/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(json.dumps(dict(tasks=len(tasks),cells=len(fixture['cells']),frozen_artifacts=len(metadata['artifact_hashes']),new_snapshot=new.snapshot_id)),flush=True)

def expected_gpu(metadata,variant,name,x):
    contract=metadata['gpu_manifest'][variant][name];n=len(x['xs'])
    if contract['schema']==2:
        task=metadata['tasks'][name];lists=task['list_input_count'];parameters=contract['parameter_count'];words=n+(len(x['ys']) if lists==2 else 0)
        count=len(x['expected'][name]) if isinstance(x['expected'][name],list) else 2 if task['output_kind']=='u64' else 1
        return dict(dispatches=int(count>0),upload_bytes=4*(words+parameters-lists+parameters+1),readback_bytes=count*4)
    dispatches=sum(1 if stage['kind']=='map' else 3 for stage in contract['stages']);cap=max(1,n)
    if contract['aggregate']=='count':dispatches+=1
    else:
        while True:
            dispatches+=1;cap=(cap+255)//256
            if cap<=1:break
    return dict(dispatches=dispatches,upload_bytes=n*4+4+4*contract['parameter_count'],readback_bytes=4)

def audit(report,host):
    metadata=json.loads((report/'metadata.json').read_text());fixture=json.loads((report/'fixtures.json').read_text());raw=json.loads((report/f'{host}-results.json').read_text())
    if raw['status']!='passed':raise ValueError('runner failed')
    if any(sha(metadata['compiler_paths'][k])!=v for k,v in metadata['compiler_hashes'].items()) or sha(ROOT/'bench/methodology.py')!=metadata['methodology_sha256']:raise ValueError('compiler or methodology changed')
    for p,h in metadata['artifact_hashes'].items():
        if sha(report/p)!=h:raise ValueError('artifact changed '+p)
    inputs={x['id']:x for x in fixture['inputs']};cells={(c['case'],fixture['inputs'][c['input']]['id']) for c in fixture['cells']};groups={};seen=set();phase_seen={'calibration':set(),'warmups':set()}
    allowed=BASE_VARIANTS|(set(metadata['gpu_manifest']) if host=='browser' else set())
    for phase in ['samples','warmups','calibration']:
        for r in raw[phase]:
            key=(r['case'],r['input']);variant=r['variant'];n=r['iterations']
            if key not in cells or variant not in allowed or n<=0 or not math.isfinite(r['seconds']) or r['seconds']<=0:raise ValueError('invalid sample')
            single,code=observation(inputs[r['input']]['expected'][r['case']])
            if r['single']!=single or r['checksum']!=str(code*n%(2**64)):raise ValueError('checksum mismatch')
            if not math.isclose(r['ns_per_call'],r['seconds']*1e9/n,rel_tol=1e-9):raise ValueError('normalization mismatch')
            if variant.endswith('_gpu'):
                x=inputs[r['input']];expected={k:v*n for k,v in expected_gpu(metadata,variant,r['case'],x).items()}
                if r['gpu_counters']!=expected:raise ValueError('GPU counters mismatch')
            if phase!='samples':
                full=(*key,variant) if phase=='calibration' else (*key,variant,r['warmup'])
                if full in phase_seen[phase]:raise ValueError('repeated phase row')
                if phase=='warmups' and not 0<=r['warmup']<fixture['parameters']['warmup']:raise ValueError('invalid warmup index')
                phase_seen[phase].add(full)
            if phase=='samples':
                full=(*key,variant,r['round'])
                if full in seen or not 0<=r['round']<fixture['parameters']['repeats']:raise ValueError('repeated round')
                seen.add(full);groups.setdefault(key,{}).setdefault(variant,[]).append(r)
    if set(groups)!=cells:raise ValueError('incomplete cells')
    for key,variants in groups.items():
        if not BASE_VARIANTS<=set(variants):raise ValueError('missing CPU/expert/control variants')
        if any(len(v)!=fixture['parameters']['repeats'] for v in variants.values()):raise ValueError('missing rounds')
        if host=='browser':
            for v,byTask in metadata['gpu_manifest'].items():
                contract=byTask.get(key[0])
                if contract is None:continue
                a=[a for a in raw['availability'] if (a['case'],a['input'],a['variant'])==(*key,v)]
                if len(a)!=1:raise ValueError('missing GPU availability')
                eligible=contract['timing_eligible']
                if eligible!=(v in variants) or (eligible and a[0]['actual_backend']!='gpu'):raise ValueError('GPU eligibility accounting mismatch')
                if eligible:
                    expected=expected_gpu(metadata,v,key[0],inputs[key[1]])
                    if any(a[0]['counters'].get(k)!=value for k,value in expected.items()):raise ValueError('GPU first-call counters mismatch')
    expected_cal={(*key,v) for key,variants in groups.items() for v in variants}
    expected_warm={(*key,v,w) for key,variants in groups.items() for v in variants for w in range(fixture['parameters']['warmup'])}
    if phase_seen['calibration']!=expected_cal or phase_seen['warmups']!=expected_warm:raise ValueError('incomplete calibration/warmup')
    expected_checks=len(fixture['inputs'])*(len(BASE_VARIANTS)+len(VALIDATION_ONLY))+len(cells)*len(BASE_VARIANTS)
    if host=='browser':expected_checks+=sum(sum(name in byTask for byTask in metadata['gpu_manifest'].values()) for x in fixture['inputs'] for name in x['expected'])+sum(sum(name in byTask for byTask in metadata['gpu_manifest'].values()) for name,input_id in cells)
    if host=='browser':
        records=raw['gpu_validation']['records'];keys={(q['case'],q['input'],q['variant']) for q in records}
        expected_keys={(name,x['id'],v) for x in fixture['inputs'] for name in x['expected'] for v,byTask in metadata['gpu_manifest'].items() if name in byTask}
        if len(records)!=len(keys) or keys!=expected_keys:raise ValueError('incomplete GPU edge fixtures')
        actual=sum(q['actual_backend']=='gpu' for q in records)
        if raw['gpu_validation']['comparisons']!=len(records) or raw['gpu_validation']['actual_gpu']!=actual or raw['gpu_validation']['fallbacks']!=len(records)-actual:raise ValueError('GPU prevalidation totals')
        for q in records:
            x=inputs[q['input']];name=q['case'];expected=x['expected'][name];count=len(expected) if isinstance(expected,list) else 1
            eligible=metadata['gpu_manifest'][q['variant']][name]['timing_eligible']
            if q['actual_backend']=='gpu':
                counters=q['counters'];wanted=expected_gpu(metadata,q['variant'],name,x)
                if not eligible or any(counters.get(k)!=v for k,v in wanted.items()):raise ValueError('GPU prevalidation counters/backend')
                schema=metadata['gpu_manifest'][q['variant']][name]['schema']
                if schema==1:
                    if set(counters)!=set(wanted):raise ValueError('schema1 GPU transfer evidence keys')
                elif schema==2:
                    live=counters.get('live_buffer_bytes')
                    if set(counters)!=set(wanted)|{'live_buffer_bytes'} or not isinstance(live,int) or live<0 or live%4:raise ValueError('schema2 GPU live buffer evidence')
                else:raise ValueError('unexpected GPU counter schema')
            elif eligible and count:raise ValueError('positive eligible GPU prevalidation fallback')
    if raw['validation']['comparisons']!=expected_checks:raise ValueError('incorrect validation count')
    return metadata,fixture,raw,inputs,groups

def summarise(report,host):
    metadata,fixture,raw,inputs,groups=audit(report,host);measurements=[]
    for (case,input_id),group in groups.items():
        values={v:[r['ns_per_call'] for r in sorted(rows,key=lambda r:r['round'])] for v,rows in group.items()};ratios={};pairs={}
        for target in ['js','wasm','borrowed_js']:
            q=lambda state:f'ink_{state}_{target}'
            for label,a,b in [('backend_prior','old_prior','new_prior'),('backend_checked','old_checked','new_checked'),('proof_old','old_prior','old_checked'),('proof_new','new_prior','new_checked'),('combined','old_prior','new_checked')]:pairs[label+'_'+target]=(q(a),q(b))
            expert='rust_expert_wasm' if target=='wasm' else 'js_expert_borrowed' if target=='borrowed_js' else 'js_expert'
            for state in KINDS:pairs[f'ink_{state}_{target}_over_{expert}']=(q(state),expert)
        for v in values:
            if v.endswith('_gpu'):
                for expert in ['js_expert','rust_expert_wasm']:pairs[expert+'_over_'+v]=(expert,v)
        for key,(a,b) in pairs.items():ratios[key]=M.ratio_ci(values[a],values[b])
        interactions={}
        for target in ['js','wasm','borrowed_js']:
            proof_old=[a/b for a,b in zip(values[f'ink_old_prior_{target}'],values[f'ink_old_checked_{target}'])]
            proof_new=[a/b for a,b in zip(values[f'ink_new_prior_{target}'],values[f'ink_new_checked_{target}'])]
            interactions[target]=dict(definition='(old-prior/old-current)/(new-prior/new-current);above1 means proof gain larger onoldbackend',paired_ratio_95pct=M.ratio_ci(proof_old,proof_new))
        measurements.append(dict(case=case,input=input_id,median_ns={v:statistics.median(xs) for v,xs in values.items()},paired_ratios_95pct=ratios,ratio_variants={k:list(v) for k,v in pairs.items()},factorial_interactions=interactions))
    summary=dict(status='passed',cells=len(groups),samples=len(raw['samples']),validation=raw['validation'],python_literal_checks=fixture['python_literal_checks'],observations=0,prior_snapshot=PRIOR,effective_prior_snapshot=metadata['effective_prior_snapshot'],new_snapshot=metadata['new_snapshot'],measurements=measurements,availability=raw['availability'],scope=raw['scope'],gpu_adapter=raw.get('gpu_adapter'),scope_observations='Parent owns canonical imports; this summary doesnot mutate catalogue.')
    (report/f'{host}-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({k:summary[k] for k in ['status','cells','samples','validation','observations']}),flush=True)

def serve(args):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def __init__(self,*a,**kw):super().__init__(*a,directory=str(args.report),**kw)
        def do_POST(self):
            if self.path!='/browser-results.json':self.send_error(404);return
            target=args.report/'browser-results.json'
            if target.exists():self.send_error(409);return
            n=int(self.headers.get('Content-Length',0))
            if not 0<n<100000000:self.send_error(413);return
            data=json.loads(self.rfile.read(n));target.write_text(json.dumps(data,indent=2)+'\n');self.send_response(200);self.end_headers();self.wfile.write(b'saved')
            if data.get('status')=='passed':summarise(args.report,'browser')
    print(f'Browser: http://127.0.0.1:{args.port}/browser.html',flush=True);http.server.ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--report',type=Path,default=REPORT);p.add_argument('--compiler',type=Path,default=ROOT.parent/'toolchain/ink-inline-web-proofs');p.add_argument('--old-compiler',type=Path,default=ROOT.parent/'toolchain/ink-direct-js-proofs');p.add_argument('--knowledge',type=Path,default=ROOT/'knowledge');p.add_argument('--prior-snapshot',type=Path,default=ROOT/f'knowledge/store/snapshots/{PRIOR}.json');p.add_argument('--zig',type=Path);p.add_argument('--cases',nargs='+',choices=CASES,default=CASES);p.add_argument('--sizes',nargs='+',type=int,default=[32,65536]);p.add_argument('--seed',type=int,default=20261105);p.add_argument('--seconds',type=float,default=.015);p.add_argument('--warmup',type=int,default=2);p.add_argument('--repeats',type=int,default=9);p.add_argument('--port',type=int,default=8818);p.add_argument('--cost-model',type=Path,default=REPORT/'cpu-cost-model.json');p.add_argument('--gpu-cost-model',type=Path,default=REPORT/'gpu-cost-model.json');p.add_argument('--input-preparation',type=Path,default=REPORT/'input-preparation')
    for name in ['prepare','node','validate','serve']:p.add_argument('--'+name,action='store_true')
    p.add_argument('--summarise',choices=['node','browser']);p.add_argument('--audit',choices=['node','browser']);args=p.parse_args()
    for name in ['report','compiler','old_compiler','knowledge','prior_snapshot','input_preparation','cost_model','gpu_cost_model']:setattr(args,name,getattr(args,name).resolve())
    if not 3<=args.repeats<=128 or not 1<=args.warmup<=10 or not 0<args.seconds<=1 or any(not 0<n<=100000 for n in args.sizes):p.error('invalid parameters')
    if args.prepare:
        args.zig=args.zig.resolve();prepare(args)
    if args.node:
        if (args.report/'node-results.json').exists():raise ValueError('archived results exist')
        print(run(['node',args.report/'node.mjs',args.report],[]));summarise(args.report,'node')
    if args.validate:print(run(['node',args.report/'node.mjs',args.report,'--validate'],[]))
    if args.audit:audit(args.report,args.audit);print('audit passed')
    if args.summarise:summarise(args.report,args.summarise)
    if args.serve:serve(args)
    if not any([args.prepare,args.node,args.validate,args.audit,args.summarise,args.serve]):p.error('choose action')
if __name__=='__main__':main()
