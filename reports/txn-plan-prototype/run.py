#!/usr/bin/env python3
import json,subprocess,statistics,sys,random,os
dirs=sys.argv[1].split(',')  # bin dirs, variant names prefixed by dir label
reps=int(os.environ.get('REPS','7'))
cells=[(64,'restock'),(64,'mixed'),(4096,'restock'),(4096,'mixed'),(262144,'mixed')]
steps=int(os.environ.get('STEPS','2000000'))
bins=[]
for d in dirs:
    label,path=d.split('=')
    for v in ['language','language_bounded','rust_tree']:
        b=f'{path}/{v}.bin'
        if os.path.exists(b): bins.append((f'{label}:{v}',b))
rng=random.Random(7)
res={}
for n,mode in cells:
    for r in range(reps+1):
        order=bins[:];rng.shuffle(order)
        for name,b in order:
            out=json.loads(subprocess.run([b,str(n),str(steps),'0',mode],capture_output=True,text=True,check=True).stdout)
            if r==0: continue  # warmup
            res.setdefault((n,mode,name),[]).append(out)
    ref=None
    print(f'\nrows={n} {mode}:')
    for name,_ in bins:
        rows=res[(n,mode,name)]
        sig={(o['checksum'],o['total_lo'],o['version'],o['events'],o['event_hash'],o['state_hash']) for o in rows}
        assert len(sig)==1,(name,sig)
        sig=sig.pop()
        med=statistics.median(o['seconds'] for o in rows)
        if 'rust_tree' in name and ref is None: ref=med
        res[(n,mode,name,'med')]=med
        print(f'  {name:32s} {med*1e9/steps:8.1f} ns/op  sig={hash(sig)%100000}')
    for name,_ in bins:
        print(f'  {name:32s} {res[(n,mode,name,"med")]/ref:5.2f}x first rust_tree listed')
