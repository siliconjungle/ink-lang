#!/usr/bin/env python3
"""Render REPORT tables from bench/views/run.py results.json."""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'bench'))
import methodology as M


def main(path):
    r = json.loads(Path(path).read_text())
    lines = []
    for n in sorted({x['n'] for x in r['results']}):
        lines.append(f'### {n} rows\n')
        lines.append('| queries | Ink maintained | Ink scan | Rust incr. i64 | Rust incr. bigint | Rust scan |'
                     ' Ink scan ÷ maintained | maintained ÷ Rust bigint | maintained ÷ Rust i64 |')
        lines.append('|---:|---:|---:|---:|---:|---:|---:|---:|---:|')
        for x in sorted((x for x in r['results'] if x['n'] == n), key=lambda x: x['query_permille']):
            m = x['median_ns_per_op']
            cells = [f"{x['query_permille'] / 10:g}%"] + [f'{m[v]:,.0f}' if m[v] >= 100 else f'{m[v]:.1f}' for v in r['variants']]
            point, lo, hi = M.ratio_ci(x['ns_per_op']['ink_scan'], x['ns_per_op']['ink_maintained'])
            digits = 2 if hi < 10 else 0
            cells.append(f'{point:,.{digits}f}× [{lo:,.{digits}f}, {hi:,.{digits}f}]')
            for other in ('rust_incremental_bigint', 'rust_incremental'):
                cells.append(M.fmt_ci(*x['ratios'][f'ink_maintained/{other}']))
            lines.append('| ' + ' | '.join(cells) + ' |')
        lines.append('')
    print('\n'.join(lines))


if __name__ == '__main__':
    main(sys.argv[1])
