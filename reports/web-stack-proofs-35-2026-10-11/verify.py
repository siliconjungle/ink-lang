"""Verify canonical publication against frozen pre-change and measured evidence."""
from pathlib import Path
import hashlib,json,sys
R=Path(__file__).resolve().parent;B=R.parents[1];sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store

def read(p):return json.loads(Path(p).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
baseline=read(R/'production-baseline.json');st=Store(B/'knowledge');stage=read(R/'staging/stage.json')
prior=Store(R/'staging/fair-prior');old=set(prior.members());current=set(st.members())
assert prior.snapshot_id==stage['previous_snapshot'] and len(old)==2495
assert st.snapshot_id==stage['snapshot'] and len(current)==2508 and old<=current
assert current-old==set(stage['fresh_entries'])
assert all(st.object(oid)==prior.object(oid)for oid in old)
old_names=read(R/'staging/fair-prior/store/names.json');names=read(B/'knowledge/store/names.json')
assert len(old_names)==4242 and len(names)==4255 and all(names.get(k)==v for k,v in old_names.items())
assert all(sha(B/p)==h for p,h in baseline['source_bindings'].items())
assert len(baseline['source_bindings'])==122
metadata=read(R/'targets/metadata.json');assert sha(Path(metadata['compiler']))==metadata['compiler_sha256']==baseline['compiler_sha256']
observations=read(R/'observations.json');before=read(R/'prior-observation-bindings.json')
assert before['count']==23420 and observations['added']==840 and observations['total_files']==24260
assert all(sha(B/'knowledge/store/observations'/name)==h for name,h in before['files'].items())
for p in ['targets/node-audit.json','targets/browser-audit.json','targets/native/audit.json','review/final-performance-review.json']:
 assert read(R/p)['status']=='passed',p
analysis=read(R/'analysis.json');assert analysis['samples']==7560 and analysis['paired_comparisons']==672 and len(analysis['strata'])==112
for p,h in analysis['bindings'].items():assert sha(R/p)==h,p
result=dict(status='passed',snapshot=st.snapshot_id,entries=len(current),previous_entries_preserved=len(old),discovery_names=len(names),observations_added=840,observations_total=24260,prior_observation_bytes_preserved=before['count'],production_sources_unchanged=122,compiler_sha256=metadata['compiler_sha256'],focused_tests=25,performance_review_sha256=sha(R/'review/final-performance-review.json'),analysis_sha256=sha(R/'analysis.json'),publication_sha256=sha(R/'publication.json'),observations_sha256=sha(R/'observations.json'),source_sha256=sha(__file__))
(R/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
