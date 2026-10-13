#!/usr/bin/env python3
"""Time structure-law instances against the unchanged program (JavaScript).

Builds the baseline and, for each function, the artifact selected by its
structure instance (found by ordinary semantic search with the installed
knowledge), checks every selection with `ink check-selection`, verifies equal
outputs on every case, then times both with paired, interleaved samples.

    python3 bench/structure-laws/run.py --compiler target/release/ink -o build/structure-laws
"""
import argparse, json, os, random, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def run(*command, **kw):
    result = subprocess.run([str(c) for c in command], capture_output=True, text=True, **kw)
    if result.returncode:
        raise SystemExit(f"{' '.join(map(str, command))}\n{result.stderr[-3000:]}")
    return result.stdout


def cases(name, rng):
    out = []
    for n in (64, 4096):
        if name == 'all_below':
            small = [rng.randrange(0, 1000) for _ in range(n)]
            out.append(dict(label=f'n={n} never false', args=[small, 1000]))
            for where, at in (('early', n // 10), ('late', 9 * n // 10)):
                xs = list(small); xs[at] = 5000
                out.append(dict(label=f'n={n} false {where}', args=[xs, 1000]))
        elif name == 'product':
            # Even x makes every factor x + 3 odd, so the product never reaches
            # zero mod 2^64; random factors would reach it through powers of two.
            small = [f'{2 * rng.randrange(0, 500)}n' for _ in range(n)]
            out.append(dict(label=f'n={n} never zero', args=[small, '3n']))
            mixed = [f'{rng.randrange(1, 1000)}n' for _ in range(n)]
            out.append(dict(label=f'n={n} random factors', args=[mixed, '3n']))
            for where, at in (('early', n // 10), ('late', 9 * n // 10)):
                xs = list(small); xs[at] = f'{2**64 - 3}n'  # x + 3 wraps to zero
                out.append(dict(label=f'n={n} zero {where}', args=[xs, '3n']))
        elif name == 'total_sorted':
            out.append(dict(label=f'n={n} random', args=[[rng.randrange(0, 2**31) for _ in range(n)]]))
        elif name == 'count_big':
            out.append(dict(label=f'n={n} random', args=[[rng.randrange(0, 2**32) for _ in range(n)], 2**31]))
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--knowledge-root', type=Path, default=ROOT / 'knowledge')
    parser.add_argument('-o', '--output', type=Path, required=True)
    args = parser.parse_args()
    out = args.output.resolve(); out.mkdir(parents=True, exist_ok=True)
    compiler = args.compiler.resolve()
    core = out / 'core.json'
    run(compiler, 'emit-core', HERE / 'probe.ink', '-o', core)
    sys.path.insert(0, str(args.knowledge_root))
    from ink_knowledge import Store
    snapshot = args.knowledge_root / 'store' / 'snapshots' / f'{Store(args.knowledge_root).snapshot_id}.json'
    env = dict(os.environ, PYTHONPATH=os.pathsep.join([str(ROOT / 'planner'), str(args.knowledge_root)]))
    run(sys.executable, '-m', 'ink_planner.semantic_search', '--compiler', compiler, '--core', core,
        '--knowledge-root', args.knowledge_root, '--snapshot', snapshot, '--budget', '512', '--time-seconds', '60',
        '--alternatives', out / 'alternatives.jsonl', '-o', out / 'search.json', env=env)
    chosen = {}
    for line in (out / 'alternatives.jsonl').read_text().splitlines():
        package = json.loads(line)
        if len(package['applications']) != 1:
            continue
        application = package['applications'][0]
        law = package['knowledge']['objects'][application['law']]
        if law['semantics'] == 'ink-general-laws-v1' and application['function'] not in chosen:
            chosen[application['function']] = package
    run(compiler, 'build', core, '--core', '--target', 'javascript', '-o', out / 'baseline.mjs')
    rng = random.Random(20261013)
    report = dict(schema=1, compiler=str(compiler), node=run('node', '--version').strip(), functions={})
    for name in ('all_below', 'product', 'total_sorted', 'count_big'):
        if name not in chosen:
            report['functions'][name] = dict(status='no structure instance admitted'); continue
        selection = out / f'{name}.selection.json'
        selection.write_text(json.dumps(chosen[name]))
        run(compiler, 'check-selection', core, selection)
        artifact = out / f'{name}.mjs'
        run(compiler, 'build', core, '--core', '--selection', selection, '--target', 'javascript', '-o', artifact)
        case_path = out / f'{name}.cases.json'; case_path.write_text(json.dumps(cases(name, rng)))
        timing = json.loads(run('node', HERE / 'bench.mjs', out / 'baseline.mjs', artifact, name, case_path))
        report['functions'][name] = dict(status='measured', law=chosen[name]['applications'][0]['law'], cases=timing)
        for row in timing:
            print(f"{name:13} {row['label']:22} {row['speedup']:.3f}x  [{row['low']:.3f}, {row['high']:.3f}]", flush=True)
    (out / 'results.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
