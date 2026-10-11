#!/usr/bin/env python3
"""Prepare deterministic fixed-schema diff fixtures and archive build identities."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / 'build/frontier-diff'


def fixtures():
    cases = []
    for kind in ['scalar', 'rows', 'rows-shared']:
        for n in [64, 1024, 16384]:
            for mode, count in [('unchanged', 0), ('sparse', max(1, (n + 99)//100)), ('dense', n//2)]:
                indexes = sorted((i*4099+17) % n for i in range(count))
                if kind == 'scalar':
                    before = [(i*7919+12345) % 1000000 for i in range(n)]
                    after = before.copy()
                    for i in indexes:
                        after[i] = (after[i]+37) % 2**32
                    edits = [dict(index=i, value=after[i]) for i in indexes]
                else:
                    before = [dict(id=i, x=(i*17)%1000000, y=(i*31)%1000000,
                                   score=(i*11)%1000000, flags=i%16) for i in range(n)]
                    # Shared identities are restored by the JS/browser fixture loader.
                    after = [dict(r) for r in before]
                    for i in indexes:
                        after[i]['x'] += 37
                    edits = [dict(index=i, **after[i]) for i in indexes]
                dirty = sorted(set(indexes + [0, n//2, n-1]))
                cases.append(dict(id=f'{kind}-{n}-{mode}', kind=kind, rows=n, mode=mode,
                                  changes=count, before=before, after=after, dirty=dirty, edits=edits))
    return cases


def main():
    WORK.mkdir(parents=True, exist_ok=True)
    cases = fixtures()
    raw = json.dumps(cases, separators=(',', ':')).encode()
    (WORK/'fixtures.json').write_bytes(raw)
    print(json.dumps(dict(cases=len(cases), fixtures_sha256=hashlib.sha256(raw).hexdigest())))


if __name__ == '__main__':
    main()
