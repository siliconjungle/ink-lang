"""Re-admit the exact checked closure with the frozen new compiler."""
import hashlib,json,subprocess
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
d=B/'knowledge/research/web-stack-proofs-27/static-derivation'
old=json.loads((d/'admission.json').read_text());build=json.loads((R/'compiler-build.json').read_text())
argv=[build['new_path']]+old['argv'][1:]
assert sha(argv[0])==build['new_sha256']
r=subprocess.run(argv,capture_output=True,text=True)
receipt=dict(argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr,
 compiler_sha256=sha(argv[0]),view_sha256=sha(argv[-1]),source_sha256=sha(argv[2]))
(R/'new-checker-admission.json').write_text(json.dumps(receipt,indent=2)+'\n')
assert r.returncode==0 and not r.stderr
assert json.loads(r.stdout)==json.loads(old['stdout'])
print(json.dumps(dict(status='passed',closure_objects=len(json.loads(r.stdout)['entries']),receipt_sha256=sha(R/'new-checker-admission.json'))))
