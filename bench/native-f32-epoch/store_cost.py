"""Compare old/new publication with identical immutable catalogue and operations."""
import cProfile,importlib,importlib.util,json,os,pstats,shutil,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store,entry,canonical,identity
WORK=ROOT/'build/native-f32-epoch';OUT=ROOT/'reports/native-f32-epoch-2026-10-13'
def old_class():
 spec=importlib.util.spec_from_file_location('ink_knowledge.cost_before_store',WORK/'before-store.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module.Store

def set_refresh_mode(mode):
 for name in ['template_index','pattern_index','family_evidence']:
  module=importlib.import_module('ink_knowledge.'+name)
  if not hasattr(module,'_after_refresh'):module._after_refresh=module.refresh
  if mode=='before':
   spec=importlib.util.spec_from_file_location('ink_knowledge.cost_before_'+name,WORK/('before-'+name.replace('_','-')+'.py'))
   old=importlib.util.module_from_spec(spec);spec.loader.exec_module(old);module.refresh=old.refresh
  else:module.refresh=module._after_refresh

def clone(source,destination,index=True):
 destination=Path(destination);(destination/'store').mkdir(parents=True,exist_ok=True)
 # Share only immutable transport inside this experiment's own workspace.
 # Membership pins/pointers, index and observations remain per-database.
 for directory in ['objects','trees']:
  target=destination/'store'/directory
  if not target.exists():target.symlink_to((source/'store'/directory).resolve(),target_is_directory=True)
 target=destination/'store/snapshots';target.mkdir(exist_ok=True)
 for file in (source/'store/snapshots').glob('*.json'):
  if not (target/file.name).exists():os.link(file,target/file.name)
 for name in ['snapshot.json','names.json']:shutil.copy2(source/'store'/name,destination/'store'/name)
 if index:shutil.copy2(source/'index.sqlite',destination/'index.sqlite')
 return destination

def setup():
 source=Store(ROOT/'knowledge');members=source.members();base=WORK/'catalogue';data=base/'store'
 for directory in ['objects','trees','snapshots']:(data/directory).mkdir(parents=True,exist_ok=True)
 for ident in members:
  target=data/'objects'/(ident+'.json')
  if not target.exists():os.link(source.data/'objects'/(ident+'.json'),target)
 seen=set()
 def tree(ident):
  if ident in seen:return
  seen.add(ident);file=source.data/'trees'/(ident+'.json');target=data/'trees'/file.name
  if not target.exists():os.link(file,target)
  node=json.loads(file.read_bytes())
  if 'left'in node:tree(node['left']);tree(node['right'])
 tree(source.snapshot['root'])
 for path in ['snapshot.json','snapshots/'+source.snapshot_id+'.json']:(data/path).write_bytes(canonical(source.snapshot)+b'\n')
 shutil.copy2(source.data/'names.json',data/'names.json')
 t=time.monotonic();Store(base).ensure_index();(OUT/'index-setup.json').write_text(json.dumps(dict(seconds=time.monotonic()-t,snapshot=source.snapshot_id,entries=len(members)),indent=2)+'\n')
 return base

def run():
 base=WORK/'catalogue'
 if not (base/'index.sqlite').exists():setup()
 rows=[]
 objects=[entry('definition','ink-cost-benchmark-v1',{'number':n})for n in range(20)]
 for repeat in range(4):
  for mode in (['before','after']if repeat%2==0 else ['after','before']):
   target=clone(base,WORK/'costs-final'/f'{repeat}-{mode}');set_refresh_mode(mode);cls=old_class()if mode=='before'else Store
   timings={};t=time.monotonic();store=cls(target);store=store.extend(objects);timings['extend']=time.monotonic()-t
   t=time.monotonic();store.ensure_index();timings['ensure_index']=time.monotonic()-t
   t=time.monotonic();view=store.bundle([identity(o)for o in objects]);timings['bundle']=time.monotonic()-t
   t=time.monotonic();store=store.extend(objects);store.ensure_index();timings['duplicate_publication']=time.monotonic()-t
   assert set(view['objects'])=={identity(o)for o in objects};rows.append(dict(repeat=repeat,mode=mode,seconds=timings,snapshot=store.snapshot_id,view_sha256=identity(view)))
   (OUT/'store-costs.json').write_text(json.dumps(rows,indent=2)+'\n');print(mode,repeat,timings,flush=True)
   # Disposable index only; preserve immutable evidence and the catalogue seed.
   (target/'index.sqlite').unlink()
 assert len({r['snapshot']for r in rows})==1 and len({r['view_sha256']for r in rows})==1
