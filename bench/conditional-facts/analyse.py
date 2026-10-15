"""Audit retained samples and derive medians; does not rerun a benchmark."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import statistics


def summary(directory):
    metadata=json.loads((directory/'metadata.json').read_bytes())
    raw={p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in (directory/'raw').glob('*.json')}
    if raw!=metadata['raw_sha256']:raise ValueError('Receipt bytes differ from metadata')
    for name,digest in metadata['module_sha256'].items():
        if hashlib.sha256((directory/name).read_bytes()).hexdigest()!=digest:raise ValueError('Emitted module changed')
    wanted={(f,n,d)for f in ['bounded','excluded','wrap64','reversed','collision','mapped']
        for n in [0,16,4096,65536]for d in ['small','boundary','random']}
    result=[]
    for cohort,seed in [('development',18421),('holdout',99273)]:
        runs=[json.loads(p.read_bytes())for p in sorted((directory/'raw').glob(cohort+'-*.json'))]
        if len(runs)!=3:raise ValueError('Expected three fresh processes per cohort')
        for run in runs:
            if run['seed']!=seed or run['hashes']!=metadata['module_sha256']:raise ValueError('Run identity')
            keys=[(r['function'],r['count'],r['distribution'])for r in run['rows']]
            if len(keys)!=len(wanted)or set(keys)!=wanted:raise ValueError('Workload coverage')
            for row in run['rows']:
                for lane in ['Before','After']:
                    values=row['samples'+lane+'Ns']
                    if len(values)!=11 or any(type(v)not in (int,float)or not math.isfinite(v)or v<0 for v in values):raise ValueError('Invalid sample')
                    if statistics.median(values)!=row[lane.lower()+'Ns']:raise ValueError('Sample median differs')
        for function,count,distribution in sorted(wanted):
            rows=[r for run in runs for r in run['rows']if(r['function'],r['count'],r['distribution'])==(function,count,distribution)]
            result.append(dict(cohort=cohort,function=function,count=count,distribution=distribution,
                beforeNs=statistics.median(r['beforeNs']for r in rows),afterNs=statistics.median(r['afterNs']for r in rows),
                processMedians=[dict(beforeNs=r['beforeNs'],afterNs=r['afterNs'])for r in rows]))
    return dict(schema=1,statistic='median of three fresh-process medians, eleven paired samples per process',rows=result)


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('report',type=Path);parser.add_argument('--check',action='store_true');args=parser.parse_args()
    result=summary(args.report);path=args.report/'summary.json'
    if args.check:
        if json.loads(path.read_bytes())!=result:raise ValueError('Derived summary differs')
    else:path.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(dict(status='checked',cells=len(result['rows']))))
