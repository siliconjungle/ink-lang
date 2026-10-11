"""Bind the unchanged checker, costs, input/control authoring and protocol before timing."""
import hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
before=json.loads((R/'source-boundary-before.json').read_text())
after={p:sha(B/p) for p in before};assert before==after
guard=dict(status='passed',tracked_files=len(before),unchanged=len(before),changed=[],after=after)
(R/'source-boundary-after.json').write_text(json.dumps(guard,indent=2)+'\n')
paths=['planner/ink_planner/semantic_search.py','bench/compact_selection17.py','bench/methodology.py','bench/web-stack-proofs-18.py','bench/web-stack-native-18.py','bench/web-stack-browser-batches18.py','knowledge/producers/web_permutation18_laws.py','knowledge/producers/web_idempotent18_laws.py','knowledge/tests/test_web_permutation18_laws.py','knowledge/tests/test_web_idempotent18_laws.py']
paths += [str(p.relative_to(B)) for p in (B/'bench/web-stack-proofs-18').iterdir() if p.is_file()]
paths += [str((R/n).relative_to(B)) for n in ['cpu-cost-model.json','gpu-cost-model.json','prepare-inputs.py','prepare-browser-batches.py','analyse.py','summarise-outcomes.py']]
receipt=dict(status='frozen-before-performance',reason='New external proof objects only. Same round17 CPU/GPU cost hypotheses, compiler/planner/backend/runtime bytes. Frozen source recipes, sparse-key/threshold profiles and strong skipping controls. Two disjoint browser contexts, nine shuffled measured rounds. Native adaptive calibration starts at one iteration; all trials retained. No timings used for authoring or policy changes.',artifacts={p:sha(B/p) for p in sorted(paths)},compiler_sha256=sha(B.parent/'toolchain/ink-sequence-proofs'),source_guard=guard)
assert not (R/'policy-freeze.json').exists()
(R/'policy-freeze.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(dict(status='passed',bound_artifacts=len(paths),unchanged_sources=len(before))))
