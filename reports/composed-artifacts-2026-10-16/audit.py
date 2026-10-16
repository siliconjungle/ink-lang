#!/usr/bin/env python3
"""Check retained initialized artifacts and optionally replay proofs/browser state."""
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
    data=(ROOT/name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data
def read(name): return json.loads(raw(name))
def archive(name):
    with tarfile.open(fileobj=io.BytesIO(raw(name)),mode='r:') as tar:
        entries=tar.getmembers()
        assert all(e.isfile() and not e.name.startswith('/') and '..' not in Path(e.name).parts for e in entries)
        assert len(entries)==len({e.name for e in entries})
        return {e.name:tar.extractfile(e).read() for e in entries}
def run(command,**kwargs):
    result=subprocess.run(command,capture_output=True,text=True,**kwargs)
    assert result.returncode==0,result.stdout+result.stderr

def audit(ink=None,chrome=None):
    m=read('metadata.json')
    assert set(m['files'])=={str(p.relative_to(ROOT)) for p in ROOT.rglob('*')
        if p.is_file() and p.name!='metadata.json' and '__pycache__' not in p.parts}
    for name,expected in m['files'].items(): assert digest((ROOT/name).read_bytes())==expected,name
    tests=raw('checks/trained-build.log.gz').decode()
    assert re.search(r'test result: ok\. 6 passed;',tests) and 'FAILED' not in tests
    final=raw('checks/final-composed.log.gz').decode()
    assert re.search(r'test result: ok\. 1 passed;',final) and 'FAILED' not in final
    knowledge=raw('checks/knowledge.log.gz').decode()
    assert 'Ran 18 tests' in knowledge and knowledge.rstrip().endswith('OK')
    clean=read('checks/compiler-image.json')
    assert clean['status']=='passed' and clean['source']==m['source'] and clean['packages']==m['packages']
    assert clean['private_checkout'] and clean['private_target']
    assert clean['fixture']==dict(program='examples/frozen-program.ink',
        trace='examples/frozen-program-long-training.json',freeze_roots='Structure')
    assert digest(raw('checks/compiler-image.log.gz'))==clean['log_sha256']
    assert digest(raw('sources/Cargo.lock.gz'))==clean['resolution_lock_sha256']
    baseline=archive('artifacts/baseline.tar.gz')
    assert {n:digest(b) for n,b in baseline.items()}==m['artifacts']['baseline']
    baseline_manifest=json.loads(baseline['artifact.json'])
    assert set(baseline)==set(baseline_manifest['files'])|{'artifact.json'}
    for name,entry in baseline_manifest['files'].items():
        assert len(baseline[name])==entry['bytes'] and digest(baseline[name])==entry['sha256']
    for name,expected in clean['images']['baseline'].items(): assert digest(baseline[name])==expected,name
    artifacts={}
    for target in ['javascript','native','rust','wasm32','webgpu']:
        files=archive('artifacts/'+target+'.tar.gz');artifacts[target]=files
        manifest=json.loads(files['artifact.json'])
        assert manifest['target']==target and manifest['mode']=='frozen'
        assert set(files)==set(manifest['files'])|{'artifact.json'}
        assert {n:digest(b) for n,b in files.items()}==m['artifacts'][target]
        for name,entry in manifest['files'].items():
            assert len(files[name])==entry['bytes'] and digest(files[name])==entry['sha256']
        packet=json.loads(files['selection.json'])
        assert packet['semantics']=='ink-compiled-plan-v1'
        assert [s['kind'] for s in packet['steps']]==['extension','rewrite']
        assert set(packet['steps'][1]['package']['action_replacement']['proofs'])=={'retune','serve','set_live'}
        assert manifest['specialization']['plan_sha256']==m['plan_sha256']
        assert digest(files['deployment.snapshot'])==manifest['startup_snapshot_sha256']
        assert manifest['selected_core_sha256']==m['selected_core_sha256']
        assert files['selected.core.json']==artifacts['javascript']['selected.core.json']
        assert files['selection.json']==artifacts['javascript']['selection.json']
        if target=='javascript':
            for name,expected in clean['images']['selected'].items(): assert digest(files[name])==expected,name
        if target=='webgpu':
            assert files['program/cpu/compiled_state.wasm'].startswith(b'\0asm')
            for name in files:
                if name.startswith('program/gpu/') and name.endswith('/manifest.json'):
                    prefix=name[:-len('manifest.json')]
                    if prefix+'cpu/Cargo.toml' in files: assert files[prefix+'cpu.wasm'].startswith(b'\0asm')
    history=archive('history.tar.gz')
    expected=json.loads(history['expected.json']);steps=json.loads(history['script.json'])
    assert len(expected)==144
    continuation=read('continuation-cases.json.gz')
    assert len(continuation['cases'])==143 and continuation['invalid']==steps[1]['reject_restore']
    for case,row in zip(continuation['cases'],expected):
        assert case['outcome']==row['reply']['outcome'] and case['snapshot']==row['snapshot']
    assert digest(artifacts['javascript']['program.mjs.source.mjs'])==m['measured_javascript_sha256']
    browser=read('checks/browser.json')
    assert browser['status']=='passed' and browser['comparisons']==432
    assert browser['restores']==6 and browser['restoreRejections']==3 and browser['initializedChecks']==6
    assert browser['gpuCalls']==1
    with tempfile.TemporaryDirectory(prefix='ink-composed-artifact-audit-') as temporary:
        temporary=Path(temporary)
        for target,files in artifacts.items():
            for name,data in files.items():
                path=temporary/target/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
            if ink: run([str(Path(ink).resolve()),'verify-model',str(temporary/target),'--replay'])
        if chrome:
            for name,data in history.items():
                path=temporary/'history'/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
            run(['node',str(REPOSITORY/'bench/gpu/replay-source-history-browser.mjs'),
                str(Path(chrome).resolve()),'history',str(temporary/'browser.json'),'--initialized','webgpu'],cwd=temporary)
            assert json.loads((temporary/'browser.json').read_bytes())==browser
    print('Verified five complete artifact inventories, committed compiler images and initialized browser history'
        +(' with proof/training replay' if ink else '')+(' and fresh browser replay' if chrome else ''))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--ink');parser.add_argument('--chrome')
    args=parser.parse_args();audit(args.ink,args.chrome)
