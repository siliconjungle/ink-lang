#!/usr/bin/env python3
"""Audit retained evidence; optionally replay source proofs and browser images."""
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
def passed(name, count):
    log = raw(name).decode()
    assert 'test result: FAILED' not in log and 'error: could not compile' not in log
    assert sum(map(int, re.findall(r'test result: ok\. (\d+) passed', log))) == count, name

def archive(name, expected):
    with tarfile.open(fileobj=io.BytesIO((ROOT/name).read_bytes()), mode='r:gz') as bundle:
        entries = bundle.getmembers()
        assert all(e.isfile() and not e.name.startswith('/') and '..' not in Path(e.name).parts for e in entries)
        assert len(entries) == len({e.name for e in entries})
        data = {e.name:bundle.extractfile(e).read() for e in entries}
    assert {n:digest(b) for n,b in data.items()} == expected
    return data

def audit(ink=None, chrome=None):
    metadata = read('metadata.json')
    assert set(metadata['files']) == {str(p.relative_to(ROOT)) for p in ROOT.rglob('*')
        if p.is_file() and p.name != 'metadata.json' and '__pycache__' not in p.parts}
    for name, expected in metadata['files'].items():
        assert digest((ROOT/name).read_bytes()) == expected, name
    core, package = read('checks/private-core.json'), read('core-package.json')
    assert core['status'] == 'passed' and core['package'] == package['commit']
    assert core['source'] == package['source'] and core['core_tree'] == package['core_tree']
    assert core['private_checkout'] and core['private_target']
    assert digest(raw('checks/private-core.log.gz')) == core['log_sha256']
    passed('checks/private-core.log.gz', 450)
    passed('checks/frozen-state.log.gz', 11)
    passed('checks/hardening.log.gz', 42)
    knowledge = raw('checks/knowledge.log.gz').decode()
    assert re.search(r'Ran 12 tests in ', knowledge) and knowledge.rstrip().endswith('OK')
    clean = read('checks/compiler-image.json')
    assert clean['status'] == 'passed' and clean['source'] == metadata['source']
    assert clean['packages'] == metadata['packages'] and clean['private_checkout'] and clean['private_target']
    assert digest(raw('checks/compiler-image.log.gz')) == clean['log_sha256']
    assert digest(raw('sources/Cargo.lock.gz')) == clean['resolution_lock_sha256']
    previous = json.loads((ROOT.parent/'frozen-program-2026-10-16/metadata.json').read_bytes())
    for mode in ['baseline','selected']:
        for name, expected in clean['images'][mode].items():
            assert previous['artifacts'][mode][name] == expected, (mode,name)
    bundles = {}
    for name, count in [('parameters',33),('program',144)]:
        expected = read(name+'/expected.json.gz');steps = read(name+'/script.json.gz')
        assert len(expected) == count and sum('restore' not in step for step in steps) == count
        native = read(name+'/native-gpu-receipts.json.gz')
        assert len(native) == count and sum(row.get('backend') == 'gpu' for row in native) == 1
        browser = read('checks/'+name+'-browser.json')
        assert browser['status'] == 'passed' and browser['comparisons'] == 3*count
        assert browser['gpuCalls'] == 1 and browser['restores'] == 6
        assert browser['results'] == [dict(backend=backend,observations=count) for backend in ['javascript','cpu','gpu']]
        bundles[name] = archive(name+'-browser.tar.gz', metadata['archives'][name])
    opportunities = read('negative-controls/exceptional-opportunities.json')
    assert [(row['count'],row['status']) for row in opportunities] == [(64,'passed'),(128,'rejected'),(244,'rejected')]
    if ink:
        run = subprocess.run([str(Path(ink).resolve()),'check-selection',str(ROOT/'parameters/input.core.json'),
            str(ROOT/'parameters/selection.json')], capture_output=True, text=True)
        assert run.returncode == 0, run.stderr
    if chrome:
        chrome = str(Path(chrome).resolve())
        with tempfile.TemporaryDirectory(prefix='ink-shared-browser-audit-') as temp:
            temp = Path(temp)
            for name, count in [('parameters',33),('program',144)]:
                for file, data in bundles[name].items():
                    p=temp/name/file;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
                for file in ['script.json','expected.json']:
                    (temp/name/file).write_bytes(raw(name+'/'+file+'.gz'))
                output = temp/(name+'-receipt.json')
                run = subprocess.run(['node',str(REPOSITORY/'bench/gpu/replay-source-history-browser.mjs'),chrome,name,str(output)],
                    cwd=temp,capture_output=True,text=True)
                assert run.returncode == 0, run.stderr
                assert json.loads(output.read_bytes()) == read('checks/'+name+'-browser.json')
    print(f"verified {len(metadata['files'])} files, 450 private core tests, complete histories and bound browser images"
          + (' with ordinary proof replay' if ink else '') + (' and fresh browser replay' if chrome else ''))

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--ink');parser.add_argument('--chrome')
    args=parser.parse_args();audit(args.ink,args.chrome)
