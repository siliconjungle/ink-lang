"""Retain completed final metadata/transport controls without generated stores."""
from pathlib import Path
import gzip,hashlib,json,statistics,subprocess,tarfile
b=Path('build/v8-variable-power-cases');here=Path('bench/v8-learning/variable-power')
sha=lambda raw:hashlib.sha256(raw).hexdigest()
head=subprocess.check_output(['git','-C','knowledge','rev-parse','HEAD'],text=True).strip()
assert not subprocess.check_output(['git','-C','knowledge','diff','HEAD','--name-only'],text=True).strip()
paths=['ink_knowledge/proposal_views.py','tests/test_proposal_view_membership.py','ink_knowledge/index.sql','ink_knowledge/index_cache.py','ink_knowledge/published_bindings.py','ink_knowledge/store.py','producers/planning_recipes.py','tests/test_published_bindings.py']
inputs={'knowledge/'+p:sha((Path('knowledge')/p).read_bytes())for p in paths}
logs={'index-regressions-hardened.log':66,'adaptive-tests.log':14,'adaptive-regressions.log':12}
for name,n in logs.items():
 raw=(b/name).read_bytes();assert b'\nOK\n'in raw and ('Ran '+str(n)+' tests').encode()in raw
files={name:b/name for name in logs}
for name in ['kind-index-preparation.json','kind-probe.json','kind-probe.log']:
 files[name]=b/name
for name in ['terminal.json','check.log','check.py','adaptive_views.py','eager_views.py','byte-parity.json','prepare.log','prepare.py']:
 files['adaptive-transport/'+name]=b/'adaptive-transport'/name
for name in ['diagnostics.json','profile.log','selection.json','stderr']:
 files['semantic-profile/'+name]=b/'semantic-profile'/name
for name in ['full-generate-terminal.json','full-generate.log','full_generate_probe.py']:
 files['search-profile/'+name]=b/'search-profile'/name
kind={mode:[json.loads((b/'search-profile'/f'kind-{mode}-{i}.json').read_bytes())for i in range(3)]for mode in ['baseline','indexed']}
for mode in kind:
 for i in range(3):files[f'search-profile/kind-{mode}-{i}.json']=b/'search-profile'/f'kind-{mode}-{i}.json'
transport=json.loads((b/'transport-controls/terminal.json').read_bytes());assert transport['exit_status']==0 and len(transport['rows'])==12
files['transport-controls/terminal.json']=b/'transport-controls/terminal.json'
summary=dict(schema=1,knowledge_source=head,hardened_index_source='1a552fedfba5c506c53c023ce888797756139534',inputs=inputs,logs={name:dict(methods=n,sha256=sha((b/name).read_bytes()))for name,n in logs.items()},kind_query_controls=kind,transport_controls=transport,scope='Exact final source and completed component controls. Historical runtime/binding controls retain their separate source pins. All fresh-process values retained, no compiler-wide or application timing claim, no peak-memory measurement, no admission or profitability authority.')
(here/'discovery-controls.json').write_text(json.dumps(summary,indent=2)+'\n')
index={name:dict(bytes=p.stat().st_size,sha256=sha(p.read_bytes()))for name,p in sorted(files.items())}
with tarfile.open(here/'discovery-controls.tar.gz','w:gz',compresslevel=9)as a:
 for name,p in sorted(files.items()):a.add(p,arcname=name,recursive=False)
(here/'discovery-controls-index.json').write_text(json.dumps(dict(schema=1,archive_sha256=sha((here/'discovery-controls.tar.gz').read_bytes()),files=index),indent=2)+'\n')
for case in ['ordinary','near-limit']:
 print(case,{mode:statistics.median(float(r['complete_assembly_seconds'])for r in transport['rows']if r['case']==case and r['variant']==mode)for mode in ['eager','adaptive']})
print('Retained',len(files),'completed discovery/control inputs')
