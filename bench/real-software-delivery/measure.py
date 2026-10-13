"""Serial correctness/runtime/memory acquisition after all automatic builds finish."""
import json,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/real-software-delivery-2026-10-13'
rows=json.loads((OUT/'corpus.json').read_text());programs=[r for r in rows if r['supported']]
for row in programs:
    for point in ['packed-base','packed-grown']:
        for effort in (['quick'] if row['split']=='development' else ['quick','balanced']):
            p=OUT/'compiled'/point/effort/row['name']/'process.json'
            if not p.exists():raise ValueError('complete all builds first: '+str(p))
            if json.loads(p.read_bytes())['status']!=0:raise ValueError('failed compiler attempt: '+str(p))
for row in programs:
    name=row['name']
    for mode in ['validate','time']:
        dest=OUT/('validation' if mode=='validate' else 'timings')/(name+'.json');dest.parent.mkdir(exist_ok=True)
        if dest.exists():continue
        r=subprocess.run(['node',str(ROOT/'bench/real-software-delivery/bench.mjs'),mode,name],cwd=ROOT,capture_output=True,text=True,timeout=300)
        if r.returncode:
            (dest.with_suffix('.failure.txt')).write_text(r.stderr);raise RuntimeError(r.stderr)
        dest.write_text(r.stdout);print(mode,name,flush=True)
    lanes=['literal','packed-base/quick','packed-grown/quick','upstream'] if row['split']=='development' else ['literal','packed-base/quick','packed-base/balanced','packed-grown/quick','packed-grown/balanced','upstream']
    for lane in lanes:
        dest=OUT/'memory'/(name+'-'+lane.replace('/','-')+'.json');dest.parent.mkdir(exist_ok=True)
        if dest.exists():continue
        r=subprocess.run(['node','--expose-gc',str(ROOT/'bench/real-software-delivery/bench.mjs'),'memory',name,lane],cwd=ROOT,capture_output=True,text=True,timeout=300)
        if r.returncode:
            dest.with_suffix('.failure.txt').write_text(r.stderr);raise RuntimeError(r.stderr)
        dest.write_text(r.stdout)
    print('memory',name,flush=True)
subprocess.run([sys.executable,'bench/real-software-delivery/report.py'],cwd=ROOT,check=True)
