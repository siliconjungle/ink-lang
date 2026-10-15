#!/usr/bin/env python3
"""Paired per-process medians and retained source/observation checks, not proofs."""
import argparse
import hashlib
import json
import statistics as stats
from pathlib import Path

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def median(xs): return stats.median(xs)
def value(j,task,size,lane):
    return median(r['ns_per_call'] for r in j['records'] if r['task']==task and r.get('size')==size and r['name']==lane)
def analyse(root):
    manifest=json.loads((root/'metadata.json').read_text())
    actual={str(p.relative_to(root)) for p in root.rglob('*') if p.is_file() and p.name not in ['metadata.json','summary.json']}
    assert actual==set(manifest['files']), 'Unbound or missing report files'
    summary={'loops':{},'neural':{},'layout':{},'memory':{},'scope':'Per-process medians; diagnostics, not selection authority or universal parity.'}
    for cohort in ['development','holdout']:
        runs=[json.loads(p.read_text())for p in sorted((root/'loops').glob(f'{cohort}-*.json'))]
        assert len(runs)==3
        assert len({tuple(c['sha256'] for c in j['corpora'])for j in runs})==1
        assert all(len(j['records'])==495 for j in runs)
        expected={(task,size,lane,sample)for task in ['membership','aggregates','numeric']for size in [16,128,512]for lane in ['before_prepared','before_ordinary','current_prepared','current_ordinary','direct_prepared']for sample in range(11)}
        assert all({(x['task'],x['size'],x['name'],x['sample'])for x in j['records']}==expected for j in runs)
        assert all(x['calls']==96 and x['ns_per_call']>0 for j in runs for x in j['records'])
        assert all(x['source_core']==manifest['cores']['workloads']for j in runs for x in j['setup']if x['name'] in ['before','current'])
        assert all(j['sources']['before']['sha256']==digest(root/'workloads-before.mjs') and j['sources']['current']['sha256']==digest(root/'workloads-current.mjs') for j in runs)
        summary['loops'][cohort]={}
        for task in ['membership','aggregates','numeric']:
            summary['loops'][cohort][task]={}
            for size in [16,128,512]:
                before=[value(j,task,size,'before_prepared')for j in runs];current=[value(j,task,size,'current_prepared')for j in runs];direct=[value(j,task,size,'direct_prepared')for j in runs]
                summary['loops'][cohort][task][str(size)]={'before_prepared_ns':median(before),'current_prepared_ns':median(current),'direct_prepared_ns':median(direct),'paired_gain':median(b/c for b,c in zip(before,current)),
                    'current_ordinary_ns':median(value(j,task,size,'current_ordinary')for j in runs),'before_ordinary_ns':median(value(j,task,size,'before_ordinary')for j in runs)}
        paired={}
        for artifact in ['previous','current']:
            paired[artifact]=[json.loads((root/'models'/f'{cohort}-{i}-{artifact}.json').read_text())for i in range(3)]
            source=root/('model-before.mjs' if artifact=='previous' else 'model-current.mjs')
            assert all(j['sources'][artifact]['sha256']==digest(source)for j in paired[artifact])
        assert len({j['corpus_sha256']for js in paired.values()for j in js})==1
        assert all(j['source_core']==manifest['cores']['model'] and j['upstream_sha256']==manifest['upstream']['handwired_source_sha256']for js in paired.values()for j in js)
        summary['neural'][cohort]={}
        for task in ['predict','derivatives']:
            before=[value(j,task,None,'previous_prepared')for j in paired['previous']];current=[value(j,task,None,'current_prepared')for j in paired['current']]
            summary['neural'][cohort][task]={'before_ns':median(before),'current_ns':median(current),'paired_gain':median(b/c for b,c in zip(before,current)),
                'current_ordinary_ns':median(value(j,task,None,'current_ordinary')for j in paired['current']),
                'handwired_ranges_ns':median(value(j,task,None,'handwired_ranges')for j in paired['current']),
                'direct_graph_ns':median(value(j,task,None,'direct_graph')for j in paired['current'])}
            if task=='predict':summary['neural'][cohort][task]['dense_ns']=median(value(j,task,None,'dense_predict')for j in paired['current'])
    runs=[json.loads(p.read_text())for p in sorted((root/'layout').glob('*.json'))];assert len(runs)==3
    assert all(j['sources']['before']['sha256']==digest(root/'text-before.mjs') and j['sources']['current']['sha256']==digest(root/'text-current.mjs')for j in runs)
    assert all(j['sources']['upstream']['sha256']==manifest['upstream']['pretext_javascript_sha256']for j in runs)
    assert all(x['source_core']==manifest['cores']['text']for j in runs for x in j['setup']if x['name'] in ['before','current'])
    for size in [8,64,512]:
        # Layout uses the same record format without a task field.
        def lane(j,name):return median(r['ns_per_call']for r in j['records']if r['size']==size and r['name']==name)
        summary['layout'][str(size)]={name:median(lane(j,name)for j in runs)for name in ['before_prepared','current_prepared','pretext']}
    for artifact in ['before','current']:
        runs=[json.loads(p.read_text())for p in sorted((root/'memory').glob(f'{artifact}-*.json'))];assert len(runs)==3
        assert all(j['module_sha256']==digest(root/f'workloads-{artifact}.mjs')for j in runs)
        summary['memory'][artifact]={phase:median(j['phases'][phase]['heapUsed']-j['phases']['after_token']['heapUsed']for j in runs)for phase in ['after_empty','after_one','after_100']}
    for name,want in manifest['files'].items():
        p=Path(name);assert not p.is_absolute() and '..'not in p.parts
        p=root/p;assert p.is_file() and not p.is_symlink() and digest(p)==want,str(p)
    for name in ['workloads','model','text']:
        core=digest(root/f'{name}.core.json')
        assert core==manifest['cores'][name]
    log=(root/'prepared-loops.log').read_text();assert log.count('"referenceCases":147')==2 and log.count('"calls":1510')==2 and '1 passed; 0 failed' in log
    full=(root/'javascript-full.log').read_text();assert 'FAILED'not in full
    import re
    assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',full)))==49
    assert '11 passed; 0 failed'in (root/'reverse-final.log').read_text()
    assert '4 passed; 0 failed'in (root/'binary64-final.log').read_text()
    assert '3 passed; 0 failed'in (root/'text-final.log').read_text()
    assert '182 results matched; 1 GPU calls'in (root/'text-final.log').read_text()
    return summary
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('report',type=Path);parser.add_argument('--check',action='store_true');args=parser.parse_args();got=analyse(args.report)
    output=args.report/'summary.json'
    if args.check:assert json.loads(output.read_text())==got;print('Prepared loop observations and bindings passed.')
    else:output.write_text(json.dumps(got,indent=2)+'\n');print(json.dumps(got,indent=2))
