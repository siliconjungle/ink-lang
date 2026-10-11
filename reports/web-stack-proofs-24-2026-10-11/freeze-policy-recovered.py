"""Bind final authoring/targets before any timing, with two declared emitter edits."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert not any((R/n).exists() for n in ['node-results.json','browser-results.json','native/results.json'])
assert not (R/'policy-freeze.json').exists()
before=json.loads((R/'source-boundary-before.json').read_text());after=json.loads((R/'source-boundary-after.json').read_text())
changed=sorted(p for p in before if after[p]!=before[p]);assert changed==['lowerings/c/src/compute.rs','lowerings/js/src/lib.rs']
assert all(sha(B/p)==h for p,h in after.items())
assert all(sha(R/'original-source'/p)==before[p] for p in changed)
paths=set()
for folder in [R,B/'bench/web-stack-proofs-24',B/'knowledge/research/web-stack-proofs-24']:
 for p in folder.rglob('*'):
  if p.is_file() and p.suffix not in ['.log','.pyc'] and '__pycache__' not in p.parts and not any(x in p.parts for x in ['prior-overlay','seed-stage','final-stage']) and not any(x.startswith('frontier-') for x in p.parts):paths.add(p)
for name in ['bench/web-stack-proofs-24.py','bench/web-stack-native-24.py','bench/web-stack-browser-batches24.py','knowledge/producers/web_demand24_laws.py','knowledge/producers/web_static24_laws.py','knowledge/tests/test_web_demand24_laws.py','lowerings/js/tests/early_exit.rs','lowerings/c/tests/early_exit.rs','bench/methodology.py','bench/compact_selection22.py']:paths.add(B/name)
paths.update(B/p for p in after)
receipt=dict(status='frozen-before-performance',artifacts={str(p.relative_to(B)):sha(p) for p in sorted(paths)},source_guard=dict(keys=102,unchanged=100,changed=changed),scope='Proofs, sources, original emitters, targets, controls, policies, and audit helpers frozen before first timing. No caller checks or runtime proof optimizer added. Existing pure semantics/checker unchanged; two authorized operational emitter changes.')
(R/'policy-freeze.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(dict(status='passed',artifacts=len(paths),unchanged_guarded_sources=100,changed_emitters=changed)))
