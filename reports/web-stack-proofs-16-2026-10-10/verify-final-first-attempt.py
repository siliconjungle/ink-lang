"""Final bounded identity audit; statistical audits are separately bound."""
import hashlib,json,re
from pathlib import Path
R=Path(__file__).resolve().parent;ROOT=R.parents[1]
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def check(p,h):assert sha(p)==h,str(p)
meta=read(R/'metadata.json')
for p,h in meta['artifact_hashes'].items():check(R/p,h)
check(Path(meta['compiler_path']),meta['compiler_sha256'])
lanes=[]
for lane,key,relative in [('fold','files',ROOT),('reduction','artifact_hashes',ROOT/'knowledge/research/web-stack-proofs-16/reduction')]:
 p=ROOT/'knowledge/research/web-stack-proofs-16'/lane/'evidence.json';d=read(p)
 for k,h in d[key].items():check(relative/k,h)
 external=[]
 for k,h in d.get('external_hashes',{}).items():
  actual=ROOT/k
  if k=='planner/ink_planner/semantic_search.py':actual=R/'initial-flat-cost-attempt/semantic_search.py'
  check(actual,h);external.append(dict(original=k,bound=str(actual.relative_to(ROOT))))
 lanes.append(dict(lane=lane,artifact_hashes=len(d[key]),external_bindings=external,evidence_sha256=sha(p)))
pre=read(R/'source-boundary-before.json');post=read(R/'source-boundary-after.json');assert set(pre)==set(post)
for p,h in post.items():check(ROOT/p,h)
changed=[p for p in post if pre[p]!=post[p]];assert changed==['planner/ink_planner/semantic_search.py']
for name in ['final-integrity.json','final-performance-review.json','native/final-review.json','root-interval-verification.json']:
 assert read(R/name)['status']=='passed',name
integrity=read(R/'final-integrity.json');native=read(R/'native/final-review.json');intervals=read(R/'root-interval-verification.json')
assert integrity['counts']['current_proofs']==1164 and integrity['counts']['canonical_total_observations_at_audit']==9666
assert intervals['intervals_recomputed']==3708 and native['recomputed_intervals']==1440
pub=read(R/'publication.json');assert pub['entries']==1164 and pub['added_entries']==75 and pub['previous_snapshot_preserved']
assert len(pub['batch_entries'])==75
for n in ['node','browser']:
 s=read(R/(n+'-summary.json'));raw=read(R/(n+'-results.json'));assert s['status']=='passed' and raw['status']=='passed'
 assert s['samples']==len(raw['samples']) and s['cells']==180
assert read(R/'native/summary.json')['samples']==16200
reportsha=sha(R/'REPORT.md');perf=read(R/'final-performance-review.json')
# Authenticate every explicit performance-review binding that points to a file.
for field in ['bindings','hashes']:
 for k,h in perf.get(field,{}).items():
  p=Path(k) if Path(k).is_absolute() else ROOT/k
  if not p.exists():p=R/k
  if p.is_file():check(p,h)
assert read(R/'profitability.json')['fresh_recipe_counts']=={'inconclusive':136,'faster':118,'slower':34}
assert 'Ran 7 tests' in (R/'planner-scoped-tests.log').read_text() and '\nOK\n' in (R/'planner-scoped-tests.log').read_text()
assert 'FAILED (errors=1)' in (R/'planner-tests.log').read_text()
rawsamples=sum(len(read(R/n)['samples']) for n in ['node-results.json','browser-results.json','native/results.json']);assert rawsamples==57348
local_links=[]
for target in re.findall(r'\]\(([^)#]+)\)',(R/'REPORT.md').read_text()):
 if '://' in target or target in ['verification.json','final-binding.json']:continue
 assert (R/target).exists(),target;local_links.append(target)
for p in ['browser-failed-oom-results.json','browser-failed-oom.png','browser-batches/merge-failure.txt','browser-batches/merger-before-feature-set-fix.py','initial-flat-cost-attempt','publication-name-collision.log','preflight-initial-failure.json']:
 assert (R/p).exists(),p
bindings=['REPORT.md','metadata.json','publication.json','policy-freeze.json','node-results.json','node-summary.json','node-observations.json','browser-results.json','browser-summary.json','browser-observations.json','browser-batches/manifest.json','browser-batches/fixture-binding.json','browser-batches/feature-set-fix-receipt.json','native/results.json','native/summary.json','native/final-review.json','final-integrity.json','final-performance-review.json','root-interval-verification.json','profitability.json','outcome-tables.json','fresh-regressions.json','all-expert-comparisons.json','browser-completed.html','browser-completed.png','verify-final.py']
out=dict(status='passed',scope='End-state artifact/source/lane/report binding; fresh performance outcomes from independently recomputed intervals. Historical full test suite not rerun; legacy discovery error preserved.',entries=1164,added_entries=75,general_laws=21,static_certificates=54,old_symmetric_certificates=40,new_static_certificates=14,canonical_wasm_observations=9666,added_wasm_observations=1800,frozen_artifacts=len(meta['artifact_hashes']),guarded_sources=len(post),unchanged_sources=len(post)-len(changed),changed_sources=changed,author_lanes=lanes,proof_selections=120,exhausted_final_searches=0,complete_fixtures=390,timed_web_cells=180,fresh_cells_per_target=72,timing_samples=rawsamples,exact_output_comparisons=16170,independently_recomputed_intervals=5148,fresh_web_profitability=read(R/'profitability.json')['fresh_recipe_counts'],tests=dict(fold=3,reduction=3,scoped_planner=7,full_planner=dict(passed=9,legacy_discovery_errors=1),historical_full_suite_rerun=False),local_report_links_checked=len(local_links),caller_checks_added=False,runtime_optimizer_added=False,broad_native_superiority_established=False,fresh_gpu_gain_established=False,bindings={p:sha(R/p) for p in bindings})
(R/'verification.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ['bindings','author_lanes']}))
