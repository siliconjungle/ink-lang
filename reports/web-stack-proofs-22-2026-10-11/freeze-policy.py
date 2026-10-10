"""Bind complete untimed authoring and target preparation before performance."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=json.loads((R/'source-boundary-before.json').read_text());after={p:sha(B/p) for p in before}
assert before==after and len(before)==102
source_guard=dict(status='passed',tracked_files=len(before),unchanged=len(before),changed=[],after=after)
(R/'source-boundary-after.json').write_text(json.dumps(source_guard,indent=2)+'\n')
paths=[B/n for n in ['planner/ink_planner/semantic_search.py','bench/compact_selection17.py','bench/compact_selection22.py','bench/methodology.py','bench/web-stack-proofs-22.py','bench/web-stack-native-22.py','bench/web-stack-browser-batches22.py','knowledge/producers/web_guard22_laws.py','knowledge/producers/web_indexed22_laws.py','knowledge/producers/web_static22_laws.py','knowledge/producers/beta_sharing17.py','knowledge/producers/beta_specialization15.py','knowledge/tests/test_web_guard22_laws.py','knowledge/tests/test_web_indexed22_laws.py']]
paths += list((B/'bench/web-stack-proofs-22').glob('*'))
paths += [R/n for n in ['cpu-cost-model.json','gpu-cost-model.json','prepare-inputs.py','prepare-browser-batches.py','analyse-reviewed.py','summarise-outcomes-reviewed.py','derive-static.py','native/metadata.json','native/validation.json','compiled-preflight.py','protocol-compiled-preflight-review.json','protocol-compiled-preflight-review.md','browser-batches/manifest.json']]
paths += [p for p in (B/'knowledge/research/web-stack-proofs-22').rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.log']
paths=sorted(set(p for p in paths if p.is_file()))
assert len(paths)>30
receipt=dict(status='frozen-before-performance',reason='Checked generic endpoints and explicit old-law compositions. Four complementary references shared with fair prior; eight fresh recipes. Same batch21 CPU/GPU cost bytes and frozen compiler/backend/runtime/planner. Strong fused controls and preset fixture bytes selected without timings; seed20261031, nine rounds, two warmups. Native/Node/three browser contexts sequential with author jobs stopped.',artifacts={str(p.relative_to(B)):sha(p) for p in paths},compiler_sha256=sha(B.parent/'toolchain/ink-sequence-proofs'),source_guard=source_guard)
assert not (R/'policy-freeze.json').exists()
(R/'policy-freeze.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(dict(status='passed',bound_artifacts=len(paths),unchanged_sources=len(before))))
