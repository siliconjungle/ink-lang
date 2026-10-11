from pathlib import Path
import json,hashlib,datetime,sys,subprocess
R=Path(__file__).resolve().parent;B=R.parents[1];P=B.parent;K=B/'knowledge'
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
review=read(R/'review/final-report-review.json')
assert review['status'] in {'passed','final-report-review-passes','independent-final-report-review-passes','Final report review passes'},review
assert review['report_sha256']==sha(R/'REPORT.md')
pub=read(R/'publication.json');obs=read(R/'observations.json');pins=read(R/'initial-pins.json')
owner=read(P/'agent-ownership.json');before=read(R/'ownership-before29.json')
for key,v in before.items():assert owner[key]==v,key
owner['web_stack_proof_batch_29'].update(status='completed',completed_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),report=str(R/'REPORT.md'),report_sha256=sha(R/'REPORT.md'),compiler_sha256=pins['compiler_sha256'],snapshot=pub['snapshot'],entries=1867,observations=19160,new_checked_objects=36,new_mathematical_identities=2,new_observations=630,timing_samples=5670,proof_vs_prior_scope='12 count/cardinality cells; ordinary compile-time selection; unchanged engine28',broad_native_goal_achieved=False,no_commit_push_PR=True,no_caller_checks_or_runtime_proof_optimizer=True,independent_reviews='generic/context/portability/saved-data/performance/report passed')
(P/'agent-ownership.json').write_text(json.dumps(owner,indent=2)+'\n')
old=(R/'parent-report-before29.md').read_bytes();assert (P/'REPORT.md').read_bytes().endswith(old)
prefix='''# DB proof batch 29 completed

Two new general cardinality identities remove unobserved scan/indexed-map stages using the unchanged engine28 compiler. Published 36 checked DB objects and 630 observations (5,670 samples); canonical DB now 1,867 objects / 19,160 observations. Prior objects, observations, names and all 343 baseline source files are preserved.

Across the 12 fresh count cells, descriptive paired geometric means versus fair prior Ink are JS 1.22–1.40×, full Wasm 1.11–1.12×, instrumented WebGPU 1.19×, native 1.37–1.55×. Strong handwritten JS/Rust still lead; this batch does not achieve broad native superiority. GPU remains slower than captured CPU controls. Independent proof, journal, statistics and report reviews pass.

[Full report](ink-lang/reports/web-stack-proofs-29-2026-10-11/REPORT.md) · [Final audit](ink-lang/reports/web-stack-proofs-29-2026-10-11/final-audit.json)

The prior report is retained below without alteration.

---

'''
(P/'REPORT.md').write_bytes(prefix.encode()+old)
subprocess.run([sys.executable,str(R/'final-audit.py')],check=True)
archive=K/'research/web-stack-proofs-29';archive.mkdir(exist_ok=True)
for name in ['publication.json','publication-checks.json','candidate-view.json','measurement-plans.json','observations.json','cohort-summary.json','final-audit.json','source-final.json']:
 target=archive/name;data=(R/name).read_bytes()
 if target.exists():assert target.read_bytes()==data,target
 else:target.write_bytes(data)
for name in ['saved-data-review.json','final-performance-review.json','final-report-review.json']:
 target=archive/name;data=(R/'review'/name).read_bytes()
 if target.exists():assert target.read_bytes()==data,target
 else:target.write_bytes(data)
(archive/'report-reference.json').write_text(json.dumps(dict(report=str(R/'REPORT.md'),report_sha256=sha(R/'REPORT.md'),preview=str(R/'report.html'),preview_sha256=sha(R/'report.html')),indent=2)+'\n')
freeze=read(R/'timing-freeze.json')
for p,h in freeze['bindings'].items():assert sha(p)==h,p
bindings={}
for p in R.rglob('*'):
 if p.is_file() and p.name!='completion-binding.json' and '__pycache__' not in p.parts and not p.name.endswith(('.sqlite','.sqlite-wal','.sqlite-shm')):
  bindings[str(p)]=sha(p)
for p in archive.rglob('*'):
 if p.is_file():bindings[str(p)]=sha(p)
for p,h in read(R/'source-final.json')['inventory'].items():bindings[str(B/p)]=h
for name in ['names.json','snapshot.json']:
 p=K/'store'/name;bindings[str(p)]=sha(p)
for i in pub['new_ids']:
 p=K/'store/objects'/f'{i}.json';bindings[str(p)]=sha(p)
for row in obs['rows']:
 p=K/'store/observations'/f"{row['id']}.json";bindings[str(p)]=sha(p)
for p in [P/'REPORT.md',P/'agent-ownership.json',Path(pins['compiler'])]:bindings[str(p)]=sha(p)
result=dict(schema=29,status='complete',snapshot=pub['snapshot'],entries=1867,observations=19160,new_checked_objects=36,new_mathematical_identities=2,new_observations=630,timing_samples=5670,baseline_sources_unchanged=343,report_sha256=sha(R/'REPORT.md'),final_audit_sha256=sha(R/'final-audit.json'),bindings=dict(sorted(bindings.items())),scope='DB-only compile-time cardinality rewrites; measured one-machine count family, no broad native-performance claim',disposable_sqlite='rebuilt and checked, excluded from content binding')
for p,h in bindings.items():assert sha(p)==h,p
(R/'completion-binding.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k!='bindings'},indent=2));print('bound files',len(bindings))
