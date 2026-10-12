"""Fixed-cohort paired uncertainty, complete losses, coverage and ablation."""
from common import *
import numpy as np,csv,statistics,math
from collections import defaultdict
check_frozen();rng=np.random.default_rng(0x133ad);points=read(OUT/'checkpoints.json');programs=read(OUT/'corpus.json');names=[p['name']for p in programs]
compiled={lane:{(r['checkpoint'],r['program']):r for r in read(OUT/f'{lane}-compilation.json')}for lane in ['forced','automatic','automatic-default']}
rows=[];curves=[];memories=[]
def ratio(a,b):
 a,b=np.array(a),np.array(b);idx=rng.integers(0,len(a),(10000,len(a)));reps=np.median(a[idx]/b[idx],axis=1);return float(np.median(a/b)),np.quantile(reps,[.025,.975]).tolist()
for name in names:
 data=read(OUT/'measurements/time'/name/'all/stdout.txt')
 for case in data['results']:
  samples=case['samples_ns']
  for lane in ['forced','automatic','automatic-default']:
   base=lane+'/current'
   for point in points:
    target=lane+'/'+point['label']
    if target not in samples:continue
    estimate,ci=ratio(samples[base],samples[target]);artifact_same=compiled[lane][('current',name)]['artifact_sha256']==compiled[lane][(point['label'],name)]['artifact_sha256']
    rows.append(dict(program=name,lane=lane,checkpoint=point['label'],size=case['size'],distribution=case['distribution'],input_identity=case['input_identity'],baseline_median_ns=float(np.median(samples[base])),target_median_ns=float(np.median(samples[target])),speedup=estimate,ci_low=ci[0],ci_high=ci[1],robust_gain=estimate>=1.05 and ci[0]>1,robust_regression=estimate<=1/1.05 and ci[1]<1,artifact_same=artifact_same,samples=samples[target],baseline_samples=samples[base]))
 # Per-variant memory is acquired in independent processes, not in the timer.
 for directory in (OUT/'measurements/memory'/name).iterdir():
  if not (directory/'stdout.txt').exists():continue
  data=read(directory/'stdout.txt')
  for r in data['results']:
   memories.append(dict(program=name,lane=data['lanes'][0]['name'],fixture=r['fixture'],os_peak_rss_bytes=data['os_peak_rss_kib']*1024,observed_rss_bytes=max(x['rss']for x in r['observed']),observed_heap_used_bytes=max(x['heapUsed']for x in r['observed']),retained_heap_delta_bytes=r['retained']['heapUsed']-r['before']['heapUsed'],logical_output_json_bytes=r['logical_output_json_bytes']))
# Family attribution is per-case removal, with overlap and non-additivity retained.
ablations=[]
for name in names:
 data=read(OUT/'measurements/time'/name/'all/stdout.txt')
 for c in data['results']:
  full=c['samples_ns']['forced/controlled']
  for family in ['absorbing-left-fold','controlled-fold-fusion']:
   removed=c['samples_ns']['forced/without-'+family];estimate,ci=ratio(removed,full);ablations.append(dict(program=name,size=c['size'],distribution=c['distribution'],family=family,removal_to_full_speedup=estimate,ci_low=ci[0],ci_high=ci[1],robust_contribution=estimate>=1.05 and ci[0]>1))
for lane in ['forced','automatic','automatic-default']:
 for p in [x for x in points if 'ablation'not in x]:
  cells=[r for r in rows if r['lane']==lane and r['checkpoint']==p['label']and r['size']>0]
  per_program={name:math.exp(statistics.mean(math.log(r['speedup'])for r in cells if r['program']==name))for name in names}
  # Fixed corpus, resampling the paired rounds only: this interval says nothing
  # about a population of arbitrary software. Each cell retains its same weight.
  reps=np.zeros(10000)
  for name in names:
   sub=[r for r in cells if r['program']==name];logs=np.zeros(10000)
   for r in sub:
    a,b=np.array(r['baseline_samples']),np.array(r['samples']);idx=rng.integers(0,len(a),(10000,len(a)));logs+=np.log(np.median(a[idx]/b[idx],axis=1))/len(sub)
   reps+=logs/len(names)
  unique={}
  for r in cells:unique.setdefault((r['program'],r['input_identity']),r)
  unique_per_program={n:math.exp(statistics.mean(math.log(r['speedup'])for r in unique.values()if r['program']==n))for n in names}
  coverage=sum(compiled[lane][(p['label'],n)].get('applications',len(read(OUT/'compiled'/lane/p['label']/n/'plan.json')['steps'])if lane.startswith('automatic')else 0)>0 for n in names)
  gains=[r for r in cells if r['robust_gain']and not r['artifact_same']];losses=[r for r in cells if r['robust_regression']and not r['artifact_same']]
  cost=[compiled[lane][(p['label'],n)]['seconds']for n in names]
  warm=[]
  if lane=='forced':
   for repeat in [3,4,5]:warm.append([r['seconds']-r.get('index_seconds',0)for r in read(OUT/f'forced-compilation-repeat-{repeat}.json')if r['checkpoint']==p['label']])
  curves.append(dict(lane=lane,checkpoint=p['label'],added_families=p['added_families'],entries=p['entries'],program_geomean_speedup=math.exp(statistics.mean(math.log(v)for v in per_program.values())),timing_only_fixed_corpus_ci=np.exp(np.quantile(reps,[.025,.975])).tolist(),unique_input_sensitivity=math.exp(statistics.mean(math.log(v)for v in unique_per_program.values())),per_program=per_program,nonempty_cases=len(cells),distinct_nonempty_input_identities=len(unique),robust_changed_artifact_gains=len(gains),robust_changed_artifact_regressions=len(losses),significant_same_artifact_timing_differences=sum((r['robust_gain']or r['robust_regression'])and r['artifact_same']for r in cells),selected_program_coverage=coverage,useful_program_coverage=len({r['program']for r in gains}),useful_nonempty_case_coverage=len(gains)/len(cells),complete_compile_median_seconds=statistics.median(cost),complete_compile_total_seconds=sum(cost),warm_forced_repeated_cohort_mean_seconds=[statistics.mean(w)for w in warm],alternative_attempts=sum(compiled[lane][(p['label'],n)].get('alternatives_discovered',compiled[lane][(p['label'],n)].get('receipt',{}).get('attempts',0))for n in names),scope='Automatic attempts count proposals attempted, not all possible algorithms. Forced discovery counts matched proposals and may revisit endpoints. Coverage is selected source bodies, not percentage of software or count of provable laws. Empty cells remain in case CSV.'))
for file,data in [('cases.json',rows),('curves.json',curves),('memory-summary.json',memories),('ablations.json',ablations)]:save(OUT/file,data)
for file,data in [('cases.csv',rows),('ablations.csv',ablations),('memory-summary.csv',memories)]:
 reduced=[{k:v for k,v in r.items()if k not in ['samples','baseline_samples']}for r in data]
 with (OUT/file).open('w')as f:w=csv.DictWriter(f,fieldnames=list(reduced[0]),lineterminator='\n');w.writeheader();w.writerows(reduced)
reg=[r for r in rows if r['robust_regression']];save(OUT/'regressions.json',reg)
# A binary relationship is never counted as independent gains from both families.
overlap=defaultdict(set)
for r in ablations:
 if r['size']>0 and r['robust_contribution']:overlap[(r['program'],r['size'],r['distribution'])].add(r['family'])
save(OUT/'ablation-overlap.json',dict(cells_with_both=sum(len(v)==2 for v in overlap.values()),cells_with_one=sum(len(v)==1 for v in overlap.values()),rule='Removal effects are conditional on the remaining catalogue and forced sequence. They are not additive; no multiplication or sum of overlapping speedups.',cells=[dict(program=k[0],size=k[1],distribution=k[2],families=sorted(v))for k,v in overlap.items()]))
print(json.dumps(curves,indent=2))
