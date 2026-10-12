"""Freeze each compiler; grow reusable proof families and benchmark full calls."""
import argparse,hashlib,json,subprocess,time
from pathlib import Path
from author import selection
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--before',type=Path,required=True);p.add_argument('--lodash',type=Path,required=True);p.add_argument('--three',type=Path,required=True);p.add_argument('--fixture',type=Path);p.add_argument('--automatic',type=Path);p.add_argument('--output',type=Path,default=ROOT/'build/proof-growth-epoch3');a=p.parse_args()
out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);source=Path(__file__).with_name('corpus.ink').resolve();receipts={};builds={}
for count in [0,11,16]:receipts[str(count)]=selection(a.compiler.resolve(),source,out/('db'+str(count)),count)
for epoch,compiler in [('before',a.before.resolve()),('after',a.compiler.resolve())]:
 for count in [0,11,16]:
  lane=epoch+'-'+str(count);start=time.perf_counter()
  cmd=[str(compiler),'build',str(source),'--target','javascript','-o',str(out/(lane+'.mjs'))]
  if count:cmd+=['--selection',str(out/('db'+str(count))/'selection.json')]
  r=subprocess.run(cmd,capture_output=True,text=True,timeout=120);assert r.returncode==0,r.stderr
  builds[lane]=dict(seconds=time.perf_counter()-start,sha256=hashlib.sha256((out/(lane+'.mjs')).read_bytes()).hexdigest())
r=subprocess.run(['node','--expose-gc',str(Path(__file__).with_name('run.mjs')),str(out),str(a.lodash.resolve()),str(a.three.resolve()),*([str(a.automatic.resolve())]if a.automatic else []),*([str(a.fixture.resolve())]if a.fixture else [])],capture_output=True,text=True,timeout=1200);assert r.returncode==0,r.stderr
results=json.loads(r.stdout);results.update(compilers={k:hashlib.sha256(v.read_bytes()).hexdigest()for k,v in [('before',a.before),('after',a.compiler)]},source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),builds=builds,discovery={k:{x:v[x]for x in ['template_count','snapshot','generated_laws','seconds','rounds']}for k,v in receipts.items()})
(out/'execution.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(dict(results=str(out/'execution.json'))))
