"""Paired round comparisons; speed ratios never establish mathematical truth."""
from pathlib import Path
import argparse, collections, hashlib, json, math, random

def interval(left, right, seed):
    assert len(left) == len(right) == 9
    ratios = [math.log(a / b) for a, b in zip(left, right)]
    rng = random.Random(seed)
    boot = sorted(math.exp(sum(rng.choice(ratios) for _ in ratios) / len(ratios))
                  for _ in range(4000))
    estimate = math.exp(sum(ratios) / len(ratios))
    lo, hi = boot[100], boot[3899]
    return dict(speedup=estimate, ci95=[lo, hi],
                classification='win' if lo > 1 else 'loss' if hi < 1 else 'uncertain')

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--results', type=Path, action='append', required=True)
    parser.add_argument('--pair', action='append', required=True,
                        help='label:reference_variant:optimized_variant')
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    pairs = [p.split(':') for p in args.pair]
    assert all(len(p) == 3 for p in pairs)
    receipts = []
    for path in args.results:
        raw = json.loads(path.read_text())
        assert raw['status'] == 'passed'
        groups = collections.defaultdict(lambda: collections.defaultdict(dict))
        for row in raw['samples']:
            name = row.get('task', row.get('name', row.get('case')))
            frame = row.get('frame', row.get('input'))
            assert name is not None and frame is not None
            value = row['ns_per_call']
            assert math.isfinite(value) and value > 0
            cell = groups[(name, frame)][row['variant']]
            assert row['round'] not in cell
            cell[row['round']] = value
        output = []
        for at, (key, variants) in enumerate(sorted(groups.items())):
            assert all(set(rounds) == set(range(9)) for rounds in variants.values())
            for label, left, right in pairs:
                if left not in variants or right not in variants:
                    continue
                a = [variants[left][i] for i in range(9)]
                b = [variants[right][i] for i in range(9)]
                output.append(dict(task=key[0], frame=key[1], comparison=label,
                                   reference=left, optimized=right,
                                   **interval(a, b, 310000 + at)))
        summary = []
        for label, left, right in pairs:
            rows = [x for x in output if x['comparison'] == label]
            if not rows:
                continue
            summary.append(dict(comparison=label, cells=len(rows),
                                geometric_mean=math.exp(sum(math.log(x['speedup']) for x in rows) / len(rows)),
                                classifications=dict(collections.Counter(x['classification'] for x in rows))))
        receipts.append(dict(path=str(path.resolve()), sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                             samples=len(raw['samples']), comparisons=output, summary=summary))
    result = dict(status='passed', sources=receipts,
                  method='9 matched rounds; geometric mean of paired reference/optimized ratios; 4000 paired-round bootstrap resamples with fixed seeds; per-cell 95% intervals. Aggregate geometric mean is descriptive only.',
                  scope='One machine and fixed input recipes; preparation/captured/full-call boundaries must be read from each variant. No general native superiority or all-hardware claim.')
    args.out.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps([dict(path=x['path'], samples=x['samples'], summary=x['summary']) for x in receipts], indent=2))

if __name__ == '__main__':
    main()
