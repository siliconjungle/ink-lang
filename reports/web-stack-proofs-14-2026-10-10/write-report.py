#!/usr/bin/env python3
"""Write a bounded comparison from archived measurements, never run benchmarks."""
import collections
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def read(name):
    return json.loads((HERE / name).read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verdict(ci, inverse=False):
    if inverse:
        return 'Ink faster' if ci[2] < 1 else 'control faster' if ci[1] > 1 else 'inconclusive'
    return 'faster' if ci[1] > 1 else 'slower' if ci[2] < 1 else 'inconclusive'


def fmt(ci):
    if ci is None:
        return 'unavailable'
    precision = 6 if min(abs(v - 1) for v in ci) < .01 else 3
    return f'{ci[0]:.{precision}g} [{ci[1]:.{precision}g}, {ci[2]:.{precision}g}]'


def counts_text(counts):
    return ', '.join(f'{count} {name}' for name, count in sorted(counts.items()))


def write():
    meta, spec, fixture = read('metadata.json'), read('spec.json'), read('fixtures.json')
    publication, planner = read('publication.json'), read('planner-change.json')
    imported = read('canonical-observation-import.json')
    tasks = {t['name']: t for t in spec['tasks']}
    summaries = {host: read(f'{host}-summary.json') for host in ['node', 'browser']}
    raw = {host: read(f'{host}-results.json') for host in ['node', 'browser']}
    native, native_raw = read('native/summary.json'), read('native/results.json')
    fresh, anchors = collections.Counter(), collections.Counter()
    adverse = []
    controls = collections.defaultdict(collections.Counter)
    for host, summary in summaries.items():
        for row in summary['measurements']:
            for name, ci in row['paired_ratios_95pct'].items():
                if name.startswith('prior_over_checked_'):
                    v = verdict(ci)
                    (anchors if tasks[row['case']]['cohort'] == 'anchor' else fresh)[v] += 1
                    if v == 'slower':
                        adverse.append((host, row['case'], row['input'], name[19:], ci))
                if name.startswith('ink_checked_') and any(c in name for c in ('_over_js_expert', '_over_rust_expert', '_over_js_literal', '_over_rust_literal')):
                    controls[(host, name, tasks[row['case']]['cohort'] == 'anchor')][verdict(ci, True)] += 1
    native_prior = collections.defaultdict(collections.Counter)
    native_control = collections.defaultdict(collections.Counter)
    for row in native['measurements']:
        for name, ci in row['paired_ratios_95pct'].items():
            if name == 'prior_over_checked' and tasks[row['case']]['cohort'] != 'anchor':
                native_prior[row['mode']][verdict(ci)] += 1
                if verdict(ci) == 'slower':
                    adverse.append(('native-' + row['mode'], row['case'], row['input'], 'native', ci))
            if name in ('checked_over_rust_expert', 'checked_over_rust_literal'):
                native_control[(row['mode'], name, tasks[row['case']]['cohort'] == 'anchor')][verdict(ci, True)] += 1

    browser = raw['browser']
    actual = [r for r in browser['availability'] if r['variant'].endswith('_gpu') and r['actual_backend'] == 'gpu']
    fallbacks = [r for r in browser['availability'] if r['variant'].endswith('_gpu') and r['actual_backend'] != 'gpu']
    gpu_samples = sum(r['variant'].endswith('_gpu') for r in browser['samples'])
    all_samples = sum(len(r['samples']) for r in raw.values())
    comparisons = sum(s['validation']['comparisons'] for s in summaries.values())
    largest = max(fixture['parameters']['sizes'])
    browser_fresh = {
        backend: collections.Counter(verdict(row['paired_ratios_95pct'][f'prior_over_checked_{backend}'])
            for row in summaries['browser']['measurements'] if tasks[row['case']]['cohort'] != 'anchor')
        for backend in ['js', 'wasm']
    }
    resident = native_prior['resident']
    expert_resident = native_control[('resident', 'checked_over_rust_expert', False)]
    lines = [
        '# Reusable web proof recipes: stronger controls and native kernels', '',
        f'{publication["added_entries"]} new checked laws expand the catalogue from {publication["previous_entries"]} to {publication["entries"]}. Twelve scalar recipes consume fresh laws; two vector anchors exercise existing laws and GPU execution. The suite includes six discovery recipes and six held-out callback instantiations, not an independent external corpus. Performance remains workload and backend dependent.', '',
        f'The stronger controls prevent a general superiority claim. Among fresh browser recipes, prior/current runtimeJS has {browser_fresh["js"]["faster"]} supported improvements and {browser_fresh["js"]["inconclusive"]} inconclusive cells; Wasm has {browser_fresh["wasm"]["faster"]} improvements, {browser_fresh["wasm"]["slower"]} regressions and {browser_fresh["wasm"]["inconclusive"]} inconclusive cells. Native resident kernels improve over the prior catalogue in {resident["faster"]} fresh cells, regress in {resident["slower"]} and remain inconclusive in {resident["inconclusive"]}; against already-fused expert Rust they win {expert_resident["Ink faster"]}, lose {expert_resident["control faster"]} and are inconclusive in {expert_resident["inconclusive"]}. The compiler can exploit reusable checked work elimination, while a strong handwritten implementation often remains faster.', '',
        f'Frozen compiler `{meta["compiler_sha256"]}`; prior `{meta["prior_snapshot"]}`; current `{meta["new_snapshot"]}`. Each recipe has a separate compiled bundle. All twelve fresh-law recipes had zero prior applications and unchanged prior bodies, then independently replayed fresh default selections. Anchors are exempt from that novelty claim.', '',
        'The only production policy change is general constant primitive cost for direct list indexing and stored length, with receiver computation still charged. Both catalogues use that same planner. Cost guidance is untrusted and every chosen rewrite is checked. The experimental callback matcher was removed; compiler, semantics, checker and backends stay frozen. The mapped-head law instead requires the compile-time equation f(z)=z, proved for the two clamp callbacks, without a runtime guard.', '',
        'Collection laws cover arbitrary pure total mapper/predicate callbacks: map, filter and mapped-filter pipelines become one ordered affine right fold x+acc*k, across four numeric types, or a wrapping sum across three word types. Float sum reassociation is excluded. The other families skip mapped-head work under the fixed-point premise, concatenate-head work over two independent lists, and arbitrary pure self-zip callbacks when only cardinality is requested. Performance recipes are U32; count results are U64.', '',
        'Primary calibration uses x*3+k with a separate acceptance cutoff. Held-out recipes use absolute distance, an opposite predicate and a piecewise offset, plus a different clamp, fallback and discarded callback. Three sizes and small/full distributions are frozen; concat also has six timed empty-prefix/nonempty-tail cells. Min-clamp uses preset384/0x60000001 cutoffs rather than a nearly constant gate. Count/head outputs can intentionally be constant at a fixed shape: the optimization skips unused collection work, while transport and output consumption still occur.', '',
        'The eager JavaScript and Rust controls retain original collection stages. Strong expert controls already perform one pass for totals/right folds and only a first-element or length query for head/count. Rust uses normal release optimization; intermediate Vec stages may optimize naturally. Expert vector controls reuse output scratch. Native Rust and Wasm use identical recipe source, with native ABI glue separately archived. No expert tuning followed measurements.', '',
        'Captured web calls include one snapshot per used list, Wasm copies, output conversion, the async boundary and checksum consumption. Direct borrowed JavaScript kernels omit input snapshots for both Ink and expert, retaining the same async/checksum driver, and are reported separately. Native resident and snapshot modes use the common separately compiled C driver, shared-library calls, result consumption and active generated-C arena reset. Native timings do not represent browser latency; compiler/toolchain differences remain. Native peak memory was not measured.', '',
        'The first native preparation encountered a zero-duration ten-call calibration on the fastest kernels. Its prepared directory and failure log are preserved separately as native-initial-clock; no timings from that attempt are accepted or pooled. The fresh native run uses an integer mach_absolute_time tick difference/timebase and 1000-call calibration identically for every variant, with fresh [native validation](native/validation.json) and metadata. This timer repair changes neither recipe nor expert algorithm.', '',
        'Independent expectations use ordinary mathematical mapper recipes, sums and a forward positional polynomial for the ordered fold. Python eager collection stages corroborate those reductions; Python head expectation directly evaluates the pure first-result semantics, rather than materializing every unused mapped element. Actual original JavaScript/Rust head controls do retain the eager whole-list map. U64 counts preserve low/high output lanes. Boundary fixtures, complete outputs and both input lists are checked for mutation.', '',
        'Current validation includes 25 scoped tests: five reduction-family tests, three collection-family tests, five planner tests and twelve storage/publication/performance-store regressions. Historical full-suite evidence is preserved separately; it is not presented as a fresh complete-suite rerun. Author evidence covers admitted type instances, including exact F32 exceptions and pure callback scheduling; the three reduction held-out interpreter examples cover U32 only. Timed implementations use U32 data.', '',
        f'Web timings retain {all_samples:,} samples and {comparisons:,} exact backend comparisons across {len(fixture["cells"])} cells per host. Native retains {native["samples"]:,} samples across {native["cells"]} resident/snapshot cells. Calibration, warmups, shuffled paired rounds, first calls and startup are separate archived evidence. [Frozen metadata](metadata.json), [Node raw](node-results.json), [browser raw](browser-results.json), [native raw](native/results.json).', '',
        'Prior/current ratios above 1 favor the new catalogue. Ink/control ratios below 1 favor Ink. Intervals are paired bootstrap 95%, with individual unadjusted exploratory comparisons; overlapping captured/borrowed views are correlated and are not independent experiments.', '',
        f'Fresh-recipe web views: {counts_text(fresh)}. Existing-law anchor views separately: {counts_text(anchors)}. Native fresh-recipe resident views: {counts_text(native_prior["resident"])}; native snapshot views: {counts_text(native_prior["snapshot"])}. These counts preserve inconclusive and adverse cells rather than asserting a universal gain.', '',
        '| Strong or original control comparison | Host/mode | Cohort | Supported outcomes |',
        '|---|---|---|---|',
    ]
    for (host, name, anchor), count in sorted(controls.items()):
        lines.append(f'| `{name}` | {host} | {"anchors" if anchor else "fresh recipes"} | {counts_text(count)} |')
    for (mode, name, anchor), count in sorted(native_control.items()):
        lines.append(f'| `{name}` | native {mode} | {"anchors" if anchor else "fresh recipes"} | {counts_text(count)} |')
    lines += ['', f'Largest full-width browser inputs ({largest} words); medians with paired95% intervals:', '',
        '| Recipe | Cohort | Prior/new runtimeJS | Ink capturedJS/expertJS | Ink borrowedJS/expertJS | InkWasm/expertRustWasm |',
        '|---|---|---|---|---|---|']
    for row in summaries['browser']['measurements']:
        if not row['input'].endswith(f'/full-{largest}'):
            continue
        q = row['paired_ratios_95pct']
        keys = ['prior_over_checked_js', 'ink_checked_js_over_js_expert', 'ink_checked_borrowed_js_over_js_expert_borrowed', 'ink_checked_wasm_over_rust_expert_wasm']
        lines.append(f'| {row["case"]} | {tasks[row["case"]]["cohort"]} | ' + ' | '.join(fmt(q.get(k)) for k in keys) + ' |')
    lines += ['', 'Native comparisons are separate resident-input and equal-snapshot kernel profiles:', '',
        '| Recipe | Mode | Prior/new | Ink/expertRust |', '|---|---|---|---|']
    for row in native['measurements']:
        if not row['input'].endswith(f'/full-{largest}'):
            continue
        q = row['paired_ratios_95pct']
        lines.append(f'| {row["case"]} | {row["mode"]} | {fmt(q["prior_over_checked"])} | {fmt(q["checked_over_rust_expert"])} |')
    lines += ['', f'GPU evidence includes {len(actual)} actual variant/cells and {gpu_samples} actual samples; {len(fallbacks)} requested-GPU variant/cells returned CPU fallback and are excluded from GPU timing. Saved scalar bundles have benchmark-only instrumentation for actual upload writes, dispatches and scalar readback, identically applied across variants with original device/host hashes retained. Vector anchors use existing device counters. Production device/shader code was not changed.', '',
        'Scalar sums lose GPU eligibility when an ordered fold replaces their pipeline; self-zip cardinality gains eligibility when only count remains. No fresh recipe has a prior/current pair that both execute on GPU. Such topology changes cannot establish a same-GPU speedup. Full transfers/readback are included. The lone nominal same-GPU improvement belongs to an existing-law anchor and remains unconfirmed; it is not a new-law GPU gain. Fallback speed is not GPU acceleration.', '',
        '| Task | Prior actualGPU cells | Current actualGPU cells | Prior/current sameGPU classifications |', '|---|---:|---:|---|']
    for name in tasks:
        old_n = sum(r['case'] == name and r['variant'] == 'ink_prior_gpu' for r in actual)
        new_n = sum(r['case'] == name and r['variant'] == 'ink_checked_gpu' for r in actual)
        c = collections.Counter(verdict(r['paired_ratios_95pct']['prior_over_checked_gpu']) for r in summaries['browser']['measurements'] if r['case'] == name and 'prior_over_checked_gpu' in r['paired_ratios_95pct'])
        lines.append(f'| {name} | {old_n} | {new_n} | {counts_text(c) or "no matched actualGPU pair"} |')
    lines += ['', 'All supported prior/current regressions, including native modes, remain visible:', '',
        '| Host/mode | Recipe | Input | Backend | Prior/current95% |', '|---|---|---|---|---|']
    for host, name, inp, backend, ci in adverse:
        lines.append(f'| {host} | {name} | {inp} | {backend} | {fmt(ci)} |')
    if not adverse:
        lines.append('| No individually supported regression | | | | |')
    lines += ['', '| Emitted file totals over 14 task bundles | Baseline | Prior | Current |', '|---|---:|---:|---:|']
    for label, filename in [('JavaScript', 'program.mjs'), ('C', 'cpu.c'), ('Wasm', 'cpu.wasm')]:
        sizes = [sum((HERE / k / name / filename).stat().st_size for name in tasks) for k in ['baseline', 'prior', 'checked']]
        lines.append(f'| {label} bytes | ' + ' | '.join(str(n) for n in sizes) + ' |')
    lines += ['', 'These are totals of separate bundles, not an aggregate application-size measurement; individual outputs can grow. Canonical web observations record exported Wasm linear-memory highwater only. JavaScript, GPU and native memory are unmeasured, so native samples receive no fabricated peak-byte records.', '',
        f'[Canonical observation import](canonical-observation-import.json) authenticates {imported["imported_observations"]} new web Wasm records, {imported["previous_observations"]}→{imported["canonical_observations"]} total, without changing the proof snapshot. Native timings remain linked report evidence because no native peak-memory measurement is available.', '',
        'The result supports reusable verified work elimination in these recipe families and preserves the performance tradeoffs against strong implementations. It does not establish that Ink generally beats JavaScript, Rust, WebAssembly or WebGPU. Algorithm choice, target lowering, transport and compiler optimization remain separate contributors. Forced-backend comparisons bypass the existing bounded runtime auto selector.', '',
        '[Web interval verification](root-interval-verification.json), [native independent verification](native-verification.json), [all profitability decisions](profitability.json), [strong controls](strong-controls.json), [current routing](backend-routing.json), [native summary](native/summary.json), [planner change](planner-change.json), [publication](publication.json), [final integrity check](verification.json).', '',
        '[Independent collection/control source review](independent-source-review.md), [independent reduction review](independent-reduction-review.md), [native timer review](native-clock-review.md), [native timer repair](native-clock-repair.json).', '']
    (HERE / 'REPORT.md').write_text('\n'.join(lines))
    print(json.dumps({'report_sha256': sha(HERE / 'REPORT.md'), 'writer_sha256': sha(Path(__file__)), 'web_samples': all_samples, 'native_samples': native['samples'], 'fresh_web_counts': dict(fresh), 'anchor_counts': dict(anchors), 'adverse_rows': len(adverse)}))


if __name__ == '__main__':
    write()
