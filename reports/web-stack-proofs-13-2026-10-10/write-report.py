"""Render batch13 results from frozen receipts; do not pool the confirmation run."""
import collections
import hashlib
import json
from pathlib import Path

p = Path(__file__).resolve().parent

def read(name):
    return json.loads((p / name).read_text())

def fmt(ci):
    return f'{ci[0]:.3f}× [{ci[1]:.3f}, {ci[2]:.3f}]'

def controls(summary, key):
    c = collections.Counter()
    for row in summary['measurements']:
        ci = row['paired_ratios_95pct'][key]
        c['checked faster' if ci[2] < 1 else 'control faster' if ci[1] > 1 else 'inconclusive'] += 1
    return ', '.join(f'{k}: {c[k]}' for k in ['checked faster', 'inconclusive', 'control faster'])

def inverse(ci):
    return [1 / ci[0], 1 / ci[2], 1 / ci[1]]

pub = read('publication.json')
m = read('metadata.json')
profit = read('profitability.json')
audit = read('root-interval-verification.json')
imp = read('observation-import.json')
route = read('backend-routing.json')
sizes = read('artifact-sizes.json')['bytes']
tests = read('test-scope.json')
pre = read('pre-timing.json')
control = read('control-preflight.json')
comparison_scope = read('comparison-scope.json')
rerun = read('validation-rerun.json')
confirm = read('gpu-confirmation.json')
confirm_pre = read('gpu-confirmation-preflight.json')
summaries = {host: read(f'{host}-summary.json') for host in ['node', 'browser']}
for host in summaries:
    assert hashlib.sha256((p / f'{host}-summary.json').read_bytes()).hexdigest() == comparison_scope['hosts'][host]['summary_sha256']
assert comparison_scope['native_rust_measured_this_batch'] is False
assert comparison_scope['expert_already_fused_factored_controls_measured'] is False
assert comparison_scope['general_language_speed_ranking_established'] is False
assert sum(s['samples'] for s in summaries.values()) == 6048
assert sum(s['validation']['comparisons'] for s in summaries.values()) == 2616
assert tests['current_tests'] == 21 and tests['prior_full_suite']['tests'] == 112
assert m['selections']['prior']['applications'] == 0
assert all(m['prior_core_equals_original'].values())
assert all(len(ids) == 1 for ids in m['new_laws_per_function'].values())
assert len(confirm['replicated']) == 0 and len(confirm['unreplicated']) == 1
assert confirm['pooled'] is False and confirm['canonical_observations_imported'] == 0
adverse = [d for d in profit['decisions'] if d['verdict'] == 'slower']
node_adverse = {(d['case'], d['input']) for d in adverse if d['host'] == 'node'}
assert len(node_adverse) == 9

lines = [
    '# Ink web proof batch 13 — 10 October 2026', '',
    f'Two proof authors and an independent reviewer supplied **{pub["added_entries"]} fresh checked proofs**, growing the catalogue **{pub["previous_entries"]}→{pub["entries"]}**. Six U32 representatives were measured with the same frozen compiler. Browser JavaScript benefits are clear on the largest inputs, but Node has adverse workloads. **No confirmed GPU speedup is established:** the one nominal main-run GPU gain fails a separate same-input repeat.', '',
    'These remain targeted proof benchmarks. The collection equations are reusable for arbitrary pure total unary callbacks, while the 6/12/24-term geometric prefixes are specialised word-polynomial patterns. This batch measures representative instances, not the whole compiler or a broad application suite. It does not establish a general ranking of Ink, JavaScript, Wasm or Rust.', '',
    '| Proof family | Instances | Transformation |', '|---|---:|---|',
    '| Mixed-radix geometric prefixes with 6/12/24 terms | 9 | Expanded sums/products become compact shared-power factor products |',
    '| Mapped-value left gate | 4 | Bind the left mapped predicate value once; skip an unused right callback and fuse output stages |',
    '| Mapped-value right gate | 4 | Bind the right mapped predicate value once; retain the original comparison and fuse output stages |',
    '| Nested weighted gate | 4 | Fuse nested zip/postmap and skip unused weighting work |', '',
    'Numeric laws cover U32/I32/U64 rings modulo 2^32 or 2^64. For m=1/2/3, the divisor-free identity is `S_(3*2^m)(x) = (1+x+x²)*product(1+x^(3*2^j), j=0..m-1)`, where `S_N(x)=1+x+...+x^(N-1)`. Source sums and products are explicitly balanced, with no shared-power source locals. Targets share x²/x³/x⁶/x¹² through existing typed Lets; both versions retain final `*k+seed`. Mathematical powers here are notation: compiled sources have no runtime exponent loop, artificial repeat or division, and x=1 is valid. These are arbitrary wrapping-word models, excluding F32 and real-series numerical-accuracy claims.', '',
    'Actual source/selected scalar AST counts, including calibration and each local binding expression:', '',
    '| Kernel | Multiplications | Additions | Selected existing Lets |', '|---|---:|---:|---:|',
    '| mixed_prefix6 | 11→4 | 6→4 | 2 |',
    '| mixed_prefix12 | 56→6 | 12→5 | 3 |',
    '| mixed_prefix24 | 254→8 | 24→6 | 4 |', '',
    'These are structural operations, not machine instructions or speed ratios. Normal JIT/release/compiler/driver common-expression elimination is allowed for both versions; an original backend may already remove much of this work. Sharing uses existing beta/Let semantics rather than a new trusted optimisation rule.', '',
    'Collection laws also cover F32. The first two gates depend on mapped values, so selected code binds the relevant callback result once for both comparison and output. Replacing that predicate with an original-input predicate would be wrong. The nested gate retains the original `x+(x*k)` grouping. Original `<` and exact per-element primitive grouping/rounding are preserved, including NaNs, infinities and signed zeros; `<` false includes unordered NaN outcomes and is not generally equivalent to `>=`. Pure total callbacks permit global scheduling changes and omission of unused invocations; effectful or divergent callbacks are outside this model. Mapped-value families remove three intermediate lists, and the nested family removes two. Full output allocation/writes/transport remain O(N).', '',
    'All 21 statements admit through the existing generic kernel, default-select, replay and reify. Immutable old977 selects zero applications and leaves all six actual benchmark bodies unchanged; new default planning applies exactly one fresh law per function. IDs and exact statement endpoints are checked for prior-catalogue duplicates. Hashes and pins identify evidence rather than establish mathematical truth. [Numeric evidence](../../knowledge/research/web-stack-proofs-13/compute/evidence.json) authenticates 85 author artifacts; [collection notes/receipts](../../knowledge/research/web-stack-proofs-13/collection/NOTES.md), [selection metadata](metadata.json) and [publication](publication.json) retain commands and evidence.', '',
    f'**Current validation: {tests["current_tests"]} tests pass**, comprising six numeric tests, three collection tests and twelve store/publisher/performance regressions. The authenticated earlier **112-test full suite is historical**; the complete 130-test suite was not rerun for this batch. [Test scope](test-scope.json) records this distinction. Numeric execution covers 36 frames/72 original-selected runs and 396 scalar output checks, plus 5,472 independent literal/unbounded/factor/recurrence oracle cases. Collection evidence contains 72 complete-array interpreter comparisons across all four types, with exceptional F32 values. Three numeric and two collection content-hash-valid false objects reject semantically rather than for identity mismatch.', '',
    f'Prior snapshot `{pub["previous_snapshot"]}`; new snapshot `{pub["snapshot"]}`; frozen compiler `{pub["compiler_sha256"]}`. The same compiler emits no-selection, prior977 and new998 variants. All {pre["frozen_hashes"]} frozen artifacts and {pre["source_guard_hashes"]} guarded compiler/core/runtime/planner/backend source files remain unchanged. No production core/backend/runtime/planner changes, caller validators, optional checker wrappers or new trusted proof rules are introduced. Functions retain the trusted-caller contract.', '',
    'Measurements use Apple M2/macOS, Node v26.1.0 and Chrome 154 with an Apple Metal-3 adapter. Thirteen correctness fixtures cover empty/singleton, wrapping boundaries, zero/unit factors and random words. Timed arrays contain 32/4096/65536 small/full-width words, offsets 509/0x9e3779b9 and factors 7/2^32-3. All timed outputs are nonconstant; mapped-value and original-input gates exercise both outcomes in each timed input. [Fixture profiles](fixture-profile.json) record branch counts. Independent Python unbounded geometric/collection references check complete outputs; ordered literal word operations/stages corroborate boundary words and the first four other words.', '',
    'Complete calls include one full typed-input snapshot per implementation, applicable Wasm ingress copies/public output conversion, await and checksum consumption. Actual GPU calls include upload, dispatch and readback. Direct compiled JS uses the same snapshot/checksum boundary as the handwritten original JS control. Startup, lazy Wasm first calls and shader preparation are separate. Rust reuses final input/output storage; intermediate Vec stages receive normal release/library optimisation. Numeric controls preserve exact balanced expanded source trees; collection controls retain eager original map/zip/postmap stages. Normal JIT/release optimisation is allowed.', '',
    'Current original-algorithm control comparisons, derived from archived individual paired intervals (checked/control latency; lower favours checked):', '',
    '| Host | Runtime Ink JS / original JS | Direct Ink JS / original JS | Ink Wasm / original Rust-Wasm |', '|---|---|---|---|',
]
for host, s in summaries.items():
    lines.append(f'| {host} | {controls(s, "ink_checked_js_over_js_literal")} | {controls(s, "ink_checked_direct_js_over_js_literal")} | {controls(s, "ink_checked_wasm_over_rust_literal_wasm")} |')
lines += [
    '', 'Each host has 36 workload cells. [Comparison scope](comparison-scope.json) binds the current summaries and exact comparison ranges. These compare the archived original algorithms and implementation boundaries. No already-factored/fused expert JS control or native Rust control is measured in this batch. Wasm toolchains/boundaries differ, so language/compiler effects are not isolated. The [older native collection experiment](../collection-proof-phase1/REPORT.md) found near parity with combined-loop Rust (Ink/Rust elapsed ratio 0.991 across 24 cells), using an older compiler on an M4 Pro shared interactive machine, without confidence intervals or CPU pinning. Some older benchmark code contains a retired path; that does not erase this archived native evidence, which also does not establish current broad native parity. Generalisation requires a broader current application suite, fair expert controls and native measurements; the current targeted results alone do not support a general language ranking.', '',
    'Largest full-width browser prior/new complete-call ratios (above 1 favours new proofs):', '',
    '| Kernel | Runtime JS | Wasm | Comparable actual GPU |', '|---|---:|---:|---:|',
]
large = [row for row in summaries['browser']['measurements'] if row['input'] == 'full-65536']
assert len(large) == 6
for row in large:
    r = row['paired_ratios_95pct']
    gpu_text = fmt(r['prior_over_checked_gpu']) if 'prior_over_checked_gpu' in r else 'Prior CPU fallback; new shader eligible'
    lines.append(f'| {row["case"]} | {fmt(r["prior_over_checked_js"])} | {fmt(r["prior_over_checked_wasm"])} | {gpu_text} |')
lines += [
    '', 'At the same largest browser inputs, comparisons with original-language controls and current GPU routing are:', '',
    '| Kernel | Original JS / direct Ink JS | Ink Wasm / original Rust-Wasm | GPU / runtime Ink JS |', '|---|---:|---:|---:|',
]
for row in large:
    r = row['paired_ratios_95pct']
    lines.append(f'| {row["case"]} | {fmt(inverse(r["ink_checked_direct_js_over_js_literal"]))} | {fmt(r["ink_checked_wasm_over_rust_literal_wasm"])} | {fmt(inverse(r["ink_checked_js_over_ink_checked_gpu"]))} |')
lines += [
    '', 'Thus direct Ink JS is roughly 2.9–5.5× faster than these original-stage JS controls; original Rust-Wasm is roughly 1.65–1.68× faster than Ink Wasm. Actual GPU complete calls take roughly 3.5–6.8× the runtime-JS latency, including transfers. The intervals and exact control scope above matter; these are workload-specific comparisons.', '',
    '[Main profitability profiles](profitability.json) classify 234 measured prior/new views:', '',
    '| Backend | Faster | Inconclusive | Slower |', '|---|---:|---:|---:|',
]
for backend in ['js', 'direct_js', 'wasm', 'gpu']:
    c = collections.Counter(d['verdict'] for d in profit['decisions'] if d['backend'] == backend)
    lines.append(f'| {backend} | {c["faster"]} | {c["inconclusive"]} | {c["slower"]} |')
lines += [
    f'| Total | {profit["counts"]["faster"]} | {profit["counts"]["inconclusive"]} | {profit["counts"]["slower"]} |', '',
    'The 18 adverse views comprise 16 correlated runtime/direct-JS views over **nine distinct Node workloads**, plus two browser GPU views. They are not 18 independent Node workloads. Node regressions affect the smaller prefix and some mapped-gate shapes; all six largest browser runtime-JS cells improve. Structural operation savings do not guarantee host/JIT profitability. Every adverse view is retained:', '',
    '| Host | Kernel/input | Backend | Prior/new 95% interval |', '|---|---|---|---:|',
]
for d in adverse:
    lines.append(f'| {d["host"]} | {d["case"]}/{d["input"]} | {d["backend"]} | {fmt(d["ratio_95pct"])} |')
lines += [
    '', 'Profiles recommend retaining prior candidates for adverse/unresolved comparisons. These proof-candidate recommendations are separate from the existing bounded backend selector described below. Individual 95% paired intervals are exploratory and unadjusted for multiplicity; correlated runtime/direct views are not independent replications.', '',
    f'[Control preflight](control-preflight.json) passes {control["comparisons"]} original-JS complete-output comparisons and {control["python_literal_checks"]} Python literal checks. CPU prevalidation passes {rerun["comparisons"]} comparisons. The first console stdout redirection collided with the node-written JSON filename; the damaged receipt is preserved, and validation was rerun successfully with a distinct console log. [Rerun receipt](validation-rerun.json) authenticates both files; this was an evidence-file collision, not a proof/source failure.', '',
    'Seven shuffled paired rounds follow calibration and discarded warmup, with a 15 ms calibration target. [Pre-timing receipt](pre-timing.json) records stopped author/compiler/test jobs before sequential Node/browser timing. Raw results retain calibration, warmups, output checksums, nonmutation, actual backend, fallback reason and per-call counters.', '',
    f'Main actual WebGPU execution covers **{audit["actual_gpu_variant_cells"]} variant/cells and {audit["gpu_timed_samples"]} timed samples**; {audit["gpu_fallback_variant_cells"]} unsupported original/prior collection fallback records are excluded from GPU timings. Each real vector call reports one dispatch, `4*N+24` upload bytes and `4*N` readback bytes. Three original collection pipelines become shader-eligible direct maps. This is eligibility evidence, not a comparison between two GPU shaders.', '',
    'Only mixed_prefix24/full-32 has a nominal main GPU interval excluding equality in favour of the new code. Its separate same-input confirmation and a small-32 companion are:', '',
    '| Kernel/input | Separate prior/new complete-call ratio | Verdict |', '|---|---:|---|',
]
for d in confirm['decisions']:
    lines.append(f'| {d["case"]}/{d["input"]} | {fmt(d["ratio_95pct"])} | {d["verdict"]} |')
nominal = confirm['unreplicated'][0]
lines += [
    '', f'The nominal main result was {fmt(nominal["ratio_95pct"])}; the full-32 repeat is 0.997565× [0.935484, 1.010956], including equality. **Zero of one nominal GPU gains replicate; no confirmed GPU speedup is established.**', '',
    f'[Confirmation receipt](gpu-confirmation.json) authenticates a separate run with {confirm["samples"]} timed samples, {confirm["exact_comparisons"]} exact comparisons, {confirm["actual_gpu_samples"]} actual GPU samples, {confirm["intervals_recomputed"]} independently recomputed intervals and {confirm["frozen_artifacts_verified"]} frozen artifacts. [Confirmation preflight](gpu-confirmation-preflight.json) checks all {confirm_pre["identical_inputs"]} correctness input arrays/scalars/expected outputs and {len(confirm["identical_gpu_artifacts"])} corresponding shader/runtime/device files against the main run. The repeat narrows timed case/shapes only. No pooling or repeat observation import occurs. [Separate report](../web-stack-proofs-13-gpu-confirmation-2026-10-10/browser-REPORT.md) retains the results.', '',
    'The repeat screenshot displays a read-only saved-result `evidence.html` viewer: the original browser tab was closed during user steering. It is presentation evidence rather than a fresh timing run; authenticated machine JSON, input identities and artifact hashes establish the saved result.', '',
    f'[Routing evidence](backend-routing.json) records {route["paired_comparisons"]} current JS/Wasm-to-GPU intervals. All favour CPU under the measured complete-call boundary; JS has the lowest checked median in all {len(route["cells"])} browser workload cells. Batch13 forces explicit backends, so these measurements do not test automatic selector behaviour or GPU-resident pipelines.', '',
    'Ink already has bounded automatic backend selection. In [ink-runtime host code](../../runtime/hosts/backend-selection.mjs), `auto` compares eligible pure compiled JavaScript, Wasm CPU and WebGPU candidates using measured prepared execution and setup costs; shared input capture/plan preparation occurs before profiling. It uses three alternating trials, amortises setup over `expectedCalls` (default 32), caches up to 32 shapes, rechecks after `recheckEvery` uses (default 32), and requires a 10% cost saving before switching. [Browser selection documentation](../../docs/javascript-backend.md#browser-backend-selection) describes the boundary. The policy is currently implemented in the JavaScript host, not authored as an Ink algorithm. Benchmark algorithms are written in Ink and database proofs are applied at compile time. This existing selector is not a generalised load-aware optimiser or state-migration system, and this batch does not measure its automatic decisions.', '',
    'Uncompressed emitted file sizes:', '',
    '| Artifact | Prior977 bytes | New998 bytes | Reduction |', '|---|---:|---:|---:|',
]
for name in ['program.mjs', 'cpu.c', 'cpu.wasm']:
    a, b = sizes['prior'][name], sizes['checked'][name]
    lines.append(f'| {name} | {a} | {b} | {(1-b/a)*100:.1f}% |')
lines += [
    '', 'Plans/runtime and compressed transfer are excluded. Shader count changes 3→6, so aggregate WGSL bytes are not a like-for-like reduction claim.', '',
    f'[Observation import](observation-import.json) adds {imp["imported"]} authenticated main-run Wasm observations, growing **{imp["before"]}→{imp["after"]}**, retaining the new proof pin. Memory means exported Wasm linear-memory highwater only; host/JS/GPU memory is unmeasured. Confirmation contributes no canonical observations.', '',
]
for host, s in summaries.items():
    lines.append(f'[{host.title()} report]({host}-REPORT.md): {s["samples"]} timed samples, {s["validation"]["comparisons"]} exact comparisons, {s["observations"]} observations. [Raw results]({host}-results.json) preserve trials and validation receipts.')
lines += [
    '', f'Main totals are **{sum(s["samples"] for s in summaries.values())} timed samples and {sum(s["validation"]["comparisons"] for s in summaries.values())} exact comparisons**. [Independent main interval audit](root-interval-verification.json) recomputes all {audit["intervals_recomputed"]} intervals and authenticates {audit["artifact_hashes_verified"]} frozen artifacts. Final [independent verification](verification.json) authenticates members, source guards, imported observations and confirmation separately. Work remains local; no commit, push or PR was created.', '',
]
(p / 'REPORT.md').write_text('\n'.join(lines))
print('Rendered REPORT.md from batch13 receipts, with separate confirmation.')
