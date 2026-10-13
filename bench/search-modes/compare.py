#!/usr/bin/env python3
"""Beam search against beam + equality saturation, and cold against warm
modular planning, on the frozen planning corpus and a multi-function example.

    python3 bench/search-modes/compare.py --compiler target/release/ink -o build/search-modes
"""
import argparse, json, shutil, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def search(args, core, knowledge, out, *extra):
    snapshot = knowledge / 'store/snapshot.json'
    env = dict(__import__('os').environ, PYTHONPATH=f"{ROOT / 'planner'}:{knowledge}")
    started = time.monotonic()
    result = subprocess.run([sys.executable, '-m', 'ink_planner.semantic_search', '--compiler', args.compiler, '--core', core,
                             '--snapshot', snapshot, '--knowledge-root', knowledge, '-o', out, '--time-seconds', str(args.seconds), *extra],
                            capture_output=True, text=True, env=env)
    seconds = time.monotonic() - started
    if result.returncode:
        return dict(error=result.stderr[-400:], seconds=round(seconds, 1))
    receipt = json.loads(result.stdout.strip().splitlines()[-1])
    return dict(seconds=round(seconds, 1), initial=receipt['initial_cost'], selected=receipt['selected_cost'],
                attempts=receipt['attempts'], egraph=receipt.get('egraph'), modular=receipt.get('modular'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--seconds', type=int, default=30)
    parser.add_argument('-o', '--output', type=Path, required=True)
    args = parser.parse_args()
    args.compiler = args.compiler.resolve()
    out = args.output.resolve(); out.mkdir(parents=True, exist_ok=True)
    knowledge = out / 'knowledge'
    if not knowledge.exists():
        subprocess.run(['cp', '-al', str(ROOT / 'knowledge'), str(knowledge)], check=True)
    programs = sorted((ROOT / 'bench/planning-corpus/heldout').glob('*.ink')) + [ROOT / 'examples/collection-pipelines.ink']
    rows = []
    for source in programs:
        core = out / (source.stem + '.core.json')
        subprocess.run([args.compiler, 'emit-core', source, '-o', core], check=True, capture_output=True)
        row = dict(program=source.stem)
        row['beam'] = search(args, core, knowledge, out / (source.stem + '-beam.json'))
        row['egraph'] = search(args, core, knowledge, out / (source.stem + '-egraph.json'), '--egraph')
        print(json.dumps(row), flush=True)
        rows.append(row)
    # Modular planning: cold, warm, then after editing one function.
    source = ROOT / 'examples/collection-pipelines.ink'
    cache = out / 'modular-cache'
    shutil.rmtree(cache, ignore_errors=True)
    core = out / 'modular.core.json'
    subprocess.run([args.compiler, 'emit-core', source, '-o', core], check=True, capture_output=True)
    modular = dict(full=search(args, core, knowledge, out / 'modular-full.json'))
    modular['cold'] = search(args, core, knowledge, out / 'modular-cold.json', '--modular-cache', str(cache))
    modular['warm'] = search(args, core, knowledge, out / 'modular-warm.json', '--modular-cache', str(cache))
    text = source.read_text()
    edited = out / 'collection-pipelines-edited.ink'
    edited.write_text(text + '\npub fn added_probe(xs:List<u32>)->u32{return foldl(xs.map(fn(x)=>x+1),0,fn(x)=>fn(a)=>a+x);}\n')
    core2 = out / 'modular-edited.core.json'
    subprocess.run([args.compiler, 'emit-core', edited, '-o', core2], check=True, capture_output=True)
    modular['after_adding_one_function'] = search(args, core2, knowledge, out / 'modular-edited.json', '--modular-cache', str(cache))
    report = dict(schema=1, seconds=args.seconds, search=rows, modular=modular)
    (out / 'report.json').write_text(json.dumps(report, indent=1) + '\n')
    lines = ['| Program | Initial cost | Beam cost | Beam s | E-graph+beam cost | s | Chosen |', '|---|---:|---:|---:|---:|---:|---|']
    for r in rows:
        b, e = r['beam'], r['egraph']
        if 'error' in b or 'error' in e:
            lines.append(f"| {r['program']} | error | {b.get('error','')[:60]} | | {e.get('error','')[:60]} | | |"); continue
        lines.append(f"| {r['program']} | {b['initial']} | {b['selected']} | {b['seconds']} | {e['selected']} | {e['seconds']} | {(e['egraph'] or {}).get('chosen')} |")
    lines += ['', '| Modular run | Cost | Seconds | Hits / misses |', '|---|---:|---:|---|']
    for name, m in modular.items():
        if 'error' in m:
            lines.append(f"| {name} | error {m['error'][:80]} | | |"); continue
        hm = f"{m['modular']['hits']} / {m['modular']['misses']}" if m.get('modular') else 'full search'
        lines.append(f"| {name} | {m['selected']} (from {m['initial']}) | {m['seconds']} | {hm} |")
    (out / 'report.md').write_text('\n'.join(lines) + '\n')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
