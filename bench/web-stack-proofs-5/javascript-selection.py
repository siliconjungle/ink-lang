#!/usr/bin/env python3
"""Audit and serve a frozen compile-time JavaScript selection experiment."""
import argparse,collections,hashlib,http.server,json,math,random,statistics
from pathlib import Path

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def interval(a,b):
    rng=random.Random(0);ds=[]
    for _ in range(4000):
        ix=[rng.randrange(7) for _ in range(7)]
        ds.append(statistics.median([a[i] for i in ix])/statistics.median([b[i] for i in ix]))
    ds.sort();return [statistics.median(a)/statistics.median(b),ds[100],ds[3899]]
def observation(x):
    if isinstance(x,list):
        total=sum(x)&(2**32-1);weighted=sum((i+1)*v for i,v in enumerate(x))&(2**32-1)
        return f"array:{len(x)}:{total}:{weighted}",(total+(weighted<<32)+len(x))%(2**64)
    return str(x),x

def audit(p,host):
    m=json.loads((p/'metadata.json').read_text());main=json.loads((p.parent/'metadata.json').read_text())
    assert sha(Path(main['compiler_path']))==m['compiler_sha256']
    for name,h in m['artifact_hashes'].items():assert sha(p/name)==h,name
    f=json.loads((p/'fixtures.json').read_text());d=json.loads((p/(host+'-results.json')).read_text())
    assert d['status']=='passed' and not d['webgpu'] and not d['peak_linear_memory_bytes']
    inputs={x['id']:x for x in f['inputs']};cells={(c['case'],f['inputs'][c['input']]['id']) for c in f['cells']}
    variants={f'ink_{k}_{b}' for k in ('prior','checked','gated') for b in ('js','direct_js')}|{'js_literal'}
    groups=collections.defaultdict(lambda:collections.defaultdict(list));seen=set()
    for phase in ('samples','warmups','calibration'):
        for r in d[phase]:
            key=(r['case'],r['input']);assert key in cells and r['variant'] in variants
            assert r['iterations']>0 and math.isfinite(r['seconds']) and r['seconds']>0
            single,code=observation(inputs[r['input']]['expected'][r['case']])
            assert r['single']==single and r['checksum']==str(code*r['iterations']%(2**64)),(phase,r)
            assert math.isclose(r['ns_per_call'],r['seconds']*1e9/r['iterations'],rel_tol=1e-9)
            if phase=='samples':
                uid=(*key,r['variant'],r['round']);assert uid not in seen and 0<=r['round']<7;seen.add(uid)
                groups[key][r['variant']].append(r)
    assert set(groups)==cells and len(d['samples'])==2058 and d['validation']['comparisons']==931
    rows=[];counts=collections.Counter();n=0
    for (case,inp),g in groups.items():
        assert set(g)==variants and all(len(x)==7 for x in g.values())
        v={k:[r['ns_per_call'] for r in sorted(rs,key=lambda r:r['round'])] for k,rs in g.items()};ratios={}
        for b in ('js','direct_js'):
            for k in ('prior','checked'):
                name=k+'_over_gated_'+b;ci=interval(v['ink_'+k+'_'+b],v['ink_gated_'+b]);ratios[name]=ci;n+=1
                if k=='prior':counts['faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive']+=1
            ratios['gated_'+b+'_over_original_js']=interval(v['ink_gated_'+b],v['js_literal']);n+=1
        rows.append(dict(case=case,input=inp,median_ns={k:statistics.median(x) for k,x in v.items()},paired_ratios_95pct=ratios))
    out=dict(status='passed',host=host,samples=len(d['samples']),validation=d['validation'],cells=len(rows),intervals=n,counts=dict(counts),artifact_hashes_verified=len(m['artifact_hashes']),measurements=rows,scope='Compile-time six-application selection; JS only; complete calls include one full input snapshot and checksum. No runtime profitability selector or caller validator. Exploratory paired 95% intervals, 4000 shared-round bootstrap draws, unadjusted multiple comparisons. No canonical memory observations.')
    (p/(host+'-summary.json')).write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k!='measurements'}),flush=True)

def serve(p):
    class H(http.server.SimpleHTTPRequestHandler):
        def __init__(self,*a,**kw):super().__init__(*a,directory=str(p),**kw)
        def do_POST(self):
            if self.path!='/javascript-selection/browser-results.json':self.send_error(404);return
            dest=p/'browser-results.json'
            if dest.exists():self.send_error(409);return
            data=self.rfile.read(int(self.headers['Content-Length']));parsed=json.loads(data)
            if parsed.get('status')!='passed':self.send_error(400);return
            dest.write_bytes(data);self.send_response(200);self.end_headers();self.wfile.write(b'saved')
    http.server.ThreadingHTTPServer(('127.0.0.1',8777),H).serve_forever()
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('report',type=Path);ap.add_argument('--serve',action='store_true');ap.add_argument('--host',choices=['node','browser']);a=ap.parse_args()
    if a.serve:serve(a.report.resolve())
    else:audit(a.report.resolve(),a.host)
