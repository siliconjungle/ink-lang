#!/usr/bin/env python3
"""Audit retained literal-emission observations; no semantic/profitability proof."""
import hashlib,json,math,re,statistics as st,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

def observations():
    runs=[json.loads((ROOT/f'layout-{i}.json').read_text())for i in range(3)]
    summary={}
    for size in [8,64,512]:
        def lane(j,name):return st.median(x['ns_per_call']for x in j['records']if x['size']==size and x['name']==name)
        names=['before_prepared','current_prepared','before_ordinary','current_ordinary','pretext']
        row={name:st.median(lane(j,name)for j in runs)for name in names}
        row['paired_gain']=st.median(lane(j,'before_prepared')/lane(j,'current_prepared')for j in runs)
        summary[str(size)]=row
    return runs,summary

def audit():
    runs,summary=observations();meta=json.loads((ROOT/'metadata.json').read_text())
    assert json.loads((ROOT/'summary.json').read_text())==summary
    files={str(p.relative_to(ROOT))for p in ROOT.rglob('*')if p.is_file()and p.name!='metadata.json'}
    assert files==set(meta['files'])
    for name,want in meta['files'].items():
        p=Path(name);assert not p.is_absolute()and '..'not in p.parts
        p=ROOT/p;assert not p.is_symlink()and sha(p)==want,str(p)
    previous=ROOT.parent/'prepared-loops-2026-10-16'
    assert sha(previous/'text.core.json')==meta['core_sha256']
    assert sha(previous/'text-current.mjs')==meta['previous_sha256']
    expected={(size,lane,sample)for size in [8,64,512]for lane in ['before_prepared','current_prepared','before_ordinary','current_ordinary','pretext']for sample in range(9)}
    for run in runs:
        assert len(run['records'])==len(expected)
        assert {(x['size'],x['name'],x['sample'])for x in run['records']}==expected
        assert all(x['calls']==32 and math.isfinite(x['ns_per_call'])and x['ns_per_call']>0 for x in run['records'])
        assert run['sources']['before']['sha256']==meta['previous_sha256']
        assert run['sources']['current']['sha256']==sha(ROOT/'current.mjs')
        assert run['sources']['upstream']['sha256']==meta['pretext_javascript_sha256']
        assert all(x['source_core']==meta['core_sha256']for x in run['setup'])
    full=(ROOT/'javascript-full.log').read_text()
    assert 'FAILED'not in full and sum(map(int,re.findall(r'test result: ok\. (\d+) passed',full)))==50
    assert '2210 binary64 constants retain exact bits'in (ROOT/'literal-regression.log').read_text()
    assert '4 passed; 0 failed'in (ROOT/'binary64-final.log').read_text()
    assert '3 passed; 0 failed'in (ROOT/'text-final.log').read_text()
    assert '182 results matched; 1 GPU calls'in (ROOT/'text-final.log').read_text()
    print('Binary64 literal bindings, complete record coverage, results and summaries passed.')

if __name__=='__main__':
    if sys.argv[1:]==['--write-summary']:(ROOT/'summary.json').write_text(json.dumps(observations()[1],indent=2)+'\n')
    else:audit()
