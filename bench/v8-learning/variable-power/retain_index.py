from pathlib import Path
import gzip,hashlib,json,subprocess,tarfile
b=Path('build/v8-variable-power-cases');here=Path('bench/v8-learning/variable-power');profile=b/'search-profile';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();rows={group:{mode:[json.loads((profile/(prefix+mode+'-'+str(i)+'.json')).read_bytes())for i in range(3)]for mode in ['legacy','indexed']}for group,prefix in [('initial-cache','binding-'),('selected-fixture','fixture-')]}
for group in rows.values():
 assert len({r['bindings']for v in group.values()for r in v})==1
 for mode,v in group.items():assert all(r['body_reads']==(180 if mode=='legacy'else 0)for r in v)
(here/'binding-controls.json').write_text(json.dumps(dict(schema=1,controls=rows,preparation=json.loads((profile/'binding-preparation.json').read_bytes()),installed_preparation=json.loads((b/'index-preparation.json').read_bytes()),scope='Three fresh Python processes per arm; exact same180 binding values; complete metadata lookup, no heap metric. Original full-cache controls precede a selected minimal relational fixture whose timings retain their own labels. Index preparation is explicit extra work. No whole-planner/application speed or proof-admission claim.'),indent=2)+'\n')
assert b'\nOK\n'in(b/'index-regressions-final.log').read_bytes();(here/'index-regressions.log.gz').write_bytes(gzip.compress((b/'index-regressions-final.log').read_bytes(),mtime=0))
paths=['knowledge/ink_knowledge/store.py','knowledge/ink_knowledge/published_bindings.py','knowledge/producers/planning_recipes.py','knowledge/tests/test_published_bindings.py'];head='b4021e84c1645207965e22b0ca8f8c6d889ececa';pins=dict(schema=1,knowledge_source=head,knowledge_runtime_control='bc39af9624fdcc6450b53e4269aea2a3defd7ba9',compiler_sha256=sha(Path('build/v8-proof-dependencies-final-cli/frozen/ink-integrated')),inputs={p:hashlib.sha256(subprocess.check_output(['git','-C','knowledge','show',head+':'+p.removeprefix('knowledge/')])).hexdigest()for p in paths},regression_methods=64,regression_seconds='25.095',regression_log_sha256=sha(b/'index-regressions-final.log'),fixture_sha256=sha(here/'binding-fixture.sqlite.gz'),scope='Disposable metadata generation/query and canonical consumer type guard only. No core/backend/source/proof/budget change. Runtime controls retain the earlier knowledge context; no costs relabelled.')
(here/'index-source-pins.json').write_text(json.dumps(pins,indent=2)+'\n');files={}
for name in ['probe.log','binding-probe.log','ablation.log','ablation-terminal.json','post-index.log','binding-preparation.json']:
 files['search-profile/'+name]=profile/name
for name in ['wide-final-cli','compact-final-cli','compact-previous-cli','indexed-final-cli']:
 for leaf in ['plan.json','plan.json.receipt.json','stdout','stderr']:
  files['search-profile/'+name+'/'+leaf]=profile/name/leaf
 if name=='indexed-final-cli':files['search-profile/'+name+'/terminal.json']=profile/name/'terminal.json'
for mode in ['legacy','indexed']:
 for i in range(3):
  for prefix in ['binding-','fixture-']:
   name=prefix+mode+'-'+str(i)+'.json';files['search-profile/'+name]=profile/name
files['index-preparation.json']=b/'index-preparation.json';files['input.core.json']=b/'corpus/inputs/44dc64a74456ff85189fc9d8969a5d23ca8b1fdfc43db8a28b18656980a840b3.core.json'
index={n:dict(bytes=p.stat().st_size,sha256=sha(p))for n,p in sorted(files.items())}
with tarfile.open(here/'index-controls.tar.gz','w:gz',compresslevel=9)as a:
 for name,p in sorted(files.items()):a.add(p,arcname=name,recursive=False)
(here/'index-controls-index.json').write_text(json.dumps(dict(schema=1,archive_sha256=sha(here/'index-controls.tar.gz'),files=index),indent=2)+'\n');print('Retained',len(files),'index/control inputs')
