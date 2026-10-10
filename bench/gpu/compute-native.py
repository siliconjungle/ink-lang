import json,subprocess,sys,math,os
from pathlib import Path
binary,fixture_path,output=sys.argv[1:]
fixtures=json.loads(Path(fixture_path).read_text())
def near(a,b):
    if isinstance(b,list):return isinstance(a,list)and len(a)==len(b)and all(near(x,y)for x,y in zip(a,b))
    if isinstance(b,dict):return isinstance(a,dict)and a.keys()==b.keys()and all(near(a[k],b[k])for k in b)
    if isinstance(b,float):return isinstance(a,(int,float))and math.isclose(a,b,rel_tol=2e-5,abs_tol=2e-5)
    return a==b
script=[]
for f in fixtures:
    for backend in ['cpu','gpu']:
        script.append({**{k:v for k,v in f.items()if k in ['call','args','pipeline']},'backend':backend})
invalid=[{'call':'kick','args':[[[1,2]],.5,[0,0,0]]},{'call':'indexed','args':[[2147483648]]},{'call':'particles','args':[[{'position':[0,0,0],'velocity':[0,0,0],'mass':1,'extra':2}],.5]},{'pipeline':{'steps':[{'id':'x','call':'indexed','args':[{'step':'x'}]}]}},{'pipeline':{'steps':[{'id':'x','call':'indexed','args':[[1]]}], 'iterations':0}},{'pipeline':{'inputs':{'x':[1]},'steps':[{'id':'x','call':'kick','args':[{'input':'x'},.5,[0,0,0]]}]}},{'pipeline':{'steps':[{'id':'x','call':'indexed','args':[[1]]}], 'outputs':['x','x']}}]
script.extend(dict(f,backend='gpu')for f in invalid)
path=Path(fixture_path).with_suffix('.script.json');path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(script))
def run(env=None):
    r=subprocess.run([binary,'--script',str(path)],capture_output=True,text=True,check=True,env=env)
    return [json.loads(x)for x in r.stdout.splitlines()]
rows=run();gpu_calls=0;receipts=[]
for i,f in enumerate(fixtures):
    for j,backend in enumerate(['cpu','gpu']):
        r=rows[i*2+j];actual=r.get('values')if'pipeline'in f else r.get('value');assert near(actual,f['expected']),(i,f.get('call'),r.get('reason'),actual)
        if backend=='gpu'and f['eligible']:assert r['backend']=='gpu',(i,r.get('reason'))
        if r['backend']=='gpu':gpu_calls+=1
        if 'pipeline'in f and f['pipeline']['iterations']==120 and backend=='gpu':receipts.append({k:v for k,v in r.items()if k!='values'})
assert all('error'in r for r in rows[-len(invalid):])
disabled=run({**os.environ,'INK_GPU_DISABLE':'1'})
for i,f in enumerate(fixtures):
    r=disabled[i*2+1];assert r['backend']=='cpu';assert near(r.get('values')if'pipeline'in f else r.get('value'),f['expected'])
receipt={'status':'passed','comparisons':len(fixtures)*2,'gpu_calls':gpu_calls,'invalid_rejected':len(invalid),'disabled_gpu_fallbacks':len(fixtures),'resident_particle_receipts':receipts,'float_tolerance':{'relative':2e-5,'absolute':2e-5}}
Path(output).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
