#!/usr/bin/env python3
"""Differential check of parallel GPU schedules against compiled CPU.

Runs every function of examples/gpu-parallel.ink at size boundaries of the
three-level schedules (0, 1, 255..257, 65535..65537 and larger) with random
values, on the GPU and on the CPU, and requires identical results. Usage:
  parallel-check.py BUNDLE_PROGRAM [--large N]
"""
import argparse, json, random, subprocess, sys

def values(kind, n, rnd):
    if kind == 'u32': return [rnd.randrange(0, 2**32) for _ in range(n)]
    if kind == 'i32': return [rnd.randrange(-2**31, 2**31) for _ in range(n)]
    if kind == 'u64':
        return [str(v) if v > 2**53 else v for v in (rnd.randrange(0, 2**64) for _ in range(n))]
    if kind == 'small': return [rnd.randrange(-50, 50) for _ in range(n)]
    if kind == 'item': return [{"key": rnd.randrange(-100, 100), "weight": rnd.randrange(0, 2**32), "flag": rnd.random() < 0.5} for _ in range(n)]

def main():
    a = argparse.ArgumentParser(); a.add_argument('program'); a.add_argument('--large', type=int, default=300000)
    a.add_argument('--seed', type=int, default=1); o = a.parse_args()
    rnd = random.Random(o.seed)
    sizes = [0, 1, 2, 255, 256, 257, 4096, 65535, 65536, 65537, o.large]
    cases = []
    for n in sizes:
        for f, k in [('scan_u32','u32'),('scan_i32','i32'),('scan_u64','u64'),('sort_u32','u32'),('sort_i32','i32'),('sort_u64','u64'),('keep_odd','u64'),('sum_u32','u32'),('sum_i32','i32'),('sum_u64','u64'),('pipeline','small')]:
            cases.append((f, [values(k, n, rnd)]))
        cases.append(('keep_items', [values('item', n, rnd), rnd.randrange(-100, 100)]))
        cases.append(('cat_items', [values('item', n, rnd), values('item', n // 3, rnd)]))
    script = []
    for f, args in cases:
        for b in ('gpu-required', 'cpu'):
            script.append({"call": f, "args": args, "backend": b})
    path = '/tmp/ink-parallel-check.json'
    json.dump(script, open(path, 'w'))
    out = subprocess.run([o.program, '--script', path], capture_output=True, text=True, check=True).stdout.splitlines()
    failures = 0
    for i, (f, args) in enumerate(cases):
        g, c = json.loads(out[2 * i]), json.loads(out[2 * i + 1])
        n = len(args[0])
        if 'error' in g or g.get('backend') != 'gpu':
            print(f'FAIL {f} n={n}: GPU did not run: {g.get("error") or g.get("reason")}'); failures += 1; continue
        if g['value'] != c['value']:
            print(f'FAIL {f} n={n}: GPU and CPU differ'); failures += 1
    print(json.dumps({"cases": len(cases), "failures": failures, "sizes": sizes}))
    sys.exit(1 if failures else 0)

if __name__ == '__main__':
    main()
