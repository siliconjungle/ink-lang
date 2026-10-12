#!/usr/bin/env python3
"""Native resident sessions: GPU sessions against CPU sessions and one-shot
pipelines, split steps, small reads, writes, shrinking feedback and u64 /
record-field reductions. Native twin of session-check.mjs.
  session-check.py SESSION_PROGRAM PARTICLES_PROGRAM [PARALLEL_PROGRAM]
"""
import json, os, random, subprocess, sys, tempfile

def run(program, script):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(script, f); path = f.name
    try:
        out = subprocess.run([program, '--script', path], capture_output=True, text=True, timeout=1800, check=True).stdout
    finally:
        os.unlink(path)
    rows = [json.loads(l) for l in out.splitlines()]
    for r in rows:
        r.pop('seconds', None); r.pop('counters', None)
    return rows

failures = checks = 0
def same(label, a, b):
    global failures, checks
    checks += 1
    if json.dumps(a, sort_keys=True) != json.dumps(b, sort_keys=True):
        failures += 1; print(f'FAIL {label}\n  {json.dumps(a)[:300]}\n  {json.dumps(b)[:300]}')

def both(program, plan, ops):
    """The same session script on GPU and CPU; returns the two result lists."""
    out = {}
    for backend in ('gpu-required', 'cpu'):
        script = [{"open": plan, "as": "s", "backend": backend}] + [dict(o, session="s") for o in ops] + [{"session": "s", "close": True}]
        rows = run(program, script)
        same(f'{backend} session backend', rows[0]['backend'], 'cpu' if backend == 'cpu' else 'gpu')
        out[backend] = [r for r in rows[1:-1] if 'iteration' not in r]
        for r in out[backend]:
            if 'error' in r: same('session error', r['error'], None)
    return out['gpu-required'], out['cpu']

def main():
    rnd = random.Random(7)
    session, particles = sys.argv[1], sys.argv[2]
    W, H = 64, 48
    cells = [1 if rnd.random() < 0.3 else 0 for _ in range(W * H)]
    fresh = [1 if rnd.random() < 0.5 else 0 for _ in range(W * H)]
    life = {"inputs": {"cells": cells}, "steps": [{"id": "next", "call": "life", "args": [{"input": "cells"}, W, H]}], "feedback": {"cells": "next"}, "outputs": ["next"]}
    one = run(session, [{"pipeline": dict(life, iterations=120), "backend": b} for b in ('gpu-required', 'cpu')])
    same('life pipeline gpu=cpu', one[0]['values'], one[1]['values'])
    g, c = both(session, life, [{"step": 50}, {"step": 70}, {"read": {"outputs": ["next"]}}, {"read": {"step": "next", "reduce": "sum"}},
        {"read": {"step": "next", "length": True}}, {"read": {"step": "next", "slice": [100, 50]}}, {"write": {"input": "cells", "value": fresh}},
        {"step": 10}, {"read": {"outputs": ["next"]}}, {"read": {"step": "next", "reduce": "bounds"}}])
    same('life session gpu=cpu', [r for r in g if 'counters' not in r], c)
    same('life session(50+70) = pipeline(120)', c[0]['values'], one[1]['values'])
    xs = [rnd.randrange(5) for _ in range(3000)]
    prefix = {"inputs": {"xs": xs}, "steps": [{"id": "p", "call": "prefix", "args": [{"input": "xs"}]}], "feedback": {"xs": "p"}, "outputs": ["p"]}
    pp = run(session, [{"pipeline": dict(prefix, iterations=5), "backend": "cpu"}])[0]
    g, c = both(session, prefix, [{"step": 2}, {"step": 3}, {"read": {"outputs": ["p"]}}, {"read": {"step": "p", "reduce": "max"}}])
    same('prefix session gpu=cpu', g, c); same('prefix session(2+3) = pipeline(5)', c[0]['values'], pp['values'])
    ys = [rnd.randrange(-20, 40) for _ in range(5000)]
    pos = {"inputs": {"xs": ys}, "steps": [{"id": "q", "call": "positives", "args": [{"input": "xs"}]}], "feedback": {"xs": "q"}, "outputs": ["q"]}
    g, c = both(session, pos, [{"step": 3}, {"read": {"step": "q", "length": True}}, {"read": {"step": "q", "reduce": "bounds"}},
        {"write": {"input": "xs", "value": [y + 5 for y in ys[:1234]]}}, {"step": 2}, {"read": {"outputs": ["q"]}}, {"read": {"step": "q", "slice": [10, 20]}}])
    same('positives session gpu=cpu (shrinking feedback, shorter write)', g, c)
    pr = [{"position": [rnd.randrange(-100, 100) for _ in range(3)], "velocity": [rnd.randrange(-5, 5) for _ in range(3)], "mass": rnd.randrange(1, 10)} for _ in range(10000)]
    plan = {"inputs": {"xs": pr}, "steps": [{"id": "next", "call": "particles", "args": [{"input": "xs"}, 0.25]}], "feedback": {"xs": "next"}, "outputs": ["next"]}
    g, c = both(particles, plan, [{"step": 40}, {"step": 60}, {"read": {"step": "next", "reduce": "bounds", "field": "position"}},
        {"read": {"step": "next", "reduce": "max", "field": "mass"}}, {"read": {"step": "next", "slice": [5, 3]}}, {"read": {"step": "next", "reduce": "sum", "field": "mass"}}])
    same('particles bounds/max/slice gpu=cpu', g[:3], c[:3])
    same('particles f32 sum within tolerance', abs(g[3]['value'] - c[3]['value']) <= 1e-4 * abs(c[3]['value']), True)
    if len(sys.argv) > 3:
        big = [str(rnd.randrange(2**56)) for _ in range(70000)]
        items = [{"key": rnd.randrange(-100, 100), "weight": rnd.randrange(2**32), "flag": rnd.random() < 0.5} for _ in range(9000)]
        plan = {"inputs": {"xs": big, "items": items}, "steps": [{"id": "s", "call": "scan_u64", "args": [{"input": "xs"}]}, {"id": "k", "call": "keep_items", "args": [{"input": "items"}, 30]}], "outputs": ["s", "k"]}
        g, c = both(sys.argv[3], plan, [{"step": 1}] + [{"read": q} for q in [{"step": "s", "reduce": "sum"}, {"step": "s", "reduce": "bounds"}, {"step": "k", "reduce": "sum", "field": "weight"},
            {"step": "k", "reduce": "bounds", "field": "key"}, {"step": "k", "reduce": "max", "field": "flag"}, {"step": "k", "length": True}]])
        same('u64 and record-field reductions gpu=cpu', g, c)
    print(json.dumps({"host": "native", "checks": checks, "failures": failures}))
    sys.exit(1 if failures else 0)

if __name__ == '__main__':
    main()
