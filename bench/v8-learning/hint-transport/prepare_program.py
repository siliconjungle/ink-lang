import json,subprocess
from pathlib import Path
from ink_knowledge import Store,semantic_entry,identity,canonical
from ink_planner.semantic_search import positions,match
root=Path.cwd();base=root/'build/v8-proof-transport';out=base/'program';out.mkdir(exist_ok=True);compiler=base/'frozen/ink-final'
source=(root/'bench/v8-learning/integer-division/source.ink').read_text();assert source.count('quot_or(x,8,73)')==1;source=source.replace('quot_or(x,8,73)','quot_or(x,x,73)').replace('module integer_measure;','module self_quotient_measure;');(out/'source.ink').write_text(source)
def run(*args):return subprocess.check_output(list(map(str,[compiler,*args])),text=True)
run('emit-core',out/'source.ink','-o',out/'core.json');run('emit-semantic',out/'core.json','--core','-o',out/'subject.json');subject=json.loads((out/'subject.json').read_bytes());law=json.loads((base/'packed.law.json').read_bytes());entry=semantic_entry(law);store=Store.publish(out/'knowledge',[entry]);applications=[]
for function,body in subject['functions'].items():
 for path,target in positions(body):
  arguments={}
  if match(law['from'],target,law['params'],arguments):applications.append(dict(function=function,path=list(path),law=identity(entry),arguments=arguments,premises=[]))
assert len(applications)==1
selection=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=store.bundle([identity(entry)]),applications=applications)
(out/'selection.json').write_bytes(canonical(selection));run('check-selection',out/'core.json',out/'selection.json')
old=json.loads((root/'bench/v8-learning/integer-division/javascript/baseline.plan.json').read_bytes());old['input_core_sha256']=subject['input_core_sha256'];(out/'baseline.plan.json').write_bytes(canonical(old));alternate=dict(old,steps=[{'kind':'rewrite','package':selection}]);(out/'searched.plan.json').write_bytes(canonical(alternate));run('check-plan',out/'core.json',out/'searched.plan.json','--core')
# Reuse the preceding selected complete-call dataset protocol, with different
# value sequences/cohort/lengths between training and holdout.
import tarfile
with tarfile.open(root/'bench/v8-learning/device-calibration/selected-inputs.tar.gz')as archive:
 for name in ['training.json','holdout.json']:(out/name).write_bytes(archive.extractfile(name).read())
(out/'storage-retention.json').write_text(json.dumps(dict(schema=1,keep=[dict(path='.',reason='Active selected source, checked plan, immutable proof and normalized-disjoint call inputs for required compiled runtime controls.')],safe_to_remove=[]),indent=2)+'\n')
print('Prepared checked U64 self-quotient original/rewrite plans:',subject['input_core_sha256'])
