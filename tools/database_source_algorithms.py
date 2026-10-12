"""End-to-end fixture authoring using the generic installed database producer."""
import argparse,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from ink_knowledge.source_algorithms import propose,publish
from producers.semantic_laws import value,var,op,term,law
from producers.capacity_plans import propose as capacities
import subprocess

def generate(compiler,directory):
 directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
 def invoke(*args):
  r=subprocess.run([str(compiler),*map(str,args)],text=True,capture_output=True);assert r.returncode==0,r.stderr
  return json.loads(r.stdout)if r.stdout.lstrip().startswith('{')else r.stdout
 core=directory/'core.json';source=ROOT/'tests/fixtures/database-source-algorithms.ink'
 receipt=invoke('emit-core',source,'-o',core);original=json.loads(core.read_bytes());sourceid=receipt['core_sha256']
 templates=json.loads((ROOT/'knowledge/libraries/source-algorithms.json').read_bytes());store=Store.publish(directory/'database',[],{})
 # Database growth under this same binary adds algorithm families.
 checkpoints=[]
 for group in [templates[:1],templates[1:]]:
  store=publish(store.root,group);context=dict(core=original,source=sourceid,compiler=str(compiler),knowledge_root=str(store.root),knowledge_snapshot=store.snapshot_id,candidate_limit=64)
  rows=list(propose(context));accepted=[]
  for row in rows:
   if row['status']!='proposal':continue
   packet=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=sourceid,steps=row['steps']);path=directory/'candidate.json';path.write_bytes(canonical(packet))
   result=invoke('check-plan',core,path,'--core');accepted.append(row['steps'][-1]['package']['applications'][0]['function'])
  checkpoints.append(dict(snapshot=store.snapshot_id,templates=len(Store(store.root).query(kind='definition',semantics='ink-source-algorithm-v1',limit=64)),applicable_functions=sorted(set(accepted))))
 context.update(knowledge_snapshot=store.snapshot_id);steps=[];seen=set();extensions=0
 while True:
  candidate=next((r for r in propose(context)if r['status']=='proposal'and r['steps'][-1]['package']['applications'][0]['function']not in seen),None)
  if candidate is None:break
  seen.add(candidate['steps'][-1]['package']['applications'][0]['function']);extensions+=sum(s['kind']=='extension'for s in candidate['steps']);steps+=candidate['steps']
  packet=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=sourceid,steps=steps);path=directory/'plan.json';path.write_bytes(canonical(packet));checked=invoke('check-plan',core,path,'--core');context.update(checked['state'])
 assert len(seen)==7,(seen,checkpoints)
 # Exact Int concat cardinality policy lives in knowledge, not a compiler case.
 s=value({'List':'U32'});xs=var(s,'xs');ys=var(s,'ys');b=value('Bool');count=lambda x:op(value('Int'),'call:count',x);bound=op(value('Int'),'binary:+',count(xs),count(ys))
 from producers.allocation_laws import examples
 theorem=examples()['allocation/concat-capacity-u32']
 obj=semantic_entry(theorem);ident=identity(obj);store=store.extend([obj],{'refinements/concat-capacity-u32':ident})
 fact=dict(function='concatenate',subject_variable='subject',context=op(b,'binary:<=',count(var(s,'subject')),bound),value=term(b,{'Bool':True}),proof={'Use':dict(law=ident,arguments=dict(xs=xs,ys=ys),premises=[])})
 evidence=dict(schema=1,semantics='ink-source-properties-v1',input_core_sha256=context['source'],knowledge=store.bundle([ident]),facts=[fact]);context['properties']=[evidence]
 physical=next(capacities(context))['step'];steps.append(physical)
 packet['steps']=steps;path.write_bytes(canonical(packet));invoke('check-plan',core,path,'--core')
 report=dict(checkpoints=checkpoints,transformed_functions=sorted(seen),extension_steps=extensions,reservation=physical['package']['reservations'][0]['capacity']);(directory/'report.json').write_bytes(canonical(report))
 return report
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--compiler',required=True);parser.add_argument('--root',required=True);args=parser.parse_args();print(json.dumps(generate(args.compiler,args.root)))
