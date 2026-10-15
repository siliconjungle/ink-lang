#!/usr/bin/env python3
"""Retained observation ledger; neither a backend proof nor selection evidence."""
import hashlib, json, math, re, statistics as st
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def summary():
    runs = [json.loads((ROOT / f'layout/{i}.json').read_text()) for i in range(3)]
    rows = {}
    for size in [8, 64, 512]:
        lane = lambda j, n: st.median(r['ns_per_call'] for r in j['records'] if r['size'] == size and r['name'] == n)
        names = ['before_prepared', 'current_prepared', 'before_ordinary', 'current_ordinary', 'pretext']
        rows[str(size)] = {n: st.median(lane(j, n) for j in runs) for n in names}
        rows[str(size)]['paired_prepared_gain'] = st.median(lane(j, 'before_prepared') / lane(j, 'current_prepared') for j in runs)
    return rows

def audit():
    meta = json.loads((ROOT / 'metadata.json').read_text())
    actual = {str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file() and p.name != 'metadata.json'}
    assert actual == set(meta['files'])
    for name, want in meta['files'].items():
        p = Path(name)
        assert not p.is_absolute() and '..' not in p.parts
        p = ROOT / p
        assert not p.is_symlink() and sha(p) == want, name
    assert json.loads((ROOT / 'summary.json').read_text()) == summary()
    baselines = ROOT.parent / 'prepared-loops-2026-10-16'
    for kind in ['model', 'workloads', 'text']:
        assert sha(baselines / f'{kind}.core.json') == meta['cores'][kind]
        receipt = json.loads((ROOT / f'{kind}.receipt.json').read_text())
        assert receipt['core_sha256'] == meta['cores'][kind]
        assert receipt['javascript_sha256'] == sha(ROOT / f'{kind}.mjs')
        assert receipt['bytes'] == (ROOT / f'{kind}.mjs').stat().st_size
        assert receipt['javascript_package'] == meta['packages']['javascript']
    for i in range(3):
        j = json.loads((ROOT / f'layout/{i}.json').read_text())
        expected = {(s, n, k) for s in [8, 64, 512] for n in ['before_prepared', 'current_prepared', 'before_ordinary', 'current_ordinary', 'pretext'] for k in range(9)}
        assert len(j['records']) == len(expected)
        assert {(r['size'], r['name'], r['sample']) for r in j['records']} == expected
        assert all(r['calls'] == 32 and math.isfinite(r['ns_per_call']) and r['ns_per_call'] > 0 for r in j['records'])
        assert j['sources']['before']['sha256'] == sha(ROOT.parent / 'binary64-literals-2026-10-16/current.mjs')
        assert j['sources']['current']['sha256'] == sha(ROOT / 'text.mjs')
        assert j['sources']['upstream']['sha256'] == meta['upstream']['pretext_javascript_sha256']
        assert all(s['source_core'] == meta['cores']['text'] for s in j['setup'])
    j = json.loads((ROOT / 'loops/development-0.json').read_text())
    assert j['seed'] == 73129
    expected = {(s, t, n, k) for s in [16, 128, 512] for t in ['membership', 'aggregates', 'numeric'] for n in ['before_prepared', 'current_prepared', 'before_ordinary', 'current_ordinary', 'direct_prepared'] for k in range(11)}
    assert len(j['records']) == len(expected)
    assert {(r['size'], r['task'], r['name'], r['sample']) for r in j['records']} == expected
    assert j['sources']['before']['sha256'] == sha(baselines / 'workloads-current.mjs')
    assert j['sources']['current']['sha256'] == sha(ROOT / 'workloads.mjs')
    models = [json.loads((ROOT / f'models/development-0-{a}.json').read_text()) for a in ['previous', 'current']]
    assert len({j['corpus_sha256'] for j in models}) == len({j['oracle_sha256'] for j in models}) == 1
    for a, j in zip(['previous', 'current'], models):
        assert j['seed'] == 72131 and j['source_core'] == meta['cores']['model']
        assert j['upstream_sha256'] == meta['upstream']['handwired_source_sha256']
        expected = {(t, n, k) for t in ['predict', 'derivatives'] for n in [a+'_ordinary', a+'_prepared', 'handwired', 'handwired_ranges', 'direct_graph', 'dense_predict'] if t == 'predict' or n != 'dense_predict' for k in range(11)}
        assert len(j['records']) == len(expected)
        assert {(r['task'], r['name'], r['sample']) for r in j['records']} == expected
        assert j['sources'][a]['sha256'] == sha(baselines / 'model-current.mjs' if a == 'previous' else ROOT / 'model.mjs')
    for name, count in [('javascript-full.log', 51), ('gpu-full.log', 10), ('runtime-full.log', 8)]:
        log = (ROOT / name).read_text()
        assert 'FAILED' not in log and sum(map(int, re.findall(r'test result: ok\. (\d+) passed', log))) == count
    assert '2160 binary64 alias/snapshot cases' in (ROOT / 'regression.log').read_text()
    assert '3 passed; 0 failed' in (ROOT / 'text-conformance.log').read_text()
    assert '182 results matched; 1 GPU calls' in (ROOT / 'text-conformance.log').read_text()
    log = (ROOT / 'model-conformance.log').read_text()
    assert '4 passed; 0 failed' in log and '2 passed; 0 failed' in log
    assert '35 results matched; 1 GPU calls' in log and '25 results matched; 1 GPU calls' in log
    for name, count, restores, errors in [('learning', 105, 9, 6), ('terminal', 75, 0, 24)]:
        receipt = json.loads((ROOT / f'browser-{name}.json').read_text())
        assert receipt['status'] == 'passed' and receipt['comparisons'] == count
        assert receipt['gpuCalls'] == 1 and receipt['restores'] == restores and receipt['requiredErrors'] == errors
        assert {r['backend'] for r in receipt['results']} == {'javascript', 'cpu', 'gpu'}
    print('Immutable binding ledger, complete diagnostic coverage and conformance logs passed.')

if __name__ == '__main__':
    import sys
    if sys.argv[1:] == ['--write-summary']:
        (ROOT / 'summary.json').write_text(json.dumps(summary(), indent=2)+'\n')
    else: audit()
