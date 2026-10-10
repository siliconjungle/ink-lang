#!/usr/bin/env python3
"""Independent archived-native evidence audit. Never builds or runs algorithms.

Run only after the parent announces all timing jobs have stopped. The script
imports neither the benchmark harness nor its methodology/statistics helpers.
"""
import hashlib
import json
import math
import random
import struct
from pathlib import Path

REPORT = Path(__file__).resolve().parent
ROOT = REPORT.parents[1]
NATIVE = REPORT / 'native'
VARIANTS = ('ink_baseline_native', 'ink_prior_native', 'ink_checked_native',
            'rust_literal_native', 'rust_expert_native')
PAIRS = {
    'prior_over_checked': (VARIANTS[1], VARIANTS[2]),
    'baseline_over_checked': (VARIANTS[0], VARIANTS[2]),
    'checked_over_rust_expert': (VARIANTS[2], VARIANTS[4]),
    'checked_over_rust_literal': (VARIANTS[2], VARIANTS[3]),
}
MASK = (1 << 64) - 1
FREEZE = json.loads((REPORT/'pre-timing-freeze.json').read_text())
EXPECTED_METADATA = FREEZE['native_metadata_sha256']
EXPECTED_WEB_METADATA = FREEZE['web_metadata_sha256']
COMPILER = FREEZE['compiler_sha256']
PLANNER = FREEZE['planner_sha256']


def check(condition, label):
    if not condition:
        raise AssertionError(label)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    return json.loads(Path(path).read_text())


def positive(value, label):
    check(type(value) in (float, int) and math.isfinite(value) and value > 0, label)


def integer(value, label, minimum=0):
    check(type(value) is int and value >= minimum, label)


def median(values):
    ordered = sorted(values)
    n = len(ordered)
    return ordered[n // 2] if n % 2 else (ordered[n // 2 - 1] + ordered[n // 2]) / 2


def independent_interval(numerator, denominator):
    """Same preregistered paired recipe, separately implemented without M."""
    check(len(numerator) == len(denominator) == 9, 'nine paired observations')
    rng = random.Random(0)
    distribution = []
    for _ in range(4000):
        indices = [rng.randrange(9) for _ in range(9)]
        top = sorted(numerator[i] for i in indices)[4]
        bottom = sorted(denominator[i] for i in indices)[4]
        distribution.append(top / bottom)
    distribution.sort()
    return [median(numerator) / median(denominator),
            distribution[100], distribution[3899]]


def observation(value, task):
    if task['output_kind'] != 'list_u32':
        scalar = int(value)
        check(0 <= scalar <= MASK, 'scalar U64 range')
        return str(value), scalar
    check(type(value) is list and all(type(x) is int and 0 <= x < 2**32 for x in value),
          'complete vector oracle shape')
    total = sum(value) & 0xffffffff
    weighted = sum((i + 1) * x for i, x in enumerate(value)) & 0xffffffff
    return f'array:{len(value)}:{total}:{weighted}', (total + (weighted << 32) + len(value)) & MASK


def main():
    bindings = {}

    def bind(path, expected=None):
        actual = digest(path)
        check(expected is None or actual == expected, 'hash ' + str(path))
        bindings[str(Path(path).relative_to(ROOT))] = actual
        return actual

    bind(NATIVE / 'metadata.json', EXPECTED_METADATA)
    bind(REPORT / 'metadata.json', EXPECTED_WEB_METADATA)
    meta = read(NATIVE / 'metadata.json')
    web = read(REPORT / 'metadata.json')
    driver = (NATIVE / 'driver.c').read_text()
    check('mach_absolute_time()' in driver and 'ticks()-start' in driver
          and 'timebase.numer/timebase.denom' in driver, 'integer tick delta and timebase clock')
    check(meta['status'] == 'prepared', 'native prepared metadata')
    check(web['compiler_sha256'] == COMPILER and web['planner_policy_sha256'] == PLANNER,
          'same frozen compiler and final cost-only planner')
    bind(ROOT / '../toolchain/ink-sequence-proofs', COMPILER)
    bind(ROOT / 'planner/ink_planner/semantic_search.py', PLANNER)
    check(web['prior_snapshot']==FREEZE['historical_prior_snapshot'] and web['new_snapshot']==FREEZE['new_snapshot'], 'published pins')
    bind(REPORT / 'spec.json', meta['spec_sha256'])
    bind(REPORT / 'fixtures.json', meta['fixtures_sha256'])
    spec = read(REPORT / 'spec.json')
    fixture = read(REPORT / 'fixtures.json')
    check(meta['tasks'] == spec['tasks'] and len(meta['tasks']) == 18, 'shared eighteen-task spec')
    check(len(meta['artifact_hashes']) == len(FREEZE['native_artifacts']) and len(meta['sources']) == 56,
          'prepared202 artifacts and44 source bindings')
    for name, expected in meta['artifact_hashes'].items():
        bind(NATIVE / name, expected)
    for name, expected in meta['sources'].items():
        bind(REPORT / name, expected)
    check(set(meta['libraries']) == set(VARIANTS), 'five native libraries')
    for path in meta['libraries'].values():
        check(str(Path(path).relative_to(NATIVE)) in meta['artifact_hashes'], 'library frozen')
    bind(ROOT / 'bench/web-stack-native-15.py', digest(NATIVE / 'harness.py'))
    bind(ROOT / 'bench/web-stack-proofs-15/literal.rs', digest(REPORT / 'literal.rs'))
    bind(ROOT / 'bench/web-stack-proofs-15/expert.rs', digest(REPORT / 'expert.rs'))

    tasks = {t['name']: t for t in meta['tasks']}
    inputs = {x['id']: x for x in fixture['inputs']}
    check(len(inputs) == len(fixture['inputs']) == 234, '188 distinct validation fixtures')
    check(set(meta['binaries']) == set(inputs), 'one native binary per fixture')
    for name, x in inputs.items():
        path = Path(meta['binaries'][name])
        check(path.name == hashlib.sha256(name.encode()).hexdigest() + '.bin', 'binary name')
        expected = struct.pack('<QQII', len(x['xs']), len(x['ys']), x['seed'], x['factor'])
        expected += struct.pack('<' + 'I' * (len(x['xs']) + len(x['ys'])), *x['xs'], *x['ys'])
        check(path.read_bytes() == expected, 'frozen binary fixture bytes ' + name)

    validation_hash = bind(NATIVE / 'validation.json')
    validation = read(NATIVE / 'validation.json')
    check(validation['status'] == 'passed' and validation['exact_comparisons'] == 1170
          and validation['inputs'] == 234 and validation['metadata_sha256'] == EXPECTED_METADATA,
          '940 complete pre-timing output validations bind prepared native bytes')
    raw_hash = bind(NATIVE / 'results.json')
    summary_hash = bind(NATIVE / 'summary.json')
    raw = read(NATIVE / 'results.json')
    summary = read(NATIVE / 'summary.json')
    check(raw['status'] == summary['status'] == 'passed', 'passed raw and summary')
    check(raw['metadata_sha256'] == EXPECTED_METADATA and raw['validation_sha256'] == validation_hash,
          'raw metadata and validation hashes')
    check(summary['metadata_sha256'] == EXPECTED_METADATA and summary['results_sha256'] == raw_hash
          and summary['validation'] == validation, 'summary binds raw and complete validation')
    check(raw['scope'] == summary['scope'] == meta['scope'], 'identical native scope')
    params = raw['parameters']
    check(params['repeats'] == 9 and params['warmup'] == 1 and params['seed'] == 20261025,
          'nine rounds, one warmup, fixed interleave seed')
    positive(params['seconds'], 'positive calibration budget')
    cells = []
    for c in fixture['cells']:
        x = fixture['inputs'][c['input']]
        check(c['case'] in x['expected'] and c['case'] == x['case'], 'cell-to-input linkage')
        cells.extend((c['case'], x['id'], mode) for mode in ('resident', 'snapshot'))
    check(len(cells) == len(set(cells)) == 216, '180 distinct native cells')
    expected_base = {cell + (v,) for cell in cells for v in VARIANTS}
    phases = {}
    for phase, field, rounds in [('calibration', None, 1), ('warmups', 'warmup', 1), ('samples', 'round', 9)]:
        expected_keys = {base + ((i,) if field else ()) for base in expected_base for i in range(rounds)}
        seen = {}
        for row in raw[phase]:
            base = tuple(row[k] for k in ('case', 'input', 'mode', 'variant'))
            if field:
                integer(row[field], phase + ' index')
            key = base + ((row[field],) if field else ())
            check(key in expected_keys and key not in seen, phase + ' exact unique coverage')
            integer(row['iterations'], phase + ' iterations', 1)
            check(row['iterations'] <= 5000000, phase + ' iteration cap')
            positive(row['seconds'], phase + ' finite positive seconds')
            positive(row['ns_per_call'], phase + ' finite positive ns')
            check(math.isclose(row['ns_per_call'], row['seconds'] * 1e9 / row['iterations'], rel_tol=1e-12),
                  phase + ' timing arithmetic')
            expected_single, code = observation(inputs[row['input']]['expected'][row['case']], tasks[row['case']])
            check(row['single'] == expected_single and row['code'] == str(code)
                  and row['checksum'] == str((code * row['iterations']) & MASK), phase + ' consumed output')
            if phase == 'calibration':
                check(row['iterations'] == 1000, 'calibration 1,000 calls after clock repair')
            seen[key] = row
        check(set(seen) == expected_keys, phase + ' complete coverage')
        phases[phase] = seen
    check(len(raw['samples']) == summary['samples'] == 9720
          and len(raw['warmups']) == len(raw['calibration']) == 1080 and summary['cells'] == 216,
          'exact sample and phase totals')
    for base in expected_base:
        calibration = phases['calibration'][base]
        expected_iterations = max(1, min(5000000, math.ceil(params['seconds'] /
                                                         (calibration['seconds'] / 1000))))
        check(phases['warmups'][base + (0,)]['iterations'] == expected_iterations,
              'warmup uses calibrated iterations')
        for i in range(9):
            check(phases['samples'][base + (i,)]['iterations'] == expected_iterations,
                  'all rounds use calibrated iterations')
    rng = random.Random(20261025)
    ordered_keys = []
    for cell in cells:
        for i in range(9):
            order = list(VARIANTS)
            rng.shuffle(order)
            ordered_keys.extend(cell + (v, i) for v in order)
    actual_keys = [tuple(row[k] for k in ('case', 'input', 'mode', 'variant', 'round')) for row in raw['samples']]
    check(actual_keys == ordered_keys, 'exact shuffled sample order')

    measurements = {(m['case'], m['input'], m['mode']): m for m in summary['measurements']}
    check(len(measurements) == len(summary['measurements']) == 216
          and set(measurements) == set(cells), 'summary exact cell coverage')
    intervals = 0
    for cell in cells:
        m = measurements[cell]
        check(m['ratio_variants'] == {k: list(pair) for k, pair in PAIRS.items()}, 'ratio orientation')
        values = {v: [phases['samples'][cell + (v, i)]['ns_per_call'] for i in range(9)] for v in VARIANTS}
        check(set(m['median_ns']) == set(VARIANTS) and set(m['paired_ratios_95pct']) == set(PAIRS),
              'all variant medians and four ratios')
        for v in VARIANTS:
            check(m['median_ns'][v] == median(values[v]), 'independent cell median')
        for name, (a, b) in PAIRS.items():
            calculated = independent_interval(values[a], values[b])
            check(m['paired_ratios_95pct'][name] == calculated, 'independent paired interval ' + name)
            intervals += 1
    check(intervals == 864, '720 independently recomputed intervals')
    bind(Path(__file__))
    bind(REPORT / 'independent-reduction-review.md')
    receipt = {
        'status': 'passed', 'native_cells': 216, 'variants': 5, 'rounds_per_cell_variant': 9,
        'samples': 9720, 'warmups': 1080, 'calibrations': 1080,
        'complete_validation_comparisons': 1170, 'validation_inputs': 234,
        'prepared_native_artifacts': len(meta['artifact_hashes']), 'source_bindings': 56,
        'calibration_iterations': 1000,
        'clock_repair': 'All variants use 1,000-call calibration and integer-difference mach_absolute_time.',
        'independently_recomputed_paired_intervals': intervals,
        'bootstrap': {'draws': 4000, 'seed': 0, 'paired_by': 'round', 'quantile_indices': [100, 3899]},
        'bindings': bindings,
        'scope': 'Archived evidence authentication and independent interval calculation only; no builds, tests, algorithm executions or new timings.',
        'limitations': [
            'Prevalidation complete output execution is authenticated from its receipt, not rerun by this verifier.',
            'Timed vectors are guarded by length, sum and weighted checksum, not complete elementwise comparison per iteration.',
            'Native resident and snapshot modes are not browser full-call latency; startup/loading excluded.',
            'Expert Rust reuses caller output storage; generated C can allocate outputs; normal release optimization permitted.',
            'Finite recipes and one machine/compiler combination are not a general language ranking or automatic routing guarantee.',
            'Paired bootstrap intervals reproduce the registered recipe; shared-machine interference and multiple comparisons remain limitations.',
        ],
    }
    destination = REPORT / 'native-verification.json'
    destination.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({'status': 'passed', 'receipt': str(destination), 'sha256': digest(destination),
                      'samples': 9720, 'intervals': intervals}))


if __name__ == '__main__':
    main()
