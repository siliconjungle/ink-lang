"""Bind before timing; C/JS compile-time known-function inlining and checked nested-zip laws."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert not any((R/n).exists() for n in ['node-results.json','browser-results.json','native/results.json'])
assert not (R/'policy-freeze.json').exists()
pins=json.loads((R/'initial-pins.json').read_text())
before=json.loads((R/'source-boundary-before.json').read_text());after=json.loads((R/'source-boundary-after.json').read_text())
expected=sorted(pins['expected_source_changes']);assert set(pins['expected_production_changes'])=={'lowerings/js/src/lib.rs','lowerings/c/src/compute.rs'}
changed=sorted(p for p in before if after[p]!=before[p])
assert len(before)==len(after)==102 and changed==sorted(pins['expected_source_changes'])==expected
assert all(sha(B/p)==h for p,h in after.items())
assert all(sha(R/'original-source'/p)==before[p] for p in changed)
paths=set()
for folder in [R,B/'bench/web-stack-proofs-27',B/'knowledge/research/web-stack-proofs-27']:
 for p in folder.rglob('*'):
  if p.is_file() and p.suffix not in ['.log','.pyc'] and '__pycache__' not in p.parts and not any(x in p.parts for x in ['prior-overlay','seed-stage','final-stage']) and not any(x.startswith('frontier-') for x in p.parts):paths.add(p)
for name in ['knowledge/producers/web_static27_laws.py','bench/web-stack-proofs-27.py','bench/web-stack-native-27.py','bench/web-stack-browser-batches27.py','knowledge/producers/web_zip27_laws.py','knowledge/tests/test_web_zip27_laws.py','bench/methodology.py','bench/compact_selection22.py']:paths.add(B/name)
paths.update(B/p for p in after)
paths.update(p for lower in ['js','c'] for p in (B/'lowerings'/lower/'tests').rglob('*') if p.is_file() and p.suffix=='.rs')
receipt=dict(status='frozen-before-performance',artifacts={str(p.relative_to(B)):sha(p) for p in sorted(paths)},source_guard=dict(keys=102,unchanged=102-len(changed),changed=changed),scope='Proofs, prior sources, targets, controls, policies and audit helpers bound before first timing. Backend factor is bounded known-function inlining in C and JS; C/Wasm executable code may change while ABI is preserved. Only two production emitters plus disclosed test instrumentation change. Core/checker/planner unchanged; no caller checks or runtime proof optimizer added.')
(R/'policy-freeze.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(dict(status='passed',artifacts=len(paths),unchanged_guarded_sources=102-len(changed),changed_backend_host_sources=changed)))
