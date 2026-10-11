import datetime,hashlib,json,re,subprocess
from pathlib import Path
p=Path(__file__).resolve().parent;root=p.parents[1];sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
m=json.loads((p/'metadata.json').read_text());guard=json.loads((p/'source-boundary-before.json').read_text())
for f,h in m['artifact_hashes'].items():assert sha(p/f)==h,f
for f,h in guard.items():assert sha(root/f)==h,f
assert sha(m['compiler_path'])==m['compiler_sha256']
t=re.search(r'Ran (\d+) tests in ([\d.]+)s\s+OK\s*$',(p/'knowledge-tests.log').read_text());assert t and int(t[1])==112
assert json.loads((p/'node-validation.json').read_text())['validation']['comparisons']==858
assert json.loads((p/'control-preflight.json').read_text())['comparisons']==78
ps=subprocess.run(['ps','-axo','pid,args'],text=True,capture_output=True,check=True).stdout
busy=[line for line in ps.splitlines() if ('ink-sequence-proofs' in line or 'planner/plan.py' in line or '-m unittest' in line or ('bench/web-stack-proofs-' in line and '--prepare' in line)) and '--serve' not in line]
assert not busy,busy
(p/'pre-timing.json').write_text(json.dumps(dict(status='passed',time_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),frozen_hashes=len(m['artifact_hashes']),source_guard_hashes=len(guard),full_tests=int(t[1]),full_tests_seconds=float(t[2]),cpu_validation=858,original_js_preflight=78,compiler_sha256=m['compiler_sha256'],owned_author_reviewer_jobs='stopped; mailbox clearance',compiler_test_planner_prepare_jobs=busy,scope='Independent compiler/test jobs complete before sequential Node then browser timing; idle archived HTTP servers excluded.'),indent=2)+'\n')
print('pre-timing clearance passed')
