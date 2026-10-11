#!/usr/bin/env python3
"""Record ordinary compiled execution at an exact clean merged-main graph."""
import argparse,datetime,hashlib,json,os,platform,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--binary',type=Path,required=True);p.add_argument('--output',type=Path,required=True)
a=p.parse_args();root=Path(__file__).resolve().parents[2];out=a.output.resolve()
def command(*args):return subprocess.run(args,cwd=root,check=True,capture_output=True,text=True).stdout.rstrip()
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
head=command('git','rev-parse','HEAD');assert head==command('git','rev-parse','origin/main'),'benchmark must run at fetched merged main'
assert not command('git','status','--porcelain'),'benchmark checkout must be clean'
submodules=command('git','submodule','status');assert all(x[0]==' 'for x in submodules.splitlines()),submodules
paths=[root/'examples/filtered-aggregate.ink',root/'bench/point-delta/standalone-aggregate.rs.txt',root/'tests/point_delta.rs',root/'src/representations.rs']+list((root/'knowledge/research/filtered-aggregate').glob('*.json'))
meta=dict(schema=2,git_main=head,git_tree=command('git','rev-parse','HEAD^{tree}'),submodules=submodules.splitlines(),platform=platform.platform(),cpu_count=os.cpu_count(),rustc=command('rustc','-Vv'),cargo=command('cargo','-V'),binary=dict(path=str(a.binary.resolve()),sha256=digest(a.binary.resolve())),generated_source_sha256=digest(a.binary.resolve().parents[2]/'src/main.rs'),inputs={str(x.relative_to(root)):digest(x)for x in paths},runs=[],scope='Ordinary compiled variants. Harness source baseline linked only for comparison/setup; production functions have no Ink runtime/checker calls. Five samples of 100 complete calls per case per process; proof checking, compilation, initialization, migration and checkpoint comparison outside steady state. Native/baseline/scanner/maintained order fixed inside samples; size/candidate outer order rotated; shared host load recorded.')
if platform.system()=='Darwin':meta['memory_bytes']=int(command('sysctl','-n','hw.memsize'));meta['cpu_model']=command('sysctl','-n','machdep.cpu.brand_string')
out.mkdir(parents=True,exist_ok=True)
for process,rows in enumerate(['48,256,1024,2048,4000','4000,2048,1024,256,48','256,4000,48,2048,1024']):
 env=os.environ.copy();env['INK_BENCH_ROWS']=rows;env['PATH']='';env.pop('INK_BENCH_REVERSE',None)
 if process%2:env['INK_BENCH_REVERSE']='1'
 start=time.perf_counter_ns();started=datetime.datetime.now(datetime.timezone.utc).isoformat();before=os.getloadavg()
 result=subprocess.run([str(a.binary.resolve())],cwd=root,env=env,check=True,capture_output=True)
 json.loads(result.stdout);(out/f'aggregate-{process}.json').write_bytes(result.stdout)
 meta['runs'].append(dict(process=process,rows=rows,reverse_candidates=bool(process%2),started_utc=started,elapsed_ns=time.perf_counter_ns()-start,load_before=before,load_after=os.getloadavg()))
 (out/'provenance.json').write_text(json.dumps(meta,indent=2)+'\n')
 print(f'compiled aggregate process {process} complete ({rows})',flush=True)
