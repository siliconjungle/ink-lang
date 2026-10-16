#!/usr/bin/env python3
"""Check retained file bindings; optionally replay proofs, packages and browser history."""
import argparse
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parents[1]
def digest(data): return hashlib.sha256(data).hexdigest()
def raw(name):
    data = (ROOT/name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data
def read(name): return json.loads(raw(name))
def bundle(name, expected):
    with tarfile.open(fileobj=io.BytesIO(raw(name)), mode='r:') as archive:
        entries = archive.getmembers()
        assert all(e.isfile() and not e.name.startswith('/') and '..' not in Path(e.name).parts for e in entries)
        assert len(entries) == len({e.name for e in entries})
        files = {e.name: archive.extractfile(e).read() for e in entries}
    assert {n: digest(b) for n, b in files.items()} == expected
    return files
def passed(name, count):
    log = raw(name).decode()
    assert 'test result: FAILED' not in log and 'error: could not compile' not in log
    assert sum(map(int, re.findall(r'test result: ok\. (\d+) passed', log))) == count
def run(command, **kwargs):
    result = subprocess.run(command, capture_output=True, text=True, **kwargs)
    assert result.returncode == 0, result.stderr + result.stdout

def audit(ink=None, chrome=None):
    metadata = read('metadata.json')
    assert set(metadata['files']) == {str(p.relative_to(ROOT)) for p in ROOT.rglob('*')
        if p.is_file() and p.name != 'metadata.json' and '__pycache__' not in p.parts}
    for name, expected in metadata['files'].items():
        assert digest((ROOT/name).read_bytes()) == expected, name
    passed('checks/frozen-state.log.gz', 11)
    passed('checks/configured-bits.log.gz', 1)
    passed('checks/trained-default.log.gz', 5)  # GPU body skips without its flag.
    failed = raw('checks/trained-all-targets-initial.log.gz').decode()
    assert '4 passed; 1 failed' in failed and 'PermissionDenied' in failed
    passed('checks/trained-gpu-retry.log.gz', 1)
    assert 'one required GPU dispatch matched' in raw('checks/trained-gpu-retry.log.gz').decode()
    knowledge = raw('checks/knowledge.log.gz').decode()
    assert re.search(r'Ran 20 tests in ', knowledge) and knowledge.rstrip().endswith('OK')
    clean = read('checks/compiler-image.json')
    assert clean['status'] == 'passed' and clean['source'] == metadata['source']
    assert clean['packages'] == metadata['packages'] and clean['private_checkout'] and clean['private_target']
    assert clean['fixture'] == dict(program='examples/frozen-parameters.ink',
        trace='examples/frozen-parameters-training.json', freeze_roots='Model')
    assert digest(raw('checks/compiler-image.log.gz')) == clean['log_sha256']
    assert digest(raw('sources/Cargo.lock.gz')) == clean['resolution_lock_sha256']
    packages = {}
    for mode in ['baseline', 'selected']:
        files = bundle(mode+'.tar.gz', metadata['archives'][mode])
        packages[mode] = files
        artifact = json.loads(files['artifact.json'])
        for name, entry in artifact['files'].items():
            assert len(files[name]) == entry['bytes'] and digest(files[name]) == entry['sha256']
        assert set(files) == set(artifact['files']) | {'artifact.json'}
        assert sum(entry['bytes'] for entry in artifact['files'].values()) == metadata['package_bytes'][mode]['compact']
        for name, expected in clean['images'][mode].items():
            assert digest(files[name]) == expected, (mode, name)
        old_plan = raw('previous-plans/'+mode+'.json.gz')
        assert json.loads(old_plan) == json.loads(files['program.mjs.plan.json'])
        assert len(old_plan) - len(files['program.mjs.plan.json']) == (
            metadata['package_bytes'][mode]['previous'] - metadata['package_bytes'][mode]['compact'])
    packet = json.loads(packages['selected']['selection.json'])
    objects = packet['knowledge']['objects']
    assert len(objects) == 76 and sum(e['kind'] == 'theorem' for e in objects.values()) == 15
    assert raw('history/input.core.json') == packages['selected']['compiled.core.json']
    assert raw('history/selected.core.json') == packages['selected']['selected.core.json']
    expected, steps = read('history/expected.json.gz'), read('history/script.json.gz')
    assert len(expected) == 33 and sum('call' in s or 'pure' in s for s in steps) == 33
    assert sum('restore' in s for s in steps) == 2 and sum('reject_restore' in s for s in steps) == 1
    native = read('history/native-gpu-receipts.json.gz')
    assert len(native) == 33 and sum(row.get('backend') == 'gpu' for row in native) == 1
    browser = read('checks/browser.json')
    assert browser['status'] == 'passed' and browser['comparisons'] == 99
    assert browser['gpuCalls'] == 1 and browser['restores'] == 6 and browser['restoreRejections'] == 3
    assert browser['results'] == [dict(backend=b, observations=33) for b in ['javascript', 'cpu', 'gpu']]
    images = bundle('browser.tar.gz', metadata['archives']['browser'])
    with tempfile.TemporaryDirectory(prefix='ink-factored-audit-') as folder:
        folder = Path(folder)
        if ink:
            ink = str(Path(ink).resolve())
            for mode, files in packages.items():
                for name, data in files.items():
                    target = folder/mode/name; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data)
                run([ink, 'verify-model', str(folder/mode), '--replay'])
            run([ink, 'check-selection', str(ROOT/'history/input.core.json'), str(ROOT/'history/selection.json')])
        if chrome:
            for name, data in images.items():
                target = folder/'history'/name; target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data)
            for name in ['script.json', 'expected.json']:
                (folder/'history'/name).write_bytes(raw('history/'+name+'.gz'))
            receipt = folder/'browser.json'
            run(['node', str(REPOSITORY/'bench/gpu/replay-source-history-browser.mjs'),
                str(Path(chrome).resolve()), 'history', str(receipt)], cwd=folder)
            assert json.loads(receipt.read_bytes()) == browser
    print(f"verified {len(metadata['files'])} bound files, factored lemmas, package inventories and complete history"
        + (' with ordinary proof/package replay' if ink else '') + (' and fresh browser replay' if chrome else ''))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--ink'); parser.add_argument('--chrome')
    args = parser.parse_args(); audit(args.ink, args.chrome)
