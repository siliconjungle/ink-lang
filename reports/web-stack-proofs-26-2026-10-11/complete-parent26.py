"""Complete only batch26 ownership and prepend authenticated prior history."""
import hashlib, json
from pathlib import Path

R = Path(__file__).resolve().parent
B = R.parents[1]
P = B.parent
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
v = json.loads((R/'verification.json').read_text())
assert v['status'] == 'passed'
report = R/'REPORT.md'
assert sha(report) == '6827cc410ebb3ff14861e4243643334a28e96f2ce10b7c9d6bd60c3825c8d39f'
history = (R/'parent-REPORT.md.before').read_bytes()
assert (P/'REPORT.md').read_bytes() == history
lead = '''## Completed batch26: invariant control-flow proofs and direct JavaScript emission (2026-10-11)

[Detailed report](ink-lang/reports/web-stack-proofs-26-2026-10-11/REPORT.md). Three agents and integration added 32 checked objects: 8 generic numeric instances of two invariant-choice identities, 16 typed source certificates and 8 newly derived old-only certificates. The catalogue now has 1,790 entries and 17,026 canonical observations. Direct JS loops and scalar locals replace callback/Let scaffolding at compilation; no caller checks or runtime proof search were added.

Nine families and 56 timed cases per host/boundary produced 20,268 samples, 9,403 complete comparisons and 4,056 independently recomputed intervals. JS emitter captured-call gains are 29/56 Node and 24/56 browser, with zero confirmed regressions at that boundary; synchronous borrowed calls include 4 Node and 1 browser regression. Fresh proof marginal JS gains are mixed: Node 4 gains / 1 loss / 11 inconclusive; browser 2 / 2 / 12. All 135 adverse attribution comparisons remain archived.

Broad native superiority remains unachieved: native resident Ink/C wins 7/56 versus optimized Rust, generated Wasm wins 0/56 per host versus optimized Rust Wasm, and actual WebGPU loses all 12 reference cells to optimized JS and Rust Wasm. Core/checker/planner/C/CPU hosts remain unchanged; Wasm executable bytes match across emitter states, with debug paths authenticated separately. A mis-pinned pre-timing preparation and initial audit failures remain archived; they supplied no timing samples. All prior history and unrelated ownership are preserved below. No commit, push or PR was made.

'''
(P/'REPORT.md').write_bytes(lead.encode() + history)
saved = json.loads((R/'parent-agent-ownership.json.before').read_text())
ownership = json.loads((P/'agent-ownership.json').read_text())
assert {k:z for k,z in ownership.items() if k != 'web_stack_proof_batch_26'} == saved
batch = ownership['web_stack_proof_batch_26']
assert batch['status'] == 'authoring'
batch.update(status='completed', snapshot=v['snapshot'], catalogue_entries=v['catalog_entries'],
             added_checked_objects=v['added_entries'], canonical_observations=v['canonical_observations'],
             observations_added=v['observations_added'], timing_samples=v['timing_samples'],
             complete_benchmark_comparisons=v['complete_benchmark_comparisons'],
             independently_recomputed_intervals=v['independent_intervals'],
             report=str(report), report_sha256=sha(report),
             broad_native_goal_achieved=False,
             conclusion='Reusable JS emitter gains; mixed proof profitability; optimized competitors mostly win.',
             no_commit_push_PR=True, no_caller_checks_or_runtime_proof_optimizer=True)
(P/'agent-ownership.json').write_text(json.dumps(ownership, indent=2)+'\n')
receipt = dict(status='completed', parent_report_sha256=sha(P/'REPORT.md'),
               ownership_sha256=sha(P/'agent-ownership.json'), report_sha256=sha(report),
               previous_report_bytes_preserved=True, unrelated_ownership_preserved=True,
               helper_sha256=sha(Path(__file__)))
(R/'parent-completion.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(json.dumps(receipt))
