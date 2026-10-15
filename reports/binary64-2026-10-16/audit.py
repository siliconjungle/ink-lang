#!/usr/bin/env python3
"""Audit retained local evidence. This does not replay or prove compiler semantics."""
import hashlib,json,re
from pathlib import Path

root=Path(__file__).resolve().parent
read=lambda name:json.loads((root/name).read_text())
sha=lambda path:hashlib.sha256(path.read_bytes()).hexdigest()
metadata=read('metadata.json')
assert metadata['schema']==1 and len(metadata['files'])<=4096
total=0
for name,expected in metadata['files'].items():
    path=Path(name)
    assert not path.is_absolute() and '..'not in path.parts and re.fullmatch('[0-9a-f]{64}',expected)
    path=root/path
    assert not path.is_symlink() and path.resolve().is_relative_to(root) and path.is_file()
    total+=path.stat().st_size
    assert total<=64*1024*1024 and sha(path)==expected,name
core=read('source.core.json');actions=read('source.actions.json');receipt=read('cli-actions-receipt.json')
assert core['semantics']=='ink-executable-core-v15'
assert actions['semantics']==receipt['semantics']=='ink-typed-actions-v4'
assert actions['source']==receipt['source']==sha(root/'source.core.json')==metadata['source_core']
assert receipt['actions_sha256']==sha(root/'source.actions.json')
package=read('core-package.json');private=read('private-core-validation.json')
assert private['status']=='passed' and private['private_checkout'] and private['private_target']
assert private['package']==package['commit'] and private['source']==package['source'] and private['core_tree']==package['core_tree']
assert private['log_sha256']==sha(root/'private-core-validation.log')
assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed;', (root/'private-core-validation.log').read_text())))==420
comparison=json.loads((root/'float64-published-compat-audit.log').read_text().splitlines()[-1])
assert comparison['failures']==[] and comparison['old_valid_modules']==247 and comparison['old_valid_law_sources']==45
assert comparison['old_invalid_modules']==674 and comparison['fragments']==921
assert comparison['published_source_bytes_match'] and comparison['published_source_core']==metadata['source_core']
for directory,count in [('',65),('frozen/',3)]:
    expected=read(directory+'expected.json');actual=read(directory+'gpu-receipts.json')
    assert len(expected)==len(actual)==count
    assert (root/(directory+'gpu-final.snapshot')).read_bytes()==bytes(expected[-1]['snapshot'])
    device=[v for v in actual if v.get('backend')=='gpu']
    assert len(device)==1 and device[0]['counters']['dispatches']>0
    assert all(v['backend']=='cpu' for v in actual if 'backend'in v and v is not device[0])
assert 'frozen'in (root/'frozen/gpu-invalid-restore-1.log').read_text()
for name,entry in read('local-validation.json').items():
    if name.endswith('.log'):
        log=(root/name).read_text()
        assert 'FAILED'not in log
        assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed;',log)))==entry['passed_tests']
print(json.dumps({'status':'passed','files':len(metadata['files']),'bytes':total,'source_core':metadata['source_core'],
                  'scope':'Retained bytes, checked transport identity, isolated-core receipt, compatibility counts and actual GPU/final-snapshot observations. No replay, authenticity or whole-compiler proof.'}))
