#!/usr/bin/env python3
"""Frozen-protocol source-cost calibration, never proof or measured superiority.

prepare: emit current selected semantic cores (untimed, only outside timer gates).
freeze: train only declared cells and freeze EVERY prediction before evaluation.
evaluate: compare frozen predictions with raw audited heldout timings; no fitting.
No canonical database or default planner model is modified.
"""
import argparse
from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path
import statistics
import subprocess
import sys

REPOSITORY = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(REPOSITORY / 'planner'), str(REPOSITORY / 'knowledge')]
from ink_planner.target_costs import COMPONENTS, TargetCostModel
from producers.import_web39 import collect

TRAIN_OPERATIONS = frozenset(('affine', 'compaction', 'scan'))
TRAIN_SIZES = frozenset((32, 16384))
UNKNOWN_FLOOR_NS = 1e-9
MAX_SWEEPS = 1200
DELTA_LIMIT = 1e-10
MINIMUM_SAVING = .10


def read(path): return json.loads(Path(path).read_text())
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def encoded(x): return (json.dumps(x, sort_keys=True, separators=(',', ':'), allow_nan=False) + '\n').encode()
def ident(x): return hashlib.sha256(encoded(x)).hexdigest()


def write_new(path, data):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('xb') as f: f.write(encoded(data))


def training(task, frame):
    return (task['operation'] in TRAIN_OPERATIONS and len(frame['xs']) in TRAIN_SIZES
            and task['split'] == 'train' and frame['split'] == 'train')


def target_boundary(host, variant, boundary):
    if host == 'native': target = 'native-c'
    elif '_gpu_' in variant: target = 'webgpu'
    elif 'wasm' in variant: target = 'wasm'
    else: target = 'javascript'
    if target == 'webgpu':
        model_boundary = 'gpu_resident_readback' if 'resident' in boundary else 'gpu_upload_readback'
    elif 'resident' in boundary:
        model_boundary = 'resident_into'
    elif host == 'native':
        model_boundary = 'into'
    else:
        model_boundary = 'owned'
    return target, model_boundary


def model_data(target, boundary, frame, weights=None):
    return dict(schema=2, target=target, boundary=boundary,
                cardinality=dict(default=len(frame['xs']), by_parameter=dict(xs=len(frame['xs']), ys=len(frame['ys']))),
                weights=weights or {k: (UNKNOWN_FLOOR_NS if k == 'unknown_work' else 0) for k in COMPONENTS})


def cohort_id(host, variant, boundary, compiler):
    # Variant is retained in full: wasm full/prepared and GPU requested/resident
    # are separate even when a human-readable boundary happens to coincide.
    return ident(dict(host=host, variant=variant, boundary=boundary, compiler=compiler))


def nnls_relative(features, times):
    """Deterministic coordinate NNLS, scaled using ONLY supplied training rows.

The unknown-work floor is a declared positive fallback constraint, not evidence
of a physical instruction price. Other weights have zero lower bounds.
"""
    if not times or len(features) != len(times): raise ValueError('empty/mismatched training')
    for y in times:
        if type(y) not in (int, float) or not math.isfinite(y) or y <= 0: raise ValueError('invalid raw ns')
    x = [[float(row[k]) / y for k in COMPONENTS] for row, y in zip(features, times)]
    floors = [UNKNOWN_FLOOR_NS if k == 'unknown_work' else 0 for k in COMPONENTS]
    scales = [math.sqrt(sum(row[j]**2 for row in x)) for j in range(len(COMPONENTS))]
    columns = [[row[j] / scales[j] if scales[j] else 0 for row in x] for j in range(len(COMPONENTS))]
    coefficients = [0.0] * len(COMPONENTS)
    residual = [sum(a*b for a, b in zip(row, floors)) - 1 for row in x]
    sweeps = 0
    max_delta = 0.0
    for sweep in range(MAX_SWEEPS):
        max_delta = 0.0
        for j, column in enumerate(columns):
            if not scales[j]: continue
            norm = sum(v*v for v in column)
            new = max(0.0, coefficients[j] - sum(v*r for v, r in zip(column, residual)) / norm)
            delta = new - coefficients[j]; coefficients[j] = new
            residual = [r + v*delta for r, v in zip(residual, column)]
            max_delta = max(max_delta, abs(delta))
        sweeps = sweep + 1
        if max_delta <= DELTA_LIMIT: break
    weights = {k: floors[j] + (coefficients[j] / scales[j] if scales[j] else 0)
               for j, k in enumerate(COMPONENTS)}
    if any(not math.isfinite(v) or v > 1e9 for v in weights.values()):
        raise ValueError('fit exceeds supported finite price bounds; retain failure instead of clipping/refitting')
    support = {k: dict(nonzero_rows=sum(row[k] != 0 for row in features),
                       maximum=max(row[k] for row in features), training_scale=scales[j],
                       identified_support=bool(scales[j])) for j, k in enumerate(COMPONENTS)}
    # Rank disclosure via deterministic pivoted elimination on scaled columns.
    matrix = [[column[i] for column in columns] for i in range(len(features))]
    rank, pivots = 0, []
    for col in range(len(COMPONENTS)):
        pivot = max(range(rank, len(matrix)), key=lambda i: abs(matrix[i][col]), default=None)
        if pivot is None or abs(matrix[pivot][col]) <= 1e-10: continue
        matrix[rank], matrix[pivot] = matrix[pivot], matrix[rank]
        scale = matrix[rank][col]; matrix[rank] = [v / scale for v in matrix[rank]]
        for i in range(rank + 1, len(matrix)):
            factor = matrix[i][col]
            matrix[i] = [a - factor*b for a, b in zip(matrix[i], matrix[rank])]
        pivots.append(COMPONENTS[col]); rank += 1
        if rank == len(matrix): break
    return dict(weights=weights, rows=len(features), rank=rank, columns=len(COMPONENTS),
                rank_pivots=pivots, low_rank=rank < len(COMPONENTS), support=support,
                unidentified=[k for k in COMPONENTS if not support[k]['identified_support']],
                sweeps=sweeps, max_scaled_coefficient_delta=max_delta,
                relative_residual_sum_squares=sum(r*r for r in residual),
                method='nonnegative coordinate least squares, relative residuals, training-only L2 column scales',
                unknown_work_positive_floor_ns=UNKNOWN_FLOOR_NS)


def prepare(report, output, baseline_compiler, candidate_compiler, protocol):
    report, output = Path(report), Path(output)
    if output.exists(): raise ValueError('preserve preparation directory')
    metadata = read(report / 'metadata.json'); spec = read(report / 'spec.json')
    prepared = {}
    for task in spec['tasks']:
        name = task['name']; folder = report / 'targets' / name
        for version, compiler in [('baseline', Path(baseline_compiler)), ('candidate', Path(candidate_compiler))]:
            expected = metadata['selections'][name][version]['compiler_sha256']
            if sha(compiler) != expected: raise ValueError('compiler drift')
            core = folder / (version + '.core.json')
            semantic = output / 'semantics' / (name + '-' + version + '.json')
            semantic.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run([str(compiler.resolve()), 'emit-semantic', str(core.resolve()), '--core', '-o', str(semantic.resolve())], check=True, capture_output=True)
            prepared[name + '/' + version] = dict(core=str(core.resolve()), core_sha256=sha(core),
                semantic=str(semantic.resolve()), semantic_sha256=sha(semantic), compiler_sha256=expected,
                rewrite_applications=metadata['selections'][name][version]['applications'])
    receipt = dict(status='prepared_no_fit', report=str(report.resolve()), metadata_sha256=sha(report / 'metadata.json'),
                   protocol=str(Path(protocol).resolve()), protocol_sha256=sha(protocol),
                   importer_sha256=sha(REPOSITORY / 'knowledge/producers/import_web39.py'),
                   producer_sha256=sha(__file__), component_estimator_sha256=sha(REPOSITORY / 'planner/ink_planner/target_costs.py'),
                   prepared=prepared, design=dict(training_operations=sorted(TRAIN_OPERATIONS),training_sizes=sorted(TRAIN_SIZES),
                   fit_rounds='all five raw paired training rounds', max_sweeps=MAX_SWEEPS,
                   delta_limit=DELTA_LIMIT, unknown_work_positive_floor_ns=UNKNOWN_FLOOR_NS,
                   minimum_selection_saving=MINIMUM_SAVING),
                   scope='Feature/semantic preparation only; no timings, fits or heldout statistics')
    write_new(output / 'preparation.json', receipt)
    return receipt


def validate_preparation(path):
    preparation = read(path); report = Path(preparation['report'])
    if sha(report / 'metadata.json') != preparation['metadata_sha256']: raise ValueError('prepared metadata drift')
    if sha(preparation['protocol']) != preparation['protocol_sha256']: raise ValueError('protocol drift')
    if sha(__file__) != preparation['producer_sha256']: raise ValueError('producer changed after preparation')
    if sha(REPOSITORY / 'knowledge/producers/import_web39.py') != preparation['importer_sha256']: raise ValueError('importer changed after preparation')
    if sha(REPOSITORY / 'planner/ink_planner/target_costs.py') != preparation['component_estimator_sha256']: raise ValueError('estimator changed after preparation')
    for binding in preparation['prepared'].values():
        for name in ('core', 'semantic'):
            if sha(binding[name]) != binding[name + '_sha256']: raise ValueError('prepared source/semantic drift')
    return preparation, report


def audited_rows(report, provenance):
    # Shared importer authenticates all raw assets/audits without publishing.
    _, sources = collect(report, provenance)
    result = []
    for host in ('node', 'browser', 'native'):
        p = report / ('native/results.json' if host == 'native' else host + '-results.json')
        for row in read(p)['samples']:
            version = row['variant'] if host == 'native' else row['variant'].split('_')[0]
            if version not in ('baseline', 'candidate'): continue
            if '_gpu_' in row['variant'] and set(row.get('actual_backend_counts', {})) != {'gpu'}: continue
            y = row['ns_per_call']
            if type(y) not in (int, float) or not math.isfinite(y) or y <= 0: raise ValueError('invalid raw ns')
            result.append(dict(row, host=host, version=version))
    return result, sources


def freeze(preparation_path, provenance_path, output):
    preparation, report = validate_preparation(preparation_path)
    output = Path(output)
    if output.exists(): raise ValueError('preserve frozen calibration directory')
    rows, sources = audited_rows(report, read(provenance_path))
    metadata = read(report / 'metadata.json')
    tasks = {t['name']: t for t in read(report / 'spec.json')['tasks']}
    frames = {f['id']: f for f in read(report / 'fixtures.json')['frames']}
    cells, cohorts = {}, {}
    # Do not compute any heldout time aggregate here. Only training y enters fit.
    for row in rows:
        frame = frames[row['frame']]; task = tasks[frame['task']]
        binding = preparation['prepared'][task['name'] + '/' + row['version']]
        cohort = cohort_id(row['host'], row['variant'], row['boundary'], binding['compiler_sha256'])
        cell_key = cohort + '/' + row['frame']
        if cell_key not in cells:
            target, boundary = target_boundary(row['host'], row['variant'], row['boundary'])
            m = TargetCostModel(model_data(target, boundary, frame))
            semantic = read(binding['semantic'])['functions']; core = read(binding['core'])['program']
            estimate = m.estimate_function(task['name'], semantic, core)
            cells[cell_key] = dict(cohort=cohort, frame=row['frame'], task=task['name'], family=task['family'],
                version=row['version'], size=len(frame['xs']), split=frame['split'], train=training(task, frame),
                components=estimate['components'], estimate_receipt=estimate)
            cohorts.setdefault(cohort, dict(host=row['host'], variant=row['variant'], boundary=row['boundary'],
                version=row['version'], compiler_sha256=binding['compiler_sha256'], target=target, model_boundary=boundary,
                training_features=[], training_ns=[]))
        if cells[cell_key]['train']:
            cohorts[cohort]['training_features'].append(cells[cell_key]['components'])
            cohorts[cohort]['training_ns'].append(row['ns_per_call'])
    fits = {}
    for cohort, data in sorted(cohorts.items()):
        if not data['training_ns']:
            fits[cohort] = dict(status='no_training_support', cohort={k:v for k,v in data.items() if not k.startswith('training_')})
            continue
        fit = nnls_relative(data['training_features'], data['training_ns'])
        descriptor = {k:v for k,v in data.items() if not k.startswith('training_')}
        fits[cohort] = dict(status='fit', cohort=descriptor, fit=fit)
        trained_cells = [cell for cell in cells.values() if cell['cohort'] == cohort and cell['train']]
        default_extent = max(cell['size'] for cell in trained_cells)
        named_extents = {name: max(len(frames[cell['frame']][name]) for cell in trained_cells) for name in ('xs', 'ys')}
        model = dict(schema=2, target=data['target'], boundary=data['model_boundary'],
                     cardinality=dict(default=default_extent, by_parameter=named_extents), weights=fit['weights'])
        fits[cohort]['exported_cardinality_scope'] = 'Maximum observed training input extents; override these hypotheses for a concrete workload, never runtime validation'
        TargetCostModel(model)
        write_new(output / 'models' / (cohort + '.json'), model)
    predictions = []
    for key, cell in sorted(cells.items()):
        fit = fits[cell['cohort']]
        if fit['status'] != 'fit': predicted = None; unseen = list(COMPONENTS)
        else:
            predicted = sum(cell['components'][k]*fit['fit']['weights'][k] for k in COMPONENTS)
            unseen = [k for k in COMPONENTS if cell['components'][k] and not fit['fit']['support'][k]['identified_support']]
        predictions.append(dict(cell, prediction_ns=predicted, unseen_feature_support=unseen))
    write_new(output / 'predictions.json', predictions)
    write_new(output / 'fits.json', fits)
    frozen = dict(status='frozen_before_heldout_evaluation', protocol_sha256=preparation['protocol_sha256'],
                  preparation=str(Path(preparation_path).resolve()), preparation_sha256=sha(preparation_path),
                  provenance_sha256=sha(provenance_path), sources=sources,
                  predictions_sha256=sha(output / 'predictions.json'), fits_sha256=sha(output / 'fits.json'),
                  model_bindings={str(p.relative_to(output)):sha(p) for p in sorted((output / 'models').glob('*.json'))},
                  scope='Training-only fits and all feature predictions frozen. No heldout error, selection regret or performance aggregate inspected. Models remain opt-in.',
                  evidence='General39 has zero rewrite applications; these cells measure engine/lowering behavior, not new DB-law profitability.')
    write_new(output / 'freeze.json', frozen)
    return frozen


def error_summary(rows):
    if not rows: return dict(cells=0)
    absolute = [abs(r['prediction_ns']-r['observed_ns']) for r in rows]
    relative = [abs(r['prediction_ns']-r['observed_ns'])/r['observed_ns'] for r in rows]
    return dict(cells=len(rows), mean_absolute_ns=statistics.mean(absolute), median_absolute_ns=statistics.median(absolute),
                mean_absolute_relative=statistics.mean(relative), median_absolute_relative=statistics.median(relative),
                maximum_absolute_relative=max(relative), underpredictions=sum(r['prediction_ns']<r['observed_ns'] for r in rows),
                unseen_support_cells=sum(bool(r['unseen_feature_support']) for r in rows))


def evaluate(frozen_directory, provenance_path, output):
    frozen_directory, output = Path(frozen_directory), Path(output)
    frozen = read(frozen_directory / 'freeze.json')
    if frozen['status'] != 'frozen_before_heldout_evaluation': raise ValueError('freeze phase required')
    if sha(frozen['preparation']) != frozen['preparation_sha256']: raise ValueError('preparation drift')
    for filename in ('predictions', 'fits'):
        if sha(frozen_directory / (filename + '.json')) != frozen[filename + '_sha256']: raise ValueError('frozen prediction/fit drift')
    for filename, digest in frozen['model_bindings'].items():
        if sha(frozen_directory / filename) != digest: raise ValueError('model drift')
    preparation, report = validate_preparation(frozen['preparation'])
    if sha(provenance_path) != frozen['provenance_sha256']: raise ValueError('provenance drift')
    rows, sources = audited_rows(report, read(provenance_path))
    if sources != frozen['sources']: raise ValueError('timing receipt drift')
    fits = read(frozen_directory / 'fits.json'); cells = read(frozen_directory / 'predictions.json')
    samples = defaultdict(list)
    for row in rows:
        binding = preparation['prepared'][row['name'] + '/' + row['version']]
        c = cohort_id(row['host'], row['variant'], row['boundary'], binding['compiler_sha256'])
        samples[c, row['frame']].append(row['ns_per_call'])
    evaluated, unsupported = [], []
    for cell in cells:
        if cell['prediction_ns'] is None:
            unsupported.append(cell); continue
        observed = statistics.median(samples[cell['cohort'], cell['frame']])
        evaluated.append(dict(cell, observed_ns=observed))
    groups = defaultdict(list)
    for row in evaluated:
        groups[row['cohort'], row['split'], row['family']].append(row)
    errors = [dict(cohort=c, split=s, family=f, **error_summary(values)) for (c,s,f), values in sorted(groups.items())]
    comparable = defaultdict(dict)
    for cell in evaluated:
        cohort = fits[cell['cohort']]['cohort']
        # Exact host + target + timer boundary only. No pooled cross-host ranking.
        comparable[cohort['host'], cohort['target'], cohort['boundary'], cell['frame']][cell['version']] = cell
    choices, inconclusive = [], []
    for key, alternatives in sorted(comparable.items()):
        if set(alternatives) != {'baseline','candidate'}:
            inconclusive.append(dict(comparable_boundary=list(key), reason='missing trained/actual eligible comparable alternative'))
            continue
        baseline, candidate = alternatives['baseline'], alternatives['candidate']
        selected = candidate if candidate['prediction_ns'] <= baseline['prediction_ns']*(1-MINIMUM_SAVING) else baseline
        best = min((baseline,candidate), key=lambda c:c['observed_ns'])
        choices.append(dict(comparable_boundary=list(key), split=baseline['split'], train=baseline['train'],
            selected=selected['version'], fastest_measured=best['version'], selected_ns=selected['observed_ns'],
            fastest_ns=best['observed_ns'], regret_ns=selected['observed_ns']-best['observed_ns'],
            regret_relative=selected['observed_ns']/best['observed_ns']-1,
            lost=selected['observed_ns']>best['observed_ns'],
            scope='Compiler/lowering choice for same computation; no new DB law claimed'))
    result = dict(status='evaluated_frozen_no_retuning', freeze_sha256=sha(frozen_directory / 'freeze.json'),
                  protocol_sha256=preparation['protocol_sha256'], errors=errors, cells=evaluated,
                  unsupported=unsupported, choices=choices, inconclusive=inconclusive,
                  losses=sum(c['lost'] for c in choices),
                  scope='All errors, losses and unsupported cells retained; estimates establish neither equivalence nor general language superiority. Poor heldout models remain opt-in.')
    write_new(output, result)
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__); s=p.add_subparsers(dest='phase',required=True)
    a=s.add_parser('prepare');a.add_argument('--report',type=Path,required=True);a.add_argument('--output',type=Path,required=True)
    a.add_argument('--baseline-compiler',type=Path,required=True);a.add_argument('--candidate-compiler',type=Path,required=True);a.add_argument('--protocol',type=Path,required=True)
    for phase in ('freeze','evaluate'):
        a=s.add_parser(phase);a.add_argument('--provenance',type=Path,required=True);a.add_argument('--output',type=Path,required=True)
        a.add_argument('--preparation' if phase=='freeze' else '--frozen',type=Path,required=True)
    a=p.parse_args()
    if a.phase=='prepare':r=prepare(a.report,a.output,a.baseline_compiler,a.candidate_compiler,a.protocol)
    elif a.phase=='freeze':r=freeze(a.preparation,a.provenance,a.output)
    else:r=evaluate(a.frozen,a.provenance,a.output)
    print(json.dumps(dict(status=r['status'])))
if __name__=='__main__':main()
