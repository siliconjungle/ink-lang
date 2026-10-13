#!/usr/bin/env python3
"""Fit and validate a reference-work selection model on the held-out corpus.

Input: a `measured.py --work` output directory. For every program it holds the
planner receipt (paired development timings and reference work for each
admitted candidate) and the candidate packages.

1. Pairs. For each work feature (reference-interpreter fuel; iterations of
   the emitted JavaScript) and each candidate whose work differs from the
   baseline's, pair its work ratio (baseline work / candidate work) with its
   paired development speedup from the same receipt.
2. Leave one program out. For each program, fit `log speedup = slope *
   log work ratio` and the residual spread on the other programs only, let
   the planner's own `work_model.select` pick a candidate, then time that pick
   against the baseline on the program's evaluation inputs.
3. Validation. The model passes only if no picked program loses on held-out
   geomean and robust held-out losses stay within 5% of the evaluated cells.
   The written model is fitted on every program and carries this record; the
   planner refuses a model without a passed record.

    python3 bench/planning-corpus/work_model.py build/measured -o bench/planning-corpus/work-model
"""
import argparse, json, math, statistics, subprocess, sys
from fractions import Fraction
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / 'planner'))
sys.path.insert(0, str(ROOT / 'knowledge'))
from ink_planner.work_model import FEATURES, RUNNER, SEMANTICS, call_weights, instrument, predict, select, validate_model  # noqa: E402

MIN_GAIN, Z = 0.05, 2.0


def run(command, timeout=None):
    result = subprocess.run([str(c) for c in command], capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(result.stderr[-2000:])
    return result.stdout


def paired_speedups(acquisition):
    """Per candidate: median over rounds of baseline time / candidate time."""
    rows = {r['measurement']: [int(x) for x in r['complete_call_ns']] for r in acquisition['acquisition']['rows']}
    base = acquisition['artifacts'][0]['measurement']
    out = {}
    for m, samples in rows.items():
        if m == base or base not in rows:
            continue
        ratios = [b / c for b, c in zip(rows[base], samples) if b > 0 and c > 0]
        if ratios:
            out[m] = statistics.median(ratios)
    return out


def count_iterations(directory, receipt, work, compiler):
    """Target iterations for receipts recorded before the planner counted them."""
    calls = json.loads((directory / 'workload.json').read_text())
    weights = call_weights(calls)
    calls = [dict(function=r['function'], args=r['args']) for rows in calls['phases'].values() for r in rows]
    scratch = directory / 'counted'
    scratch.mkdir(exist_ok=True)
    core = scratch / 'core.json'
    run([compiler, 'emit-core', HERE / 'heldout' / f'{directory.name}.ink', '-o', core])
    artifacts = []
    for row in work['rows']:
        m = row['measurement']
        artifact = scratch / f'{m}.mjs'
        if not artifact.exists():
            run([compiler, 'emit-plan', core, directory / 'candidates' / f'{m}.plan.json', '--core', '--target', 'javascript', '-o', artifact])
            artifact.write_text(instrument(artifact.read_text()))
        artifacts.append(dict(measurement=m, path=str(artifact)))
    request = scratch / 'request.json'
    request.write_text(json.dumps(dict(artifacts=artifacts, calls=calls)))
    report = json.loads(run(['node', RUNNER, request], timeout=3600))
    counts = {r['measurement']: r['iterations'] for r in report['rows']}
    for row in work['rows']:
        if row['measurement'] in counts:
            row['iterations'] = counts[row['measurement']]
            row['weighted_iterations'] = str(sum(int(c) * w for c, w in zip(row['iterations'], weights)))


def program_data(directory, compiler):
    receipt = json.loads((directory / 'plan.json.receipt.json').read_text())
    work = receipt.get('work_acquisition')
    acquisition = receipt.get('measurement_acquisition')
    if not work or not acquisition:
        raise ValueError(f'{directory.name}: receipt lacks work or measurement data (run measured.py --work)')
    if not any('weighted_iterations' in r for r in work['rows']):
        count_iterations(directory, receipt, work, compiler)
    measurements = [c['measurement'] for c in receipt['candidates']]
    eligible = [c['measurement'] for c in receipt['candidates'] if (c.get('capability') or {}).get('emittable', True)]
    base = measurements[0]
    timed = paired_speedups(acquisition)
    rows = {r['measurement']: r for r in work['rows']}
    pairs = {}
    for feature, field in (('reference_fuel', 'weighted'), ('target_iterations', 'weighted_iterations')):
        pairs[feature] = [dict(measurement=m, work_ratio=float(Fraction(rows[base][field]) / Fraction(rows[m][field])), speedup=s, steps=rows[m]['steps'])
                          for m, s in timed.items()
                          if m in rows and field in rows[m] and field in rows[base] and Fraction(rows[m][field]) > 0
                          and Fraction(rows[m][field]) != Fraction(rows[base][field])]
    return dict(receipt=receipt, work=work, measurements=measurements, eligible=eligible, pairs=pairs)


def fit(pairs):
    xs = [math.log(p['work_ratio']) for p in pairs]
    ys = [math.log(p['speedup']) for p in pairs]
    denominator = sum(x * x for x in xs)
    if not pairs or denominator == 0:
        return None
    slope = max(1e-6, min(4.0, sum(x * y for x, y in zip(xs, ys)) / denominator))
    residuals = [y - slope * x for x, y in zip(xs, ys)]
    sigma = math.sqrt(sum(r * r for r in residuals) / len(residuals))
    return dict(slope=slope, sigma=sigma, pairs=len(pairs))


def model(fitted, validation, feature):
    return dict(schema=1, semantics=SEMANTICS, target='javascript', feature=feature, slope=round(fitted['slope'], 6), sigma=round(fitted['sigma'], 6),
                z=Z, min_gain=MIN_GAIN, fitted_pairs=fitted['pairs'], validation=validation,
                scope=('Predicts JavaScript complete-call speedup from ' + ('loop iterations of the emitted JavaScript'
                       if feature == 'target_iterations' else 'reference-interpreter fuel; semantic rewrites only')))


def held_out(name, measured, plan, compiler, out):
    """Time `plan` against the baseline on the program's evaluation inputs."""
    d = out / name
    d.mkdir(parents=True, exist_ok=True)
    source = measured / name
    core = d / 'core.json'
    run([compiler, 'emit-core', HERE / 'heldout' / f'{name}.ink', '-o', core])
    run([compiler, 'emit-plan', core, plan, '--core', '--target', 'javascript', '-o', d / 'pick.mjs'])
    timing = json.loads(run(['node', HERE / 'evaluate.mjs', source / 'baseline.mjs', d / 'pick.mjs', 'run', source / 'inputs.json'], timeout=3600))
    results = timing['results']
    return dict(results=results, speedup=math.exp(statistics.fmean(math.log(r['speedup']) for r in results)),
                robust_gains=sum(1 for r in results if r['low'] > 1 and r['speedup'] >= 1.05),
                robust_losses=sum(1 for r in results if r['high'] < 1 and r['speedup'] <= 1 / 1.05))


def ensure_baseline(name, measured, compiler):
    """measured.py emits the baseline and inputs only for programs it changed."""
    d = measured / name
    if (d / 'baseline.mjs').exists() and (d / 'inputs.json').exists():
        return
    fixtures = json.loads((ROOT / 'reports/knowledge-growth-2026-10-13/fixtures.json').read_text())
    evaluation = [f for f in fixtures if f['program'] == name and f['split'] == 'evaluation']
    (d / 'inputs.json').write_text(json.dumps([dict(label=f"{f['size']}-{f['distribution']}", path=str(ROOT / f['path'])) for f in evaluation]))
    receipt = json.loads((d / 'plan.json.receipt.json').read_text())
    plan = d / 'baseline-plan.json'
    plan.write_text(json.dumps(dict(schema=1, semantics='ink-compiled-plan-v1', input_core_sha256=receipt['source'], steps=[]),
                               sort_keys=True, separators=(',', ':')) + '\n')
    run([compiler, 'emit-core', HERE / 'heldout' / f'{name}.ink', '-o', d / 'core.json'])
    run([compiler, 'emit-plan', d / 'core.json', plan, '--core', '--target', 'javascript', '-o', d / 'baseline.mjs'])


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('measured', type=Path)
    parser.add_argument('--compiler', type=Path, default=ROOT / 'target/release/ink')
    parser.add_argument('-o', '--output', type=Path, required=True)
    args = parser.parse_args()
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=True)
    measured = args.measured.resolve()
    data = {}
    for d in sorted(p for p in measured.iterdir() if (p / 'plan.json.receipt.json').exists()):
        data[d.name] = program_data(d, args.compiler)
    summary, lines = {}, []
    for feature in FEATURES:
        rows, evaluated, losses = [], 0, 0
        for name, program in data.items():
            others = [p for n, q in data.items() if n != name for p in q['pairs'][feature]]
            fitted = fit(others)
            row = dict(name=name, pairs=len(program['pairs'][feature]), fitted_on=len(others))
            if fitted is None:
                row.update(pick='baseline', reason='no training pairs'); rows.append(row); continue
            candidate = model(fitted, dict(status='validated'), feature)  # provisional, for `select` only
            validate_model(candidate)
            chosen, selection = select(candidate, 'leave-one-out', program['work'], program['measurements'], program['eligible'], program['measurements'][0])
            row.update(slope=round(fitted['slope'], 3), sigma=round(fitted['sigma'], 3), reason=selection['reason'])
            if chosen == program['measurements'][0]:
                row.update(pick='baseline'); rows.append(row); continue
            row.update(pick=chosen, steps=next(r['steps'] for r in program['work']['rows'] if r['measurement'] == chosen),
                       predicted=selection['predicted_speedup'], lower=selection['lower_bound'])
            ensure_baseline(name, measured, args.compiler)
            result = held_out(name, measured, measured / name / 'candidates' / f'{chosen}.plan.json', args.compiler, out / feature)
            row.update(held_out=round(result['speedup'], 4), robust_gains=result['robust_gains'], robust_losses=result['robust_losses'], results=result['results'])
            evaluated += len(result['results']); losses += result['robust_losses']
            rows.append(row)
        picked = [r for r in rows if r.get('pick') not in (None, 'baseline')]
        failures = []
        if not picked:
            failures.append('the model picked nothing on any held-out program')
        failures += [f"{r['name']}: held-out geomean {r['held_out']:.3f} below 1" for r in picked if r['held_out'] < 1]
        if evaluated and losses > 0.05 * evaluated:
            failures.append(f'{losses} robust losses in {evaluated} cells exceeds 5%')
        validation = dict(status='validated' if not failures else 'rejected', protocol='leave-one-program-out on the frozen planning corpus',
                          feature=feature, programs=len(rows), picked=len(picked), evaluated_cells=evaluated, robust_losses=losses,
                          robust_gains=sum(r.get('robust_gains', 0) for r in picked), failures=failures,
                          geomean_all=math.exp(statistics.fmean(math.log(r.get('held_out', 1.0)) for r in rows)) if rows else None)
        final = fit([p for q in data.values() for p in q['pairs'][feature]])
        summary[feature] = dict(validation=validation, programs=rows, final=final)
        if final is not None:
            (out / f'work-model-{feature}.json').write_text(json.dumps(model(final, validation, feature), indent=1, sort_keys=True) + '\n')
        lines += [f'### {feature}', '', '| Program | Training pairs | Pick | Predicted | Held-out geomean | Robust gains / losses |', '|---|---:|---|---:|---:|---:|']
        for r in rows:
            if r.get('pick') in (None, 'baseline'):
                lines.append(f"| {r['name']} | {r.get('fitted_on', 0)} | baseline | | 1.000× | – |")
            else:
                lines.append(f"| {r['name']} | {r['fitted_on']} | {', '.join(r['steps'])} | {r['predicted']:.2f}× (≥{r['lower']:.2f}) | {r['held_out']:.3f}× | {r['robust_gains']} / {r['robust_losses']} |")
        fitted_text = f"slope {final['slope']:.3f}, residual spread {final['sigma']:.3f} on {final['pairs']} pairs" if final else 'no pairs'
        lines += ['', f"Fit on all programs: {fitted_text}. Validation: **{validation['status']}**" + (f" ({'; '.join(failures)})" if failures else '') +
                  f"; {validation['picked']} of {validation['programs']} programs picked; geomean over all programs {validation['geomean_all']:.3f}×.", '']
    (out / 'validation.json').write_text(json.dumps(dict(schema=1, features=summary,
        pairs={n: q['pairs'] for n, q in data.items()}), indent=1) + '\n')
    (out / 'report.md').write_text('\n'.join(lines) + '\n')
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
