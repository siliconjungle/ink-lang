#!/usr/bin/env python3
"""Resident GPU sessions: steady-state cost per iteration, one-off transfer
cost and the break-even iteration count against the compiled CPU.

For each workload and size, on the GPU and on the CPU, the native host runs
one session script:
  open (upload) -> finish -> step 1 (warm-up) -> step K1 -> step K2
  -> read a reduction (a few words) -> read whole outputs -> close
and, for comparison, the same work as one-shot pipeline calls that upload
and read back every time (the pre-session behaviour).

  steady  = (t(step K2) - t(step K1)) / (K2 - K1)    seconds per iteration
  fixed   = open + finish + whole read                one-off transfer cost
  break-even n* = smallest n with gpu.fixed + n*gpu.steady <= cpu.fixed + n*cpu.steady

Usage:
  residency.py --session BUNDLE_PROGRAM --particles BUNDLE_PROGRAM [--quick] [--out FILE]

Times are wall-clock on whatever device wgpu selects. On a software Vulkan
driver (lavapipe) they measure the mechanism, not GPU performance.
"""
import argparse, json, math, os, random, subprocess, sys, tempfile

def life(n, rnd):
    w = h = int(math.isqrt(n))
    cells = [1 if rnd.random() < 0.3 else 0 for _ in range(w * h)]
    plan = {"inputs": {"cells": cells}, "steps": [{"id": "out", "call": "life", "args": [{"input": "cells"}, w, h]}],
            "feedback": {"cells": "out"}, "outputs": ["out"]}
    return plan, {"step": "out", "reduce": "sum"}, w * h

def particles(n, rnd):
    xs = [{"position": [rnd.uniform(-100, 100) for _ in range(3)], "velocity": [rnd.uniform(-5, 5) for _ in range(3)],
           "mass": rnd.uniform(1, 10)} for _ in range(n)]
    plan = {"inputs": {"xs": xs}, "steps": [{"id": "out", "call": "particles", "args": [{"input": "xs"}, 0.01]}],
            "feedback": {"xs": "out"}, "outputs": ["out"]}
    return plan, {"step": "out", "reduce": "bounds", "field": "position"}, n

def prefix(n, rnd):
    xs = [rnd.randrange(0, 4) for _ in range(n)]
    plan = {"inputs": {"xs": xs}, "steps": [{"id": "out", "call": "prefix", "args": [{"input": "xs"}]}],
            "feedback": {"xs": "out"}, "outputs": ["out"]}
    return plan, {"step": "out", "reduce": "max"}, n

def shuffle(n, rnd):
    xs = [rnd.randrange(-1000, 1000) for _ in range(n)]
    plan = {"inputs": {"xs": xs}, "steps": [{"id": "out", "call": "shuffle", "args": [{"input": "xs"}]}],
            "feedback": {"xs": "out"}, "outputs": ["out"]}
    return plan, {"step": "out", "reduce": "bounds"}, n

WORKLOADS = {
    "life (element-wise stencil)": ("session", life),
    "particles (element-wise records)": ("particles", particles),
    "prefix (parallel scan, feedback)": ("session", prefix),
    "shuffle (map + radix sort, feedback)": ("session", shuffle),
}

def run(program, script):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(script, f)
        path = f.name
    try:
        out = subprocess.run([program, '--script', path], capture_output=True, text=True, timeout=3600)
    finally:
        os.unlink(path)
    if out.returncode:
        raise RuntimeError(out.stderr.strip())
    return [json.loads(line) for line in out.stdout.splitlines()]

def measure(program, plan, small, backend, k1, k2, oneshot):
    # A first session compiles pipelines and creates the device; the
    # measured session pays only allocation, upload and its own work.
    script = [
        {"open": plan, "as": "warm", "backend": backend},
        {"session": "warm", "step": 1, "wait": True},
        {"session": "warm", "close": True},
        {"open": plan, "as": "s", "backend": backend},
        {"session": "s"},
        {"session": "s", "step": 1, "wait": True},
        {"session": "s", "step": k1, "wait": True},
        {"session": "s", "step": k2, "wait": True},
        {"session": "s", "read": small},
        {"session": "s", "read": {"outputs": ["out"]}},
        {"session": "s", "close": True},
    ]
    script += [{"pipeline": dict(plan, iterations=1), "backend": backend} for _ in range(oneshot)]
    r = run(program, script)[3:]
    for line in r:
        if "error" in line:
            raise RuntimeError(line["error"])
    if r[0]["backend"] != ("cpu" if backend == "cpu" else "gpu"):
        raise RuntimeError(f"{backend} session ran on {r[0]['backend']}: {r[0]['reason']}")
    steady = (r[4]["seconds"] - r[3]["seconds"]) / (k2 - k1)
    steady = max(steady, r[4]["seconds"] / k2 / 4)  # guard against timer noise
    out = {
        "backend": r[0]["backend"],
        "open_s": r[0]["seconds"] + r[1]["seconds"],
        "upload_bytes": r[0]["counters"]["upload_bytes"],
        "first_step_s": r[2]["seconds"],
        "steady_s_per_iteration": steady,
        "small_read_s": r[5]["seconds"],
        "small_read_bytes": r[5]["counters"]["readback_bytes"],
        "full_read_s": r[6]["seconds"],
        "full_read_bytes": r[6]["counters"]["readback_bytes"],
    }
    out["fixed_s"] = out["open_s"] + out["full_read_s"]
    if oneshot:
        out["oneshot_s_per_iteration"] = sum(x["seconds"] for x in r[8:]) / oneshot
    return out

def break_even(g, c):
    gain = c["steady_s_per_iteration"] - g["steady_s_per_iteration"]
    extra = g["fixed_s"] - c["fixed_s"]
    if gain <= 0:
        return None
    return max(1, math.ceil(extra / gain)) if extra > 0 else 1

def main():
    a = argparse.ArgumentParser()
    a.add_argument('--session', required=True, help='native program of examples/gpu-session.ink')
    a.add_argument('--particles', required=True, help='native program of examples/particles.ink')
    a.add_argument('--quick', action='store_true')
    a.add_argument('--out')
    a.add_argument('--seed', type=int, default=1)
    o = a.parse_args()
    rnd = random.Random(o.seed)
    sizes = [4096, 65536] if o.quick else [4096, 65536, 262144, 1048576]
    k1, k2 = (5, 25) if o.quick else (10, 110)
    rows = []
    for name, (bundle, make) in WORKLOADS.items():
        program = o.session if bundle == "session" else o.particles
        for n in sizes:
            plan, small, elements = make(n, rnd)
            row = {"workload": name, "elements": elements}
            try:
                row["gpu"] = measure(program, plan, small, "gpu-required", k1, k2, 3)
                row["cpu"] = measure(program, plan, small, "cpu", k1, k2, 0)
                row["break_even_iterations"] = break_even(row["gpu"], row["cpu"])
                row["speedup_steady"] = row["cpu"]["steady_s_per_iteration"] / row["gpu"]["steady_s_per_iteration"]
                row["residency_gain"] = row["gpu"]["oneshot_s_per_iteration"] / row["gpu"]["steady_s_per_iteration"]
            except (RuntimeError, subprocess.TimeoutExpired) as e:
                row["error"] = str(e)
            rows.append(row)
            print(json.dumps(row), file=sys.stderr)
    adapter = os.environ.get("INK_ADAPTER_NOTE", "")
    report = {"k": [k1, k2], "adapter_note": adapter, "rows": rows}
    if o.out:
        json.dump(report, open(o.out, 'w'), indent=1)
    print(table(report))

def ms(s):
    return f"{s * 1e3:.3f}" if s < 1 else f"{s * 1e3:.0f}"

def table(report):
    lines = ["| workload | elements | GPU steady ms/iter | CPU steady ms/iter | GPU one-shot ms/iter | GPU fixed ms (upload+read) | small read bytes | break-even iterations |",
             "|---|---:|---:|---:|---:|---:|---:|---:|"]
    for r in report["rows"]:
        if "error" in r:
            lines.append(f"| {r['workload']} | {r['elements']} | error: {r['error'][:60]} | | | | | |")
            continue
        g, c = r["gpu"], r["cpu"]
        be = r["break_even_iterations"]
        lines.append(f"| {r['workload']} | {r['elements']} | {ms(g['steady_s_per_iteration'])} | {ms(c['steady_s_per_iteration'])} | "
                     f"{ms(g['oneshot_s_per_iteration'])} | {ms(g['fixed_s'])} | {g['small_read_bytes']} | {be if be else 'never (CPU faster per iteration)'} |")
    return "\n".join(lines)

if __name__ == '__main__':
    main()
