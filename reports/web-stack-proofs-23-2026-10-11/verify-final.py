"""Verify frozen identities and results; supports pre-report and final review stages."""
import argparse,hashlib,json,sqlite3,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1];P=B.parent
sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store,identity
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda n:json.loads((R/n).read_text())
a=argparse.ArgumentParser();a.add_argument('--final',action='store_true');args=a.parse_args()
m=read('metadata.json');pub=read('publication.json');st=Store(B/'knowledge')
assert sha(B/'reports/web-stack-proofs-22-2026-10-11/REPORT.md')=='7dfef4947f785c4fa232f4ecdfa0bf58b197c44ffafe47ade240a8ab9fc67166'
prior=Store(B/'knowledge',B/f"knowledge/store/snapshots/{m['prior_snapshot']}.json")
assert pub['status']=='checked' and pub['previous_snapshot']==m['prior_snapshot'] and pub['snapshot']==m['new_snapshot']==st.snapshot_id
assert pub['previous_entries']==1648 and pub['previous_snapshot_preserved']
old=set(prior.members());now=set(st.members());delta=now-old
assert old<=now and delta==set(pub['batch_entries']) and len(now)==pub['entries']
for i in now:
 o=st.object(i);assert identity(o)==i and set(o['dependencies'])<=now
for rel,h in m['artifact_hashes'].items():assert sha(R/rel)==h,rel
assert sha(m['compiler_path'])==m['compiler_sha256']==pub['compiler_sha256']
policy=read('policy-freeze.json')
for rel,h in policy['artifacts'].items():assert sha(B/rel)==h,rel
extra=read('pretime-review-bindings.json')
for rel,h in extra['artifacts'].items():assert sha(R/rel)==h,rel
before=read('source-boundary-before.json');assert len(before)==102 and before=={p:sha(B/p) for p in before}
shared=set(m['shared_old_witness_ids']);fresh=delta-shared
assert shared<=delta
changed=reference=0
for n,t in m['tasks'].items():
 bodies=[read(f'tasks/{n}/{k}-selected.core.json')['program']['functions'][0]['body'] for k in ['prior','checked']]
 if t['fresh_proof_required']:
  assert t['checked_changes_prior'] and bodies[0]!=bodies[1] and set(t['new_laws'])&fresh,n
  changed+=1
 else:
  assert not t['checked_changes_prior'] and bodies[0]==bodies[1],n
  reference+=1
 for k in ['prior','checked']:
  for rows in [t['selections'],t['gpu_selections']]:
   row=rows[k];path=R/row['path'];assert sha(path)==row['sha256']
   package=json.loads(path.read_text());objects=package['knowledge']['objects'];assert set(objects)==set(package['knowledge']['membership'])
   for i,o in objects.items():assert identity(o)==i and st.object(i)==o
assert changed+reference==len(m["tasks"]) and changed>0
raw=[read('node-results.json'),read('browser-results.json'),read('native/results.json')];assert all(x['status']=='passed' for x in raw)
native=read('native/metadata.json')
assert native['main_metadata_sha256']==sha(R/'metadata.json')
for rel,h in native['artifact_hashes'].items():assert sha(R/'native'/rel)==h,rel
reviews={}
names=['native-final-review.json','catalogue-review.json','code-shape-review.json']+(['protocol-final-review.json'] if args.final else [])
for name in names:
 d=read(name);assert d['status'] in ['passed','Final review passes'],name
 for rel,h in d.get('bindings',{}).items():
  p=Path(rel)
  if not p.is_absolute():p=B/p if (B/p).is_file() else R/p
  assert sha(p)==h,(name,rel)
 reviews[name]=d
if args.final:assert reviews['protocol-final-review.json']['bindings'][str((R/'REPORT.md').relative_to(B))]==sha(R/'REPORT.md')
observations=len(list((st.data/'observations').glob('*.json')))
db=sqlite3.connect('file:'+str(B/'knowledge/index.sqlite')+'?mode=ro',uri=True)
assert db.execute('pragma integrity_check').fetchone()==('ok',)
counts={t:db.execute('select count(*) from '+t).fetchone()[0] for t in ['entries','members','observations']};db.close()
assert counts==dict(entries=len(now),members=len(now),observations=observations) and observations==13746+10*len(read("fixtures.json")["cells"])
w=read('root-interval-verification.json');assert w['status']=='passed'
v=dict(status='passed',catalog_entries=len(now),added_entries=len(delta),snapshot=st.snapshot_id,prior_snapshot=prior.snapshot_id,fair_prior_entries=len(old|shared),frozen_report_artifacts=len(m['artifact_hashes']),selection_packages=4*len(m['tasks']),fresh_CPU_changed_tasks=changed,old_law_reference_tasks=reference,timing_samples=sum(len(x['samples']) for x in raw),exact_benchmark_comparisons=sum(x['validation']['comparisons'] for x in raw[:2])+read('native/validation.json')['exact_comparisons'],web_intervals_independently_recomputed=w['intervals_recomputed'],native_intervals_independently_recomputed=reviews['native-final-review.json']['independently_recomputed_paired_intervals'],canonical_observations=observations,sqlite_counts=counts,source_guard=dict(files=102,unchanged=102,changed=[]),gpu={k:z for k,z in raw[1]['gpu_validation'].items() if k!='records'},regressions_retained=len(read('fresh-regressions.json')['rows']),broad_native_expert_superiority_established=False,no_runtime_optimizer_or_input_checks_added=True,no_compiler_backend_runtime_or_planner_changes=True,commit_push_PR=False)
assert v['native_intervals_independently_recomputed']==8*len(read('fixtures.json')['cells'])
(R/'verification.json').write_text(json.dumps(v,indent=2)+'\n')
if args.final:
 files=['REPORT.md','verification.json','metadata.json','policy-freeze.json','pretime-review-bindings.json','publication.json','node-results.json','browser-results.json','native/results.json','node-summary.json','browser-summary.json','native/summary.json','outcome-tables.json','fresh-regressions.json','all-expert-comparisons.json','profitability.json','backend-routing.json','root-interval-verification.json','native-final-review.json','catalogue-review.json','protocol-final-review.json','code-shape-review.json','source-boundary-before.json','source-boundary-after.json','browser-batches/manifest.json']
 files += [p.name for p in R.glob('*.py')]
 files += [str(p.relative_to(R)) for p in (R/'browser-batches').glob('b*/browser-results.json')]
 files += [n for n in ['browser-completed.html','browser-completed.png','browser-completed.jpg'] if (R/n).is_file()]
 assert (P/'REPORT.md').read_bytes().endswith((R/'parent-REPORT.md.before').read_bytes())
 old_ownership=read('parent-agent-ownership.json.before');ownership=json.loads((P/'agent-ownership.json').read_text());assert {k:z for k,z in ownership.items() if k!='web_stack_proof_batch_23'}==old_ownership
 binding=dict(status='bound',artifacts={n:sha(R/n) for n in sorted(set(files))},parent_report_sha256=sha(P/'REPORT.md'),ownership_sha256=sha(P/'agent-ownership.json'),compiler_sha256=m['compiler_sha256'],snapshot=m['new_snapshot'],prior_parent_preserved=True,scope='Frozen inputs, controls, policies and targets; every timing and adverse comparison retained. Explicit fresh/reference roles and actual GPU accounting.')
 (R/'final-binding.json').write_text(json.dumps(binding,indent=2)+'\n')
print(json.dumps(v))
