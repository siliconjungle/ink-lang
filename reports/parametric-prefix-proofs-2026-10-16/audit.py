#!/usr/bin/env python3
"""Audit retained suffix-parametric proofs; optionally replay with Ink/Chrome."""
import argparse
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import statistics
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def raw(name):
    data = (ROOT / name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data


def read(name):
    return json.loads(raw(name))


def run(command, success=True, **kwargs):
    result = subprocess.run(command, capture_output=True, text=True, **kwargs)
    assert (result.returncode == 0) == success, result.stdout + result.stderr
    return result


def audit(ink=None, chrome=None):
    metadata = read('metadata.json')
    assert set(metadata['files']) == {
        str(p.relative_to(ROOT)) for p in ROOT.rglob('*')
        if p.is_file() and p.name != 'metadata.json' and '__pycache__' not in p.parts}
    for name, expected in metadata['files'].items():
        assert digest((ROOT / name).read_bytes()) == expected, name

    def archive(name):
        with tarfile.open(fileobj=io.BytesIO(raw(name)), mode='r:') as tar:
            entries = tar.getmembers()
            assert all(e.isfile() and not e.name.startswith('/') and '..' not in Path(e.name).parts for e in entries)
            assert len(entries) == len({e.name for e in entries})
            files = {e.name: tar.extractfile(e).read() for e in entries}
        assert {n: digest(b) for n, b in files.items()} == metadata['archives'][name]
        return files

    assert 'Ran 21 tests' in raw('checks/knowledge-all.log.gz').decode()
    assert raw('checks/knowledge-all.log.gz').decode().rstrip().endswith('OK')
    assert 'test result: ok. 12 passed;' in raw('checks/frozen-all.log.gz').decode()
    assert 'test result: ok. 1 passed;' in raw('checks/parity.log.gz').decode()
    image = read('checks/compiler-image.json')
    assert image['status'] == 'passed' and image['source'] == metadata['source']
    assert image['private_checkout'] and image['private_target']
    assert image['packages'] == metadata['packages']
    assert digest(raw('checks/compiler-image.log.gz')) == image['log_sha256']
    assert digest(raw('sources/Cargo.lock.gz')) == image['resolution_lock_sha256']
    plans = {}
    for count, helpers, size in [(32, 3, 492180), (128, 5, 836086), (512, 7, 1924553)]:
        plan = read(f'{count}/plan.json.gz'); plans[count] = plan
        assert len(raw(f'{count}/plan.json.gz')) == size
        assert [s['kind'] for s in plan['steps']] == ['extension', 'rewrite']
        extension = plan['steps'][0]['package']
        assert len(extension['knowledge']['objects'][extension['extension']]['payload']['functions']) == helpers
        objects = plan['steps'][1]['package']['knowledge']['objects']
        universal = [o for o in objects.values() if o['kind'] == 'theorem'
                     and o['payload']['declaration']['Theorem']['params']
                     and o['payload']['declaration']['Theorem']['params'][0][0] == 'chunk_suffix']
        assert len(universal) == helpers
        assert digest(raw(f'{count}/frozen.core.json.gz')) == plan['input_core_sha256']
        assert read(f'{count}/selected.core.json.gz') == plan['steps'][1]['package']['action_replacement']['selected']
    # Proof packaging changed; runtime code in the measured earlier study did not.
    previous = REPOSITORY / 'reports/shared-helper-code-2026-10-16'
    for count in [32, 128]:
        assert raw(f'{count}/selected.core.json.gz') == gzip.decompress((previous / f'{count}/selected.core.json.gz').read_bytes())
        assert raw(f'{count}/program.mjs.gz') == gzip.decompress((previous / f'performance/baseline/{count}/program.mjs.gz').read_bytes())
    samples = read('checks/authoring-times.json')
    assert len(samples['pairs']) == 6
    ratios = []
    for index, pair in enumerate(samples['pairs']):
        assert pair['order'] == (['previous', 'parametric'] if index % 2 == 0 else ['parametric', 'previous'])
        for name, filename in [('previous', 'previous128-plan.json.gz'), ('parametric', '128/plan.json.gz')]:
            result = pair['results'][name]
            assert result['seconds'] > 0 and result['bytes'] == len(raw(filename))
            assert result['sha256'] == digest(raw(filename))
        ratios.append(pair['results']['previous']['seconds'] / pair['results']['parametric']['seconds'])
    assert math.isclose(math.exp(statistics.mean(map(math.log, ratios))), metadata['authoring_geometric_speedup'])
    artifacts = {}
    for name in ['baseline', 'javascript', 'webgpu']:
        files = archive(f'artifacts/{name}.tar.gz'); artifacts[name] = files
        manifest = json.loads(files['artifact.json'])
        assert set(files) == set(manifest['files']) | {'artifact.json'}
        for path, expected in manifest['files'].items():
            assert digest(files[path]) == expected['sha256'] and len(files[path]) == expected['bytes']
        if name != 'baseline':
            assert json.loads(files['selection.json']) == plans[512]
            assert files['selected.core.json'] == raw('512/selected.core.json.gz')
        if name != 'webgpu':
            for path, expected in image['images']['baseline' if name == 'baseline' else 'selected'].items():
                assert digest(files[path]) == expected
    corpus = archive('corpus.tar.gz')
    report = json.loads(corpus['report.json'])
    assert report['headline']['compiled'] == report['headline']['programs'] == 10
    assert report['headline']['programs_selecting_alternative'] == 0
    assert report['headline']['laws_admitted'] == 54
    assert report['headline']['laws_admitted_in_multiple_programs'] == 7
    assert report['headline']['last_gates'] == {'measurement_budget': 10}
    history = archive('history-512.tar.gz')
    assert len(json.loads(history['expected.json'])) == 144
    browser = read('checks/browser-512.json')
    assert browser['status'] == 'passed' and browser['comparisons'] == 432
    assert browser['gpuCalls'] == 1 and browser['initializedChecks'] == 6 and browser['restoreRejections'] == 3
    assert 'inductive proof proves a different statement' in raw('negative/false-tail.log.gz').decode()
    with tempfile.TemporaryDirectory(prefix='ink-prefix-audit-') as temporary:
        temporary = Path(temporary)
        for name, files in [*artifacts.items(), ('history', history)]:
            for path, data in files.items():
                destination = temporary / name / path
                destination.parent.mkdir(parents=True, exist_ok=True); destination.write_bytes(data)
            if ink and name != 'history':
                run([str(Path(ink).resolve()), 'verify-model', str(temporary / name), '--replay'])
        if ink:
            binary = str(Path(ink).resolve())
            for count in [32, 128, 512]:
                core = temporary / f'{count}.core.json'; core.write_bytes(raw(f'{count}/frozen.core.json.gz'))
                plan = temporary / f'{count}.plan.json'; plan.write_bytes(raw(f'{count}/plan.json.gz'))
                run([binary, 'check-plan', str(core), str(plan), '--core'])
            for name, success in [('valid', True), ('false-tail', False)]:
                view = temporary / f'{name}.json'; view.write_bytes(raw(f'negative/{name}.json.gz'))
                result = run([binary, 'knowledge-check', str(temporary / '512.core.json'), str(view)], success)
                if not success:
                    assert 'identity mismatch' not in result.stderr and 'interface mismatch' not in result.stderr
        if chrome:
            output = temporary / 'browser.json'
            run(['node', str(REPOSITORY / 'bench/gpu/replay-source-history-browser.mjs'),
                 str(Path(chrome).resolve()), 'history', str(output), '--initialized', 'webgpu'], cwd=temporary)
            assert json.loads(output.read_bytes()) == browser
    print('Verified parametric proof plans, unchanged measured code, six authoring pairs, three initialized artifacts and corpus/browser evidence'
          + (' with fresh proof/training replay' if ink else '') + (' and browser replay' if chrome else ''))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--ink'); parser.add_argument('--chrome')
    args = parser.parse_args(); audit(args.ink, args.chrome)
