"""Verify checked publication, frozen matrix and complete performance evidence."""
import argparse,hashlib,json,sqlite3,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1];P=B.parent
sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store,identity
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda n:json.loads((R/n).read_text())
a=argparse.ArgumentParser();a.add_argument('--final',action='store_true');args=a.parse_args()
m=read('metadata.json');pub=read('publication.json');st=Store(B/'knowledge');pin=read('initial-pins.json')
assert sha(B/'reports/web-stack-proofs-24-2026-10-11/REPORT.md')==pin['prior_report_sha256']
old=Store(B/'knowledge',B/f'knowledge/store/snapshots/{pin["prior_snapshot"]}.json');prior=set(old.members());now=set(st.members());delta=now-prior
assert pub['status']=='checked' and pub['previous_snapshot']==old.snapshot_id==m['prior_snapshot'] and pub['snapshot']==st.snapshot_id==m['new_snapshot']
assert len(prior)==pin['prior_entries'] and len(now)==pub['entries'] and delta==set(pub['batch_entries']) and len(delta)==pub['added_entries']
for i in now:
 o=st.object(i);assert identity(o)==i and set(o['dependencies'])<=now
for n,h in m['artifact_hashes'].items():assert sha(R/n)==h,n
for c in m['compilers'].values():assert sha(c['path'])==c['sha256']
assert m['compilers']['old']['sha256']==pin['prior_compiler_sha256'] and m['compilers']['new']['sha256']!=pin['prior_compiler_sha256']
for n,h in read('policy-freeze.json')['artifacts'].items():assert sha(B/n)==h,n
if (R/'pretime-review-bindings.json').exists():
 for n,h in read('pretime-review-bindings.json')['artifacts'].items():assert sha(R/n)==h,n
before=read('source-boundary-before.json');after=read('source-boundary-after.json');changed=sorted(n for n in before if before[n]!=after[n]);assert changed==sorted(pin['expected_source_changes']) and len(before)==len(after)==102
assert all(sha(B/n)==h for n,h in after.items()) and all(sha(R/'original-source'/n)==before[n] for n in changed)
fresh=references=0
for case,t in m['tasks'].items():
 cores={k:read(t['selections'][k]['selected_core_path']) for k in ['prior','checked']};bodies={k:c['program']['functions'][0]['body'] for k,c in cores.items()}
 if t['fresh_proof_required']:assert bodies['prior']!=bodies['checked'] and t['new_laws'];fresh+=1
 else:assert bodies['prior']==bodies['checked'];references+=1
 for k,sel in t['selections'].items():
  assert sha(R/sel['selected_core_path'])==sel['selected_core_sha256'] and sha(R/sel['path'])==sel['sha256']
  package=read(sel['path']);objects=package['knowledge']['objects'];assert set(objects)==set(package['knowledge']['membership'])
  for i,o in objects.items():assert identity(o)==i and st.object(i)==o
  for backend in ['old','new']:
   lane=t['matrix_bundles'][backend+'_'+k];assert lane['selected_core_sha256']==sel['selected_core_sha256'];assert sha(R/lane['bundle']/'manifest.json')==lane['manifest_sha256']
assert fresh==5 and references==4
raw=[read('node-results.json'),read('browser-results.json'),read('native/results.json')];assert all(x['status']=='passed' for x in raw)
reviews={n:read(n) for n in ['native-final-review.json','catalogue-review.json']+(['protocol-final-review.json'] if args.final else [])}
for n,d in reviews.items():
 assert d['status'] in ['passed','Final review passes'],n
 for rel,h in d.get('bindings',{}).items():
  p=Path(rel);p=p if p.is_absolute() else B/p if (B/p).is_file() else R/p;assert sha(p)==h,(n,rel)
obsadded=sum(len(read(h+'-observations.json')) for h in ['node','browser']);obscount=pin['prior_observations']+obsadded
ledger=list((B/'knowledge/store/observations').glob('*.json'));assert len(ledger)==obscount
with sqlite3.connect('file:'+str(B/'knowledge/index.sqlite')+'?mode=ro',uri=True) as db:
 counts={t:db.execute('select count(*) from '+t).fetchone()[0] for t in ['entries','members','observations']};assert db.execute('pragma integrity_check').fetchone()==('ok',)
assert counts==dict(entries=len(now),members=len(now),observations=obscount)
w=read('root-interval-verification.json');assert w['status']=='passed'
wit=json.loads((B/'knowledge/research/web-stack-proofs-25/static-derivation/witnesses.json').read_text())
roles=dict(generic_roots=len(wit['generic_roots']),fresh_source_bridges=len(wit['new_composed']),shared_old_certificates=len(wit['shared_old']))
v=dict(status='passed',catalog_entries=len(now),added_entries=len(delta),proof_roles=roles,fair_prior_entries=wit['effective_prior_entries'],snapshot=st.snapshot_id,canonical_observations=obscount,observations_added=obsadded,sqlite_counts=counts,fresh_proof_tasks=fresh,backend_reference_tasks=references,frozen_report_artifacts=len(m['artifact_hashes']),selection_packages=2*len(m['tasks']),compiled_matrix_bundles=4*len(m['tasks']),timing_samples=sum(len(x['samples']) for x in raw),complete_benchmark_comparisons=sum(x['validation']['comparisons'] for x in raw[:2])+read('native/validation.json')['exact_comparisons'],independent_intervals=w['intervals_recomputed']+w['interaction_intervals_recomputed'],source_guard=dict(keys=102,unchanged=98,changed=changed),adverse_comparisons_retained=len(read('regressions.json')['rows']),core_kernel_planner_unchanged=True,runtime_host_changed=True,no_caller_checks_or_runtime_proof_optimizer=True,commit_push_PR=False,scope='Backend includes C/Wasm/CPU host transport. Proofs and backend factorially separated. One machine and preset U32 instantiations; no universal language ranking.')
(R/'verification.json').write_text(json.dumps(v,indent=2)+'\n')
if args.final:
 assert reviews['protocol-final-review.json']['bindings'][str((R/'REPORT.md').relative_to(B))]==sha(R/'REPORT.md')
 assert (P/'REPORT.md').read_bytes().endswith((R/'parent-REPORT.md.before').read_bytes())
 saved=read('parent-agent-ownership.json.before');current=json.loads((P/'agent-ownership.json').read_text());assert {k:z for k,z in current.items() if k!='web_stack_proof_batch_25'}==saved
 files={p for p in R.iterdir() if p.is_file() and p.suffix!='.log' and p.name!='final-binding.json'};files.update(R/n for n in ['native/results.json','native/summary.json','native/metadata.json','native/validation.json']);files.update((R/'browser-batches').glob('b*/browser-results.json'))
 binding=dict(status='bound',artifacts={str(p.relative_to(R)):sha(p) for p in sorted(files)},parent_report_sha256=sha(P/'REPORT.md'),ownership_sha256=sha(P/'agent-ownership.json'),snapshot=st.snapshot_id,prior_history_and_unrelated_ownership_preserved=True)
 (R/'final-binding.json').write_text(json.dumps(binding,indent=2)+'\n')
print(json.dumps(v))
