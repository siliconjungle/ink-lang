from pathlib import Path
import json,hashlib,sys,platform,collections,math
R=Path(__file__).resolve().parent;B=R.parents[1];K=B/'knowledge';sys.path.insert(0,str(K))
from ink_knowledge import Store,identity
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
store=Store(K);publication=read(R/'publication.json');assert store.snapshot_id==publication['snapshot']
prior=set(p.stem for p in (K/'store/observations').glob('*.json'));old=read(R/'initial-pins.json')
sources={'node':'node-results.json','browser':'browser-results.json','native':'native/results28.json','gpu':'gpu-performance/results.json','context':'context-performance/timing.json'}
for host in ['node','browser']:
 if (R/f'owned-js-control/{host}-results.json').exists():sources['owned-'+host]=f'owned-js-control/{host}-results.json'
entries=[];plans={}
for host,path in sources.items():
 raw=read(R/path);assert raw['status']=='passed';groups=collections.defaultdict(list)
 for row in raw['samples']:groups[(row.get('name',row.get('task')),row['frame'],row['variant'],row.get('boundary','captured'))].append(row)
 for (name,frame,variant,boundary),rows in sorted(groups.items()):
  rows.sort(key=lambda x:x['round']);assert [x['round'] for x in rows]==list(range(9));assert all(math.isfinite(x['ns_per_call']) and x['ns_per_call']>0 for x in rows)
  if host=='context':
   folder=R/'context-performance'/name;selection=read(folder/'selection.json');source=selection['input_core_sha256'];manifest=read(folder/('selected' if variant.startswith('selected') else 'literal')/'manifest.json');proof_selected=variant.startswith('selected');kind='explicit checked replay'
  else:
   folder=B/'reports/web-stack-proofs-27-2026-10-11/tasks'/name;selection=read(folder/'checked-selection.json');source=selection['input_core_sha256'];manifest=read(R/'current'/name/'manifest.json');proof_selected=variant.startswith(('current','baseline','ink'));kind='exact fixed batch27 checked core; no reselection'
  laws=sorted({a['law'] for a in selection['applications']}) if proof_selected else []
  assert all(i in store.members() for i in laws)
  plan={'schema':28,'program':source,'selected_core':manifest['core_sha256'] if proof_selected else source,'host':host,'variant':variant,'boundary':boundary,'semantic_selection_sha256':sha(folder/'selection.json') if host=='context' else sha(folder/'checked-selection.json'),'compiler_sha256':read(R/'compiler-final.json')['compiler_sha256'],'timing_artifact_sha256':sha(R/path),'scope':kind}
  plan_id=identity(plan);plans[plan_id]=plan
  peak=0;memory='not measured; peak_bytes=0 is an explicit unknown sentinel, not a zero-allocation claim'
  if host=='gpu' and variant=='current_gpu_requested':
   availability=next(x for x in raw['availability'] if x['frame']==frame)
   assert availability['actual_backend']=='gpu' and all(x['actual_backend_counts']=={'gpu':x['iterations']} for x in rows)
   peak=availability['counters']['live_buffer_bytes'];memory='reported WebGPU live buffer peak, excludes host heap'
  target={'hardware':platform.platform()+' '+platform.machine(),'driver':str(raw.get('host','native driver '+sha(R/'native/driver'))),'toolchain':'frozen28 compiler '+plan['compiler_sha256']+'; matched controls bound in measurement plan','backend':variant,'bridge':host+'/'+boundary+'; raw '+plan['timing_artifact_sha256']}
  workload={'shape':{'task':name,'frame':frame,'input_elements':rows[0]['size'],'memory_metric':memory},'distribution':{'scope':kind,'controls':'frozen fixtures and complete goldens','statistic':'nine raw per-call timings, rounded to integer nanoseconds; preparation/capture boundary explicit'},'concurrency':1,'residency':boundary}
  obj={'schema':1,'program':source,'entries':laws,'plan':plan_id,'target':target,'workload':workload,'metrics':{'complete_call_ns':[str(max(1,round(x['ns_per_call']))) for x in rows],'peak_bytes':peak}}
  oid=store.observe(obj);entries.append({'id':oid,'host':host,'name':name,'frame':frame,'variant':variant,'plan':plan_id,'proof_entries':laws})
assert prior<=set(p.stem for p in (K/'store/observations').glob('*.json'))
(R/'measurement-plans.json').write_text(json.dumps(plans,indent=2)+'\n')
receipt={'status':'published','snapshot':store.snapshot_id,'entries':len(store.members()),'prior_observations':len(prior),'total_observations':len(list((K/'store/observations').glob('*.json'))),'new_observations':len({x['id'] for x in entries}-prior),'samples':sum(len(read(R/p)['samples']) for p in sources.values()),'measurement_plans_sha256':sha(R/'measurement-plans.json'),'sources':{p:sha(R/p) for p in sources.values()},'rows':entries,'scope':'timings are profitability evidence only; no new proof follows from a timing; untouched baseline observations preserved'}
(R/'observations.json').write_text(json.dumps(receipt,indent=2)+'\n');archive=K/'research/web-engine-28';(archive/'observations.json').write_text(json.dumps(receipt,indent=2)+'\n');(archive/'measurement-plans.json').write_text((R/'measurement-plans.json').read_text());print('published observations',receipt['new_observations'],'total',receipt['total_observations'])
