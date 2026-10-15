"""Verify retained preparation receipts, coverage and derived medians."""
import argparse,hashlib,json,math,statistics
from pathlib import Path

def verify(directory):
    summary=json.loads((directory/'summary.json').read_bytes())
    for name,digest in summary['files'].items():
        if hashlib.sha256((directory/name).read_bytes()).hexdigest()!=digest:raise ValueError('changed receipt: '+name)
    expected={(f,n,m) for f in ['prepared','prepared_dependent'] for n in [0,1,32,512] for m in [0,16,256]}
    derived=[]
    for lane,seed in [('development',21431),('holdout',49139)]:
        runs=[json.loads((directory/f'{lane}-{i}.json').read_bytes()) for i in range(3)]
        for run in runs:
            if run['seed']!=seed:raise ValueError('seed')
            for name,digest in run['hashes'].items():
                if summary['files'][name]!=digest:raise ValueError('module identity')
            keys=[(v['function'],v['count'],v['width']) for v in run['rows']]
            if len(keys)!=24 or set(keys)!=expected:raise ValueError('coverage')
            for row in run['rows']:
                for side in ['Before','After']:
                    values=row['samples'+side+'Ns']
                    if len(values)!=11 or any(type(x) not in (int,float) or not math.isfinite(x) or x<0 for x in values):raise ValueError('samples')
                    if statistics.median(values)!=row[side.lower()+'Ns']:raise ValueError('median')
        for f,n,m in sorted(expected):
            rows=[v for run in runs for v in run['rows'] if (v['function'],v['count'],v['width'])==(f,n,m)]
            derived.append(dict(lane=lane,function=f,count=n,width=m,beforeNs=statistics.median(v['beforeNs'] for v in rows),afterNs=statistics.median(v['afterNs'] for v in rows)))
    key=lambda r:(r['lane'],r['function'],r['count'],r['width'])
    if sorted(derived,key=key)!=sorted(summary['rows'],key=key):raise ValueError('derived summary')
    print(json.dumps(dict(status='checked',cells=len(derived))))
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('report',type=Path);args=parser.parse_args();verify(args.report)
