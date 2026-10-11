"""Summarize every heldout adaptive comparison; no benchmark execution."""
import pathlib,json,hashlib,math,random,statistics,collections
B=pathlib.Path(__file__).resolve().parents[1];R=B/'reports/web-stack-engine-39-2026-10-11/adaptive';read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 d=read(R/'evaluation-results.json');audit=read(R/'evaluation-audit.json');assert audit['status']=='passed'and audit['bindings']['results']==sha(R/'evaluation-results.json')
 groups={}
 for x in d['samples']:groups.setdefault((x['frame'],x['boundary']),{}).setdefault(x['variant'],{})[x['round']]=x['ns_per_call']
 comparisons=[];decisions=[]
 for (frame,boundary),variants in sorted(groups.items()):
  current='auto_cached';chosen_rows=[x for x in d['samples']if x['frame']==frame and x['boundary']==boundary and x['variant']==current];chosen=set(k for x in chosen_rows for k in x['actual_backend_counts']);assert len(chosen)==1
  medians={b:statistics.median(variants['auto_path_'+b].values())for b in ['cpu','javascript','gpu']};best=min(medians,key=medians.get)
  decisions.append(dict(frame=frame,boundary=boundary,chosen=next(iter(chosen)),heldout_fastest_actual_auto_path=best,actual_auto_path_medians_ns=medians,adaptive_median_ns=statistics.median(variants[current].values()),observed_regret_ratio=statistics.median(variants[current].values())/medians[best],limit='Fastest heldout backend is retrospective descriptive lower bound; never used to train or retune.'))
  for reference in ['static_cpu','auto_path_cpu','auto_path_javascript','auto_path_gpu','direct_cpu','direct_javascript','direct_gpu']:
   a,b=variants[reference],variants[current];assert set(a)==set(b)=={0,1,2};logs=[math.log(a[i]/b[i])for i in range(3)];seed=int.from_bytes(hashlib.sha256((frame+'/'+boundary+'/'+reference+'/'+current).encode()).digest()[:8],'big');rng=random.Random(seed);draws=sorted(math.exp(math.fsum(rng.choices(logs,k=3))/3)for _ in range(2000));lo,hi=draws[50],draws[1949]
   ratio=math.exp(math.fsum(logs)/3);comparisons.append(dict(frame=frame,boundary=boundary,reference=reference,current=current,ratio_reference_over_current=ratio,ci95=[lo,hi],classification='faster'if lo>1 else'slower'if hi<1 else'uncertain',point_loss=ratio<1,seed=seed))
 aggregate=[]
 for boundary in d['protocol']['boundaries']:
  rows=[x for x in comparisons if x['boundary']==boundary and x['reference']=='static_cpu'];aggregate.append(dict(boundary=boundary,static_reference_over_adaptive_geomean=math.exp(math.fsum(math.log(x['ratio_reference_over_current'])for x in rows)/len(rows)),classifications=dict(collections.Counter(x['classification']for x in rows)),all_point_losses=sum(x['point_loss']for x in rows),chosen_backend_counts=dict(collections.Counter(x['chosen']for x in decisions if x['boundary']==boundary))))
 first=[]
 for x in d['first_selection_miss']:
  cached=statistics.median(groups[(x['frame'],x['boundary'])]['auto_cached'].values());first.append(dict(x,cached_median_ns=cached,single_miss_over_cached_ratio=x['elapsed_ms']*1e6/cached,limit='One firstmiss observation; includes cache miss/context/Promise/execution/consumer. Not an isolated cache-only latency or replicated confidence estimate.'))
 result=dict(status='passed',comparisons=comparisons,decisions=decisions,aggregates=aggregate,first_miss_vs_cached=first,profile_sha256=sha(R/'frozen-profile.json'),model_not_retuned=True,automatic_global_default=False,limits=['One recipe/target,3within-process paired rounds and2000 exploratory seeded draws, nominal95percentile without multiplicity correction; no universal speed claim.','All16heldoutcells and all112comparisons retained including losses/uncertainty. Boundaries not pooled.','Ownedfulloutputs and common allwordconsumer included; explicitJScontrol bypassesauto transport and is never auto price surrogate.'],bindings={str(p.relative_to(B)):sha(p)for p in [R/'metadata.json',R/'frozen-profile.json',R/'fit-receipt.json',R/'training-results.json',R/'evaluation-results.json',R/'evaluation-audit.json',pathlib.Path(__file__)]})
 with (R/'summary.json').open('x')as f:json.dump(result,f,indent=2);f.write('\n')
 print(json.dumps(dict(status='passed',comparisons=len(comparisons),aggregates=aggregate)))
if __name__=='__main__':main()
