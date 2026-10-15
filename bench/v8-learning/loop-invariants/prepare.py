"""Prepare a checked whole-call control; no automatic-selection claim."""
import importlib.util,json,os,subprocess,hashlib
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definition_context28 import bind
root=Path(__file__).resolve().parents[3];d=Path(__file__).resolve().parent
compiler=Path(os.environ.get('INK_COMPILER',root/'target/debug/ink')).resolve()
spec=importlib.util.spec_from_file_location('frozen_invariants',d/'frozen-producer.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def invoke(*args):
 r=subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True,timeout=120)
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout
invoke('emit-core',d/'source.ink','-o',d/'core.json');invoke('emit-semantic',d/'core.json','--core','-o',d/'semantic.json')
model=json.loads((d/'core.json').read_bytes());subject=json.loads((d/'semantic.json').read_bytes())
name,raw=m.specialize(subject,model)[0];assert name.startswith('hoist/run/')
law=bind(raw,model,subject);obj=semantic_entry(law);store=Store.publish(d/'knowledge',[obj])
packet=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=store.bundle([identity(obj)]),applications=[dict(function='run',path=[],law=identity(obj),arguments={n:dict(sort=s,node={'Free':n})for n,s in law['params'].items()},premises=[])])
(d/'selection.json').write_bytes(canonical(packet));invoke('check-selection',d/'core.json',d/'selection.json')
for lane in ('baseline','hoisted'):
 invoke('build',d/'source.ink','--target','javascript','-o',d/(lane+'.mjs'),*(['--selection',d/'selection.json']if lane=='hoisted'else []))
for split,seed,shapes in [('training',7193,[(32,128),(128,256),(256,512)]),('holdout',8371,[(37,193),(193,383),(383,769)])]:
 rows=[]
 for n,k in [(0,shapes[-1][1]),*shapes]:
  xs=[(i*seed+11)&0xffffffff for i in range(n)];ys=[(i*(seed+17)+3)&0xffffffff for i in range(k)];args=[xs,ys]
  # Independent closed-form oracle for this wrapping-word source, checked
  # against actual source execution below (not a proof premise).
  expected=(sum(xs)*sum(y*y for y in ys))&0xffffffff
  p=d/'reference-args.json';p.write_text(json.dumps(args))
  reference=json.loads(invoke('run',d/'source.ink','run',p));assert reference==expected,(reference,expected)
  rows.append(dict(function='run',args=args,expected=reference))
 request=dict(artifacts=[dict(path=str((d/(lane+'.mjs')).resolve()),measurement=lane)for lane in ('baseline','hoisted')],phases={split:rows[1:],split+'-empty':rows[:1]},measurement=dict(rounds=11,minimum_batch_ms=5,maximum_calls_per_sample=1024))
 (d/(split+'-request.json')).write_text(json.dumps(request)+'\n')
(d/'reference-args.json').unlink()
print(json.dumps(dict(law=identity(obj),compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),oracle='source interpreter and independent wrapping-word formula agree')))
