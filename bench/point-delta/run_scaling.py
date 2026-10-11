#!/usr/bin/env python3
"""Archive independent merged-main runs, exact inputs, binaries and host provenance."""
import argparse,datetime,hashlib,json,os,platform,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--point',type=Path,required=True);p.add_argument('--aggregate',type=Path,required=True);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
a=p.parse_args();root=Path(__file__).resolve().parents[2];out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
def command(*args):return subprocess.run(args,cwd=root,check=True,capture_output=True,text=True).stdout.strip()
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
head=command('git','rev-parse','HEAD');main=command('git','rev-parse','origin/main')
assert head==main,'benchmark must run at fetched merged main'
assert not command('git','status','--porcelain'),'benchmark checkout must be clean'
submodules=command('git','submodule','status');assert all(x[0]==' ' for x in submodules.splitlines()),submodules
paths=[root/'examples/point-query-delta.ink',root/'examples/filtered-aggregate.ink',root/'bench/point-delta/scaling.rs.txt',root/'bench/point-delta/aggregate.rs.txt']+list((root/'knowledge/research/point-delta').glob('*.json'))+list((root/'knowledge/research/filtered-aggregate').glob('*.json'))
meta=dict(schema=1,git_main=head,git_tree=command('git','rev-parse','HEAD^{tree}'),submodules=submodules.splitlines(),platform=platform.platform(),machine=platform.machine(),cpu_count=os.cpu_count(),rustc=command('rustc','-Vv'),cargo=command('cargo','-V'),node=command('node','--version'),clang=command('clang','--version'),binaries={k:dict(path=str(v.resolve()),sha256=digest(v.resolve()))for k,v in [('point',a.point),('aggregate',a.aggregate),('compiler',a.compiler)]},inputs={str(x.relative_to(root)):digest(x)for x in paths},runs=[],scope='Warm dependency build and driver compilation excluded from steady state. Proof checking/initialization/migrations are separately timed in each driver. No other benchmark process from this runner executes concurrently. Native precedes baseline and handwritten implementations inside a sample. Candidate and size order alternate across processes; host background load is recorded. No all-device speed guarantee.')
if platform.system()=='Darwin':meta['memory_bytes']=int(command('sysctl','-n','hw.memsize'));meta['cpu_model']=command('sysctl','-n','machdep.cpu.brand_string')
(out/'provenance.json').write_text(json.dumps(meta,indent=2)+'\n')
orders=['48,256,1024,2048,4000','4000,2048,1024,256,48','256,4000,48,2048,1024']
for process,rows in enumerate(orders):
    workloads=[('point',a.point),('aggregate',a.aggregate)] if process%2==0 else [('aggregate',a.aggregate),('point',a.point)]
    for name,binary in workloads:
        env=os.environ.copy();env['INK_BENCH_ROWS']=rows;env['PATH']='';env.pop('INK_BENCH_REVERSE',None)
        if process%2:env['INK_BENCH_REVERSE']='1'
        started=datetime.datetime.now(datetime.timezone.utc).isoformat();load_before=os.getloadavg();start=time.perf_counter_ns()
        result=subprocess.run([str(binary.resolve())],cwd=root,env=env,check=True,capture_output=True)
        json.loads(result.stdout);(out/f'{name}-{process}.json').write_bytes(result.stdout)
        meta['runs'].append(dict(workload=name,process=process,rows=rows,reverse_candidates=bool(process%2),started_utc=started,elapsed_ns=time.perf_counter_ns()-start,load_before=load_before,load_after=os.getloadavg()))
        (out/'provenance.json').write_text(json.dumps(meta,indent=2)+'\n')
        print(f'{name} process {process} complete ({rows})',flush=True)
