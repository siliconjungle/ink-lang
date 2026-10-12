"""Ordinary offline measured planner, separately from conformance selections."""
import argparse,json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store
from producers.pipeline_templates import publish
p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--output',type=Path,default=ROOT/'build/proof-growth-epoch3/automatic');a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
lines=Path(__file__).with_name('corpus.ink').read_text().splitlines();results=[]
for name in ['mapped_left','checksum','first_label']:
 out=a.output/name;out.mkdir(parents=True,exist_ok=True);source=out/'source.ink';source.write_text('\n'.join(l for l in lines if not l.startswith('pub fn')or l.startswith('pub fn '+name+'('))+'\n')
 rows=[dict(key=(i*167+91)%512,flag=i%7==0,label='node-'+str(i),weight=(i%31-15)/8)for i in range(1024)]
 args=[rows]if name=='checksum'else[rows,16]
 workload=dict(schema=1,phases={'selection':[dict(function=name,args=args)]},profile={'selection':1},workload=dict(shape={'records':1024},distribution='periodic selection; independently varied evaluation inputs',concurrency=1,residency='host-immutable-trusted-values-complete-result'))
 calls=out/'calls.json';calls.write_text(json.dumps(workload));db=out/'database';Store.publish(db,[],{});publish(db).ensure_index()
 cmd=[sys.executable,'-m','ink_planner.compiled_planning','--compiler',str(a.compiler.resolve()),'--source',str(source.resolve()),'--knowledge-root',str(db.resolve()),'--target','javascript','--budget','512','--state-limit','32','--time-seconds','45','--semantic-budget','512','--proposal-timeout','120','--measure-workload',str(calls.resolve()),'--emit',str((out/'selected.mjs').resolve()),'-o',str((out/'plan.json').resolve())]
 start=time.perf_counter();r=subprocess.run(cmd,capture_output=True,text=True,timeout=600,env=dict(os.environ,PYTHONPATH=os.pathsep.join([str(ROOT/'knowledge'),str(ROOT/'planner')])));elapsed=time.perf_counter()-start
 (out/'stdout.json').write_text(r.stdout);(out/'stderr.log').write_text(r.stderr)
 results.append(dict(name=name,returncode=r.returncode,complete_seconds=elapsed,receipt=json.loads(r.stdout)if r.stdout.lstrip().startswith('{')else r.stdout))
 if r.returncode:raise ValueError(r.stderr)
(a.output/'results.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results))
