"""Validate complete timing coverage and retain every case and candidate."""
import collections
import json
import random
import statistics
import sys

report = json.load(open(sys.argv[1]))
assert report['status'] == 'passed'
variants = ['apply-old', 'apply-shared', 'old-source-old-lowering',
            'old-source-new-lowering', 'final-state', 'internal-fields',
            'frontier-roundtrip']
groups = collections.defaultdict(lambda: collections.defaultdict(dict))
for sample in report['samples']:
    cell = groups[sample['case']][sample['variant']]
    assert sample['round'] not in cell
    assert sample['iterations'] > 0 and sample['us'] > 0
    cell[sample['round']] = sample['us']
expected = {f'{kind}-{size}-{mode}' for kind in ['rows', 'rows-shared']
            for size in [64, 1024, 16384] for mode in ['unchanged', 'sparse', 'dense']}
assert set(groups) == expected
assert len(report['validation']) == len(expected) * len(variants)
assert {(v['case'], v['variant']) for v in report['validation']} == {
    (case, variant) for case in expected for variant in variants}
rng = random.Random(71431)
summary = {'schema': 1, 'rounds': report['rounds'], 'bootstrap_draws': 10000,
           'ratio': 'comparator / final-state; above one favours final-state', 'cases': []}
for case, cells in groups.items():
    assert set(cells) == set(variants)
    assert all(set(cell) == set(range(report['rounds'])) for cell in cells.values())
    medians = {name: statistics.median(cell.values()) for name, cell in cells.items()}
    ratios = {}
    for comparator in ['old-source-old-lowering', 'frontier-roundtrip']:
        draws = []
        for _ in range(summary['bootstrap_draws']):
            indices = [rng.randrange(report['rounds']) for _ in range(report['rounds'])]
            draws.append(statistics.median(cells[comparator][i] for i in indices) /
                         statistics.median(cells['final-state'][i] for i in indices))
        draws.sort()
        ratios[comparator] = {'median_ratio': medians[comparator] / medians['final-state'],
                             'paired_bootstrap_95_percent': [draws[249], draws[9749]]}
    summary['cases'].append({'case': case, 'median_us': medians, 'ratios': ratios})
print(json.dumps(summary, indent=2))
