"""Audit retained derivative-preparation receipts and aggregation."""
import argparse,hashlib,json,math,statistics
from pathlib import Path

def audit(root):
    summary=json.loads((root/'summary.json').read_bytes())
    for name,digest in summary['files'].items():
        if Path(name).name!=name or hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest:raise ValueError('changed artifact: '+name)
    derived=[]
    for cohort,seed in [('development',72131),('holdout',99173)]:
        runs=[json.loads((root/f'{cohort}-{i}.json').read_bytes())for i in range(3)]
        for run in runs:
            if run['seed']!=seed or run['moduleSha256']!=summary['files']['program.mjs']:raise ValueError('run identity')
            if [row['count']for row in run['rows']]!=[0,16,4096,32768]:raise ValueError('size coverage')
            for row in run['rows']:
                if set(row['lanes'])!={'prepared','repeated','handwritten'}:raise ValueError('controls missing')
                for lane in row['lanes'].values():
                    samples=lane['samplesNs']
                    if len(samples)!=11 or any(not isinstance(x,(int,float))or not math.isfinite(x)or x<0 for x in samples):raise ValueError('samples')
                    if statistics.median(samples)!=lane['medianNs']:raise ValueError('sample median')
        for count in [0,16,4096,32768]:
            rows=[row for run in runs for row in run['rows']if row['count']==count]
            derived.append(dict(cohort=cohort,count=count,medianNs={n:statistics.median(row['lanes'][n]['medianNs']for row in rows)for n in ['prepared','repeated','handwritten']}))
    if derived!=summary['rows']:raise ValueError('derived aggregate')
    print(json.dumps(dict(status='checked',cells=len(derived),processes=6,controls=3)))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('report',type=Path);audit(p.parse_args().report)
