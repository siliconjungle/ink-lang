"""Close local batch30 evidence without touching frozen sources or prior work."""
from pathlib import Path
import json, hashlib, sys
R=Path(__file__).resolve().parent; B=R.parents[1]; K=B/'knowledge'; P=B.parent
sys.path.insert(0,str(K))
from ink_knowledge import Store
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
pub=read(R/'publication.json'); obs=read(R/'observations.json'); audit=read(R/'final-audit.json')
assert pub['new_entries']==24 and obs['new_observations']==840 and audit['status']=='passed'
assert read(R/'review/saved-data-review.json')['status']=='passed'
review=read(R/'review/final-report-review.json')
assert 'pass' in str(review.get('status','')).lower(),review.get('status')
assert sha(R/'REPORT.md') in json.dumps(review), 'final report hash missing from review'
store=Store(K);assert store.snapshot_id==pub['snapshot'] and len(store.members())==1891
assert len(list((K/'store/observations').glob('*.json')))==20000
ownership=read(P/'agent-ownership.json');before=read(R/'ownership-before30.json')
for key,value in before.items():assert ownership[key]==value,key
lane=ownership['web_stack_proof_batch_30']
lane.update(status='complete',snapshot=pub['snapshot'],new_checked_objects=24,entries=1891,
            new_observations=840,observations=20000,samples=7560,
            prior_sources_unchanged=355,report=str(R/'REPORT.md'),report_sha256=sha(R/'REPORT.md'),
            broad_native_goal_achieved=False,
            result='Cheap map-filter-map improves JS; other cohorts/targets include regressions. Fused handwritten controls still lead overall.',
            evidence=dict(publication_sha256=sha(R/'publication.json'),analysis_sha256=sha(R/'analysis.json'),
                          observations_sha256=sha(R/'observations.json'),final_audit_sha256=sha(R/'final-audit.json'),
                          final_report_review_sha256=sha(R/'review/final-report-review.json')))
(P/'agent-ownership.json').write_text(json.dumps(ownership,indent=2)+'\n')
old=(R/'parent-report-before30.md').read_bytes()
current=(P/'REPORT.md').read_bytes();assert current.endswith(old)
summary=("# Completed DB proof batch30 — 2026-10-11\n\n"
         "Published 24 checked objects for concat-filter and map-filter-map transport. "
         "Same frozen compiler; 355 prior sources unchanged. Cheap map pipeline averages 1.224× Node JS and 1.264× browser JS versus prior Ink. "
         "Other recipes/targets regress; full 24-cell browser JS 0.961×, WebGPU 0.963×. "
         "Efficient handwritten Rust/JS still lead overall; broad native goal remains unmet. "
         "7,560 samples are recorded in 840 new observations; canonical 1,891 objects/20,000 observations.\n\n"
         "[Full batch30 report](ink-lang/reports/web-stack-proofs-30-2026-10-11/REPORT.md). "
         "Publication and evidence are local; no commit, push or PR.\n\n").encode()
(P/'REPORT.md').write_bytes(summary+old)
archive=K/'research/web-stack-proofs-30';archive.mkdir(exist_ok=True,parents=True)
for name in ['REPORT.md','analysis.json','cohorts.json','source-final.json','final-audit.json',
             'timing-freeze.json','review/saved-data-review.json','review/final-performance-review.json',
             'review/final-report-review.json','benchmark-preparation/performance-author-review.json']:
    dest=archive/name;dest.parent.mkdir(exist_ok=True,parents=True);dest.write_bytes((R/name).read_bytes())
paths=[p for p in R.rglob('*') if p.is_file() and p.name!='completion-binding.json'
       and '__pycache__' not in p.parts and not any(p.name.endswith(s) for s in ['.sqlite','.sqlite-wal','.sqlite-shm'])]
paths += [B/p for p in read(R/'source-final.json')['inventory']]
paths += [Path(read(R/'initial-pins.json')['compiler']),P/'REPORT.md',P/'agent-ownership.json']
paths += [p for p in (K/'store').iterdir() if p.is_file()]
paths += [K/'store/objects'/(i+'.json') for i in pub['new_ids']]
paths += [K/'store/observations'/(x['id']+'.json') for x in obs['rows']]
paths += [p for p in archive.rglob('*') if p.is_file()]
bindings={str(p.resolve()):sha(p) for p in sorted(set(paths))}
result=dict(status='complete',snapshot=pub['snapshot'],entries=1891,observations=20000,
            samples=7560,new_checked_objects=24,new_observations=840,bindings=bindings,
            scope='Local DB publication; exact source/raw/evidence hashes. SQLite/cache files excluded. Profitability remains workload-dependent; no broad native superiority.')
(R/'completion-binding.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='bindings'}));print('bound files',len(bindings))
