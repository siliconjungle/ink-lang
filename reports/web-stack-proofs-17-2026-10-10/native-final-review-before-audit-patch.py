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
EXPECTED_METADATA = '8db895656c219e0953dfc492e91e0a09a3bb057214adc965c5732cfa4d933792'
EXPECTED_WEB_METADATA = '92ce464f25db102e76133b3f60c32ce56397246ea451f18e09e202b969916e7e'
COMPILER = '45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08'
PLANNER = '84427f6cf4d6b72ccb2b76e2a73b942634fe7becdf4688e2425359546487637b'


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
    bind(REPORT / 'native-storage-failure.json')
    bind(REPORT / 'native-time-failed-enospc.log')
    bind(NATIVE / 'results-failed-enospc.json')
    check((NATIVE / 'results-failed-enospc.json').stat().st_size == 0, 'failed storage archive contains no samples')
    driver = (NATIVE / 'driver.c').read_text()
    check('mach_absolute_time()' in driver and 'ticks()-start' in driver
          and 'timebase.numer/timebase.denom' in driver, 'integer tick delta and timebase clock')
    check(meta['status'] == 'prepared', 'native prepared metadata')
    check(web['compiler_sha256'] == COMPILER and web['planner_policy_sha256'] == PLANNER,
          'same frozen compiler and final optional binding/cardinality planner')
    bind(ROOT / '../toolchain/ink-sequence-proofs', COMPILER)
    bind(ROOT / 'planner/ink_planner/semantic_search.py', PLANNER)
    check(web['prior_snapshot'] == 'cc8308b40f651cdc3e5ece5b32ea94cea81bc2596046680384138fa16dd8ed9a'
          and web['new_snapshot'] == '717bc5be3b6d186678d71d3c11ec5a10a0bdc884759993f1d70add7a37b20c76',
          'prior1164 and selected1247 pins')
    bind(REPORT / 'spec.json', meta['spec_sha256'])
    bind(REPORT / 'fixtures.json', meta['fixtures_sha256'])
    spec = read(REPORT / 'spec.json')
    fixture = read(REPORT / 'fixtures.json')
    check(meta['tasks'] == spec['tasks'] and len(meta['tasks']) == 12, 'shared fourteen-task spec')
    check(len(meta['artifact_hashes']) == 170 and len(meta['sources']) == 38,
          'prepared170 artifacts and38 source bindings')
    for name, expected in meta['artifact_hashes'].items():
        bind(NATIVE / name, expected)
    for name, expected in meta['sources'].items():
        bind(REPORT / name, expected)
    check(set(meta['libraries']) == set(VARIANTS), 'five native libraries')
    for path in meta['libraries'].values():
        check(str(Path(path).relative_to(NATIVE)) in meta['artifact_hashes'], 'library frozen')
    bind(ROOT / 'bench/web-stack-native-17.py', digest(NATIVE / 'harness.py'))
    bind(ROOT / 'bench/web-stack-proofs-17/literal.rs', digest(REPORT / 'literal.rs'))
    bind(ROOT / 'bench/web-stack-proofs-17/expert.rs', digest(REPORT / 'expert.rs'))

    tasks = {t['name']: t for t in meta['tasks']}
    inputs = {x['id']: x for x in fixture['inputs']}
    check(len(inputs) == len(fixture['inputs']) == 156, '156 distinct validation fixtures')
    check(set(meta['binaries']) == set(inputs), 'one native binary per fixture')
    for name, x in inputs.items():
        path = Path(meta['binaries'][name])
        check(path.name == hashlib.sha256(name.encode()).hexdigest() + '.bin', 'binary name')
        expected = struct.pack('<QQII', len(x['xs']), len(x['ys']), x['seed'], x['factor'])
        expected += struct.pack('<' + 'I' * (len(x['xs']) + len(x['ys'])), *x['xs'], *x['ys'])
        check(path.read_bytes() == expected, 'frozen binary fixture bytes ' + name)

    validation_hash = bind(NATIVE / 'validation.json')
    validation = read(NATIVE / 'validation.json')
    check(validation['status'] == 'passed' and validation['exact_comparisons'] == 780
          and validation['inputs'] == 156 and validation['metadata_sha256'] == EXPECTED_METADATA,
          '780 complete pre-timing output validations bind prepared native bytes')
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
    check(len(cells) == len(set(cells)) == 144, '144 distinct native cells')
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
    check(len(raw['samples']) == summary['samples'] == 6480
          and len(raw['warmups']) == len(raw['calibration']) == 720 and summary['cells'] == 144,
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
    check(len(measurements) == len(summary['measurements']) == 144
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
    check(intervals == 576, '576 independently recomputed intervals')
    bind(Path(__file__))
    guard = read(REPORT / 'source-boundary-before.json')
    check(len(guard) == 102, '102-key source guard')
    bind(REPORT / 'source-boundary-before.json')
    changed = []
    for path, expected in guard.items():
        actual = digest(ROOT / path)
        if actual != expected: changed.append(path)
        bind(ROOT / path, PLANNER if path == 'planner/ink_planner/semantic_search.py' else expected)
    check(changed == ['planner/ink_planner/semantic_search.py'], 'only documented external planner changed')
    bind(REPORT / 'policy-freeze.json')
    policy = read(REPORT / 'policy-freeze.json')
    for path, expected in policy['artifacts'].items(): bind(ROOT / path, expected)
    check(meta['main_metadata_sha256'] == EXPECTED_WEB_METADATA, 'native binds web metadata')
    check(meta['snapshots'] == {k:web[k] for k in ['prior_snapshot','effective_prior_snapshot','new_snapshot']}, 'all snapshot pins shared')
    check(meta['cpu_cost_model_sha256'] == web['cost_model_sha256'], 'same CPU policy')
    outcomes = {}
    for mode in ('resident','snapshot'):
        outcomes[mode] = {}
        for cohort, predicate in [('all',lambda x:True),('vectors',lambda x:tasks[x['case']]['output_kind']=='list_u32'),('folds',lambda x:tasks[x['case']]['output_kind']!='list_u32')]:
            selected = [x for x in summary['measurements'] if x['mode']==mode and predicate(x)]
            result = {}
            for label, numerator_fast in [('prior_over_checked',False),('checked_over_rust_expert',True)]:
                ratios = [x['paired_ratios_95pct'][label] for x in selected]
                ink_wins = sum(v[2]<1 if numerator_fast else v[1]>1 for v in ratios)
                ink_losses = sum(v[1]>1 if numerator_fast else v[2]<1 for v in ratios)
                result[label] = dict(ink_faster=ink_wins,inconclusive=len(ratios)-ink_wins-ink_losses,ink_slower=ink_losses,ratio_range=[min(v[0] for v in ratios),max(v[0] for v in ratios)])
            outcomes[mode][cohort] = result
    bind(Path(__file__))
    receipt = dict(status='passed',native_cells=144,variants=5,rounds_per_cell_variant=9,samples=6480,warmups=720,calibrations=720,complete_validation_comparisons=780,validation_inputs=156,prepared_native_artifacts=170,source_bindings=38,calibration_iterations=1000,independently_recomputed_paired_intervals=intervals,bootstrap=dict(draws=4000,seed=0,paired_by='round',quantile_indices=[100,3899]),source_guard=dict(keys=102,changed=changed),outcomes=outcomes,bindings=bindings,scope='Archived authentication and independent intervals only; no tests, builds, algorithms or new timing runs.',limitations=['The 780 complete native prevalidation comparisons are authenticated, not rerun. Timed vectors use length/sum/weighted checksums rather than complete per-iteration comparisons.','Native direct function timings bypass packed scalar result bridges. Resident borrows inputs; snapshot times malloc/copy/free of both inputs. Both consume outputs/reset arenas before finishing.','Expert Rust reuses output destination; generated C allocates vector outputs. Startup/input generation/module loading excluded; one shared-library boundary each, no cross-library LTO.','Apple Clang14 and RustLLVM22 are different optimizer versions; one AppleM2/shared machine and synthetic fixture families do not establish a language ranking.','Whole frozen native matrix rerun after ENOSPC; the failed archive is empty and no samples were pooled or selectively retained.','Confidence intervals reproduce registered paired recipe; shared-machine interference and multiple comparisons remain limitations.'])
    destination = REPORT / 'native-final-review.json'
    destination.write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps({'status': 'passed', 'receipt': str(destination), 'sha256': digest(destination),
                      'samples': 6480, 'intervals': intervals}))


if __name__ == '__main__':
    main()
