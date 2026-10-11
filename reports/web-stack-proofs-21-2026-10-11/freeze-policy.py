"""Bind the unchanged checker, costs, input/control authoring and protocol before timing."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=json.loads((R/'source-boundary-before.json').read_text())
after={p:sha(B/p) for p in before};assert before==after
guard=dict(status='passed',tracked_files=len(before),unchanged=len(before),changed=[],after=after)
(R/'source-boundary-after.json').write_text(json.dumps(guard,indent=2)+'\n')
paths=['planner/ink_planner/semantic_search.py','bench/compact_selection17.py','bench/methodology.py','bench/web-stack-proofs-21.py','bench/web-stack-native-21.py','bench/web-stack-browser-batches21.py','knowledge/producers/web_predicate21_laws.py','knowledge/producers/web_structure21_laws.py','knowledge/producers/web_static21_laws.py','knowledge/producers/beta_sharing17.py','knowledge/producers/beta_specialization15.py','knowledge/research/web-stack-proofs-21/static-derivation-reviewed/witnesses.json','knowledge/research/web-stack-proofs-21/static-derivation-reviewed/admission.json','knowledge/tests/test_web_predicate21_laws.py','knowledge/tests/test_web_structure21_laws.py']
paths += [str(p.relative_to(B)) for p in (B/'bench/web-stack-proofs-21').iterdir() if p.is_file()]
paths += [str((R/n).relative_to(B)) for n in ['cpu-cost-model.json','gpu-cost-model.json','prepare-inputs.py','prepare-browser-batches.py','analyse.py','summarise-outcomes.py','analyse-reviewed.py','summarise-outcomes-reviewed.py','derive-static.py']]
paths += ['knowledge/research/web-stack-proofs-21/predicate/evidence.json','knowledge/research/web-stack-proofs-21/predicate/NOTES.md','knowledge/research/web-stack-proofs-21/structure/evidence.json','knowledge/research/web-stack-proofs-21/structure/NOTES.md']
paths += [str((R/n).relative_to(B)) for n in ['native/metadata.json','native/validation.json','protocol-compiled-preflight-review.py','protocol-compiled-preflight-review.json','protocol-compiled-preflight-review.md']]
paths += ['knowledge/producers/web_gpu21_laws.py','knowledge/tests/test_web_gpu21_laws.py','knowledge/research/web-stack-proofs-21/gpu/evidence.json','knowledge/research/web-stack-proofs-21/gpu/NOTES.md']
paths += [str((R/n).relative_to(B)) for n in ['extend-old-closure.py','derive-static-gpu.py']]
paths += ['knowledge/research/web-stack-proofs-21/static-gpu/witnesses.json','knowledge/research/web-stack-proofs-21/static-gpu/admission.json']
paths=sorted(set(paths))
receipt=dict(status='frozen-before-performance',reason='New external generic and composed proof endpoints only. Same round20 CPU/GPU cost hypotheses, compiler/planner/backend/runtime bytes. Frozen new generic sequence recipes/profiles and strong fused controls. Disjoint browser contexts, nine shuffled measured rounds. Native calibration zero timer handled uniformly from outset; all trials retained. No timings used for authoring or policy changes.',artifacts={p:sha(B/p) for p in sorted(paths)},compiler_sha256=sha(B.parent/'toolchain/ink-sequence-proofs'),source_guard=guard)
assert not (R/'policy-freeze.json').exists()
(R/'policy-freeze.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(dict(status='passed',bound_artifacts=len(paths),unchanged_sources=len(before))))
