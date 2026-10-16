#!/usr/bin/env python3
"""Retained observation/source bindings; never proof or authenticity authority."""
import gzip,hashlib,json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
def digest(data):return hashlib.sha256(data).hexdigest()
def read(name):
    data=(ROOT/name).read_bytes()
    return json.loads(gzip.decompress(data)if name.endswith('.gz')else data)

def main():
    metadata=read('metadata.json')
    for name,want in metadata['files'].items():
        path=Path(name)
        assert not path.is_absolute()and '..'not in path.parts
        file=ROOT/path
        assert file.is_file()and not file.is_symlink()
        assert digest(file.read_bytes())==want,name
    identity=digest((ROOT/'source.core.json').read_bytes())
    assert read('source.core.json')['semantics']=='ink-executable-core-v15'
    assert identity==read('source-check.json')['core_sha256']==read('source.capture.json')['core_sha256']
    for row in read('source.capture.json')['files']:
        assert digest(row['source'].encode())==row['sha256']
    oracle=read('oracle.json.gz')
    assert oracle['revision']=='0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8'
    assert len(oracle['cases'])==1680
    assert sum(4+len(case['continuations'])for case in oracle['cases'])==13001
    for kind,count in [('geometry',13002),('lifecycle',53)]:
        script=read(kind+'-script.json.gz');expected=read(kind+'-expected.json.gz');receipts=read(kind+'-gpu-receipts.json.gz')
        assert sum('restore'not in step for step in script)==len(expected)==len(receipts)==count
        assert sum(step.get('expect_gpu',False)for step in script)==1
        assert sum(row.get('backend')=='gpu'for row in receipts)==1
        assert bytes(expected[-1]['snapshot'])==(ROOT/(kind+'-gpu-final.snapshot')).read_bytes()
    log=(ROOT/'cross-target.log').read_text()
    assert '3 passed; 0 failed'in log and '13002 results matched; 1 GPU calls'in log
    assert '13002 values/outcomes and exact snapshots matched'in log
    log=(ROOT/'lifecycle-errors.log').read_text()
    assert '1 passed; 0 failed'in log and '53 results matched; 1 GPU calls'in log
    assert '53 values/outcomes and exact snapshots matched'in log
    log=(ROOT/'planner-unit-tests.log').read_text()
    assert 'Ran 343 tests'in log and log.rstrip().endswith('OK')
    browser=read('browser.json')
    assert browser['status']=='passed'and browser['comparisons']==159 and browser['restores']==36
    assert browser['gpuCalls']==1 and browser['requiredErrors']==4
    assert browser['results']==[dict(backend=name,observations=53)for name in ['javascript','cpu','gpu']]
    module=digest(gzip.decompress((ROOT/'current.mjs.gz').read_bytes()))
    for rotation in range(3):
        timing=read(f'timing-{rotation}.json')
        assert timing['rotation']==rotation and timing['sources']['ink']['sha256']==module
        assert all(row['source_core']==identity for row in timing['setup'])
        assert len(timing['records'])==3*3*3*15
        assert {row['name']for row in timing['records']}=={'pretext','ordinary','prepared'}
        assert all(row['calls']==128 for row in timing['records'])
    print(json.dumps(dict(status='passed',oracle_cases=1680,geometry_observations=13002,lifecycle_observations=53,
        scope='Retained source/observation bindings; no correctness, authenticity, browser accuracy or profitability proof.')))
if __name__=='__main__':main()
