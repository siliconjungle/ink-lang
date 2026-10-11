"""Update this batch's parent summary, preserving all historical bytes and roles."""
import datetime,hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent;P=R.parents[2]
v=json.loads((R/'verification.json').read_text())
assert json.loads((R/'protocol-final-review.json').read_text())['status']=='Final review passes'
old=(R/'parent-REPORT.md.before').read_bytes()
assert (P/'REPORT.md').read_bytes()==old
intro='''# Checked web-stack proof batch 23 — completed

Three agents and integration added 40 checked objects: 17 generic optimization endpoints, four deployment compositions, six supports, twelve fresh source bridges and one shared old-only consequence. The catalogue has 1,688 entries and 14,946 canonical observations. These laws erase complementary filter counts, unused scan state and first-match intermediate arrays under pure total callback semantics.

Of 120 fresh cells per CPU target, prior-to-current improvements are 104 Node JS, 104 browser JS, 88 Node Wasm, 85 browser Wasm and 108 native resident/copied-input cells each. All 51 adverse comparisons remain archived. These are gains over prior Ink; expert JS/Rust win most comparisons. There are no confirmed native expert-Rust wins, and all 36 actual complete-call WebGPU cells lose to expert JS. Broad native superiority remains unproven; first-match folds still scan the whole input.

37,044 samples, 10,536 complete comparisons and 3,300 independently recomputed intervals passed reviews. All 102 guarded production files are unchanged. Proof application is compile time; no runtime caller checks or proof optimizer were added. No commit, push or PR was made.

[Full batch23 report](ink-lang/reports/web-stack-proofs-23-2026-10-11/REPORT.md) · [all outcomes](ink-lang/reports/web-stack-proofs-23-2026-10-11/outcome-tables.json) · [verification](ink-lang/reports/web-stack-proofs-23-2026-10-11/verification.json)

---

'''
(P/'REPORT.md').write_bytes(intro.encode()+old)
ownership=json.loads((P/'agent-ownership.json').read_text())
saved=json.loads((R/'parent-agent-ownership.json.before').read_text())
assert {k:z for k,z in ownership.items() if k!='web_stack_proof_batch_23'}==saved
ownership['web_stack_proof_batch_23'].update(status='completed',completed_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),snapshot=v['snapshot'],entries=v['catalog_entries'],observations=v['canonical_observations'],added_entries=v['added_entries'],generic_optimization_endpoints=17,timing_samples=v['timing_samples'],complete_comparisons=v['exact_benchmark_comparisons'],independently_recomputed_intervals=3300,adverse_comparisons_retained=51,broad_native_expert_superiority=False,report_sha256=hashlib.sha256((R/'REPORT.md').read_bytes()).hexdigest(),limits='Preset U32 calls on one machine; broader types proved separately. Expert implementations mostly faster; zero confirmed native Rust or GPU expert wins. No runtime checks or optimizer added.')
(P/'agent-ownership.json').write_text(json.dumps(ownership,indent=2)+'\n')
print(json.dumps(dict(status='completed',parent_history_preserved=True,unrelated_ownership_preserved=True)))
