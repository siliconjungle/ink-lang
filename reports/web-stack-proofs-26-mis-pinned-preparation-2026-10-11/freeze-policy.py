"""Bind before timing; One JSproduction lowering and its structural differential test change only."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert not any((R/n).exists() for n in ['node-results.json','browser-results.json','native/results.json'])
assert not (R/'policy-freeze.json').exists()
pins=json.loads((R/'initial-pins.json').read_text())
before=json.loads((R/'source-boundary-before.json').read_text());after=json.loads((R/'source-boundary-after.json').read_text())
expected=sorted(pins['expected_source_changes']);assert set(expected)=={'lowerings/js/src/lib.rs','lowerings/js/tests/differential.rs'}
changed=sorted(p for p in before if after[p]!=before[p])
assert len(before)==len(after)==102 and changed==sorted(pins['expected_source_changes'])==expected
assert all(sha(B/p)==h for p,h in after.items())
assert all(sha(R/'original-source'/p)==before[p] for p in changed)
paths=set()
for folder in [R,B/'bench/web-stack-proofs-26',B/'knowledge/research/web-stack-proofs-26']:
 for p in folder.rglob('*'):
  if p.is_file() and p.suffix not in ['.log','.pyc'] and '__pycache__' not in p.parts and not any(x in p.parts for x in ['prior-overlay','seed-stage','final-stage']) and not any(x.startswith('frontier-') for x in p.parts):paths.add(p)
for name in ['bench/web-stack-proofs-26.py','bench/web-stack-native-26.py','bench/web-stack-browser-batches26.py','knowledge/producers/web_invariant26_laws.py','knowledge/tests/test_web_invariant26_laws.py','bench/methodology.py','bench/compact_selection22.py']:paths.add(B/name)
paths.update(B/p for p in after)
paths.update(B/p for p in ['lowerings/js/tests/early_exit.rs','lowerings/js/tests/statements.rs'])
receipt=dict(status='frozen-before-performance',artifacts={str(p.relative_to(B)):sha(p) for p in sorted(paths)},source_guard=dict(keys=102,unchanged=100,changed=changed),scope='Proofs, prior sources, targets, controls, policies and audit helpers bound before first timing. Backend factor is direct-loop JS emission only; C/Wasm/host stay byte identical. One production file plus its structural test change; two of102 guards change. Core/checker/planner unchanged; no caller checks or runtime proof optimizer added.')
(R/'policy-freeze.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(dict(status='passed',artifacts=len(paths),unchanged_guarded_sources=100,changed_backend_host_sources=changed)))
