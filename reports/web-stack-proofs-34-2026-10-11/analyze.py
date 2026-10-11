"""Analyze frozen batch34 samples; no timings or semantic authority."""
from pathlib import Path
import hashlib,json,math,random
R=Path(__file__).resolve().parent;P=R/'targets'
def read(p):return json.loads(Path(p).read_text())
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
fixtures={x['id']:x for x in read(P/'fixtures.json')['frames']};rows=[]
for host in ['node','browser']:
 for x in read(P/(host+'-summary.json'))['comparisons']:rows.append(dict(x,host=host))
def paired(frame,boundary,host,ref,current,left,right):
 assert set(left)==set(right)==set(range(9))
 logs=[math.log(left[i]['ns_per_call']/right[i]['ns_per_call'])for i in range(9)];seed=int(hashlib.sha256((host+'/'+boundary+'/'+frame+'/'+ref+'/'+current).encode()).hexdigest()[:16],16);rng=random.Random(seed);draws=sorted(math.exp(math.fsum(rng.choices(logs,k=9))/9)for _ in range(4000));lo,hi=draws[100],draws[3899]
 return dict(host=host,frame=frame,boundary=boundary,reference=ref,current=current,ratio_reference_over_current=math.exp(math.fsum(logs)/9),ci95=[lo,hi],classification='faster'if lo>1 else'slower'if hi<1 else'inconclusive',bootstrap_seed=seed)
groups={}
for x in read(P/'native/results.json')['samples']:groups.setdefault((x['frame'],x['boundary']),{}).setdefault(x['variant'],{})[x['round']]=x
for(frame,boundary),variants in sorted(groups.items()):
 for ref in ['literal','prior','expert']:rows.append(paired(frame,boundary,'native',ref,'checked',variants[ref],variants['checked']))
groups={}
for x in read(P/'browser-results.json')['samples']:groups.setdefault(x['frame'],{}).setdefault(x['variant'],{})[x['round']]=x
for frame,variants in sorted(groups.items()):
 for ref in ['expert_js_owned','rust_wasm_full']:rows.append(paired(frame,'instrumented-full-gpu-request','browser',ref,'checked_gpu_requested',variants[ref],variants['checked_gpu_requested']))
assert len(rows)==672
aggregates=[]
for host,boundary,ref,current in sorted({(x['host'],x['boundary'],x['reference'],x['current'])for x in rows}):
 xs=[x for x in rows if(x['host'],x['boundary'],x['reference'],x['current'])==(host,boundary,ref,current)];assert len(xs)==24
 item=dict(host=host,boundary=boundary,reference=ref,current=current,cells=len(xs),geomean=math.exp(math.fsum(math.log(x['ratio_reference_over_current'])for x in xs)/len(xs)),wins=sum(x['classification']=='faster'for x in xs),losses=sum(x['classification']=='slower'for x in xs),inconclusive=sum(x['classification']=='inconclusive'for x in xs));aggregates.append(item)
strata=[]
for a in aggregates:
 for kind in ['raw','heldout']:
  xs=[x for x in rows if all(x[k]==a[k]for k in['host','boundary','reference','current'])and ('heldout'in x['frame'])==(kind=='heldout')]
  strata.append(dict(a,cohort=kind,cells=len(xs),geomean=math.exp(math.fsum(math.log(x['ratio_reference_over_current'])for x in xs)/len(xs)),wins=sum(x['classification']=='faster'for x in xs),losses=sum(x['classification']=='slower'for x in xs),inconclusive=sum(x['classification']=='inconclusive'for x in xs)))
regressions=[x for x in rows if x['reference'].startswith('prior')and x['classification']=='slower']
bindings={str(p.relative_to(R)):sha(p)for p in [P/'metadata.json',P/'node-results.json',P/'browser-results.json',P/'native/results.json',P/'node-summary.json',P/'browser-summary.json',Path(__file__)]}
result=dict(status='passed',samples=7560,paired_comparisons=len(rows),method='Nine paired log ratios;4,000 seeded bootstrap draws; nominal per-cell95% percentile intervals; aggregate geometric means descriptive; no multiplicity correction or broad language ranking.',ratios='reference/checked; above1favorschecked',bindings=bindings,aggregates=aggregates,strata=strata,comparisons=rows,prior_regressions=regressions)
(R/'analysis.json').write_text(json.dumps(result,indent=2)+'\n');(R/'regressions.json').write_text(json.dumps(dict(status='retained',count=len(regressions),rows=regressions),indent=2)+'\n')
for x in aggregates:
 if x['reference'].startswith('prior')or x['reference'].startswith('expert')or x['reference'].startswith('rust'):print(x)
print('prior regressions',len(regressions))
