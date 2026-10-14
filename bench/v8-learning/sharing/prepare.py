"""Reproduce checked complete-call sharing measurement inputs and modules."""
import importlib.util,json,os,subprocess,sys
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definition_context28 import bind
root=Path(__file__).resolve().parents[3];d=Path(__file__).resolve().parent
compiler=Path(os.environ.get('INK_COMPILER',root/'target/debug/ink')).resolve()
# Frozen measurement input; ongoing database evolution does not change this baseline.
spec=importlib.util.spec_from_file_location('frozen_sharing',d/'frozen-producer.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);specialize=m.specialize

def invoke(*args):return subprocess.run([str(compiler),*map(str,args)],check=True,capture_output=True,text=True).stdout
invoke('emit-core',d/'source.ink','-o',d/'core.json');invoke('emit-semantic',d/'core.json','--core','-o',d/'semantic.json')
model=json.loads((d/'core.json').read_bytes());subject=json.loads((d/'semantic.json').read_bytes())
name,raw=next((n,l)for n,l in specialize(subject,model)if n.startswith('share/run/'))
law=bind(raw,model,subject);obj=semantic_entry(law);store=Store.publish(d/'knowledge',[obj])
packet=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=store.bundle([identity(obj)]),applications=[dict(function='run',path=[],law=identity(obj),arguments={n:dict(sort=s,node={'Free':n})for n,s in law['params'].items()},premises=[])])
(d/'selection.json').write_bytes(canonical(packet));invoke('check-selection',d/'core.json',d/'selection.json')
for lane in ('baseline','shared'):
 invoke('build',d/'source.ink','--target','javascript','-o',d/(lane+'.mjs'),*(['--selection',d/'selection.json']if lane=='shared'else []))
for phase,seed in [('training',7193),('holdout',8371)]:
 rows=[]
 for size in (256,2048,8192):
  xs=[(i*seed+11)&0xffffffff for i in range(size)];args=[xs];p=d/'reference-args.json';p.write_text(json.dumps(args));expected=json.loads(invoke('run',d/'source.ink','run',p))
  rows.append(dict(function='run',args=args,expected=expected))
 request=dict(artifacts=[dict(path=str((d/(lane+'.mjs')).resolve()),measurement=lane)for lane in ('baseline','shared')],phases={phase:rows},measurement=dict(rounds=13,minimum_batch_ms=10,maximum_calls_per_sample=1024))
 (d/(phase+'-request.json')).write_text(json.dumps(request)+'\n')
(d/'reference-args.json').unlink()
print('Checked sharing law, baseline/selected modules and disjoint workload packets prepared')
