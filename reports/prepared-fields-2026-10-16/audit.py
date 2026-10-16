"""Check retained measurements/identities; observations supply no proof authority."""
import gzip,hashlib,json,re,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parent
DIST=ROOT.parents[1]
def digest(data):return hashlib.sha256(data).hexdigest()
def read(path):return json.loads((ROOT/path).read_text())
def median(rows):return statistics.median(rows)
def analyse():
    manifest=read('metadata.json')
    actual={str(p.relative_to(ROOT)) for p in ROOT.rglob('*') if p.is_file() and p.name!='metadata.json'}
    assert actual==set(manifest['files'])
    for name,want in manifest['files'].items():
        p=Path(name);assert not p.is_absolute() and '..'not in p.parts
        assert digest((ROOT/p).read_bytes())==want,name
    for name,want in manifest['retained_inputs'].items():
        p=Path(name);assert not p.is_absolute() and '..'not in p.parts
        assert digest((DIST/p).read_bytes())==want,name
    module={lane:gzip.decompress((ROOT/f'workloads-{lane}.mjs.gz').read_bytes()) for lane in ['before','current']}
    runs=[read(f'timings/{i}.json') for i in range(3)]
    short=[read(f'short-warmup/{i}.json') for i in range(3)]
    summary={'workloads':[],'complex_text':[],'memory':{},'scope':'Pooled medians of matched observations. Empirical diagnostics, not portable guarantees or automatic selection evidence.'}
    for docs,warmup in [(runs,128),(short,12)]:
        assert {d['seed'] for d in docs}=={19,71,991}
        for d in docs:
            assert d.get('warmup_rounds',12)==warmup
            assert len(d['records'])==495 and len(d['corpora'])==3
            assert all(d['sources'][lane]['sha256']==digest(module[lane]) for lane in module)
            assert all(s['source_core']==digest((ROOT/'workloads.core.json').read_bytes()) for s in d['setup'] if s['name'] in module)
            assert all(r['ns_per_call']>0 and r['calls']==96 for r in d['records'])
    for size in [16,128,512]:
        for task in ['membership','aggregates','numeric']:
            values={lane:median(r['ns_per_call'] for d in runs for r in d['records'] if r['size']==size and r['task']==task and r['name']==lane)
                for lane in ['before_ordinary','before_prepared','current_ordinary','current_prepared','direct_prepared']}
            summary['workloads'].append(dict(size=size,task=task,ns=values,prepared_before_over_current=values['before_prepared']/values['current_prepared']))
    complex_bytes=gzip.decompress((ROOT/'complex-current.mjs.gz').read_bytes())
    prior=gzip.decompress((DIST/'reports/prepared-complex-text-2026-10-16/current.mjs.gz').read_bytes())
    for size in [8,64,512]:
        for engine in ['blink','gecko','webkit']:
            values={}
            for revision,source in [('baseline',prior),('current',complex_bytes)]:
                docs=[read(f'complex-timings/{revision}-{i}.json') for i in range(3)]
                for d in docs:
                    assert d['sources']['ink']['sha256']==digest(source)
                    assert d['warmupRounds']==128 and d['samples']==15 and d['calls']==128
                    assert len(d['records'])==405
                values[revision]={lane:median(r['ns_per_call'] for d in docs for r in d['records'] if r['size']==size and r['engine']==engine and r['name']==lane) for lane in ['ordinary','prepared','pretext']}
            summary['complex_text'].append(dict(size=size,engine=engine,ns=values,prepared_before_over_current=values['baseline']['prepared']/values['current']['prepared'],current_over_pretext=values['current']['prepared']/values['current']['pretext']))
    for lane in module:
        d=read(f'memory/{lane}.json');assert d['module_sha256']==digest(module[lane])
        summary['memory'][lane]={'module_bytes':len(module[lane]),'heap_after_calls':d['phases']['after_100']['heapUsed'],'rss_after_calls':d['phases']['after_100']['rss'],'import_ms':d['import_ms'],'token_ms':d['token_ms'],'first_one_ms':d['first_one_ms']}
    text=read('checks/complete-text.json');assert (text['referenceObservations'],text['ordinary'],text['prepared'])==(13002,13002,52008)
    assert text['source_core']=='1fabac22e4632a067b9cd5c99f8d85805502a66fa6e29083b3e093e3f913a42d'
    neural=read('checks/neural.json');assert (neural['referenceCases'],neural['preparedCalls'],neural['topologyChecksPerToken'])==(18,270,1)
    log=(ROOT/'checks/javascript-full.log').read_text();assert 'FAILED'not in log
    assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',log)))==53
    fields=(ROOT/'checks/prepared-fields.log').read_text();assert '"referenceCases":50,"calls":750'in fields and '2 passed; 0 failed'in fields
    planner=(ROOT/'checks/planner.log').read_text();assert 'Ran 343 tests'in planner and 'OK (skipped=5)'in planner
    return summary
if __name__=='__main__':
    import sys
    result=analyse()
    if '--write' in sys.argv:(ROOT/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
    else:assert result==read('summary.json')
    print('Prepared field report identities, complete results and measurements passed.')
