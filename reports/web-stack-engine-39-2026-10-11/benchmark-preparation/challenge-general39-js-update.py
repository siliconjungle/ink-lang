from pathlib import Path
import collections,hashlib,json,math,random
ROOT=Path(__file__).resolve().parents[3];R=ROOT/'reports/web-stack-engine-39-2026-10-11';P=R/'general-final'
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
fixtures=read(P/'fixtures.json')['frames'];lookup={f['id']:f for f in fixtures};matches=[]
for f in fixtures:
 if f['task']!='general39_update':continue
 g=lookup[f['id'].replace('general39_update-','general39_update_recompute-',1)]
 for key in ['xs','ys','seed','k','expected','dimensions','input_shape','algorithmic_work','timed']:assert f[key]==g[key],(f['id'],key)
 payload=json.dumps([f[k]for k in ['xs','ys','seed','k','expected']],separators=(',',':')).encode()
 matches.append({'update_frame':f['id'],'recompute_frame':g['id'],'timed':f['timed'],'complete_inputs_and_output_sha256':hashlib.sha256(payload).hexdigest()})
rows=[];groups=[];bindings={}
for host in ['node','browser']:
 result=P/(host+'-results.json');supplement=R/'benchmark-preparation'/('general-final-'+host+'-supplementary-audit-v2.json');audit=read(supplement);assert audit['status']=='passed'and audit['bindings']['results']==sha(result)
 raw=read(result);samples=collections.defaultdict(list)
 for sample in raw['samples']:samples[(sample['frame'],sample['variant'])].append(sample)
 bindings[host]={'results_sha256':sha(result),'supplementary_audit_sha256':sha(supplement)}
 for pair in [x for x in matches if x['timed']]:
  current=samples[(pair['update_frame'],'candidate_js_owned')];recompute=samples[(pair['recompute_frame'],'expert_js_owned')];original=samples[(pair['update_frame'],'expert_js_owned')]
  assert all(len(v)==5 and {s['round']for s in v}==set(range(5))and all(s['boundary']=='captured-js-owned'for s in v)for v in [current,recompute,original])
  a=[math.log(s['ns_per_call'])for s in recompute];b=[math.log(s['ns_per_call'])for s in current];c=[math.log(s['ns_per_call'])for s in original]
  ratio=math.exp(math.fsum(a)/5-math.fsum(b)/5);old_ratio=math.exp(math.fsum(c)/5-math.fsum(b)/5)
  seed=int(hashlib.sha256((host+'/'+pair['update_frame']+'/fixed-recompute-challenge').encode()).hexdigest()[:16],16);rng=random.Random(seed)
  draws=sorted(math.exp(math.fsum(rng.choices(a,k=5))/5-math.fsum(rng.choices(b,k=5))/5)for _ in range(2000));lo,hi=draws[50],draws[1949]
  rows.append(dict(host=host,update_frame=pair['update_frame'],recompute_frame=pair['recompute_frame'],boundary='captured-js-owned',dimensions=lookup[pair['update_frame']]['dimensions'],reference='predeclared_expert_recompute_js_owned',current='candidate_update_js_owned',ratio_reference_over_current=ratio,ci95_independent_rounds=[lo,hi],classification='faster'if lo>1 else'slower'if hi<1 else'inconclusive',original_sparse_control_ratio=old_ratio,fastest_observed_of_two_control_point_ratio=min(ratio,old_ratio),bootstrap_seed=seed))
 selected=[r for r in rows if r['host']==host];counts=collections.Counter(r['classification']for r in selected)
 groups.append(dict(host=host,cells=len(selected),nominal_classifications={k:counts[k]for k in ['faster','slower','inconclusive']},fixed_recompute_control_equal_cell_geomean_ratio=math.exp(math.fsum(math.log(r['ratio_reference_over_current'])for r in selected)/len(selected)),original_sparse_control_equal_cell_geomean_ratio=math.exp(math.fsum(math.log(r['original_sparse_control_ratio'])for r in selected)/len(selected)),descriptive_best_observed_control_equal_cell_geomean_ratio=math.exp(math.fsum(math.log(r['fastest_observed_of_two_control_point_ratio'])for r in selected)/len(selected))))
limits=['No new algorithms, timers, control tuning or original-comparison edits. Both JS controls and both source contexts were predeclared and timed in the frozen suite.', 'Complete inputs, scalar parameters, output and dimensions match across61 frame pairs, including36 timed pairs and zero-divisor correctness cases.', 'Recompute challenge compares different task phases within the same run, not randomized interleaved pairs. Point ratio is separate geometric sample means; bootstrap independently resamples the two five-round groups. Timing drift and phase/JIT effects remain possible.', 'The fixed alternative one-loop control is the headline challenge. The minimum of the two observed control point estimates is descriptive, selection-biased and has no confidence interval or confirmatory fastest-control claim.', 'Ratios reference/current; above1 favors candidate. Nominal exploratory intervals, no multiple-comparison correction or independent-process replication.', 'A roughly3x win over the Array.from-based sparse control does not establish3x over an optimized handwritten JavaScript implementation; fixed recompute challenge must accompany it.']
out=dict(status='passed',metadata_sha256=sha(P/'metadata.json'),fixture_sha256=sha(P/'fixtures.json'),expert_source_sha256=sha(P/'expert.mjs'),tool_sha256=sha(Path(__file__)),matched_correctness_frames=len(matches),matched_timed_frames=sum(x['timed']for x in matches),bindings=bindings,groups=groups,matches=matches,comparisons=rows,limits=limits)
p=R/'benchmark-preparation/general-js-update-control-challenge.json';p.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'status':'passed','matched_frames':len(matches),'matched_timed_frames':sum(x['timed']for x in matches),'groups':groups}))
