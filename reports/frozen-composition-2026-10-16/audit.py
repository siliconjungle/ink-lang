#!/usr/bin/env python3
"""Audit retained composition proofs, complete histories and paired measurements."""
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
    assert sum(map(int, re.findall(r'test result: ok\. (\d+) passed', log))) == count, name
def run(command, **kwargs):
    result = subprocess.run(command, capture_output=True, text=True, **kwargs)
    assert result.returncode == 0, result.stderr + result.stdout
def gm(values): return math.exp(statistics.mean(map(math.log, values)))

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
    passed('checks/private-core.log.gz', 458)
    passed('checks/frozen-state.log.gz', 12)
    for name, count in [('rust',20),('javascript',57),('gpu',12)]:
        passed('checks/packages/'+name+'.log.gz', count)
    for name, count in [('frozen',18),('closed-data',5),('float-laws',3),('composition',3)]:
        log = raw('checks/knowledge/'+name+'.log.gz').decode()
        assert re.search(r'Ran '+str(count)+r' tests in ', log) and log.rstrip().endswith('OK'), name
    assert 'overflowed its stack' in raw('negative-controls/linear-stack.log.gz').decode()
    clean = read('checks/compiler-image.json')
    assert clean['status'] == 'passed' and clean['source'] == metadata['source']
    assert clean['packages'] == metadata['packages'] and clean['private_checkout'] and clean['private_target']
    assert clean['fixture'] == dict(program='examples/frozen-program.ink',
        trace='examples/frozen-program-long-training.json', freeze_roots='Structure', composition=True)
    assert digest(raw('checks/compiler-image.log.gz')) == clean['log_sha256']
    assert digest(raw('sources/Cargo.lock.gz')) == clean['resolution_lock_sha256']
    baseline = bundle('baseline-package.tar.gz', metadata['archives']['baseline-package'])
    manifest = json.loads(baseline['artifact.json'])
    assert set(baseline) == set(manifest['files']) | {'artifact.json'}
    for name, entry in manifest['files'].items():
        assert len(baseline[name]) == entry['bytes'] and digest(baseline[name]) == entry['sha256']
    for name, expected in clean['images']['baseline'].items():
        assert digest(baseline[name]) == expected
    images = {}
    for count, helpers in [('32',7),('128',31)]:
        plan = read(count+'/plan.json.gz')
        assert [s['kind'] for s in plan['steps']] == ['extension','rewrite']
        extension = plan['steps'][0]['package']
        functions = extension['knowledge']['objects'][extension['extension']]['payload']['functions']
        assert len(functions) == helpers
        names = {f['name'] for f in functions}
        def calls(term):
            if isinstance(term, dict):
                invocation = term.get('Call')
                result = {invocation[0]} if isinstance(invocation,list) and invocation[0] in names else set()
                return result | set().union(*(calls(x) for x in term.values()))
            if isinstance(term, list):
                return set().union(*(calls(x) for x in term)) if term else set()
            return set()
        graph = {f['name']:calls(f['body']) for f in functions}
        def depth(name, active=frozenset()):
            assert name not in active
            return 1+max((depth(n,active|{name}) for n in graph[name]), default=0)
        assert max(map(depth,names)) == (3 if count=='32' else 5)
        assert digest(raw(count+'/input.core.json')) == plan['input_core_sha256']
        selected = read(count+'/selected.core.json')
        assert selected == plan['steps'][1]['package']['action_replacement']['selected']
        if count == '128':
            c = clean['composition']
            assert digest(raw(count+'/plan.json.gz')) == c['plan_sha256']
            assert digest(raw(count+'/selected.core.json')) == c['selected_core_sha256']
            assert digest(raw(count+'/input.core.json')) == c['input_core_sha256']
            assert raw(count+'/input.core.json') == baseline['compiled.core.json']
        steps, expected = read(count+'/script.json.gz'), read(count+'/expected.json.gz')
        assert len(expected)==144 and sum('call' in s or 'pure' in s for s in steps)==144
        assert sum('restore' in s for s in steps)==2 and sum('reject_restore' in s for s in steps)==1
        native = read(count+'/native-gpu-receipts.json.gz')
        assert len(native)==144 and sum(r.get('backend')=='gpu' for r in native)==1
        browser = read('checks/browser-'+count+'.json')
        assert browser['status']=='passed' and browser['comparisons']==432
        assert browser['gpuCalls']==1 and browser['restores']==6 and browser['restoreRejections']==3
        images[count] = bundle(count+'-browser.tar.gz', metadata['archives'][count+'-browser'])
        measured = {name: raw('performance/'+count+'/'+filename) for name, filename in
            [('baseline','baseline.mjs.gz'),('selected','program.mjs.gz')]}
        assert images[count]['gpu-module/program.mjs'] == measured['selected']
        if count=='128':
            assert digest(measured['selected'])==clean['composition']['javascript_sha256']
            assert measured['baseline']==baseline['program.mjs.source.mjs']
        rows = [read('performance/'+count+f'/process-{i}.json') for i in range(6)]
        for index, row in enumerate(rows):
            assert row['order']==(['baseline','selected'] if index%2==0 else ['selected','baseline'])
            assert row['readsPerSample']==25000 and row['samples']==5 and row['warmupReads']==2500
            assert row['completeChecksumsAndCheckpointsAgree']
            assert row['seed']==digest(raw(count+'/initial.snapshot'))
            for name in measured:
                assert row['images'][name]==dict(module=digest(measured[name]),bytes=len(measured[name]))
            for stride in ['0','1','16','256']:
                b,s=[row['results'][name]['phases'][stride] for name in ['baseline','selected']]
                assert b['sums']==s['sums'] and b['snapshot']==s['snapshot']
                for phase in [b,s]:
                    assert len(phase['nsPerRequest'])==5 and all(x>0 for x in phase['nsPerRequest'])
                    assert statistics.median(phase['nsPerRequest'])==phase['medianNs']
        summary = read('performance/summary.json')[count]
        for stride, expected in summary.items():
            values = {n:[r['results'][n]['phases'][stride]['medianNs'] for r in rows] for n in measured}
            ratios = [b/s for b,s in zip(values['baseline'],values['selected'])]
            actual = dict(baselineNs=gm(values['baseline']), selectedNs=gm(values['selected']), speedup=gm(ratios))
            for name,value in actual.items():
                assert math.isclose(value,expected[name],rel_tol=1e-12)
            assert expected['pairedRange']==[min(ratios),max(ratios)]
    with tempfile.TemporaryDirectory(prefix='ink-composition-audit-') as folder:
        folder=Path(folder)
        if ink:
            ink=str(Path(ink).resolve())
            for count in ['32','128']:
                packet=folder/(count+'.json');packet.write_bytes(raw(count+'/plan.json.gz'))
                run([ink,'check-plan',str(ROOT/count/'input.core.json'),str(packet),'--core'])
        if chrome:
            for count in ['32','128']:
                for name,data in images[count].items():
                    p=folder/count/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
                for name in ['script.json','expected.json']:
                    (folder/count/name).write_bytes(raw(count+'/'+name+'.gz'))
                receipt=folder/(count+'.json')
                run(['node',str(REPOSITORY/'bench/gpu/replay-source-history-browser.mjs'),
                    str(Path(chrome).resolve()),count,str(receipt)],cwd=folder)
                assert json.loads(receipt.read_bytes())==read('checks/browser-'+count+'.json')
    print(f"verified {len(metadata['files'])} bound files, 458 private core tests, complete histories and 12 paired processes"
        + (' with ordinary plan replay' if ink else '') + (' and fresh browser replay' if chrome else ''))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--ink');parser.add_argument('--chrome')
    args=parser.parse_args();audit(args.ink,args.chrome)
