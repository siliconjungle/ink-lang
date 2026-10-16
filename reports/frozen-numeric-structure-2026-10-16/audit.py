#!/usr/bin/env python3
"""Artifact integrity/consistency, optionally ordinary source-proof replay."""
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

ROOT=Path(__file__).resolve().parent
def raw(name):
    data=(ROOT/name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data
def read(name): return json.loads(raw(name))
def passed(name,count):
    log=raw(name).decode()
    assert 'test result: FAILED' not in log
    assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',log)))==count,name

def audit(ink=None):
    metadata=read('metadata.json')
    for name,digest in metadata['files'].items():
        assert hashlib.sha256((ROOT/name).read_bytes()).hexdigest()==digest,name
    core=read('core-package.json');private=read('checks/private-core.json')
    assert private['status']=='passed' and private['package']==core['commit']
    assert private['source']==core['source'] and private['core_tree']==core['core_tree']
    assert private['private_checkout'] is True and private['private_target'] is True
    assert hashlib.sha256(raw('checks/private-core.log.gz')).hexdigest()==private['log_sha256']
    passed('checks/private-core.log.gz',442)
    passed('checks/javascript.log.gz',56)
    passed('checks/frozen-state-all.log.gz',9)
    passed('checks/hardening.log.gz',42)
    passed('checks/final-numeric.log.gz',1)
    for name,count in [('knowledge-frozen',7),('knowledge-hygiene',4),('knowledge-dependent',18)]:
        log=raw('checks/'+name+'.log.gz').decode()
        assert re.search(rf'Ran {count} tests? in ',log) and log.rstrip().endswith('OK'),name
    steps=read('history/script.json.gz');expected=read('history/expected.json.gz')
    assert len(expected)==55 and sum('restore' not in s for s in steps)==55
    receipts=read('history/gpu-receipts.json.gz')
    assert len(receipts)==55 and sum(r.get('backend')=='gpu' for r in receipts)==1
    assert read('checks/package-execution.json')==dict(observations=55,typedInitialState=True,
        writerWithdrawn=True,exactSnapshots=True,freshInstances=True)
    assert read('checks/cli-image.json')['release_matches_debug'] is True
    for name,digest in metadata['cores'].items():
        assert hashlib.sha256(raw(name+'.core.json.gz')).hexdigest()==digest,name
    with tarfile.open(fileobj=io.BytesIO((ROOT/'javascript-artifact.tar.gz').read_bytes()),mode='r:gz') as bundle:
        members=bundle.getmembers()
        assert all(m.isfile() and not m.name.startswith('/') and '..' not in Path(m.name).parts for m in members)
        data={m.name:bundle.extractfile(m).read() for m in members}
        assert {k:hashlib.sha256(v).hexdigest() for k,v in data.items()}==metadata['artifact_files']
        artifact=json.loads(data['artifact.json'])
        for name,entry in artifact['files'].items():
            assert len(data[name])==entry['bytes'] and hashlib.sha256(data[name]).hexdigest()==entry['sha256'],name
    if ink:
        with tempfile.TemporaryDirectory(prefix='ink-frozen-numeric-audit-') as directory:
            directory=Path(directory);source=directory/'core.json';packet=directory/'selection.json'
            source.write_bytes(raw('compiled.core.json.gz'));packet.write_bytes(raw('selection.json.gz'))
            checked=subprocess.run([str(Path(ink).resolve()),'check-selection',str(source),str(packet)],capture_output=True,text=True)
            assert checked.returncode==0,checked.stderr
    print(f"verified {len(metadata['files'])} bound files, standalone core, complete histories and package"+(' with source-proof replay' if ink else ''))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--ink');audit(parser.parse_args().ink)
