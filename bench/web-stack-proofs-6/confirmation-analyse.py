#!/usr/bin/env python3
"""Independent paired analysis of an unchanged-artifact focused browser repeat."""
import argparse,collections,hashlib,json,random,statistics
from pathlib import Path

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def interval(a,b):
    assert len(a)==len(b)==7
    rng=random.Random(0);draws=[]
    for _ in range(4000):
        ix=[rng.randrange(7) for _ in range(7)]
        draws.append(statistics.median([a[i] for i in ix])/statistics.median([b[i] for i in ix]))
    draws.sort();return [statistics.median(a)/statistics.median(b),draws[100],draws[3899]]
def classify(ci):return 'faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive'
def analyse(p):
    m=json.loads((p/'metadata.json').read_text());parent=p.parent
    assert sha(parent/'metadata.json')==m['confirmation']['parent_metadata_sha256']
    for n,h in m['artifact_hashes'].items():
        assert sha(p/n)==h,n
        if n not in ('fixtures.json','browser.html'):assert (p/n).read_bytes()==(parent/n).read_bytes(),n
    raw=json.loads((p/'browser-results.json').read_text());summary=json.loads((p/'browser-summary.json').read_text())
    g=collections.defaultdict(lambda:collections.defaultdict(list))
    for r in raw['samples']:g[(r['case'],r['input'])][r['variant']].append(r)
    n=0;counts=collections.Counter();decisions=[];routes=[]
    for r in summary['measurements']:
        v={k:[t['ns_per_call'] for t in sorted(rs,key=lambda t:t['round'])] for k,rs in g[(r['case'],r['input'])].items()}
        assert r['median_ns']=={k:statistics.median(x) for k,x in v.items()}
        for name,saved in r['paired_ratios_95pct'].items():
            if name.startswith(('prior_over_checked_','baseline_over_checked_')):
                a,_,b,backend=name.split('_',3);av,bv=f'ink_{a}_{backend}',f'ink_{b}_{backend}'
            else:av,bv=name.split('_over_',1)
            ci=interval(v[av],v[bv]);assert ci==saved,(r['case'],r['input'],name);n+=1
            if name.startswith('prior_over_checked_'):
                verdict=classify(ci);counts[verdict]+=1;decisions.append(dict(case=r['case'],input=r['input'],backend=name.split('prior_over_checked_')[1],ratio_95pct=ci,verdict=verdict))
        med={b:statistics.median(v['ink_checked_'+b]) for b in ('js','wasm','gpu')}
        routes.append(dict(case=r['case'],input=r['input'],median_ns=med,lowest_median_current_backend=min(med,key=med.get),checked_cpu_over_checked_gpu_95pct={b:interval(v['ink_checked_'+b],v['ink_checked_gpu']) for b in ('js','wasm')}))
    out=dict(status='passed',intervals_recomputed=n,artifact_hashes_verified=len(m['artifact_hashes']),unchanged_parent_artifacts=84,samples=len(raw['samples']),actual_gpu_samples=sum(r['variant'].endswith('_gpu') for r in raw['samples']),counts=dict(counts),decisions=decisions,routes=routes,scope='Separate exploratory focused repeat; same compiled files and full-call protocol, four largest input cells, fresh shuffled seven rounds. No multiple-comparison adjustment or general GPU win assertion.')
    (p/'root-analysis.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k not in ('decisions','routes')}))
if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('report',type=Path);analyse(ap.parse_args().report.resolve())
