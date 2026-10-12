"""Reference evaluator execution, independently implemented in pinned core."""
from common import *
import argparse
p=argparse.ArgumentParser();p.add_argument('--small',action='store_true');a=p.parse_args();rows=[];check_frozen();programs={r['name']:r for r in read(OUT/'corpus.json')}
for f in read(OUT/'fixtures.json'):
 if f['split']!='evaluation' or (a.small and f['size']>1021):continue
 d=OUT/'reference'/f['program']/f"{f['size']}-{f['distribution']}"
 if (d/'process.json').exists():r=read(d/'process.json')
 else:r=process([INK,'run',ROOT/programs[f['program']]['source'],'run',ROOT/f['path']],d)
 rows.append(dict(fixture=f['path'],**r));print(f['program'],f['size'],f['distribution'],r['status'],flush=True)
save(OUT/'reference-processes.json',rows)
