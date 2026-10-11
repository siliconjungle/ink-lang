"""Round20 final hash/catalogue/count audit; no timed algorithms run."""
import hashlib,json,sqlite3,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1];P=B.parent
sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store,canonical,identity
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads((R/p).read_text())
m=read('metadata.json');pub=read('publication.json')
assert pub['status']=='checked' and pub['previous_snapshot']==m['prior_snapshot'] and pub['snapshot']==m['new_snapshot']
assert pub['previous_entries']==1343 and pub['previous_snapshot_preserved']
for rel,h in m['artifact_hashes'].items():assert sha(R/rel)==h,rel
assert sha(m['compiler_path'])==m['compiler_sha256']==pub['compiler_sha256']
policy=read('policy-freeze.json')
for rel,h in policy['artifacts'].items():assert sha(B/rel)==h,rel
before=read('source-boundary-before.json');after={p:sha(B/p) for p in before}
assert before==after and len(before)==102
st=Store(B/'knowledge');prior=Store(B/'knowledge',B/f"knowledge/store/snapshots/{m['prior_snapshot']}.json")
assert st.snapshot_id==m['new_snapshot']
fresh=set(st.members())-set(prior.members());assert set(prior.members())<=set(st.members()) and fresh==set(pub['batch_entries'])
for i in st.members():assert identity(st.object(i))==i
for n,t in m['tasks'].items():
 assert t['fresh_proof_required'] and t['checked_changes_prior'] and set(t['new_laws'])&fresh,n
 for kind in ['prior','checked']:
  for choices in [t['selections'],t['gpu_selections']]:
   path=R/choices[kind]['path'];assert sha(path)==choices[kind]['sha256']
   package=json.loads(path.read_text());assert set(package['knowledge']['objects'])==set(package['knowledge']['membership'])
   for i,obj in package['knowledge']['objects'].items():assert identity(obj)==i
raw=[read('node-results.json'),read('browser-results.json'),read('native/results.json')]
assert all(x['status']=='passed' for x in raw)
native=read('native/metadata.json')
for rel,h in native['artifact_hashes'].items():assert sha(R/'native'/rel)==h,rel
assert native['main_metadata_sha256']==sha(R/'metadata.json')
reviews={}
for name in ['native-final-review.json','catalogue-review.json','protocol-final-review.json','code-shape-review.json']:
 d=read(name);assert d['status'] in ['passed','Final review passes'],name
 for rel,h in d.get('bindings',{}).items():
  p=Path(rel)
  if not p.is_absolute():p=B/p if (B/p).is_file() else R/p
  assert sha(p)==h,(name,rel)
 reviews[name]=d
assert reviews['protocol-final-review.json']['bindings'][str((R/'REPORT.md').relative_to(B))]==sha(R/'REPORT.md')
observations=len(list((st.data/'observations').glob('*.json')))
db=sqlite3.connect('file:'+str(B/'knowledge/index.sqlite')+'?mode=ro',uri=True)
assert db.execute('pragma integrity_check').fetchone()==('ok',)
counts={t:db.execute('select count(*) from '+t).fetchone()[0] for t in ['entries','members','observations']};db.close()
assert counts==dict(entries=len(st.members()),members=len(st.members()),observations=observations)
w=read('root-interval-verification.json')
assert w['status']=='passed'
verification=dict(status='passed',catalog_entries=len(st.members()),added_entries=len(fresh),snapshot=st.snapshot_id,prior_snapshot=prior.snapshot_id,frozen_report_artifacts=len(m['artifact_hashes']),selection_packages=4*len(m['tasks']),fresh_CPU_changed_tasks=len(m['tasks']),timing_samples=sum(len(x['samples']) for x in raw),exact_benchmark_comparisons=sum(x['validation']['comparisons'] for x in raw[:2])+read('native/validation.json')['exact_comparisons'],web_intervals_independently_recomputed=w['intervals_recomputed'],canonical_observations=observations,sqlite_counts=counts,source_guard=dict(files=102,unchanged=102,changed=[]),gpu=raw[1]['gpu_validation'],regressions_retained=len(read('fresh-regressions.json')['rows']),broad_native_expert_superiority_established=False,no_runtime_optimizer_or_input_checks_added=True,no_compiler_backend_runtime_or_planner_changes=True,commit_push_PR=False)
verification['gpu']={k:v for k,v in verification['gpu'].items() if k!='records'}
verification['native_intervals_independently_recomputed']=reviews['native-final-review.json'].get('intervals_recomputed',reviews['native-final-review.json'].get('independently_recomputed_intervals'))
(R/'verification.json').write_text(json.dumps(verification,indent=2)+'\n')
names=['REPORT.md','verification.json','metadata.json','policy-freeze.json','publication.json','node-results.json','browser-results.json','native/results.json','node-summary.json','browser-summary.json','native/summary.json','outcome-tables.json','fresh-regressions.json','all-expert-comparisons.json','profitability.json','backend-routing.json','root-interval-verification.json','native-final-review.json','catalogue-review.json','protocol-final-review.json','source-boundary-before.json','source-boundary-after.json','browser-batches/manifest.json','analyse.py','summarise-outcomes.py','verify-final.py','code-shape-review.json']
names+=[str(p.relative_to(R)) for p in (R/'browser-batches').glob('b*/browser-results.json')]
names += [n for n in ['browser-completed.html','browser-completed.jpg'] if (R/n).is_file()]
binding=dict(status='bound',artifacts={n:sha(R/n) for n in names},parent_report_sha256=sha(P/'REPORT.md'),ownership_sha256=sha(P/'agent-ownership.json'),compiler_sha256=m['compiler_sha256'],snapshot=m['new_snapshot'],scope='Frozen recipes, policies and target hashes preserved. All measured samples and adverse comparisons retained; explicit compile-time proof admission/application and actualGPU accounting. No runtime checker wrappers.')
(R/'final-binding.json').write_text(json.dumps(binding,indent=2)+'\n');print(json.dumps(verification))
