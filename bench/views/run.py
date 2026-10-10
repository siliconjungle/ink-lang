#!/usr/bin/env python3
"""Update/query sweep for maintained views (filtered sum and count).

Tests Ink's central incremental-view claim on one workload while the share of
queries varies from 0 to 99%. Five variants share one C driver and one ABI:

  ink_maintained           emit-state --maintenance ... --prove-views --require-views
                           (cache maintained per update; decomposition checked)
  ink_scan                 emit-state without maintenance (recomputes per query)
  rust_incremental         handwritten BTreeMap, i64 totals maintained by deltas
  rust_incremental_bigint  same with arbitrary-precision totals (Ink's Int)
  rust_scan                handwritten BTreeMap, recompute per query

Every variant must report identical checksums, totals and counts for each
configuration. Times exclude building the initial table. Rounds are
interleaved after one warmup; ratios use paired bootstrap intervals
(bench/methodology.py).
"""
import argparse, json, os, platform, shutil, statistics, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'bench'))
import methodology as M

HERE = ROOT / 'bench/views'
BUILD = ROOT / 'build/view-sweep'
MAINTENANCE = ROOT / 'knowledge/research/table-maintenance/table.json'
VARIANTS = ['ink_maintained', 'ink_scan', 'rust_incremental', 'rust_incremental_bigint', 'rust_scan']
COMMANDS = []


def run(argv, env=None, cwd=ROOT):
    argv = list(map(str, argv))
    start = time.perf_counter()
    p = subprocess.run(argv, cwd=cwd, env=env, text=True, capture_output=True)
    COMMANDS.append({'argv': argv, 'seconds': round(time.perf_counter() - start, 3), 'returncode': p.returncode})
    if p.returncode:
        raise RuntimeError(' '.join(argv) + '\n' + p.stdout[-2000:] + p.stderr[-4000:])
    return p.stdout


def build(env):
    BUILD.mkdir(parents=True, exist_ok=True)
    run(['cargo', 'build', '--release', '--bin', 'ink'], env)
    ink = ROOT / 'target/release/ink'
    native = env.copy()
    native['RUSTFLAGS'] = '-C target-cpu=native -C panic=abort'
    driver = BUILD / 'driver.o'
    run(['clang', '-O3', '-std=c11', '-c', HERE / 'driver.c', '-o', driver])
    for variant, extra in [('ink_maintained', ['--maintenance', MAINTENANCE, '--prove-views', '--require-views']),
                           ('ink_scan', [])]:
        project = BUILD / variant
        shutil.rmtree(project, ignore_errors=True)
        run([ink, 'emit-state', HERE / 'view_sweep.ink', '-o', project] + extra)
        with (project / 'src/lib.rs').open('a') as f:
            f.write('\n' + (HERE / 'ink_abi.rs').read_text())
        toml = (project / 'Cargo.toml').read_text()
        toml = toml.replace('crate-type = ["rlib", "cdylib"]', 'crate-type = ["staticlib"]').replace('lto = "thin"', 'lto = false')
        (project / 'Cargo.toml').write_text(toml)
        target = BUILD / f'target-{variant}'
        native['CARGO_TARGET_DIR'] = str(target)
        run(['cargo', 'build', '--release', '--offline', '--lib', '--manifest-path', project / 'Cargo.toml'], native)
        (lib,) = (target / 'release').glob('lib*.a')
        run(['clang', driver, lib, '-o', BUILD / f'{variant}.bin'] + M.static_rust_link_libs())
    baseline = BUILD / 'rust-baseline'
    (baseline / 'src').mkdir(parents=True, exist_ok=True)
    shutil.copyfile(HERE / 'baseline.rs', baseline / 'src/lib.rs')
    (baseline / 'Cargo.toml').write_text(
        '[package]\nname="view-sweep-baseline"\nversion="0.1.0"\nedition="2021"\n[lib]\ncrate-type=["staticlib"]\n'
        '[features]\nscan=[]\nbigint=[]\n[dependencies]\nnum-bigint="=0.4.8"\n'
        '[profile.release]\nlto=false\ncodegen-units=1\npanic="abort"\n')
    for variant, features in [('rust_incremental', []), ('rust_incremental_bigint', ['bigint']), ('rust_scan', ['scan'])]:
        target = BUILD / f'target-{variant}'
        native['CARGO_TARGET_DIR'] = str(target)
        flags = ['--features', ','.join(features)] if features else []
        run(['cargo', 'build', '--release', '--offline', '--manifest-path', baseline / 'Cargo.toml'] + flags, native)
        run(['clang', driver, target / 'release/libview_sweep_baseline.a', '-o', BUILD / f'{variant}.bin']
            + M.static_rust_link_libs())


def plans():
    out = {}
    for variant in ('ink_maintained', 'ink_scan'):
        path = BUILD / variant / 'plan.json'
        plan = json.loads(path.read_text()) if path.exists() else {}
        out[variant] = {k: plan.get(k) for k in ('view_decompositions', 'view_authority', 'view_fallback', 'trusted')}
    return out


def steps_for(n, q, budget):
    # Roughly constant scan work per run: queries x rows visited.
    return int(min(200_000, max(400, budget / (n * q / 1000 + 1))))


def measure(variant, n, steps, q, seed):
    out = run([BUILD / f'{variant}.bin', n, steps, q, seed])
    return json.loads(out)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--sizes', default='1024,65536')
    p.add_argument('--queries', default='0,1,10,100,500,900,990', help='query share, per mille')
    p.add_argument('--rounds', type=int, default=5)
    p.add_argument('--budget', type=float, default=1e7, help='scan rows per run (sets steps)')
    p.add_argument('--seed', type=int, default=7)
    p.add_argument('--out', type=Path, default=ROOT / f'reports/view-sweep-{platform.system().lower()}')
    p.add_argument('--skip-build', action='store_true')
    a = p.parse_args()
    env = os.environ.copy()
    if not a.skip_build:
        build(env)
    a.out.mkdir(parents=True, exist_ok=True)
    configs = [(int(n), int(q)) for n in a.sizes.split(',') for q in a.queries.split(',')]
    results = []
    for n, q in configs:
        steps = steps_for(n, q, a.budget)
        seed = a.seed + n + q
        for v in VARIANTS:                                   # warmup + agreement
            measure(v, n, steps, q, seed)
        outputs = {v: measure(v, n, steps, q, seed) for v in VARIANTS}
        observed = {v: (o['checksum'], o['units'], o['rows'], o['queries'], o['updates']) for v, o in outputs.items()}
        if len(set(observed.values())) != 1:
            raise SystemExit(f'variants disagree at n={n} q={q}: {observed}')
        samples = {v: [] for v in VARIANTS}
        for _, v in M.interleaved(VARIANTS, a.rounds, seed):
            measured = measure(v, n, steps, q, seed)
            current = tuple(measured[k] for k in ('checksum', 'units', 'rows', 'queries', 'updates'))
            if current != observed[v]:
                raise SystemExit(f'timed variant disagrees at n={n} q={q}: {v}: {current} != {observed[v]}')
            samples[v].append(measured['seconds'] / steps * 1e9)
        row = {'n': n, 'query_permille': q, 'steps': steps, 'queries': outputs[VARIANTS[0]]['queries'],
               'updates': outputs[VARIANTS[0]]['updates'], 'units': outputs[VARIANTS[0]]['units'],
               'rows': outputs[VARIANTS[0]]['rows'], 'ns_per_op': samples,
               'median_ns_per_op': {v: statistics.median(s) for v, s in samples.items()},
               'ratios': {}}
        for other in VARIANTS[1:]:
            row['ratios'][f'ink_maintained/{other}'] = M.ratio_ci(samples['ink_maintained'], samples[other])
        row['ratios']['rust_incremental_bigint/rust_scan'] = M.ratio_ci(samples['rust_incremental_bigint'], samples['rust_scan'])
        results.append(row)
        print(json.dumps({'n': n, 'q': q, 'steps': steps,
                          'median_ns': {v: round(x, 1) for v, x in row['median_ns_per_op'].items()}}), flush=True)
    report = {'schema': 1, 'workload': 'bench/views/view_sweep.ink', 'variants': VARIANTS,
              'rounds': a.rounds, 'warmup': 1, 'budget': a.budget, 'seed': a.seed,
              'environment': M.environment(env), 'plans': plans(), 'results': results, 'commands': COMMANDS}
    (a.out / 'results.json').write_text(json.dumps(report, indent=1) + '\n')
    print(f'wrote {a.out / "results.json"}')


if __name__ == '__main__':
    main()
