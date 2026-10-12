"""Summarise the serial full-call benchmark without discarding losses."""
import json
import random
import statistics
import sys
from pathlib import Path

report = Path(sys.argv[1])
data = json.loads((report / 'samples.json').read_text())
assert data['status'] == 'passed'
cases = {}
for sample in data['samples']:
    cases.setdefault(sample['case'], {}).setdefault(sample['variant'], []).append(sample)
rng = random.Random(72413)
rows = []
for case, variants in cases.items():
    medians = {name: statistics.median(s['us'] for s in samples) for name, samples in variants.items()}
    row = {'case': case, 'median_us': medians}
    if 'before' in medians:
        before = {s['round']: s['us'] for s in variants['before']}
        fixed = {s['round']: s['us'] for s in variants['fixed']}
        rounds = sorted(before)
        assert rounds == sorted(fixed)
        ratios = []
        for _ in range(5000):
            chosen = rng.choices(rounds, k=len(rounds))
            ratios.append(statistics.median(before[i] for i in chosen) / statistics.median(fixed[i] for i in chosen))
        ratios.sort()
        row['before_over_fixed'] = medians['before'] / medians['fixed']
        row['paired_bootstrap_95'] = [ratios[125], ratios[4874]]
    row['fixed_over_frontier'] = medians['fixed'] / medians['frontier']
    rows.append(row)
summary = {'schema': 1, 'status': 'passed', 'cases': rows, 'validation_cells': len(data['validation']), 'excluded': data['excluded']}
(report / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
table = ['| Case | Wasm before | Wasm fixed | Frontier JS | Ink JS | Before/fixed |', '|---|---:|---:|---:|---:|---:|']
for row in rows:
    m = row['median_us']
    before = f"{m['before']/1000:.3f}" if 'before' in m else 'budget exclusion'
    factor = f"{row['before_over_fixed']:.2f}×" if 'before_over_fixed' in row else '—'
    table.append(f"| {row['case']} | {before} | {m['fixed']/1000:.3f} | {m['frontier']/1000:.3f} | {m['javascript']/1000:.3f} | {factor} |")
(report / 'table.md').write_text('\n'.join(table) + '\n')
print(json.dumps({'cases': len(rows), 'validation_cells': summary['validation_cells'], 'measured_speedup_range': [min(r['before_over_fixed'] for r in rows if 'before_over_fixed' in r), max(r['before_over_fixed'] for r in rows if 'before_over_fixed' in r)]}))
