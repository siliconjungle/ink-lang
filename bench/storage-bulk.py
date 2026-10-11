#!/usr/bin/env python3
"""Emit literal candidates, measure complete public calls, save comparable observations."""
import hashlib,json,os,platform,statistics,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'knowledge'));sys.path.insert(0,str(ROOT/'planner'))
from ink_knowledge import Store
from ink_planner.representation_selection import rank,phase_workload
BUILD=ROOT/'build/storage-bulk-bench';OUT=ROOT/'reports/storage-bulk-incremental';COMPILER=ROOT/'target/debug/ink'
def run(args):
    start=time.perf_counter_ns();r=subprocess.run(list(map(str,args)),cwd=ROOT,capture_output=True,text=True)
    if r.returncode:raise RuntimeError(r.stderr[-5000:])
    return r.stdout,time.perf_counter_ns()-start
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    BUILD.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True);store=Store(ROOT/'knowledge');rows=[];lifecycle=[];hashes={};requests={};outputs={}
    target_base=dict(hardware=platform.platform(),driver='host',toolchain='Node '+run(['node','--version'])[0].strip()+'; '+run(['rustc','--version'])[0].strip(),bridge='public invoke_json')
    groups=[('table',['direct','packed-2','packed-4','indexed-4-hot-1023']),('boolean',['boolean-direct','any-delta','all-delta'])]
    for group,labels in groups:
        source=ROOT/'knowledge/research/storage-bulk'/('booleans.ink' if group=='boolean' else 'app.ink');js=[]
        for label in labels:
            request=ROOT/'knowledge/research/storage-bulk'/(label+'.json');requests[label]=json.loads(request.read_text());hashes[label]=sha(request)
            _,check_ns=run([COMPILER,'check-representation',source,request]);lifecycle.append(dict(label=label,phase='check',ns=check_ns))
            for backend in ['javascript','rust-wasm']:
                project=BUILD/label/backend;project.mkdir(parents=True,exist_ok=True);output=project/'program.mjs' if backend=='javascript' else project;_,emit_ns=run([COMPILER,'emit-representation',source,request,'--target',backend,'-o',output]);lifecycle.append(dict(label=label,phase='proof-check-and-emit:'+backend,ns=emit_ns))
                generated=project/('program.mjs' if backend=='javascript' else 'src/lib.rs');outputs[str(generated.relative_to(ROOT))]=sha(generated)
                if backend=='javascript':js.append([label,str(generated)]);continue
                (project/'src/bin').mkdir(exist_ok=True);(project/'src/bin/storage_bench.rs').write_bytes((ROOT/'bench/storage-bulk-runner.rs.txt').read_bytes())
                _,build_ns=run(['cargo','build','--release','--offline','--manifest-path',project/'Cargo.toml','--target-dir',BUILD/'native-target','--bin','storage_bench']);lifecycle.append(dict(label=label,phase='native-build',ns=build_ns))
                raw,_=run([BUILD/'native-target/release/storage_bench',group]);rows.extend(dict(json.loads(line),label=label,backend='rust-native',group=group) for line in raw.splitlines())
            outputs[str((project/'Cargo.lock').relative_to(ROOT))]=sha(project/'Cargo.lock')
        raw,_=run(['node',ROOT/'bench/storage-bulk.mjs',json.dumps(js),group]);rows.extend(dict(json.loads(line),backend='javascript',group=group) for line in raw.splitlines())
    decisions=[]
    for row in rows:
        request=requests[row['label']];target=dict(target_base,backend=row['backend']);workload=dict(shape={'rows':row['rows'],'group':row['group']},distribution='ascending distinct keys, hot query 1023; all Boolean rows initially true',concurrency=1,residency='host')
        store.observe(dict(schema=1,program=request['input_core_sha256'],entries=[request['representation']],plan=hashes[row['label']],target=target,workload=phase_workload(workload,row['phase']),metrics=dict(complete_call_ns=list(map(str,row['samples_ns'])),peak_bytes=None)))
        row['median_ns']=statistics.median(row['samples_ns'])
    for group,labels in groups:
        for backend in ['javascript','rust-native']:
            for n in [16,128,1024]:
                profiles=({'reads':{'action:get-hot':10000,'action:put':1,'action:erase':1},'writes':{'action:get-hot':1,'action:put':10000,'action:erase':1}} if group=='table' else {'any-reads':{'action:any_query':10000,'action:insert':1,'action:replace':1,'action:erase':1},'all-reads':{'action:all_query':10000,'action:insert':1,'action:replace':1,'action:erase':1},'writes':{'action:any_query':1,'action:insert':10000,'action:replace':1,'action:erase':1}})
                for name,profile in profiles.items():
                    target=dict(target_base,backend=backend);workload=dict(shape={'rows':n,'group':group},distribution='ascending distinct keys, hot query 1023; all Boolean rows initially true',concurrency=1,residency='host')
                    selected,costs=rank(store,requests[labels[0]]['input_core_sha256'],[hashes[l] for l in labels],target,workload,profile,hashes[labels[0]])
                    decisions.append(dict(group=group,backend=backend,rows=n,profile=name,selected=next(l for l in labels if hashes[l]==selected),costs=costs))
    (OUT/'runtime.json').write_text(json.dumps(dict(schema=1,scope='steady-state public complete calls; initialisation, proof checking, emission and build excluded and recorded separately; memory unmeasured; one machine',target=target_base,compiler_sha256=sha(COMPILER),snapshot=store.snapshot_id,request_sha256=hashes,generated_sha256=outputs,rows=rows,lifecycle=lifecycle,decisions=decisions),indent=2)+'\n')
    print(json.dumps(dict(report=str(OUT/'runtime.json'),rows=len(rows),decisions=len(decisions))))
if __name__=='__main__':main()
