"""Render batch12 findings exclusively from the archived receipts and trials."""
import collections
import json
from pathlib import Path

p = Path(__file__).resolve().parent

def read(name):
    return json.loads((p / name).read_text())

def fmt(ci):
    return f'{ci[0]:.3f}× [{ci[1]:.3f}, {ci[2]:.3f}]'

def control_counts(summary, key):
    counts = collections.Counter()
    for row in summary['measurements']:
        ci = row['paired_ratios_95pct'][key]  # checked latency / original-control latency
        counts['checked faster' if ci[2] < 1 else 'control faster' if ci[1] > 1 else 'inconclusive'] += 1
    return ', '.join(f'{name}: {counts[name]}' for name in ['checked faster', 'inconclusive', 'control faster'])

pub = read('publication.json')
m = read('metadata.json')
profit = read('profitability.json')
audit = read('root-interval-verification.json')
imp = read('observation-import.json')
route = read('backend-routing.json')
sizes = read('artifact-sizes.json')['bytes']
tests = read('test-scope.json')
pre = read('pre-timing.json')
controls = read('control-preflight.json')
summaries = {host: read(f'{host}-summary.json') for host in ['node', 'browser']}
assert sum(s['samples'] for s in summaries.values()) == 6048
assert sum(s['validation']['comparisons'] for s in summaries.values()) == 2616
assert tests['current_tests'] == 21 and tests['prior_full_suite']['tests'] == 112
assert m['selections']['prior']['applications'] == 0
assert all(m['prior_core_equals_original'].values())
assert all(len(ids) == 1 for ids in m['new_laws_per_function'].values())
gpu = [d for d in profit['decisions'] if d['backend'] == 'gpu']
assert len(gpu) == 18 and all(d['verdict'] == 'inconclusive' for d in gpu)

lines = [
    '# Ink web proof batch 12 — 10 October 2026', '',
    f'Two proof authors and an independent reviewer supplied **{pub["added_entries"]} fresh checked proofs**, growing the catalogue **{pub["previous_entries"]}→{pub["entries"]}**. Six U32 representatives were measured with the same frozen compiler. CPU results include useful gains and five adverse Node quintic workloads. **No GPU speedup is established:** all 18 comparable GPU intervals include equality.', '',
    '| Proof family | Instances | Transformation |',
    '|---|---:|---|',
    '| Cubic/quartic/quintic odd centered differences | 9 | Explicit endpoint products become compact wrapping-word polynomials |',
    '| Gated left mapped zip | 4 | Select first, skip an unused pure callback and fuse map/zip/postmap |',
    '| Gated right mapped zip | 4 | Retain the original comparison and fuse selected callback/postmap |',
    '| Mode-selected mapped pair | 4 | Evaluate only the contributing mapped side and fuse output stages |', '',
    'Numeric laws cover U32/I32/U64 rings modulo 2^32 or 2^64. Their exact identities are `(x+k)^3-(x-k)^3 = 2*k*(3*x*x+k*k)`, `(x+k)^4-(x-k)^4 = 8*x*k*(x*x+k*k)`, and `(x+k)^5-(x-k)^5 = 2*k*(5*xx*(xx+2*kk)+kk*kk)`, with `xx=x*x` and `kk=k*k` each computed once. Powers here are mathematical notation: original kernels contain explicit left-associated products, and both versions retain final `+seed`. These are arbitrary word polynomial models, with no F32 arithmetic reassociation or floating-point derivative/accuracy claim. No artificial repeat loops are used.', '',
    'Actual source/selected scalar AST counts, including the offset and local binding expressions:', '',
    '| Kernel | Multiplications | Additions/subtractions | Selected local bindings |',
    '|---|---:|---:|---:|',
    '| cubic_odd_difference | 4→5 | 8→2 | 0 |',
    '| quartic_odd_difference | 6→5 | 10→2 | 0 |',
    '| quintic_odd_difference | 8→8 | 12→3 | 2 |', '',
    'There is no uniform multiplication reduction. Quintic sharing uses two existing typed Let expressions. These are structural counts, not instruction or speed ratios; normal target common-expression elimination and constant hoisting are allowed.', '',
    'Collection laws also cover F32. They preserve the original `<` comparison, selected per-element primitive grouping/rounding, order and length, including exceptional values. The false branch of `<` includes unordered NaN comparisons; it is not generally equivalent to `>=`. Callbacks are arbitrary pure total unary functions: global scheduling changes and unused callback invocations may disappear. Effectful or divergent callbacks are outside this model. The gated families eliminate two intermediate lists, and the mode family eliminates three. Full output writes and transport remain O(N).', '',
    'All 21 laws admit through the existing generic kernel, default-select, replay and reify. Immutable old956 selects zero applications and leaves the six actual benchmark bodies unchanged; new default planning applies exactly one fresh law per function. Fresh IDs and exact statement endpoints were compared against the old catalogue. Hashes identify objects and receipts; they do not establish mathematical truth. [Numeric evidence](../../knowledge/research/web-stack-proofs-12/compute/evidence.json), [collection notes/receipts](../../knowledge/research/web-stack-proofs-12/collection/NOTES.md), [selection metadata](metadata.json) and [publication](publication.json) preserve the evidence.', '',
    f'**Current validation: {tests["current_tests"]} tests pass**, comprising six numeric tests, three collection tests and twelve store/publisher/performance regressions. The authenticated prior **112-test full suite is historical**; the complete 121-test suite was not rerun for this batch. [Test scope](test-scope.json) records commands/log identities and this distinction. Numeric interpreter coverage is 36 frames/72 original-selected runs with 396 scalar outputs, plus 5,472 independent ordered-literal/unbounded/compact oracle cases. Collection evidence contains 72 complete-array interpreter comparisons across all four types, including NaNs, infinities and signed zeros. Three numeric and two collection content-hash-valid false objects are rejected semantically, rather than for hash mismatch.', '',
    f'Prior snapshot `{pub["previous_snapshot"]}`; new snapshot `{pub["snapshot"]}`; frozen compiler `{pub["compiler_sha256"]}`. The same compiler emits no-selection, prior956 and new977 variants. All {pre["frozen_hashes"]} frozen artifacts and {pre["source_guard_hashes"]} guarded compiler/core/runtime/planner/backend source files remain unchanged. No core, backend or runtime changes, new trusted proof rules, caller validators or optional checker wrappers are introduced. Generated functions retain the trusted-caller contract.', '',
    'Measurements use an Apple M2/macOS host, Node v26.1.0 and Chrome 154 with an Apple Metal-3 adapter. Thirteen correctness fixtures include empty/singleton arrays, wrapping boundaries, random words and zero/unit factors. Timed shapes use 32/4096/65536 elements and small/full-width distributions, offsets 509/0x9e3779b9 and factors 7/2^32-3. Representative outputs remain input-dependent. Independent Python unbounded odd-binomial expansions and collection closed forms check complete outputs; literal wrapping operations/stages corroborate boundary words and the first four other words. Numeric originals preserve exact left-associated endpoint products; collection originals retain eager maps and conditional zip/postmap stages.', '',
    'Complete calls include one full typed-input snapshot for every implementation, applicable Wasm ingress copies/public output conversion, await and checksum consumption. GPU calls include real upload, dispatch and readback. Direct compiled JS has the same snapshot/checksum boundary as the handwritten original JS control. Startup, lazy Wasm first calls and shader preparation are recorded separately. Rust reuses final input/output storage while intermediate Vec stages receive normal release/library optimization. Original JS/Rust controls implement the original algorithms, with ordinary JIT/release optimization allowed. Already-factored/fused expert controls, native Rust, GPU-resident pipelines and general language rankings are outside scope; different target toolchains/boundaries limit cross-language attribution.', '',
    'Current original-algorithm control comparisons, derived from archived paired intervals (checked/control latency; lower favors checked):', '',
    '| Host | Runtime Ink JS / original JS | Direct Ink JS / original JS | Ink Wasm / original Rust-Wasm |',
    '|---|---|---|---|',
]
for host, s in summaries.items():
    lines.append(f'| {host} | {control_counts(s, "ink_checked_js_over_js_literal")} | {control_counts(s, "ink_checked_direct_js_over_js_literal")} | {control_counts(s, "ink_checked_wasm_over_rust_literal_wasm")} |')
lines += [
    '', 'Each host has 36 workload cells. Under these archived implementations and boundaries, Ink JS beats the original JS controls throughout, while original Rust-Wasm beats Ink Wasm throughout. This does not establish a general ranking of languages.', '',
    f'[Control preflight](control-preflight.json) passes {controls["comparisons"]} original-JS complete-output comparisons and {controls["python_literal_checks"]} literal Python checks; CPU prevalidation passes {pre["cpu_validation"]} comparisons. Seven shuffled paired rounds follow calibration and discarded warmup, with 15 ms calibration targets. [Pre-timing receipt](pre-timing.json) records stopped author/compiler/test jobs before sequential Node/browser timing. Warmup, calibration, actual backend, fallback reason, checksum/nonmutation and per-call counters remain archived. Individual 95% paired intervals are exploratory and unadjusted for multiple comparisons; runtime/direct views are correlated, not independent replications.', '',
    'Largest full-width browser prior/new complete-call ratios (above 1 favors the new proofs):', '',
    '| Kernel | Runtime JS | Wasm | Comparable actual GPU |',
    '|---|---:|---:|---:|',
]
for row in summaries['browser']['measurements']:
    if row['input'] == 'full-65536':
        r = row['paired_ratios_95pct']
        gpu_text = fmt(r['prior_over_checked_gpu']) if 'prior_over_checked_gpu' in r else 'Prior CPU fallback; new shader eligible'
        lines.append(f'| {row["case"]} | {fmt(r["prior_over_checked_js"])} | {fmt(r["prior_over_checked_wasm"])} | {gpu_text} |')
lines += ['', '[Profitability profiles](profitability.json) classify 234 measured prior/new views:', '',
          '| Backend | Faster | Inconclusive | Slower |', '|---|---:|---:|---:|']
for backend in ['js', 'direct_js', 'wasm', 'gpu']:
    c = collections.Counter(d['verdict'] for d in profit['decisions'] if d['backend'] == backend)
    lines.append(f'| {backend} | {c["faster"]} | {c["inconclusive"]} | {c["slower"]} |')
lines += [
    f'| Total | {profit["counts"]["faster"]} | {profit["counts"]["inconclusive"]} | {profit["counts"]["slower"]} |', '',
    'The ten adverse views are **five Node quintic workloads measured through both runtime and direct JS**. They are not ten independent workloads. The full-width 65,536-element quintic runtime ratio is 0.903 on Node versus 1.259 in the browser: host/JIT differences matter, and not all six kernels improve on Node. Node full-32 quintic is inconclusive. All adverse cells are retained:', '',
    '| Host | Kernel/input | Backend | Prior/new 95% interval |', '|---|---|---|---:|',
]
for d in profit['decisions']:
    if d['verdict'] == 'slower':
        lines.append(f'| {d["host"]} | {d["case"]}/{d["input"]} | {d["backend"]} | {fmt(d["ratio_95pct"])} |')
lines += [
    '', 'The profiles recommend retaining the prior candidate for adverse or unresolved comparisons. A general target/host-specific selection policy has not been implemented; correctness alone does not guarantee profitability.', '',
    f'Actual WebGPU execution covers **{audit["actual_gpu_variant_cells"]} variant/cells and {audit["gpu_timed_samples"]} timed samples**. The {audit["gpu_fallback_variant_cells"]} unsupported original/prior collection fallback records are excluded from GPU timings and comparisons. Each real vector call records one dispatch, `4*N+24` upload bytes and `4*N` readback bytes. Three collection pipelines become direct-map shader eligible, but a prior CPU fallback is not a comparable old GPU shader.', '',
    '**All 18 comparable GPU prior/new intervals include equality.** No nominal GPU gain survives even the initial interval screen, so no confirmation repeat is needed or performed and no confirmed GPU gain is claimed. Full-call transfer/dispatch latency can dominate reduced scalar work.', '',
    f'[Current-backend routing evidence](backend-routing.json) records {route["paired_comparisons"]} JS/Wasm-to-GPU intervals; all favor CPU under this boundary. JS has the lowest checked median in all {len(route["cells"])} browser workload cells. GPU-resident batching and automatic routing are outside the measurement/implementation scope.', '',
    'Uncompressed emitted file sizes:', '',
    '| Artifact | Prior956 bytes | New977 bytes | Reduction |', '|---|---:|---:|---:|',
]
for name in ['program.mjs', 'cpu.c', 'cpu.wasm']:
    a, b = sizes['prior'][name], sizes['checked'][name]
    lines.append(f'| {name} | {a} | {b} | {(1-b/a)*100:.1f}% |')
lines += [
    '', 'Plans/runtime and compressed transfer are excluded. Shader count changes 3→6, so aggregate WGSL bytes are not a like-for-like size reduction.', '',
    f'[Observation import](observation-import.json) adds {imp["imported"]} authenticated Wasm observations, growing **{imp["before"]}→{imp["after"]}**, with the new proof pin retained. These memory records measure exported Wasm linear-memory highwater only. Host/JS/GPU memory is unmeasured; no such memory observations are invented.', '',
]
for host, s in summaries.items():
    lines.append(f'[{host.title()} report]({host}-REPORT.md): {s["samples"]} timed samples, {s["validation"]["comparisons"]} exact comparisons, {s["observations"]} observations. [Raw results]({host}-results.json) retain rounds, counters and complete validation receipts.')
lines += [
    '', f'The main run totals **{sum(s["samples"] for s in summaries.values())} timed samples and {sum(s["validation"]["comparisons"] for s in summaries.values())} exact comparisons**. [Independent interval audit](root-interval-verification.json) recomputes all {audit["intervals_recomputed"]} intervals and authenticates {audit["artifact_hashes_verified"]} frozen artifacts. The final [independent verifier](verify.py) and [receipt](verification.json) authenticate proof members, source guards and imported observations separately. Work remains local; no commit, push or PR was created.', '',
]
(p / 'REPORT.md').write_text('\n'.join(lines))
print('Rendered REPORT.md from batch12 receipts.')
