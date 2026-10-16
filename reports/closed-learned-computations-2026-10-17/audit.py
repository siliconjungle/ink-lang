#!/usr/bin/env python3
"""Audit retained bytes, paired histories and optional ordinary artifact checks."""
import argparse,hashlib,json,subprocess,tarfile,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent
h=lambda data:hashlib.sha256(data).hexdigest()
def audit(ink=None):
 metadata=json.loads((ROOT/'metadata.json').read_bytes())
 files={str(p.relative_to(ROOT)):h(p.read_bytes())for p in ROOT.rglob('*')
     if p.is_file() and p!=ROOT/'metadata.json' and '__pycache__'not in p.parts}
 assert files==metadata['files'],'report file inventory or hash mismatch'
 image=json.loads((ROOT/'compiler-image.json').read_bytes())
 assert image['status']=='passed' and image['private_checkout'] and image['private_target']
 assert sum(len(files)for files in image['images'].values())==22
 assert h((ROOT/'compiler-image.log').read_bytes())==image['log_sha256']
 modules={};inventories={}
 for label in ['baseline','previous','selected']:
  with tempfile.TemporaryDirectory()as temporary:
   with tarfile.open(ROOT/(label+'-artifact.tar.gz'))as archive:archive.extractall(temporary,filter='data')
   folder=Path(temporary)/'artifact';manifest=json.loads((folder/'artifact.json').read_bytes())
   files={str(p.relative_to(folder)):{'bytes':p.stat().st_size,'sha256':h(p.read_bytes())}
      for p in folder.rglob('*')if p.is_file() and p.name!='artifact.json'}
   assert files==manifest['files']
   for name,expected in image['images'].get(label,{}).items():assert h((folder/name).read_bytes())==expected,(label,name)
   descriptor=json.loads((folder/'program.mjs.plan.json').read_bytes())
   if label=='selected':
    selection=(folder/'selection.json').read_bytes()
    assert descriptor['specialization_package']==dict(schema=1,semantics='ink-trained-proof-reference-v1',path='selection.json',sha256=h(selection))
    assert 'compiled_plan'not in descriptor and 'semantic_package'not in descriptor
   if ink:subprocess.run([str(ink),'verify-model',str(folder)],check=True,capture_output=True)
   modules[label]=h((folder/'program.mjs.source.mjs').read_bytes());inventories[label]=sum(v['bytes']for v in files.values())
 groups={}
 for group in sorted((ROOT/'measurements').iterdir()):
  records=[json.loads(p.read_bytes())for p in sorted(group.glob('pair-*.json'))]
  assert len(records)==6,(group.name,len(records))
  for row in records:
   assert row['completeChecksumsAndCheckpointsAgree']
   for phase in row['results']['baseline']['phases']:
    a=row['results']['baseline']['phases'][phase];b=row['results']['selected']['phases'][phase]
    assert a['checksums']==b['checksums'] and a['checkpoint']==b['checkpoint']
    assert len(a['nsPerRequest'])==len(b['nsPerRequest'])==5
   controls={'pairs':('baseline','selected'),'long-pairs':('baseline','selected'),
       'final-long-pairs':('baseline','selected'),'previous-long-pairs':('baseline','previous'),
       'final-short-pairs':('baseline','selected'),'isolated-pairs':('baseline','selected'),
       'isolated-previous-pairs':('baseline','previous'),
       'node25-baseline-pairs':('baseline','selected'),'node25-previous-pairs':('previous','selected')}
   baseline,selected=controls[group.name]
   assert row['images']['baseline']['sourceModule']==modules[baseline]
   assert row['images']['selected']['sourceModule']==modules[selected]
  groups[group.name]=len(records)
 corpus=ROOT/'corpus'
 context=json.loads((corpus/'context.json').read_bytes())
 terminal=json.loads((corpus/'terminal.json').read_bytes())
 report=json.loads((corpus/'report.json').read_bytes())
 records=json.loads((corpus/'records.json').read_bytes())
 compiler=json.loads((ROOT/'committed-compiler.json').read_bytes())
 assert terminal['status']=='completed' and terminal['exit_code']==0
 assert terminal['compiler_sha256']==context['compiler_sha256']==compiler['sha256']
 assert compiler['source']==image['source']
 assert report['context']==context
 expected=set(context['corpus_inputs'])
 assert len(expected)==len(records)==len(report['programs'])==10
 assert {r['name']for r in records}=={r['name']for r in report['programs']}==expected
 assert all(r['status']==0 for r in records+report['programs'])
 assert report['headline']['programs']==report['headline']['compiled']==10
 assert report['headline']['programs_selecting_alternative']==sum(p['selected_alternative']for p in report['programs'])
 for record in records:
  name=record['name'];binding=context['corpus_inputs'][name]
  assert binding['core_sha256']==record['core_sha256']
  for key,suffix in [('core_sha256','.core.json'),('capture_sha256','.sources.json')]:
   assert h((corpus/'inputs'/(binding[key]+suffix)).read_bytes())==binding[key]
  if ink:subprocess.run([str(ink),'check-plan',str(corpus/'inputs'/(binding['core_sha256']+'.core.json')),
      str(corpus/'plans'/(name+'.json')),'--core'],check=True,capture_output=True)
 return dict(status='passed',images=22,artifact_inventory_bytes=inventories,measurement_groups=groups,corpus=report['headline'],
  scope='Retained file integrity and paired checksum/checkpoint agreement. With --ink, complete source-bound proof and artifact verification. Not compiler correctness, convergence or universal performance.')
if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--ink',type=Path);a=p.parse_args()
 print(json.dumps(audit(a.ink.resolve()if a.ink else None)))
