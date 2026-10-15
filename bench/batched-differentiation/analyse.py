"""Audit retained batched derivative receipts and aggregation."""
import argparse,hashlib,json,math,re,statistics
from pathlib import Path

def audit(root):
    summary=json.loads((root/'summary.json').read_bytes())
    for name,digest in summary['files'].items():
        if Path(name).name!=name or hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest:raise ValueError('changed artifact: '+name)
    if hashlib.sha256((root/'source.ink').read_bytes()).hexdigest()!=summary['source_sha256']:raise ValueError('source binding')
    derived=[]
    for cohort,seed in [('development',72131),('holdout',99173)]:
        runs=[json.loads((root/f'{cohort}-{i}.json').read_bytes())for i in range(3)]
        for run in runs:
            if run['seed']!=seed or run['moduleSha256']!=summary['files']['program.mjs'] or run['previousSha256']!=summary['files']['previous.mjs']:raise ValueError('run identity')
            if [row['count']for row in run['rows']]!=[0,16,4096,32768]:raise ValueError('size coverage')
            for row in run['rows']:
                if set(row['lanes'])!={'previous','batched','repeated','handwritten'}:raise ValueError('controls missing')
                for lane in row['lanes'].values():
                    samples=lane['samplesNs']
                    if len(samples)!=11 or any(not isinstance(x,(int,float))or not math.isfinite(x)or x<0 for x in samples):raise ValueError('samples')
                    if statistics.median(samples)!=lane['medianNs']:raise ValueError('sample median')
        for count in [0,16,4096,32768]:
            rows=[row for run in runs for row in run['rows']if row['count']==count]
            derived.append(dict(cohort=cohort,count=count,medianNs={n:statistics.median(row['lanes'][n]['medianNs']for row in rows)for n in ['previous','batched','repeated','handwritten']}))
    if derived!=summary['rows']:raise ValueError('derived aggregate')
    metadata=json.loads((root/'metadata.json').read_bytes())
    admission=json.loads((root/'proof-admission.json').read_bytes())
    if admission['admission']['status']!='checked' or len(admission['equations'])!=2:raise ValueError('proof coverage')
    if admission['source_sha256']!=metadata['source_files']['knowledge/tests/fixtures/differential-batching/source.ink']:raise ValueError('proof source binding')
    log=(root/'final-parity.log').read_text()
    for marker in ['5 passed; 0 failed','8 passed; 0 failed','database_batching_equations_replay_and_preserve_selected_execution ... ok']:
        if marker not in log:raise ValueError('missing acceptance: '+marker)
    total=gpu=0
    for name,count,dispatches in [('adaptive-learning',24,1),('whole-computation-learning',25,2),('batched-differentiation',37,1),('proved-batched-differentiation',19,1)]:
        rows=json.loads((root/(name+'-gpu.json')).read_bytes())
        if len(rows)!=count or sum(r.get('backend')=='gpu'for r in rows)!=dispatches:raise ValueError('dispatch receipt: '+name)
        for marker in [f'wgpu: {count} results matched; {dispatches} GPU calls',f'rust Wasm: {count} values/outcomes and exact snapshots matched']:
            if marker not in log:raise ValueError('missing compiled target: '+name)
        total+=count;gpu+=dispatches
    for name,expected in [('core-tests',394),('javascript-tests',47)]:
        text=(root/(name+'.log')).read_text()
        if sum(map(int,re.findall(r'test result: ok\. (\d+) passed; 0 failed',text)))!=expected:raise ValueError('test receipt: '+name)
    print(json.dumps(dict(status='checked',cells=len(derived),processes=6,controls=4,cross_target_cases=total,actual_gpu_calls=gpu,source_equalities=2)))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('report',type=Path);audit(p.parse_args().report)
