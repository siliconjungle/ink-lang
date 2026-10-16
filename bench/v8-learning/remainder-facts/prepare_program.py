from pathlib import Path
import json,subprocess,tarfile
from ink_knowledge import Store,canonical,semantic_entry,identity
from ink_planner.semantic_search import positions,match
from producers.frozen_laws import index,load
base=Path('build/v8-remainder-acquisition');out=base/'program';out.mkdir(exist_ok=False);compiler=Path('build/v8-proof-transport/frozen/ink-integrated').resolve()
(out/'source.ink').write_text('module remainder_call_control;\nfn reduce(xs:List<u64>)->u64{return foldl(xs,0,fn(x)=>fn(a)=>a+rem_or(x,x,73)+rem_or(0,x,73));}\npub fn score(xs:List<u64>,cohort:u32)->u64{return reduce(xs)+word_widen_u32_to_u64(cohort);}\n')
def run(*args):return subprocess.check_output(list(map(str,[compiler,*args])),text=True)
run('emit-core',out/'source.ink','-o',out/'core.json');run('emit-semantic',out/'core.json','--core','-o',out/'subject.json');subject=json.loads((out/'subject.json').read_bytes());data=Path('knowledge/producers/data/v8-integer-laws');laws=[load(data,r)for r in index(data)if r['name']in ['u64_rem_or_self','u64_rem_or_zero_numerator']];objects=[semantic_entry(law)for law in laws];store=Store.publish(out/'knowledge',objects);applications=[]
for law,obj in zip(laws,objects):
 for function,body in subject['functions'].items():
  for path,target in positions(body):
   arguments={}
   if match(law['from'],target,law['params'],arguments):applications.append(dict(function=function,path=list(path),law=identity(obj),arguments=arguments,premises=[]))
assert len(applications)==2
selection=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=store.bundle([identity(o)for o in objects]),applications=applications);(out/'selection.json').write_bytes(canonical(selection));run('check-selection',out/'core.json',out/'selection.json')
with tarfile.open('bench/v8-learning/hint-transport/selected-inputs.tar.gz')as archive:
 old=json.loads(archive.extractfile('program/baseline.plan.json').read());old['input_core_sha256']=subject['input_core_sha256'];(out/'baseline.plan.json').write_bytes(canonical(old));alternate=dict(old,steps=[dict(kind='rewrite',package=selection)]);(out/'searched.plan.json').write_bytes(canonical(alternate));run('check-plan',out/'core.json',out/'searched.plan.json','--core')
 for name in ['training.json','holdout.json']:
  workload=json.loads(archive.extractfile('program/'+name).read());workload['workload']['shape']['domain']='U64 self and zero-numerator remainder fold with observed cohort';(out/name).write_text(json.dumps(workload,indent=2)+'\n')
print('Prepared two checked self-contained remainder laws:',subject['input_core_sha256'])
