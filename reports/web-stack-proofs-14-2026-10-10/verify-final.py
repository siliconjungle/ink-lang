#!/usr/bin/env python3
"""Authenticate batch14 closure without collecting new measurements."""
import collections,hashlib,json,re,sys
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def authenticate(root,hashes):
 for name,digest in hashes.items():assert sha(root/name)==digest,name
 return len(hashes)

m=read(HERE/'metadata.json');native=read(HERE/'native/metadata.json');pub=read(HERE/'publication.json')
assert pub['status']=='checked' and pub['added_entries']==33 and pub['entries']==1031
assert m['new_snapshot']==pub['snapshot']=='0510381225f45dc33922b2ead3794abd79c190bc3b3cbc34ce41d50e959ed8b1'
assert m['prior_snapshot']==pub['previous_snapshot']=='30e427bcb8524fe3760881a3a5722c7445f9fdab3d2818a707b8d8508e80c110'
assert sha(m['compiler_path'])==m['compiler_sha256']=='45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08'
main_artifacts=authenticate(HERE,m['artifact_hashes']);native_artifacts=authenticate(HERE/'native',native['artifact_hashes'])
before=read(HERE/'source-boundary-before.json');after=read(HERE/'source-boundary-after.json');authenticate(ROOT,after)
changed=[n for n in before if before[n]!=after[n]]
assert changed==['planner/ink_planner/semantic_search.py']
assert len(after)==102 and m['planner_policy_sha256']==after[changed[0]]=='e8bf920b7ac5c3cf79070b8e574fcd8dd579b59d1ff4b989761ea19d05daef92'
author_counts={}
for lane in ['collection','reduction']:
 e=read(ROOT/f'knowledge/research/web-stack-proofs-14/{lane}/evidence.json')
 author_counts[lane]=authenticate(ROOT,e['artifact_hashes'])
logs={
 'collection':(ROOT/'knowledge/research/web-stack-proofs-14/collection/focused-final-cost-planner-tests.log',3),
 'reduction':(ROOT/'knowledge/research/web-stack-proofs-14/reduction/final-focused-tests.log',5),
 'planner':(HERE/'planner-tests.log',5),
 'store':(HERE/'store-tests.log',7),
 'publisher':(HERE/'publisher-tests.log',2),
 'performance_store':(HERE/'performance-store-tests.log',3)}
for _,(p,n) in logs.items():
 t=p.read_text();assert re.search(r'Ran '+str(n)+r' tests? in ',t) and t.rstrip().endswith('OK'),str(p)
assert sum(n for _,n in logs.values())==25
spec=read(HERE/'spec.json');fresh=[t for t in spec['tasks'] if t['fresh_proof_required']]
assert len(fresh)==12 and len(spec['tasks'])==14
for t in fresh:
 x=m['tasks'][t['name']];assert x['prior_equals_original'] and x['checked_changes_prior'] and x['new_laws']
 assert x['selections']['prior']['applications']==0
 for k in ['prior','checked']:
  receipt=read(HERE/'tasks'/t['name']/f'{k}-selection-check.json')
  assert receipt['semantics']=='ink-evidence-v1'
  assert receipt['snapshot_sha256']==m['prior_snapshot' if k=='prior' else 'new_snapshot']
  assert sorted(set(receipt['applied_laws']))==x['selections'][k]['laws']
web=read(HERE/'root-interval-verification.json');nv=read(HERE/'native-verification.json')
assert web['status']==nv['status']=='passed' and web['intervals_recomputed']==2838 and nv['independently_recomputed_paired_intervals']==720
assert nv['samples']==8100 and nv['native_cells']==180 and web['gpu_timed_samples']==702
summaries={h:read(HERE/f'{h}-summary.json') for h in ['node','browser']}
assert [summaries[h]['samples'] for h in ['node','browser']]==[13770,14472]
assert [summaries[h]['validation']['comparisons'] for h in ['node','browser']]==[4726,4996]
canonical=Store(ROOT/'knowledge');old=Store(ROOT/'knowledge',ROOT/f'knowledge/store/snapshots/{m["prior_snapshot"]}.json')
assert canonical.snapshot_id==m['new_snapshot'] and len(canonical.members())==1031
assert len(old.members())==998 and set(old.members())<=set(canonical.members())
imports=read(HERE/'canonical-observation-import.json');assert imports['status']=='passed' and imports['imported_observations']==900
assert len(list((canonical.data/'observations').glob('*.json')))==6786
for row in imports['rows']:assert sha(canonical.data/'observations'/(row['id']+'.json'))==row['artifact_sha256']
assert len(imports['rows'])==900 and canonical.snapshot_id==m['new_snapshot']
assert (HERE/'browser-completed.png').stat().st_size>1000
files=['REPORT.md','publication.json','planner-change.json','pre-timing-freeze.json','metadata.json','source-boundary-before.json','source-boundary-after.json','node-results.json','browser-results.json','native/results.json','node-summary.json','browser-summary.json','native/summary.json','root-interval-verification.json','native-verification.json','canonical-observation-import.json','profitability.json','strong-controls.json','backend-routing.json','independent-source-review.md','independent-reduction-review.md','native-clock-review.md','native-clock-repair.json','browser-completed.png','verify-final.py','verify-native.py','write-report.py']
files.extend(str(p.relative_to(HERE)) for p,_ in logs.values() if p.is_relative_to(HERE))
result=dict(status='passed',catalogue_entries=1031,new_laws=33,snapshot=m['new_snapshot'],previous_snapshot=m['prior_snapshot'],prior_entries_preserved=998,current_scoped_tests=25,full_historical_suite_rerun=False,main_frozen_artifacts=main_artifacts,native_frozen_artifacts=native_artifacts,author_artifacts=author_counts,guarded_sources=102,unchanged_guarded_sources=101,planned_changed_sources=changed,fresh_workload_selections=12,web_samples=28242,native_samples=8100,total_samples=36342,web_exact_comparisons=9722,native_exact_comparisons=940,independently_verified_web_intervals=2838,independently_verified_native_intervals=720,actual_gpu_samples=702,actual_gpu_variant_cells=78,fallback_variant_cells=192,canonical_observations=6786,added_observations=900,caller_checks_added=False,profitability='Measured workload/target views; negative and inconclusive observations retained. No broad native/expert dominance or fresh same-GPU gain established.',artifact_hashes={n:sha(HERE/n) for n in files})
(HERE/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print({k:v for k,v in result.items() if k!='artifact_hashes'})
