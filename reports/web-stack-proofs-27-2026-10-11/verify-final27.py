"""Authenticate batch27 checked publication, frozen sources and full evidence."""
import argparse, hashlib, json, sqlite3, sys
from pathlib import Path
R=Path(__file__).resolve().parent; B=R.parents[1]; P=B.parent
sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store, identity
read=lambda n:json.loads((R/n).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
a=argparse.ArgumentParser();a.add_argument('--final',action='store_true');args=a.parse_args()
pins=read('initial-pins.json');m=read('metadata.json');pub=read('publication.json');st=Store(B/'knowledge')
assert sha(B/'reports/web-stack-proofs-26-2026-10-11/REPORT.md')==pins['prior_report_sha256']
old=Store(B/'knowledge',B/'knowledge/store/snapshots'/f"{pins['prior_snapshot']}.json")
prior=set(old.members());now=set(st.members());delta=now-prior
assert len(prior)==1790 and len(now)==1822 and len(delta)==32 and prior<=now
assert pub['status']=='checked' and pub['snapshot']==st.snapshot_id==m['new_snapshot']
assert pub['previous_snapshot']==old.snapshot_id==m['prior_snapshot'] and delta==set(pub['batch_entries'])
for i in now:
 o=st.object(i);assert identity(o)==i and set(o['dependencies'])<=now
for n,h in m['artifact_hashes'].items():assert sha(R/n)==h,n
for c in m['compilers'].values():assert sha(c['path'])==c['sha256']
assert m['compilers']['old']['sha256']==pins['prior_compiler_sha256']
assert m['compilers']['new']['sha256']!=pins['prior_compiler_sha256']
for n,h in read('policy-freeze.json')['artifacts'].items():assert sha(B/n)==h,n
for n,h in read('pretime-review-bindings.json')['artifacts'].items():assert sha(R/n)==h,n
before=read('source-boundary-before.json');after=read('source-boundary-after.json')
changed=sorted(n for n in before if before[n]!=after[n])
assert len(before)==len(after)==102 and changed==sorted(pins['expected_source_changes'])
assert all(sha(B/n)==h for n,h in after.items())
assert all(sha(R/'original-source'/n)==before[n] for n in changed)
fresh=references=0
for case,t in m['tasks'].items():
 cores={k:read(t['selections'][k]['selected_core_path']) for k in ['prior','checked']}
 bodies={k:next(f['body'] for f in c['program']['functions'] if f['name']==case) for k,c in cores.items()}
 if t['fresh_proof_required']:assert bodies['prior']!=bodies['checked'] and t['new_laws'];fresh+=1
 else:assert bodies['prior']==bodies['checked'];references+=1
 for k,sel in t['selections'].items():
  assert sha(R/sel['path'])==sel['sha256'] and sha(R/sel['selected_core_path'])==sel['selected_core_sha256']
  package=read(sel['path']);objects=package['knowledge']['objects']
  assert set(objects)==set(package['knowledge']['membership'])
  for i,o in objects.items():assert identity(o)==i and st.object(i)==o
  for backend in ['old','new']:
   lane=t['matrix_bundles'][backend+'_'+k]
   assert lane['selected_core_sha256']==sel['selected_core_sha256']
   assert sha(R/lane['bundle']/'manifest.json')==lane['manifest_sha256']
assert fresh==2 and references==6
raw=[read('node-results.json'),read('browser-results.json'),read('native/results.json')]
assert all(x['status']=='passed' for x in raw)
names=['native-final-review.json','catalogue-review.json']+(['protocol-final-review.json'] if args.final else [])
for n in names:
 d=read(n);assert d['status'] in ['passed','Final review passes'],n
 for rel,h in d.get('bindings',{}).items():
  p=Path(rel);p=p if p.is_absolute() else B/p if (B/p).is_file() else R/p
  assert sha(p)==h,(n,rel)
obsadded=sum(len(read(h+'-observations.json')) for h in ['node','browser'])
assert obsadded==320
obscount=pins['prior_observations']+obsadded;assert obscount==17346
assert len(list((B/'knowledge/store/observations').glob('*.json')))==obscount
with sqlite3.connect('file:'+str(B/'knowledge/index.sqlite')+'?mode=ro',uri=True) as db:
 counts={t:db.execute('select count(*) from '+t).fetchone()[0] for t in ['entries','members','observations']}
 assert db.execute('pragma integrity_check').fetchone()==('ok',)
assert counts==dict(entries=1822,members=1822,observations=17346)
w=read('root-interval-verification.json');assert w['status']=='passed'
v=dict(status='passed',catalog_entries=1822,added_entries=32,
 proof_roles=dict(optimization_endpoints=8,proof_supports=8,typed_source_certificates=16,mathematical_identities=2),
 fair_prior_entries=1790,snapshot=st.snapshot_id,canonical_observations=obscount,
 observations_added=obsadded,sqlite_counts=counts,fresh_proof_tasks=fresh,backend_reference_tasks=references,
 frozen_report_artifacts=len(m['artifact_hashes']),selection_packages=2*len(m['tasks']),
 compiled_matrix_bundles=4*len(m['tasks']),timing_samples=sum(len(x['samples']) for x in raw),
 complete_benchmark_comparisons=sum(x['validation']['comparisons'] for x in raw[:2])+read('native/validation.json')['exact_comparisons'],
 independent_intervals=w['intervals_recomputed']+w['interaction_intervals_recomputed'],
 source_guard=dict(keys=102,unchanged=102-len(changed),changed=changed),
 adverse_comparisons_retained=len(read('regressions.json')['rows']),
 core_kernel_planner_unchanged=True,runtime_host_changed=False,
 no_caller_checks_or_runtime_proof_optimizer=True,commit_push_PR=False,
 scope='Bounded pure known-call inlining in C/JS only, exact selected cores across compiler states. Two independent-list nested-zip identities. Related U32 kernels on one machine; expert scratch reuse disclosed; no universal language ranking.')
(R/'verification.json').write_text(json.dumps(v,indent=2)+'\n')
if args.final:
 assert read('protocol-final-review.json')['bindings'][str((R/'REPORT.md').relative_to(B))]==sha(R/'REPORT.md')
 assert (P/'REPORT.md').read_bytes().endswith((R/'parent-REPORT.md.before').read_bytes())
 saved=read('parent-agent-ownership.json.before');current=json.loads((P/'agent-ownership.json').read_text())
 assert {k:z for k,z in current.items() if k!='web_stack_proof_batch_27'}==saved
 files={p for p in R.iterdir() if p.is_file() and p.suffix!='.log' and p.name!='final-binding.json'}
 files.update(R/n for n in ['native/results.json','native/summary.json','native/metadata.json','native/validation.json'])
 files.update((R/'browser-batches').glob('b*/browser-results.json'))
 (R/'final-binding.json').write_text(json.dumps(dict(status='bound',artifacts={str(p.relative_to(R)):sha(p) for p in sorted(files)},parent_report_sha256=sha(P/'REPORT.md'),ownership_sha256=sha(P/'agent-ownership.json'),snapshot=st.snapshot_id,prior_history_and_unrelated_ownership_preserved=True),indent=2)+'\n')
print(json.dumps(v))
