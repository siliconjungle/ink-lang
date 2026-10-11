#!/usr/bin/env python3
"""Audit every measured cell and summarise retained rounds, including losses."""
import collections
import gzip
import hashlib
import json
import statistics
import sys
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'bench'))
from methodology import bootstrap_ci, ratio_ci

REPORT = ROOT / 'reports/frontier-diff-2026-10-12'


def digest(value):
    h = 2166136261
    def visit(x):
        nonlocal h
        if isinstance(x, int):
            h = ((h ^ (x & 0xffffffff)) * 16777619) & 0xffffffff
        elif isinstance(x, list):
            for v in x:
                visit(v)
        elif isinstance(x, dict):
            for v in x.values():
                visit(v)
    visit(value)
    return h


def main():
    fixture_path = ROOT / 'build/frontier-diff/fixtures.json'
    raw = fixture_path.read_bytes() if fixture_path.exists() else gzip.decompress((REPORT / 'fixtures.json.gz').read_bytes())
    fixtures = json.loads(raw)
    assert len(fixtures) == 27
    provenance = json.loads((REPORT / 'provenance.json').read_text())
    assert hashlib.sha256(raw).hexdigest() == provenance['files']['build/frontier-diff/fixtures.json']
    prepared_provenance = json.loads((REPORT / 'prepared-provenance.json').read_text())
    for name, sha in prepared_provenance['archives'].items():
        assert hashlib.sha256((REPORT / name).read_bytes()).hexdigest() == sha, name
    for name in ['runner.mjs', 'node.mjs', 'browser.html']:
        for prefix, pins in [('', provenance['files']), ('prepared-', prepared_provenance['harness'])]:
            data = gzip.decompress((REPORT / (prefix + name + '.gz')).read_bytes())
            assert hashlib.sha256(data).hexdigest() == pins['bench/frontier-diff/' + name]
    with tarfile.open(REPORT / 'measured-artifacts.tar.gz') as tar:
        assert set(m.name for m in tar.getmembers()) == set(prepared_provenance['files'])
        for name, sha in prepared_provenance['files'].items():
            assert hashlib.sha256(tar.extractfile(name).read()).hexdigest() == sha, name
            if name in provenance['files']:
                assert sha == provenance['files'][name], name
    cases = {c['id']: c for c in fixtures}
    phases = {}
    expected_digests = {}
    for c in fixtures:
        # Independent checks of the fixture generator, rather than generated Ink.
        assert len(c['before']) == len(c['after']) == c['rows']
        indexes = [i for i, (a, b) in enumerate(zip(c['before'], c['after'])) if a != b]
        assert indexes == [e['index'] for e in c['edits']]
        assert len(indexes) == c['changes'] and set(indexes) <= set(c['dirty'])
        replay = c['before'].copy()
        for e in c['edits']:
            replay[e['index']] = e['value'] if c['kind'] == 'scalar' else {k: v for k, v in e.items() if k != 'index'}
        assert replay == c['after']
        phases[c['id']] = ['diff', 'hint', 'apply', 'roundtrip']
        if c['kind'] == 'scalar' and len(c['edits']) <= 256:
            phases[c['id']].append('apply-probe')
        for phase in phases[c['id']]:
            expected_digests[(c['id'], phase)] = digest(c['edits'] if phase in ['diff', 'hint'] else c['after'])

    summary = {'schema': 1, 'audit': [], 'cells': [], 'comparisons': []}
    runs = ['node-results', 'browser-results', 'node-prepared', 'browser-prepared', 'native-results']
    for run in runs:
        native = run == 'native-results'
        browser = run.startswith('browser')
        prepared = run.endswith('prepared')
        if native:
            samples = [json.loads(s) for s in (REPORT / (run + '.jsonl')).read_text().splitlines()]
            availability = []
        else:
            data = json.loads((REPORT / (run + '.json')).read_text())
            assert data['status'] == 'passed'
            assert data.get('prepared', False) == prepared
            samples = data['samples']
            availability = data['availability']
            assert sum('kind' in v for v in data['validation']) == 27
            assert sum(v.get('passed', False) for v in data['validation']) == 115
            if browser:
                assert len(data['unsupported']) == 54
        grouped = collections.defaultdict(list)
        for s in samples:
            grouped[(s['case'], s['phase'], s['variant'])].append(s)
            assert s['iterations'] > 0 and s['ns_per_call'] > 0
            if s['variant'].startswith('ink-webgpu'):
                assert s['actual_backend'] == 'gpu' and s['counters']['dispatches'] > 0
                if s['variant'].endswith('resident'):
                    assert s['counters']['upload_bytes'] == 0
            if s['variant'] in ['ink-javascript', 'ink-wasm-full', 'ink-wasm-prepared', 'ink-webgpu-full', 'ink-webgpu-resident', 'ink-rust']:
                assert s['digest'] == (expected_digests[(s['case'], s['phase'])] * s['iterations']) & 0xffffffff
        expected_keys = set()
        for case, ps in phases.items():
            for phase in ps:
                names = ['ink-rust'] if native else ['frontier', 'ink-javascript', 'ink-wasm-full']
                gpu = browser and phase in ['diff', 'hint', 'apply-probe']
                if gpu:
                    names.append('ink-webgpu-full')
                if prepared and phase != 'roundtrip':
                    names.append('ink-wasm-prepared')
                    if gpu:
                        names.append('ink-webgpu-resident')
                expected_keys.update((case, phase, name) for name in names)
        assert set(grouped) == expected_keys, (run, expected_keys - set(grouped), set(grouped) - expected_keys)
        for key, ss in grouped.items():
            ss.sort(key=lambda s: s['round'])
            assert [s['round'] for s in ss] == list(range(5)), (run, key)
            ns = [s['ns_per_call'] for s in ss]
            c = cases[key[0]]
            summary['cells'].append(dict(run=run, case=key[0], kind=c['kind'], rows=c['rows'], mode=c['mode'], phase=key[1], variant=key[2],
                                        median_us=statistics.median(ns)/1000, min_us=min(ns)/1000, max_us=max(ns)/1000,
                                        bootstrap_95_us=[v/1000 for v in bootstrap_ci(ns, seed=71331)]))
            if not native and key[2] != 'frontier':
                f = grouped[(key[0], key[1], 'frontier')]
                point, lo, hi = ratio_ci([s['ns_per_call'] for s in f], ns, seed=71331)
                summary['comparisons'].append(dict(run=run, case=key[0], phase=key[1], variant=key[2],
                                                   frontier_over_ink=point, paired_bootstrap_95=[lo, hi]))
        summary['audit'].append(dict(run=run, cases=27, cells=len(grouped), samples=len(samples), rounds_per_cell=5,
                                     actual_gpu_cells=len(availability), passed=True))
    (REPORT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')

    # Display representative tables; summary.json retains every size/mode/loss.
    lookup = {(c['run'], c['case'], c['phase'], c['variant']): c['median_us'] for c in summary['cells']}
    tables = []
    for run in ['browser-results', 'node-results', 'browser-prepared', 'node-prepared', 'native-results']:
        tables += [f'### {run}\n', '| Case (16,384 entries; 164 changes) | Phase | Frontier | Ink JS | Ink Wasm | Ink WebGPU | Wasm captured | GPU resident | Rust native |',
                   '|---|---|---:|---:|---:|---:|---:|---:|---:|']
        for kind in ['scalar', 'rows', 'rows-shared']:
            for phase in ['diff', 'hint', 'apply', 'roundtrip']:
                values = []
                for variant in ['frontier', 'ink-javascript', 'ink-wasm-full', 'ink-webgpu-full', 'ink-wasm-prepared', 'ink-webgpu-resident', 'ink-rust']:
                    v = lookup.get((run, kind + '-16384-sparse', phase, variant))
                    values.append('—' if v is None else f'{v:,.2f}')
                tables.append('| ' + ' | '.join([kind, phase] + values) + ' |')
        tables.append('')
    (REPORT / 'tables.md').write_text('All numbers are medians in microseconds per call. Each includes consuming the entire returned representation.\n\n' + '\n'.join(tables))
    print(json.dumps(summary['audit'], indent=2))


if __name__ == '__main__':
    main()
