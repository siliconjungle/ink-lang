#!/usr/bin/env python3
"""Audit scalar GPU stages, matched measurements and clean source images."""
import argparse
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import re
import statistics
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parents[1]


def digest(data): return hashlib.sha256(data).hexdigest()
def raw(name):
    data = (ROOT / name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data
def read(name): return json.loads(raw(name))


def unpack(data):
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:') as tar:
        entries = tar.getmembers()
        assert all(e.isfile() and not e.name.startswith('/') and '..' not in Path(e.name).parts for e in entries)
        assert len(entries) == len({e.name for e in entries})
        return {e.name: tar.extractfile(e).read() for e in entries}


def run(command, **kwargs):
    result = subprocess.run(command, capture_output=True, text=True, **kwargs)
    assert result.returncode == 0, result.stdout + result.stderr


def audit(ink=None, chrome=None):
    m = read('metadata.json')
    assert set(m['files']) == {str(p.relative_to(ROOT)) for p in ROOT.rglob('*')
        if p.is_file() and p.name != 'metadata.json' and '__pycache__' not in p.parts}
    for name, expected in m['files'].items(): assert digest((ROOT/name).read_bytes()) == expected, name
    archives = {}
    for name, expected in m['archives'].items():
        files = unpack(raw(name)); archives[name] = files
        assert {n:digest(b) for n,b in files.items()} == expected
    previous_bytes = (REPOSITORY/m['previous_artifact']['path']).read_bytes()
    assert digest(previous_bytes) == m['previous_artifact']['sha256']
    previous = unpack(gzip.decompress(previous_bytes)); grouped = archives['grouped-model.tar.gz']
    for files, count, total in [(previous,851,26943249),(grouped,314,16573460)]:
        manifest = json.loads(files['artifact.json'])
        assert set(files) == set(manifest['files']) | {'artifact.json'}
        assert len(manifest['files']) == count and sum(v['bytes'] for v in manifest['files'].values()) == total
        for name, entry in manifest['files'].items():
            assert digest(files[name]) == entry['sha256'] and len(files[name]) == entry['bytes']
    for name in ['source.core.json','compiled.core.json','selected.core.json','selection.json',
                 'deployment.snapshot','model.snapshot','program/program.mjs']:
        assert previous[name] == grouped[name], name
    def helper_graphs(files):
        manifest = json.loads(files['program/manifest.json'])
        helpers = [f for f in manifest['functions'] if f['name'].startswith('__frozen_proposal_')]
        out = []
        for helper in helpers:
            if not helper['gpu']:
                out.append(None); continue
            child = json.loads(files['program/'+helper['bundle']+'manifest.json'])
            f = next(f for f in child['functions'] if f['name'] == helper['name'])
            out.append(len(f['graph']['nodes']))
        return out
    assert helper_graphs(previous) == [8,16,32,64,None,None,None]
    assert helper_graphs(grouped) == [1]*7
    image = read('checks/compiler-image.json')
    assert image['status'] == 'passed' and image['source'] == m['source'] and image['packages'] == m['packages']
    assert image['private_checkout'] and image['private_target']
    assert digest(raw('checks/compiler-image.log.gz')) == image['log_sha256']
    assert digest(raw('sources/Cargo.lock.gz')) == image['resolution_lock_sha256']
    assert len(image['webgpu_images']) == 170
    assert sum(n.endswith('.wgsl') for n in image['webgpu_images']) == 30
    for name, expected in image['webgpu_images'].items(): assert digest(grouped[name]) == expected, name
    backend = raw('checks/backend-all.log.gz').decode()
    assert 'FAILED' not in backend and sum(map(int,re.findall(r'test result: ok\. (\d+) passed',backend))) == 14
    assert 'test result: ok. 12 passed;' in raw('checks/frozen-all.log.gz').decode()
    parity = raw('checks/model-parity.log.gz').decode()
    assert parity.count('wgpu: 155 results matched; 12 GPU calls') == 3
    assert 'wgpu: 38 results matched; 38 GPU calls' in raw('checks/word-parity.log.gz').decode()
    model = read('checks/model-browser.json'); word = read('checks/word-browser.json')
    assert model['status'] == word['status'] == 'passed'
    assert model['comparisons'] == 465 and model['gpuCalls'] == 12 and model['initializedChecks'] == 6
    assert model['restoreRejections'] == 3
    assert word['comparisons'] == 114 and word['gpuCalls'] == 38
    names = ['previous64gpu','grouped64gpu','grouped512gpu','grouped512cpu','grouped512javascript']
    final = []
    for prefix in ['performance/', 'performance/contended/']:
        rows = []
        for index in range(6):
            packet = read(prefix+f'process-{index}.json.gz'); rows.append(packet)
            assert packet['pair'] == index and packet['order'] == (names if index%2 == 0 else names[::-1])
            assert packet['frames_sha256'] == digest(raw('frames.json'))
            for key, files in [('previous',previous),('grouped',grouped)]:
                assert packet['images'][key]['manifest'] == digest(files['artifact.json'])
                assert packet['images'][key]['files'] == json.loads(files['artifact.json'])['files']
            for row in packet['rows']:
                assert len(row['samples_ns']) == len(row['counters']) == 7
                assert all(v>0 for v in row['samples_ns']) and row['initialization_ns']>0
                if row['backend'] == 'gpu-required':
                    for counter in row['counters']:
                        assert counter['dispatches'] == (64 if row['name']=='previous64gpu' else 1)
                        assert counter['upload_bytes']==12 and counter['readback_bytes']==4
                        assert counter['live_buffer_bytes']==(272 if row['name']=='previous64gpu' else 20)
            a,b = [next(r for r in packet['rows'] if r['name']==n) for n in names[:2]]
            assert a['checksum'] == b['checksum']
        if prefix == 'performance/': final = rows
    def values(name): return [statistics.median(next(r for r in p['rows'] if r['name']==name)['samples_ns']) for p in final]
    summary = read('performance/summary.json')
    assert summary['pairs']==6
    for name in names: assert statistics.median(values(name))==summary['median_process_medians_ns'][name]
    ratio = math.exp(statistics.mean(math.log(a/b) for a,b in zip(values(names[0]),values(names[1]))))
    assert math.isclose(ratio,summary['paired_gpu64_speedup'])
    with tempfile.TemporaryDirectory(prefix='ink-scalar-gpu-audit-') as folder:
        folder=Path(folder)
        for name,files in [('grouped',grouped),('model-history',archives['model-history.tar.gz']),('word-history',archives['word-history.tar.gz'])]:
            for path,data in files.items():
                out=folder/name/path;out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(data)
        if ink: run([str(Path(ink).resolve()),'verify-model',str(folder/'grouped'),'--replay'])
        if chrome:
            for history, expected, extra in [('model-history',model,['--initialized','grouped']),('word-history',word,[])]:
                output=folder/(history+'.json')
                run(['node',str(REPOSITORY/'bench/gpu/replay-source-history-browser.mjs'),str(Path(chrome).resolve()),history,str(output),*extra],cwd=folder)
                assert json.loads(output.read_bytes()) == expected
    print('Verified scalar stage counts, exact image/proof bindings, 12 paired processes and actual GPU histories'
          + (' with fresh proof/training replay' if ink else '') + (' and browser execution' if chrome else ''))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--ink');parser.add_argument('--chrome')
    args=parser.parse_args();audit(args.ink,args.chrome)
