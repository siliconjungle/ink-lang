"""Replay original whole-action proofs and compose DB-owned protocol alternatives."""
import argparse,gzip,json,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('-o',type=Path,required=True);p.add_argument('--dense-capacity',type=int,default=4096);a=p.parse_args()
root=Path(__file__).resolve().parents[2];sys.path.insert(0,str(root/'knowledge'))
from producers.state_protocols import candidates
from ink_knowledge import canonical
compiler=a.compiler.resolve();d=a.o.resolve();d.mkdir(parents=True,exist_ok=True)
source=root/'reports/planner-reliability-2026-10-14/filtered-input.core.json'
packet=json.loads(gzip.decompress((root/'reports/action-specialization-2026-10-14/map-plan.json.gz').read_bytes()))
def write(name,value):path=d/name;path.write_bytes(canonical(value)+b'\n');return path
def run(*args):
 r=subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True)
 if r.returncode:raise ValueError(r.stderr)
 return json.loads(r.stdout)if r.stdout.startswith('{')else r.stdout
before=write('general.json',packet);receipt=run('check-plan',source,before,'--core');write('general.receipt.json',receipt)
run('emit-plan',source,before,'--core','--target','javascript','-o',d/'general.mjs')
context=receipt['state'];context.update(compiler=str(compiler),emit_target='javascript')
rows=list(candidates(context,capacities=()))
fused=next(r for r in rows if r['status']=='proposal'and r['label'].endswith('/fused-protocol'))
packet['steps'].append(fused['step']);path=write('kernel-map.json',packet)
receipt=run('check-plan',source,path,'--core');write('kernel-map.receipt.json',receipt)
run('emit-plan',source,path,'--core','--target','javascript','-o',d/'kernel-map.mjs')
context=receipt['state'];context.update(compiler=str(compiler),emit_target='javascript')
for row in candidates(context,capacities=(a.dense_capacity,)):
 if row['status']!='proposal'or '/columns/'not in row['label']:continue
 name='kernel-number'if row['step']['package']['columns'][0]['exact_numbers']else'kernel-word'
 plan=dict(packet);plan['steps']=[*packet['steps'],row['step']];path=write(name+'.json',plan)
 receipt=run('check-plan',source,path,'--core');write(name+'.receipt.json',receipt)
 run('emit-plan',source,path,'--core','--target','javascript','-o',d/(name+'.mjs'))
from producers.maintained_updates import guarded_word_update
import copy
guarded=copy.deepcopy(packet)
for step in guarded['steps']:
 if step['kind']=='maintained':step['package']=guarded_word_update(step['package'],d/'guarded-knowledge')
path=write('kernel-guarded.json',guarded);receipt=run('check-plan',source,path,'--core');write('kernel-guarded.receipt.json',receipt)
run('emit-plan',source,path,'--core','--target','javascript','-o',d/'kernel-guarded.mjs')
dense=copy.deepcopy(guarded);dense['steps'].insert(-1,dict(kind='physical',package=dict(schema=1,semantics='ink-physical-plan-v1',input_core_sha256=guarded['steps'][-1]['package']['input_core_sha256'],dense_prefixes=[dict(table=n,capacity=a.dense_capacity)for n in sorted({v['table']for s in guarded['steps']if s['kind']=='maintained'for v in s['package']['views']})])))
path=write('kernel-dense.json',dense);receipt=run('check-plan',source,path,'--core');write('kernel-dense.receipt.json',receipt)
run('emit-plan',source,path,'--core','--target','javascript','-o',d/'kernel-dense.mjs')
zero=copy.deepcopy(packet)
for step in zero['steps']:
 if step['kind']=='maintained':step['package']=guarded_word_update(step['package'],d/'zero-knowledge',zero=True)
path=write('kernel-zero.json',zero);receipt=run('check-plan',source,path,'--core');write('kernel-zero.receipt.json',receipt)
run('emit-plan',source,path,'--core','--target','javascript','-o',d/'kernel-zero.mjs')
zero['steps'].insert(-1,dense['steps'][-2]);path=write('kernel-zero-dense.json',zero);receipt=run('check-plan',source,path,'--core');write('kernel-zero-dense.receipt.json',receipt)
run('emit-plan',source,path,'--core','--target','javascript','-o',d/'kernel-zero-dense.mjs')
# Materialize original source and the compiler's lower-level protocol graph.
(d/'input.core.json').write_bytes(source.read_bytes())
run('emit-protocol-ir',source,'--core','-o',d/'protocol-ir.json')
