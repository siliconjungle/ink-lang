"""Recreate the authentic pre-sharing boundary from pinned Git proof bytes."""
from pathlib import Path
import json,subprocess,hashlib,gzip,argparse
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.frozen_laws import index,load
from ink_planner.semantic_search import positions,match
p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('--scratch',type=Path,required=True);a=p.parse_args()
base=a.scratch;base.mkdir(parents=True,exist_ok=False);compiler=a.compiler.resolve();data=Path('knowledge/producers/data/v8-integer-laws')
revision='f53f223f008a15cbd620c3f62f1f34ecd84d50c9'
def historical(path):return subprocess.check_output(['git','-C','knowledge','show',revision+':'+path])
rows=json.loads(historical('producers/data/v8-integer-laws/index.json'))['rows']
def old_law(row):return json.loads(gzip.decompress(historical('producers/data/v8-integer-laws/'+row['sha256']+'.json.gz')))
source='module shared_witnesses;\nfn reduce(xs:List<u64>)->u64{return foldl(xs,0,fn(x)=>fn(a)=>a+quot_or(x,x,73)+rem_or(x,x,73)+rem_or(0,x,73));}\npub fn score(xs:List<u64>,cohort:u32)->u64{return reduce(xs)+word_widen_u32_to_u64(cohort);}\n'
(base/'source.ink').write_text(source)
def run(*args):return subprocess.run(list(map(str,[compiler,*args])),capture_output=True,text=True,timeout=120)
r=run('emit-core',base/'source.ink','-o',base/'core.json');assert not r.returncode,r.stderr
r=run('emit-semantic',base/'core.json','--core','-o',base/'subject.json');assert not r.returncode,r.stderr
subject=json.loads((base/'subject.json').read_bytes());names=['u64_quot_or_self','u64_rem_or_self','u64_rem_or_zero_numerator'];laws={row['name']:old_law(row)for row in rows if row['name']in names};objects={name:semantic_entry(law)for name,law in laws.items()};store=Store.publish(base/'inline-store',objects.values());applications=[]
for name,law in laws.items():
 for function,body in subject['functions'].items():
  for path,target in positions(body):
   arguments={}
   if match(law['from'],target,law['params'],arguments):applications.append(dict(function=function,path=list(path),law=identity(objects[name]),arguments=arguments,premises=[]))
assert len(applications)==3
selection=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=store.bundle([identity(o)for o in objects.values()]),applications=applications);raw=canonical(selection);(base/'inline.selection.json').write_bytes(raw);result=run('check-selection',base/'core.json',base/'inline.selection.json');(base/'inline.stdout').write_text(result.stdout);(base/'inline.stderr').write_text(result.stderr)
receipt=dict(schema=1,exit_status=result.returncode,reason=result.stderr.strip(),selection_bytes=len(raw),selection_sha256=hashlib.sha256(raw).hexdigest(),compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),source=subject['input_core_sha256'],entry_ids={n:identity(o)for n,o in objects.items()},scope='Authentic composed source-site selection; ordinary fixed limits. A rejection is a capability boundary, not comparable successful-check timing.')
(base/'boundary.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt),flush=True);assert result.returncode!=0 and 'size limit'in result.stderr
