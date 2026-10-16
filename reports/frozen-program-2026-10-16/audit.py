#!/usr/bin/env python3
"""Check retained integrity/consistency; optionally replay ordinary source proofs."""
import argparse
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import re
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent
def raw(name):
    data = (ROOT/name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data
def read(name): return json.loads(raw(name))
def digest(data): return hashlib.sha256(data).hexdigest()
def passed(name, count):
    log = raw(name).decode()
    assert 'test result: FAILED' not in log, name
    assert sum(map(int, re.findall(r'test result: ok\. (\d+) passed', log))) == count, name
def python_passed(name, count):
    log = raw(name).decode()
    assert re.search(rf'Ran {count} tests? in ', log) and log.rstrip().endswith('OK'), name

def archive(name, expected):
    with tarfile.open(fileobj=io.BytesIO((ROOT/name).read_bytes()), mode='r:gz') as bundle:
        entries = bundle.getmembers()
        assert all(e.isfile() and not e.name.startswith('/') and '..' not in Path(e.name).parts for e in entries)
        assert len({e.name for e in entries}) == len(entries)
        data = {e.name:bundle.extractfile(e).read() for e in entries}
    assert {name:digest(value) for name,value in data.items()} == expected
    manifest = json.loads(data['artifact.json'])
    for name, entry in manifest['files'].items():
        assert len(data[name]) == entry['bytes'] and digest(data[name]) == entry['sha256'], name
    return data

def audit(ink=None):
    metadata = read('metadata.json')
    assert set(metadata['files']) == {str(p.relative_to(ROOT)) for p in ROOT.rglob('*')
                                    if p.is_file() and p.name != 'metadata.json' and '__pycache__' not in p.parts}
    for name, expected in metadata['files'].items():
        assert digest((ROOT/name).read_bytes()) == expected, name
    package = read('core-package.json')
    core = read('checks/private-core.json')
    assert core['status'] == 'passed' and core['package'] == package['commit']
    assert core['source'] == package['source'] and core['core_tree'] == package['core_tree']
    assert core['private_checkout'] and core['private_target']
    assert digest(raw('checks/private-core.log.gz')) == core['log_sha256']
    passed('checks/private-core.log.gz', 446)
    passed('checks/javascript.log.gz', 57)
    passed('checks/hardening.log.gz', 42)
    passed('checks/final-program.log.gz', 1)
    for name, count in [('knowledge-frozen',11),('knowledge-basic',9),('knowledge-dependent',13)]:
        python_passed('checks/'+name+'.log.gz', count)
    # One batch exhausted disk while compiling Wasm. Every other case passed;
    # the sole affected test then passed after clearing owned compiler caches.
    batch = raw('checks/frozen-state.log.gz').decode()
    retry = raw('checks/startup-retry.log.gz').decode()
    failed = re.findall(r'^test (\w+) \.\.\. FAILED$', batch, re.M)
    name = 'trained_frozen_packages_start_and_preserve_remaining_capabilities_across_targets'
    assert failed == [name] and 'No space left on device' in batch
    assert 'test result: FAILED. 9 passed; 1 failed' in batch
    passed('checks/startup-retry.log.gz', 1)
    completed = set(re.findall(r'^test (\w+) \.\.\. ok$', batch+'\n'+retry, re.M))
    assert completed == set(metadata['frozen_tests']) and len(completed) == 10
    clean = read('checks/clean-compiler.json')
    assert clean['status'] == 'passed' and clean['source'] == metadata['source']
    assert clean['private_checkout'] and clean['private_target']
    assert clean['packages'] == metadata['packages']
    assert digest(raw('checks/clean-compiler.log.gz')) == clean['log_sha256']
    assert digest(raw('sources/Cargo.lock.gz')) == clean['resolution_lock_sha256']
    baseline = archive('baseline-artifact.tar.gz', metadata['artifacts']['baseline'])
    selected = archive('selected-artifact.tar.gz', metadata['artifacts']['selected'])
    previous = archive('previous-selected-artifact.tar.gz', metadata['artifacts']['previous-selected'])
    for mode, data in [('baseline',baseline),('selected',selected)]:
        for name, expected in clean['images'][mode].items():
            assert digest(data[name]) == expected, (mode,name)
    assert selected['selected.core.json'] == previous['selected.core.json']
    assert read('checks/package-execution.json') == dict(observations=144,typedInitialState=True,
        writerWithdrawn=True,exactSnapshots=True,freshInstances=True)
    expected = read('history/expected.json.gz');steps = read('history/script.json.gz')
    assert len(expected) == 144 and sum('restore' not in step for step in steps) == 144
    receipts = read('history/gpu-receipts.json.gz')
    assert len(receipts) == 144 and sum(row.get('backend') == 'gpu' for row in receipts) == 1
    for group in ['initial','final']:
        summary = read('measurements/'+group+'/summary.json')
        assert summary['processes'] == 6
        rows = [read(f'measurements/{group}/process-{i}.json') for i in range(6)]
        assert len({row['processId'] for row in rows}) == 6
        memory_ids = []
        for i,row in enumerate(rows):
            assert row['images'] == summary['images'] and row['completeChecksumsAndCheckpointsAgree']
            for phase in row['results']['baseline']['phases']:
                a,b = (row['results'][mode]['phases'][phase] for mode in ['baseline','selected'])
                assert a['checksum'] == b['checksum'] and a['checkpoint'] == b['checkpoint']
                assert summary['phases'][phase]['ratios'][i] == a['medianNs']/b['medianNs']
            a,b = (read(f'measurements/{group}/memory-{i}-{mode}.json') for mode in ['baseline','selected'])
            assert a['checksum'] == b['checksum'] and a['checkpoint'] == b['checkpoint']
            memory_ids += [a['processId'], b['processId']]
        assert len(set(memory_ids)) == 12
        for phase, stats in summary['phases'].items():
            values = [row['results']['baseline']['phases'][phase]['medianNs'] /
                      row['results']['selected']['phases'][phase]['medianNs'] for row in rows]
            assert math.isclose(stats['geometricSpeedup'], math.exp(sum(map(math.log, values))/6))
        assert summary['images']['baseline']['sourceModule'] == digest(baseline['program.mjs.source.mjs'])
        image = previous if group == 'initial' else selected
        assert summary['images']['selected']['sourceModule'] == digest(image['program.mjs.source.mjs'])
    if ink:
        with tempfile.TemporaryDirectory(prefix='ink-frozen-program-audit-') as directory:
            directory = Path(directory)
            source, packet = directory/'core.json', directory/'selection.json'
            source.write_bytes(selected['compiled.core.json']);packet.write_bytes(selected['selection.json'])
            checked = subprocess.run([str(Path(ink).resolve()), 'check-selection', str(source), str(packet)],capture_output=True,text=True)
            assert checked.returncode == 0, checked.stderr
    print(f"verified {len(metadata['files'])} bound files, clean source images, histories and paired measurements"+(' with ordinary proof replay' if ink else ''))

if __name__ == '__main__':
    parser = argparse.ArgumentParser();parser.add_argument('--ink');audit(parser.parse_args().ink)
