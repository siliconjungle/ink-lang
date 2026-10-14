"""Replay original whole-action proofs and compose DB-owned protocol alternatives."""
import argparse,gzip,json,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
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
for row in candidates(context,capacities=(4096,)):
 if row['status']!='proposal'or '/columns/'not in row['label']:continue
 name='kernel-number'if row['step']['package']['columns'][0]['exact_numbers']else'kernel-word'
 plan=dict(packet);plan['steps']=[*packet['steps'],row['step']];path=write(name+'.json',plan)
 receipt=run('check-plan',source,path,'--core');write(name+'.receipt.json',receipt)
 run('emit-plan',source,path,'--core','--target','javascript','-o',d/(name+'.mjs'))
# Materialize original source and the compiler's lower-level protocol graph.
(d/'input.core.json').write_bytes(source.read_bytes())
run('emit-protocol-ir',source,'--core','-o',d/'protocol-ir.json')
