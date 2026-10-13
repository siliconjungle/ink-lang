#!/usr/bin/env python3
"""Measured default selection on the held-out corpus, evaluated on unseen inputs.

For each corpus program:

1. Build a measurement workload from its development inputs only.
2. Run the ordinary compiled planner with `--measure-workload` against a private
   copy of the knowledge root. It times every admitted candidate on those
   inputs and selects through the lifecycle rank and its uncertainty guard.
3. Emit the baseline and the selection, check equal outputs, and time both
   with paired, interleaved samples on every evaluation input. Evaluation
   inputs never reach selection.

    python3 bench/planning-corpus/measured.py --compiler target/release/ink -o build/measured
"""
import argparse, hashlib, json, math, os, statistics, subprocess, sys, tempfile, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
FIXTURES = ROOT / 'reports/knowledge-growth-2026-10-13/fixtures.json'


def run(command, timeout=None, env=None):
    result = subprocess.run([str(c) for c in command], capture_output=True, text=True, timeout=timeout, env=env)
    if result.returncode:
        raise RuntimeError(f"{' '.join(map(str, command))[:300]}\n{result.stderr[-3000:]}")
    return result.stdout


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':')).encode()


def evaluate_program(program, fixtures, args, out):
    name = program['name']; d = out / name; d.mkdir(parents=True, exist_ok=True)
    source = HERE / program['source']
    development = [f for f in fixtures if f['program'] == name and f['split'] == 'development']
    evaluation = [f for f in fixtures if f['program'] == name and f['split'] == 'evaluation']
    workload = dict(schema=1, phases={'call:run': [dict(function='run', args=json.loads((ROOT / f['path']).read_text())) for f in development]},
                    profile={'call:run': 1},
                    workload=dict(shape=dict(inputs=[f"{f['size']}-{f['distribution']}" for f in development]),
                                  distribution='development:' + '+'.join(sorted({f['distribution'] for f in development})),
                                  concurrency=1, residency='host'))
    (d / 'workload.json').write_text(json.dumps(workload))
    record = dict(name=name, development=[f['path'] for f in development], evaluation_inputs=len(evaluation))
    with tempfile.TemporaryDirectory(prefix='ink-measured-', dir=args.scratch) as temporary:
        scratch = Path(temporary) / 'knowledge'
        subprocess.run(['cp', '-al', str(args.knowledge_root), str(scratch)], check=True)
        env = dict(os.environ, PYTHONPATH=os.pathsep.join([str(ROOT / 'planner'), str(scratch)]))
        started = time.monotonic()
        run([sys.executable, '-m', 'ink_planner.compiled_planning', '--compiler', args.compiler, '--source', source,
             '--knowledge-root', scratch, '--target', 'javascript', '--planning-effort', args.planning_effort,
             '--measure-workload', d / 'workload.json', '--measure-timeout', '600',
             *(['--work-workload', d / 'workload.json', '--keep-candidates', d / 'candidates'] if args.work else []),
             '--emit', d / 'selected.mjs', '-o', d / 'plan.json'], timeout=3600, env=env)
        record['planning_seconds'] = round(time.monotonic() - started, 2)
    receipt = json.loads((d / 'plan.json.receipt.json').read_text())
    selection = receipt.get('selection') or {}
    baseline_plan = dict(schema=1, semantics='ink-compiled-plan-v1', input_core_sha256=receipt['source'], steps=[])
    selected_plan = json.loads((d / 'plan.json').read_text())
    record.update(candidates=len(receipt.get('candidates', [])), selection_reason=selection.get('reason'),
                  guard=(selection.get('uncertainty_guard') or {}).get('excluded'),
                  measured=len((receipt.get('measurement_acquisition') or {}).get('observations', [])),
                  rejected_measurements=len((receipt.get('measurement_acquisition') or {}).get('rejected', [])),
                  selected_steps=[s['kind'] for s in selected_plan.get('steps', [])])
    totals = selection.get('total_ns') or {}
    measurements = {c['plan']: c['measurement'] for c in receipt.get('candidates', [])}
    chosen = measurements.get(receipt['selected']); base = receipt['candidates'][0]['measurement'] if receipt.get('candidates') else None
    if chosen in totals and base in totals and float(totals[chosen]) > 0:
        record['development_speedup'] = float(totals[base]) / float(totals[chosen])
    core = d / 'core.json'
    run([args.compiler, 'emit-core', source, '-o', core])
    (d / 'baseline-plan.json').write_bytes(canonical(baseline_plan) + b'\n')
    inputs = [dict(label=f"{f['size']}-{f['distribution']}", path=str(ROOT / f['path'])) for f in evaluation]
    (d / 'inputs.json').write_text(json.dumps(inputs))
    run([args.compiler, 'emit-plan', core, d / 'baseline-plan.json', '--core', '--target', 'javascript', '-o', d / 'baseline.mjs'])

    def compare(before, after):
        results = json.loads(run(['node', HERE / 'evaluate.mjs', before, after, 'run', d / 'inputs.json'], timeout=3600))['results']
        return dict(results=results, speedup=math.exp(statistics.fmean(math.log(r['speedup']) for r in results)),
                    robust_gains=sum(1 for r in results if r['low'] > 1 and r['speedup'] >= 1.05),
                    robust_losses=sum(1 for r in results if r['high'] < 1 and r['speedup'] <= 1 / 1.05))
    if args.reference_compiler:
        # The previous default: the same source emitted with no plan by the
        # reference compiler, so backend changes count as well as selection.
        run([args.reference_compiler, 'emit-core', source, '-o', d / 'reference-core.json'])
        run([args.reference_compiler, 'emit-plan', d / 'reference-core.json', d / 'baseline-plan.json', '--core', '--target', 'javascript', '-o', d / 'reference.mjs'])
        record['versus_reference'] = compare(d / 'reference.mjs', d / 'selected.mjs')
    if not selected_plan.get('steps'):
        record.update(status='baseline retained', speedup=1.0, results=[])
        return record
    record.update(status='selected alternative', **compare(d / 'baseline.mjs', d / 'selected.mjs'))
    return record


def markdown(records):
    reference = any('versus_reference' in r for r in records)
    lines = ['| Program | Selection | Development speedup | Held-out geomean | Robust gains / losses (of 24) |' + (' Versus previous default | Gains / losses |' if reference else ''),
             '|---|---|---:|---:|---:|' + ('---:|---:|' if reference else '')]
    for r in records:
        if r.get('error'):
            lines.append(f"| {r['name']} | error: {r['error'][:80]} | | | |"); continue
        dev = f"{r['development_speedup']:.2f}×" if 'development_speedup' in r else ''
        gains = f"{r.get('robust_gains', 0)} / {r.get('robust_losses', 0)}" if r['status'] != 'baseline retained' else '–'
        what = r['status'] + (f" ({', '.join(r['selected_steps'])})" if r.get('selected_steps') else '')
        extra = ''
        if reference:
            v = r.get('versus_reference')
            extra = f" {v['speedup']:.3f}× | {v['robust_gains']} / {v['robust_losses']} |" if v else ' | |'
        lines.append(f"| {r['name']} | {what} | {dev} | {r['speedup']:.3f}× | {gains} |{extra}")
    ok = [r for r in records if not r.get('error')]
    if ok:
        lines.append(f"| **all** | {sum(1 for r in ok if r['status'] != 'baseline retained')} of {len(ok)} selected | | "
                     f"**{math.exp(statistics.fmean(math.log(r['speedup']) for r in ok)):.3f}×** | "
                     f"{sum(r.get('robust_gains', 0) for r in ok)} / {sum(r.get('robust_losses', 0) for r in ok)} |" +
                     (f" **{math.exp(statistics.fmean(math.log(r['versus_reference']['speedup']) for r in ok if 'versus_reference' in r)):.3f}×** | "
                      f"{sum(r['versus_reference']['robust_gains'] for r in ok if 'versus_reference' in r)} / {sum(r['versus_reference']['robust_losses'] for r in ok if 'versus_reference' in r)} |" if reference else ''))
    return '\n'.join(lines) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--knowledge-root', type=Path, default=ROOT / 'knowledge')
    parser.add_argument('--planning-effort', default='balanced')
    parser.add_argument('--programs')
    parser.add_argument('--scratch', type=Path)
    parser.add_argument('--reference-compiler', type=Path, help='also time against this compiler\'s unplanned output (the previous default)')
    parser.add_argument('--work', action='store_true', help='also record reference work and keep candidate packages for work_model.py')
    parser.add_argument('-o', '--output', type=Path, required=True)
    args = parser.parse_args()
    out = args.output.resolve(); out.mkdir(parents=True, exist_ok=True)
    args.compiler = args.compiler.resolve(); args.knowledge_root = args.knowledge_root.resolve()
    if args.reference_compiler: args.reference_compiler = args.reference_compiler.resolve()
    args.scratch = (args.scratch or out / 'scratch').resolve(); args.scratch.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((HERE / 'corpus.json').read_text()); fixtures = json.loads(FIXTURES.read_text())
    wanted = set(args.programs.split(',')) if args.programs else None
    path = out / 'records.json'
    records = json.loads(path.read_text()) if path.exists() else []
    for program in manifest['programs']:
        if wanted and program['name'] not in wanted:
            continue
        records = [r for r in records if r['name'] != program['name']]
        print(f"{program['name']} ...", file=sys.stderr, flush=True)
        try:
            record = evaluate_program(program, fixtures, args, out)
        except Exception as error:
            record = dict(name=program['name'], error=str(error)[-1500:])
        records.append(record)
        path.write_text(json.dumps(records, indent=1) + '\n')
        print(f"  {record.get('status', 'error')} {record.get('speedup', '')}", file=sys.stderr, flush=True)
    (out / 'report.md').write_text(markdown(records))
    print(markdown(records))


if __name__ == '__main__':
    main()
