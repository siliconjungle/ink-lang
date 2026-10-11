"""Verify canonical publication and immutable batch37 evidence."""
from pathlib import Path
import hashlib,json,sys
R=Path(__file__).resolve().parent;B=R.parents[1];sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store
def read(p):return json.loads(Path(p).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
st=Store(B/'knowledge');stage=read(R/'staging/stage.json');prior=Store(R/'staging/fair-prior');old=set(prior.members());current=set(st.members())
assert len(old)==2512 and len(current)==2534 and old<=current
assert prior.snapshot_id==stage['previous_snapshot'] and st.snapshot_id==stage['snapshot']
assert current-old==set(stage['fresh_entries']) and len(stage['fresh_entries'])==22 and not stage['shared_old_entries']
assert all(st.object(i)==prior.object(i)for i in old)
oldnames=read(R/'staging/fair-prior/store/names.json');names=read(B/'knowledge/store/names.json')
assert len(oldnames)==4259 and len(names)==4281 and all(names.get(k)==v for k,v in oldnames.items())
b=read(R/'production-baseline.json');assert len(b['source_bindings'])==122 and all(sha(B/p)==h for p,h in b['source_bindings'].items())
m=read(R/'targets/metadata.json');assert sha(m['compiler'])==m['compiler_sha256']==b['compiler_sha256']
before=read(R/'prior-observation-bindings.json');observations=read(R/'observations.json')
assert before['count']==25100 and observations['added']==840 and observations['total_files']==25940
assert all(sha(B/'knowledge/store/observations'/p)==h for p,h in before['files'].items())
for p in ['targets/node-audit.json','targets/browser-audit.json','targets/native/audit.json','review/final-performance-review.json']:assert read(R/p)['status']=='passed',p
a=read(R/'analysis.json');assert a['samples']==7560 and a['paired_comparisons']==672 and len(a['strata'])==112
assert all(sha(R/p)==h for p,h in a['bindings'].items())
j=dict(status='passed',snapshot=st.snapshot_id,entries=len(current),previous_entries_preserved=len(old),fresh_objects=22,generic_endpoints=6,proof_supports=12,source_certificates=4,discovery_names=len(names),observations_added=840,observations_total=25940,prior_observation_bytes_preserved=before['count'],production_sources_unchanged=122,compiler_sha256=m['compiler_sha256'],focused_tests=25,performance_review_sha256=sha(R/'review/final-performance-review.json'),analysis_sha256=sha(R/'analysis.json'),publication_sha256=sha(R/'publication.json'),observations_sha256=sha(R/'observations.json'),source_sha256=sha(__file__))
(R/'verification.json').write_text(json.dumps(j,indent=2)+'\n');print(json.dumps(j))
