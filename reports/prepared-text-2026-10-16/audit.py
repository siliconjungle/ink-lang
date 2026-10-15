#!/usr/bin/env python3
"""Retained observation bindings, not correctness or authenticity proofs."""
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent
def digest(data): return hashlib.sha256(data).hexdigest()
def read(name): return json.loads((ROOT/name).read_text())
def main():
    manifest=read('metadata.json')
    for name,want in manifest['files'].items():
        p=Path(name)
        assert not p.is_absolute() and '..' not in p.parts
        file=ROOT/p
        assert file.is_file() and not file.is_symlink()
        assert digest(file.read_bytes())==want,name
    identity=digest((ROOT/'source.core.json').read_bytes())
    assert read('source.core.json')['semantics']=='ink-executable-core-v15'
    assert identity==manifest['core_sha256']==read('source.capture.json')['core_sha256']==read('source.receipt.json')['core_sha256']
    for source in read('source.capture.json')['files']:
        assert digest(source['source'].encode())==source['sha256']
    oracle=read('oracle.json')
    assert oracle['revision']=='0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8'
    assert len(oracle['cases'])==232
    log=(ROOT/'validation.log').read_text()
    assert '3 passed; 0 failed' in log and '182 results matched; 1 GPU calls' in log
    assert '182 values/outcomes and exact snapshots matched' in log
    expected=read('expected.json')
    assert len(expected)==182
    assert bytes(expected[-1]['snapshot'])==(ROOT/'gpu-final.snapshot').read_bytes()
    receipts=read('gpu-receipts.json')
    assert len(receipts)==182
    assert sum(r.get('backend')=='gpu' for r in receipts)==1
    timing=read('diagnostic.json')
    assert timing['sources']['current']['sha256']==digest((ROOT/'current.mjs').read_bytes())
    assert timing['sources']['before']['sha256']==digest((ROOT/'before-contracts.mjs').read_bytes())
    assert {r['size'] for r in timing['records']}=={8,64,512}
    assert len(timing['records'])==3*5*9
    assert all(s['source_core']==identity for s in timing['setup'] if s['name']=='current')
    print(json.dumps({'status':'passed','oracle_cases':232,'observations':182,'scope':'Retained observation/source bindings; no correctness, authenticity, browser accuracy or profitability proof.'}))
if __name__=='__main__': main()
