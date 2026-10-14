"""Audit complete-engine evidence and retain every held-out cell, including losses.

These descriptive ratios are not confidence bounds or proof of generalisation to
other programs. Process variation and individual fallback decisions stay visible.
"""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import statistics

LIFECYCLE = 'engine-create/session-open/steps/full-read/session-close/engine-close-v1'
MODES = ('cpu', 'gpu', 'auto', 'profile')


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def analyse(training, evaluation, profile_sha256):
    require(3 <= len(training) <= 32 and 3 <= len(evaluation) <= 32,
            'three distinct processes per split required')
    cohort = None
    processes = set()
    contexts = {}
    cells = {}
    workload_totals = []
    for mode, records in [('train', training), ('evaluation', evaluation)]:
        for record in records:
            require(record['schema'] == 1 and record['mode'] == mode and
                    record['lifecycle'] == LIFECYCLE, 'wrong acquisition lifecycle or split')
            pid = record['process_id']
            require(isinstance(pid, str) and pid and pid not in processes,
                    'training and evaluation processes must be distinct')
            processes.add(pid)
            provenance = {k: record[k] for k in ('target_key', 'environment', 'device',
                          'source_hashes', 'protocol_sha256', 'training_protocol', 'evaluation_protocol')}
            provenance['profile_mode'] = record.get('profile_mode', 'inline')
            require(provenance['profile_mode'] in ('inline', 'prepared'), 'unknown profile preparation')
            require(cohort is None or provenance == cohort, 'mixed acquisition provenance')
            cohort = provenance
            require(record['device'].get('isFallbackAdapter') is False, 'hardware GPU required')
            require(record['profile_sha256'] == (profile_sha256 if mode == 'evaluation' else None),
                    'wrong fitted profile or profile used in training')
            common_setup = record.get('common_setup_ns', 0)
            require(type(common_setup) in (int, float) and math.isfinite(common_setup) and common_setup >= 0,
                    'invalid shared ABI startup cost')
            preparation = record.get('profile_preparation_ns', 0)
            require(type(preparation) in (int, float) and math.isfinite(preparation) and preparation >= 0,
                    'invalid profile preparation cost')
            require((mode == 'evaluation' and provenance['profile_mode'] == 'prepared') or preparation == 0,
                    'unexpected preparation cost')
            if mode == 'evaluation' and provenance['profile_mode'] == 'prepared':
                require(preparation > 0, 'prepared profile setup cost missing')
            totals = {name: 0 for name in MODES}
            train, held = record['training_protocol'], record['evaluation_protocol']
            require(not set(train['sizes']) & set(held['sizes']) and
                    not set(train['horizons']) & set(held['horizons']) and train['seed'] != held['seed'],
                    'training/evaluation overlap')
            spec = train if mode == 'train' else held
            expected = {(family, n, iterations) for family in ('ecs', 'physics')
                        for n in spec['sizes'] for iterations in spec['horizons']}
            seen = set()
            names = MODES[:2] if mode == 'train' else MODES
            for case in record['cases']:
                key = (case['family'], case['n'], case['iterations'])
                require(key in expected and key not in seen, 'unexpected or duplicate case')
                seen.add(key)
                require(case['validated'] is True, 'unchecked output')
                context = case['context']
                require(json.loads(context['scope'])[0] == 'ink-resident-engine-v1' and
                        context['boundary'] == 'captured-owned', 'session costs are not engine costs')
                binding = (case['core_sha256'], context)
                require(key not in contexts or contexts[key] == binding, 'case context changed')
                contexts[key] = binding
                require(set(case['samples']) == set(names) == set(case['complete_engine_ns']),
                        'missing execution path')
                times = {}
                for name in names:
                    samples = case['samples'][name]
                    require(len(samples) == 8 and [s['round'] for s in samples] == list(range(8)),
                            'eight complete rounds required')
                    require([s['elapsed_ns'] for s in samples] == case['complete_engine_ns'][name],
                            'timing samples differ')
                    for sample in samples:
                        ns, backend, counters = sample['elapsed_ns'], sample['backend'], sample['counters']
                        require(type(ns) in (int, float) and math.isfinite(ns) and ns > 0,
                                'invalid elapsed time')
                        require(backend in ('cpu', 'gpu'), 'unknown actual backend')
                        require(name not in ('cpu', 'auto') or backend == 'cpu', 'CPU baseline changed')
                        require(name != 'gpu' or backend == 'gpu', 'forced GPU fell back')
                        if backend == 'gpu':
                            require(counters['live_buffer_bytes'] == 0 and counters['peak_buffer_bytes'] > 0 and
                                    (case['n'] == 0 or counters['dispatches'] > 0), 'GPU leak or no dispatch')
                        else:
                            require(counters['peak_buffer_bytes'] is None, 'CPU memory is unmeasured')
                    require(case['backends'][name] == samples[-1]['backend'] and
                            case['decisions'][name] == samples[-1]['decision'] and
                            case['counters'][name] == samples[-1]['counters'], 'last-sample summary differs')
                    times[name] = statistics.median(s['elapsed_ns'] for s in samples)
                    totals[name] += sum(s['elapsed_ns'] for s in samples)
                for r in range(8):
                    require(sorted(case['samples'][name][r]['order'] for name in names) == list(range(len(names))),
                            'incomplete interleaved round')
                # Each complete block includes every backend at each position and
                # every directed within-round adjacent pair exactly once.
                # Across-round boundary carryover and background activity remain.
                for block in range(0, 8, len(names)):
                    orders = [[None] * len(names) for _ in names]
                    for r in range(len(names)):
                        for name in names:
                            orders[r][case['samples'][name][block + r]['order']] = name
                    require(all(set(row[p] for row in orders) == set(names) for p in range(len(names))),
                            'backend positions are unbalanced')
                    pairs = Counter((row[i - 1], row[i]) for row in orders for i in range(1, len(names)))
                    require(len(pairs) == len(names) * (len(names) - 1) and all(v == 1 for v in pairs.values()),
                            'preceding backends are unbalanced')
                if mode == 'evaluation':
                    entry = cells.setdefault(key, [])
                    entry.append(dict(process_id=pid, median_ns=times,
                        speedup_vs_cpu={name: times['cpu'] / times[name] for name in MODES[1:]},
                        profile_speedup_vs_best_forced=min(times['cpu'], times['gpu']) / times['profile'],
                        profile_backend_counts=dict(Counter(s['backend'] for s in case['samples']['profile'])),
                        profile_decisions=case['samples']['profile']))
            require(seen == expected, 'missing registered case')
            if mode == 'evaluation':
                workload_totals.append(dict(process_id=pid, profile_calls=8 * len(expected),
                    profile_preparation_ns=preparation, common_setup_ns=common_setup, execution_ns=totals,
                    cpu_complete_ns=common_setup + totals['cpu'],
                    profile_complete_ns=common_setup + preparation + totals['profile'],
                    profile_speedup_including_preparation=(common_setup + totals['cpu']) / (common_setup + preparation + totals['profile'])))
    results = []
    for (family, n, iterations), measurements in sorted(cells.items()):
        ratios = {name: [m['speedup_vs_cpu'][name] for m in measurements] for name in MODES[1:]}
        results.append(dict(family=family, n=n, iterations=iterations, processes=measurements,
            speedup_vs_cpu={name: dict(median=statistics.median(values), minimum=min(values), maximum=max(values))
                            for name, values in ratios.items()},
            profile_slower_processes=sum(v < 1 for v in ratios['profile'])))
    return dict(schema=1, lifecycle=LIFECYCLE, cohort=cohort, profile_sha256=profile_sha256,
        training_processes=len(training), evaluation_processes=len(evaluation), cases=results, workload_totals=workload_totals,
        profile_median_loss_cells=sum(c['speedup_vs_cpu']['profile']['median'] < 1 for c in results),
        scope='Two existing ECS/physics kernels, held-out sizes/horizons/seeds. All cells retained. '
              'Case ratios cover full engine calls; workload totals additionally include shared ABI startup and one-time profile preparation. '
              'Browser startup and common module import excluded. '
              'Ratios are descriptive, not confidence bounds. No machine-isolation claim. '
              'CPU and driver memory unmeasured; not Box2D or a full game engine.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--receipt', required=True)
    parser.add_argument('--profile', required=True)
    parser.add_argument('--evaluation', nargs='+', required=True)
    parser.add_argument('-o', required=True)
    args = parser.parse_args()
    receipt = json.loads(Path(args.receipt).read_text())
    profile_sha256 = digest(args.profile)
    require(receipt['profile_sha256'] == profile_sha256, 'fitted profile bytes differ')
    training = []
    for name, expected_hash in receipt['training_files'].items():
        require(digest(name) == expected_hash, 'training file bytes differ')
        training.append(json.loads(Path(name).read_text()))
    result = analyse(training, [json.loads(Path(p).read_text()) for p in args.evaluation], profile_sha256)
    result['evidence_sha256'] = {p: digest(p) for p in [args.receipt, args.profile, *receipt['training_files'], *args.evaluation]}
    Path(args.o).write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(dict(cases=len(result['cases']), profile_median_loss_cells=result['profile_median_loss_cells'], output=args.o)))


if __name__ == '__main__':
    main()
