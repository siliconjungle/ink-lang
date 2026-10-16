#!/usr/bin/env python3
"""Audit captured lifecycle observations; optionally replay proofs and controls."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import statistics
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--ink', type=Path)
parser.add_argument('--run', action='store_true', help='rerun finite JS controls, excluding performance loops')
args = parser.parse_args()
root = Path(__file__).resolve().parent
summary = json.loads((root/'summary.json').read_bytes())
for name, expected in summary['files'].items():
    path = root/name
    assert path.resolve().is_relative_to(root)
    data = path.read_bytes()
    assert len(data) == expected['bytes'] and hashlib.sha256(data).hexdigest() == expected['sha256'], name

raw = {}
for name, receipt in summary['artifacts'].items():
    assert (root/name).resolve().is_relative_to(root)
    path = root/receipt['stored']
    assert path.resolve().is_relative_to(root)
    compressed = path.read_bytes()
    assert hashlib.sha256(compressed).hexdigest() == receipt['stored_sha256']
    data = gzip.decompress(compressed)
    assert len(data) == receipt['bytes'] and hashlib.sha256(data).hexdigest() == receipt['sha256']
    raw[name] = data
def load(name):
    return json.loads(raw[name])
assert load('producer-reproduction/prefix-composed.plan.json') == load('composed-cohort-1/projected-guarded.plan.json')

processes = 0
for cohort, expected in summary['cohorts'].items():
    captured = load(cohort+'/summary.json')
    assert captured['status'] == 'measured-unadmitted' and captured['pairs'] == expected['pairs']
    assert captured['reference_values'] == 96
    for name, receipt in captured['files'].items():
        data = raw[cohort+'/'+name]
        assert hashlib.sha256(data).hexdigest() == receipt['sha256'] and len(data) == receipt['bytes']
    rows = []
    for pair in range(expected['pairs']):
        variants = {name: load(f'{cohort}/pair-{pair}-{name}.json') for name in expected['variants']}
        for name, record in variants.items():
            assert record['reference_values'] == 96 and record['reference_history_outcomes'] == 335
            assert record['variant'] == name and record['pair'] == pair
            assert len(record['records']) == 24
            assert record['image_bytes'] == len(raw[f'{cohort}/{name}.mjs'])
            processes += 1
            for case in record['records']:
                assert len(case['samples_ms']) == 5 and min(case['samples_ms']) > 0
                assert statistics.median(case['samples_ms']) == case['median_ms']
            for a, b in zip(variants['baseline']['records'], record['records']):
                for key in ['name', 'scenario', 'checksum', 'first', 'snapshot']:
                    assert a[key] == b[key], (cohort, pair, name, a['name'], key)
        rows.append(variants)
    ratios = captured.get('paired_baseline_over_variant')
    if ratios is None:  # Original two-image cohort predates the general driver.
        ratios = dict(guarded=captured['paired_baseline_over_guarded'])
    for name in expected['variants'][1:]:
        for index, case in enumerate(rows[0]['baseline']['records']):
            pairs = [r['baseline']['records'][index]['median_ms']/r[name]['records'][index]['median_ms'] for r in rows]
            retained = ratios[name][case['name']]
            assert pairs == retained['pairs']
            assert statistics.median(pairs) == retained['median']
assert processes == 42
assert 'Ran 26 tests' in (root/'knowledge-regressions-final.log').read_text()
assert (root/'knowledge-regressions-final.log').read_text().rstrip().endswith('OK')

if args.ink or args.run:
    cohort = 'composed-cohort-1'
    with tempfile.TemporaryDirectory(prefix='ink-guard-lifecycle-audit-') as temporary:
        folder = Path(temporary)
        for name, data in raw.items():
            if name.startswith(cohort+'/'):
                target = folder/Path(name).relative_to(cohort)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
        def command(*parts):
            result = subprocess.run(list(map(str, parts)), check=True, capture_output=True, text=True, timeout=180)
            return result.stdout
        if args.ink:
            compiler = args.ink.resolve()
            for variant, plan, receipt in [('baseline', 'identity.plan.json', None),
                    ('guarded', 'plan.json', 'replay.json'),
                    ('projected', 'projected.plan.json', 'projected-replay.json'),
                    ('projected-guarded', 'projected-guarded.plan.json', 'projected-guarded-replay.json')]:
                checked = json.loads(command(compiler, 'check-plan', folder/'source.core.json', folder/plan, '--core'))
                if receipt:
                    saved = json.loads((folder/receipt).read_bytes())
                    assert all(checked[k] == saved[k] for k in ['input', 'selected', 'plan_sha256'])
                output = folder/'recompiled.mjs'
                command(compiler, 'compile', folder/'source.core.json', '--core', '--plan', folder/plan,
                        '--target', 'javascript', '-o', output)
                assert output.read_bytes() == (folder/(variant+'.mjs')).read_bytes()
            for case in load(cohort+'/data.json')['values']:
                arguments = folder/'reference-validation.json'
                arguments.write_text(json.dumps(case['args']))
                value = json.loads(command(compiler, 'run', folder/'source.core.json', 'evaluate', arguments, '--core'))
                assert value == case['value'], case['name']
        if args.run:
            data = load(cohort+'/data.json')
            data['scenarios'] = []
            validation = folder/'validation-data.json'
            validation.write_text(json.dumps(data))
            for variant in summary['cohorts'][cohort]['variants']:
                result = json.loads(command('node', folder/'measure.mjs', folder/(variant+'.mjs'), validation, variant, 0))
                assert result['reference_values'] == 96 and result['reference_history_outcomes'] == 335
print(json.dumps(dict(status='passed', captured_processes=processes,
    cases_per_process=24, distinct_reference_values=96, reference_history_outcomes=335,
    knowledge_tests=26, checked_images=4 if args.ink else 0,
    rerun_js_controls=bool(args.run), profitability_admission=False)))
