#!/usr/bin/env python3
"""Measure explicit guarded specialization; outputs are observations, not admission."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import platform
import re
import shutil
import statistics
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--ink', required=True, type=Path)
parser.add_argument('--out', required=True, type=Path)
parser.add_argument('--pairs', type=int, default=5)
parser.add_argument('--variant', action='append', default=[], metavar='NAME=PLAN',
    help='additional checked plan against the same original core')
args = parser.parse_args()
assert 1 <= args.pairs <= 20
root = Path(__file__).resolve().parents[2]
report = root/'reports/guarded-function-specialization-2026-10-17'
out = args.out.resolve()
assert not out.exists(), 'Use a fresh output directory to retain previous measurements.'
out.mkdir(parents=True)
shutil.copy2(Path(__file__), out/'run.py')
ink = args.ink.resolve()
def run(command):
    result = subprocess.run(list(map(str, command)), capture_output=True, text=True, timeout=180)
    if result.returncode:
        (out/'failure.json').write_text(json.dumps(dict(command=list(map(str, command)),
            status=result.returncode, stdout=result.stdout, stderr=result.stderr), indent=2)+'\n')
        raise RuntimeError(result.stderr)
    return result
def write(path, value):
    path.write_text(json.dumps(value, indent=2)+'\n')
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for name in ['source.core.json', 'plan.json', 'configuration.json']:
    shutil.copy2(report/'proof'/name, out/name)
replayed = json.loads(run([ink, 'check-plan', out/'source.core.json', out/'plan.json', '--core']).stdout)
write(out/'replay.json', {k: replayed[k] for k in ['input', 'selected', 'plan_sha256', 'status']})
compile_times = {}
identity = json.loads((out/'plan.json').read_bytes())
identity['steps'] = []
write(out/'identity.plan.json', identity)
plans = dict(baseline=out/'identity.plan.json', guarded=out/'plan.json')
for option in args.variant:
    name, path = option.split('=', 1)
    assert re.fullmatch(r'[a-z][a-z0-9-]{0,40}', name) and name not in plans
    target = out/(name+'.plan.json')
    shutil.copy2(Path(path), target)
    receipt = json.loads(run([ink, 'check-plan', out/'source.core.json', target, '--core']).stdout)
    write(out/(name+'-replay.json'), {k: receipt[k] for k in ['input', 'selected', 'plan_sha256', 'status']})
    plans[name] = target
for variant, plan in plans.items():
    command = [ink, 'compile', out/'source.core.json', '--core', '--target', 'javascript', '-o', out/(variant+'.mjs')]
    command += ['--plan', plan]
    before = time.monotonic()
    compiled = run(command)
    compile_times[variant] = time.monotonic()-before
    (out/(variant+'-compile.log')).write_text(compiled.stdout+compiled.stderr)
# Retain historical reproduction as provenance, not as a veto on later literal
# emitters. Plan replay and all independent reference controls still run below.
# The archived runner keeps its original exact-emitter reproduction contract.
write(out/'emitter-provenance.json', dict(
    compiler_sha256=digest(ink), input=replayed['input'], selected=replayed['selected'],
    historical_guarded_sha256=digest(report/'parity/program.mjs'),
    current_guarded_sha256=digest(out/'guarded.mjs'),
    reproduces_historical_guarded=digest(out/'guarded.mjs')==digest(report/'parity/program.mjs')))

graph = json.loads((out/'configuration.json').read_bytes())
graphs = dict(match=graph, early=copy.deepcopy(graph), late=copy.deepcopy(graph), empty=[])
graphs['early'][0]['kind'] = 'Kind.Multiply'
graphs['late'][-1]['kind'] = 'Kind.Add'
weights = [[0.5, 2.0], [0.03125, 0.99609375]]
inputs = {str(n): [[(i % 11 - 5 + phase)/8 for i in range(n)] for phase in range(3)] for n in [0, 1, 64, 1024]}
values = []
for name, code in graphs.items():
    for length, vectors in inputs.items():
        for w, weight in enumerate(weights):
            for phase, vector in enumerate(vectors):
                arguments = [code, weight, vector]
                write(out/'reference-args.json', arguments)
                result = run([ink, 'run', out/'source.core.json', 'evaluate', out/'reference-args.json', '--core'])
                values.append(dict(name=f'{name}/{length}/{w}/{phase}', args=arguments, value=json.loads(result.stdout)))
scenarios = []
for graph_name in graphs:
    for length in ['1', '64', '1024']:
        scenarios.append(dict(name=f'stable/{graph_name}/{length}', lifetime='stable', graph=graph_name,
            input=length, reads=1, cycles=3000, warmup=3000))
for lifetime in ['short', 'learning']:
    for graph_name in ['match', 'late']:
        for reads in [1, 8, 64]:
            cycles = {1: 2048, 8: 512, 64: 128}[reads]
            scenarios.append(dict(name=f'{lifetime}/{graph_name}/{reads}', lifetime=lifetime, graph=graph_name,
                input='64', reads=reads, cycles=cycles, warmup=cycles))
# Retained history includes exact raw F32 tags. JSON integers here fit JS's safe
# domain; snapshots are byte arrays and U64 host versions are normalized in JS.
data = dict(schema=1, samples=5, graphs=graphs, weights=weights, inputs=inputs,
    scenarios=scenarios, values=values,
    history=dict(steps=json.loads((report/'parity/script.json').read_bytes()),
                 expected=json.loads((report/'parity/expected.json').read_bytes())))
write(out/'data.json', data)
shutil.copy2(Path(__file__).with_name('measure.mjs'), out/'measure.mjs')
measurements = []
for pair in range(args.pairs):
    names = list(plans)
    # Rotate starts, then reverse alternate pairs, keeping every image isolated.
    offset = (pair // 2) % len(names)
    order = names[offset:]+names[:offset]
    if pair % 2:
        order.reverse()
    row = dict(pair=pair, order=order, variants={})
    for variant in order:
        result = run(['node', out/'measure.mjs', out/(variant+'.mjs'), out/'data.json', variant, pair])
        record = json.loads(result.stdout)
        write(out/f'pair-{pair}-{variant}.json', record)
        row['variants'][variant] = record
    baseline = row['variants']['baseline']
    for name in names[1:]:
        for left, right in zip(baseline['records'], row['variants'][name]['records']):
            for key in ['name', 'scenario', 'checksum', 'first', 'snapshot']:
                assert left[key] == right[key], (pair, name, left['name'], key)
    measurements.append(row)
    print(json.dumps(dict(pair=pair, variants=order, ratios={name:{a['name']:a['median_ms']/b['median_ms']
        for a,b in zip(baseline['records'], row['variants'][name]['records'])} for name in names[1:]})), flush=True)

ratios = {}
for name in list(plans)[1:]:
    ratios[name] = {}
    for index, scenario in enumerate(scenarios):
        pairs = [r['variants']['baseline']['records'][index]['median_ms'] /
                 r['variants'][name]['records'][index]['median_ms'] for r in measurements]
        ratios[name][scenario['name']] = dict(median=statistics.median(pairs), pairs=pairs, min=min(pairs), max=max(pairs))
summary = dict(schema=1, status='measured-unadmitted', distribution=run(['git', '-C', root, 'rev-parse', 'HEAD']).stdout.strip(),
    compiler_sha256=digest(ink), platform=platform.platform(), machine=platform.machine(),
    command=list(map(str, [__file__, '--ink', ink, '--out', out, '--pairs', args.pairs,
        *[part for option in args.variant for part in ['--variant', option]]])),
    pairs=args.pairs, samples_per_case=5, reference_values=len(values), reference_history_outcomes_per_process=335,
    compile_seconds=compile_times, paired_baseline_over_variant=ratios,
    scope='JavaScript bound state calls including complete list result consumption. Short lifetimes include creation/binding and initial learning writes. Learning histories include graph and weight writes. Setup/import/recovery and peak process RSS are separate observations. No GPU/native claim, profitability admission or full training-algorithm cost claim.',
    files={str(p.relative_to(out)):dict(bytes=p.stat().st_size, sha256=digest(p)) for p in sorted(out.iterdir()) if p.is_file()})
write(out/'summary.json', summary)
print(json.dumps(dict(status=summary['status'], cases=len(scenarios), variants=list(plans), pairs=args.pairs)), flush=True)
