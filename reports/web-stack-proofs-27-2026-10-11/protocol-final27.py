"""Independent saved-data protocol audit. No timing, compiler or test execution."""
import argparse,collections,hashlib,json,math,statistics,re
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
KINDS=['old_prior','old_checked','new_prior','new_checked']
CPU={f'ink_{k}_{b}' for k in KINDS for b in ['js','wasm','borrowed_js']}|{'js_expert','js_expert_borrowed','rust_expert_wasm'}
MASK=2**64-1

def observation(v):
 if not isinstance(v,list):return str(v),int(v)
 s=sum(v)&0xffffffff;w=sum((i+1)*x for i,x in enumerate(v))&0xffffffff
 return f'array:{len(v)}:{s}:{w}',(s+(w<<32)+len(v))&MASK

def counters(m,t,x,variant):
 c=m['gpu_manifest'][variant][t['name']];n=len(x['xs'])
 if c['schema']==2:
  inputs=n+(len(x['ys']) if len(t['list_inputs'])==2 else 0);params=len(t['params']);out=len(x['expected'][t['name']]) if isinstance(x['expected'][t['name']],list) else t['scalar_words']
  return dict(dispatches=int(out>0),upload_bytes=4*(inputs+params-len(t['list_inputs'])+params+1),readback_bytes=out*4)
 dispatches=sum(1 if q['kind']=='map' else 3 for q in c['stages'])
 if c['aggregate']=='count':dispatches+=1
 else:
  cap=max(1,n)
  while True:
   dispatches+=1;cap=(cap+255)//256
   if cap<=1:break
 return dict(dispatches=dispatches,upload_bytes=4*n+4+4*c['parameter_count'],readback_bytes=4)

def counter_record(m,t,x,variant,c):
 want=counters(m,t,x,variant);schema=m['gpu_manifest'][variant][t['name']]['schema'];assert c and all(c.get(k)==v for k,v in want.items())
 if schema==1:assert set(c)==set(want)
 else:assert set(c)==set(want)|{'live_buffer_bytes'} and isinstance(c['live_buffer_bytes'],int) and c['live_buffer_bytes']>=0 and c['live_buffer_bytes']%4==0

class RNG:
 def __init__(self,seed):self.x=seed&0xffffffff
 def next(self):
  x=self.x;x=(x^(x<<13))&0xffffffff;x=(x^(x>>17))&0xffffffff;x=(x^(x<<5))&0xffffffff;self.x=x;return x
 def shuffle(self,values):
  result=list(values)
  for i in range(len(result)-1,0,-1):j=self.next()%(i+1);result[i],result[j]=result[j],result[i]
  return result

def variants(raw,m,name):
 result=[]
 for state in KINDS:result.extend(f'ink_{state}_{b}' for b in ['js','wasm','borrowed_js'])
 if raw['browser']:result.extend(v for v,q in m['gpu_manifest'].items() if name in q and q[name]['timing_eligible'])
 return result+['rust_expert_wasm','js_expert','js_expert_borrowed']
def shuffled_order(raw,fixture,m):
 rng=RNG(fixture['parameters']['seed']);wanted={p:[] for p in ['calibration','warmups','samples']};iterations={}
 for cell in fixture['cells']:
  x=fixture['inputs'][cell['input']];name=cell['case'];available=variants(raw,m,name)
  for v in rng.shuffle(available):wanted['calibration'].append((name,x['id'],v))
  for w in range(fixture['parameters']['warmup']):
   for v in rng.shuffle(available):wanted['warmups'].append((name,x['id'],v,w))
  for round in range(fixture['parameters']['repeats']):
   for v in rng.shuffle(available):wanted['samples'].append((name,x['id'],v,round))
 for phase,rows in wanted.items():
  actual=[(q['case'],q['input'],q['variant'],q['warmup'] if phase=='warmups' else q['round']) if phase!='calibration' else (q['case'],q['input'],q['variant']) for q in raw[phase]];assert actual==rows,('seededorder',phase)
 for q in raw['calibration']:
  n=q['iterations'];assert n<=1000000 and n&(n-1)==0 and (n.bit_length()-1)%2==0
  iterations[(q['case'],q['input'],q['variant'])]=max(1,min(1000000,math.ceil(fixture['parameters']['seconds']/(q['seconds']/n))))
 for phase in ['warmups','samples']:
  for q in raw[phase]:assert q['iterations']==iterations[(q['case'],q['input'],q['variant'])]

def audit_host(raw,f,m,tasks):
 inputs={x['id']:x for x in f['inputs']};cells={(c['case'],f['inputs'][c['input']]['id']) for c in f['cells']};assert raw['status']=='passed' and raw['parameters']==f['parameters']
 wanted={(c,i,v) for c,i in cells for v in variants(raw,m,c)};seen={p:set() for p in ['samples','warmups','calibration']};groups=collections.defaultdict(lambda:collections.defaultdict(list));phase_rows=0
 for phase in seen:
  for q in raw[phase]:
   key=(q['case'],q['input'],q['variant']);assert key in wanted
   n=q['iterations'];seconds=q['seconds'];assert isinstance(n,int) and n>0 and math.isfinite(seconds) and seconds>0
   single,code=observation(inputs[q['input']]['expected'][q['case']]);assert q['single']==single and q['checksum']==str(code*n&MASK)
   assert math.isclose(q['ns_per_call'],seconds*1e9/n,rel_tol=1e-9)
   expected_boundary='borrowed-sync' if q['variant'].endswith('_borrowed_js') or q['variant']=='js_expert_borrowed' else 'full'
   assert q['boundary']==expected_boundary
   if q['variant'].endswith('_gpu'):assert q['gpu_counters']=={k:v*n for k,v in counters(m,tasks[q['case']],inputs[q['input']],q['variant']).items()}
   else:assert q['gpu_counters'] is None
   ix=q['round'] if phase=='samples' else q['warmup'] if phase=='warmups' else None;record=(*key,ix);assert record not in seen[phase];seen[phase].add(record);phase_rows+=1
   if phase=='samples':groups[(q['case'],q['input'])][q['variant']].append(q)
 assert seen['samples']=={(*q,r) for q in wanted for r in range(f['parameters']['repeats'])}
 assert seen['warmups']=={(*q,w) for q in wanted for w in range(f['parameters']['warmup'])} and seen['calibration']=={(*q,None) for q in wanted}
 requested={(c,i,v) for c,i in cells for v in CPU}
 if raw['browser']:requested|={(c,i,v) for c,i in cells for v,by in m['gpu_manifest'].items() if c in by}
 assert len(raw['availability'])==len(requested) and {(q['case'],q['input'],q['variant']) for q in raw['availability']}==requested
 for q in raw['availability']:
  if q['variant'].endswith('_gpu'):
   eligible=m['gpu_manifest'][q['variant']][q['case']]['timing_eligible'];assert (q['actual_backend']=='gpu')==eligible
   if eligible:counter_record(m,tasks[q['case']],inputs[q['input']],q['variant'],q['counters'])
  else:assert q['actual_backend']==('cpu' if q['variant'].endswith('_wasm') and q['variant'].startswith('ink_') else 'rust-wasm' if q['variant'].startswith('rust_') else 'javascript')
 gpu_keys={(x['case'],x['id'],v) for x in f['inputs'] for v,by in m['gpu_manifest'].items() if x['case'] in by} if raw['browser'] else set()
 assert raw['validation']['comparisons']==len(f['inputs'])*17+len(requested)+len(gpu_keys) and raw['validation']['fixtures']==len(f['inputs'])
 records=raw['gpu_validation']['records'];assert len(records)==len(gpu_keys) and {(q['case'],q['input'],q['variant']) for q in records}==gpu_keys
 actual=0
 for q in records:
  x=inputs[q['input']];eligible=m['gpu_manifest'][q['variant']][q['case']]['timing_eligible'];gold=x['expected'][q['case']];positive=bool(gold) if isinstance(gold,list) else True
  if q['actual_backend']=='gpu':assert eligible;counter_record(m,tasks[q['case']],x,q['variant'],q['counters']);actual+=1
  else:assert not eligible or not positive
 assert raw['gpu_validation']['actual_gpu']==actual and raw['gpu_validation']['fallbacks']==len(records)-actual
 return groups,dict(samples=len(raw['samples']),phase_rows=phase_rows,comparisons=raw['validation']['comparisons'],actual_GPU_prevalidation=actual,GPU_prevalidation_fallbacks=len(records)-actual,timed_GPU_cells=sum(v.endswith('_gpu') for c,i,v in wanted))

def main(report_sha=None):
 import importlib.util,sys
 sys.path.insert(0,str(B/'bench'));import methodology as M
 m=read(R/'metadata.json');f=read(R/'fixtures.json');s=read(R/'spec.json');tasks={t['name']:t for t in s['tasks']}
 asset_review=read(R/'preflight-receipt.json');assert len(tasks)==asset_review['tasks'] and len(f['inputs'])==asset_review['inputs'] and len(f['cells'])==asset_review['cells']
 for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
 for tool in m['compilers'].values():assert sha(tool['path'])==tool['sha256']
 preflight=read(R/'protocol-compiled-preflight-review.json');assert preflight['status']=='compiled-pretime-review-passes'
 for p,h in preflight['bindings'].items():assert sha(B/p)==h,p
 guard=read(R/'source-boundary-before.json');pins=read(R/'initial-pins.json');changed=[p for p,h in guard.items() if sha(B/p)!=h];assert len(guard)==102 and set(changed)==set(pins['expected_source_changes'])
 for p in changed:assert sha(R/'original-source'/p)==guard[p]
 policy=read(R/'policy-freeze.json');assert policy['status']=='frozen-before-performance'
 for p,h in policy['artifacts'].items():assert sha(B/p)==h,p
 host_rows={};parts=[];manifest=read(R/'browser-batches/manifest.json');assert len(manifest['batches'])>=2 and manifest['main_metadata_sha256']==sha(R/'metadata.json')
 union_inputs=[];union_cells=[];union_tasks=[]
 for b in manifest['batches']:
  folder=R/'browser-batches'/f'b{b["batch"]}';bf=read(folder/'fixtures.json');bs=read(folder/'spec.json');part=read(folder/'browser-results.json')
  assert sha(folder/'fixtures.json')==b['fixtures_sha256'] and sha(folder/'spec.json')==b['spec_sha256']
  shuffled_order(part,bf,m);audit_host(part,bf,m,tasks);parts.append(part);union_inputs+=bf['inputs'];union_tasks+=bs['tasks']
  union_cells.extend((c['case'],bf['inputs'][c['input']]['id']) for c in bf['cells'])
 assert union_inputs==f['inputs'] and union_tasks==s['tasks'] and union_cells==[(c['case'],f['inputs'][c['input']]['id']) for c in f['cells']]
 intervals=interactions=medians=0;adverse=[]
 for host in ['node','browser']:
  raw=read(R/f'{host}-results.json');groups,counts=audit_host(raw,f,m,tasks);host_rows[host]=counts
  if host=='node':shuffled_order(raw,f,m)
  else:
   for phase in ['samples','warmups','calibration','availability']:assert raw[phase]==[q for p in parts for q in p[phase]]
   assert raw['gpu_validation']['records']==[q for p in parts for q in p['gpu_validation']['records']]
  summary=read(R/f'{host}-summary.json');assert len(summary['measurements'])==len(f['cells'])
  for row in summary['measurements']:
   values={v:[q['ns_per_call'] for q in sorted(rows,key=lambda q:q['round'])] for v,rows in groups[(row['case'],row['input'])].items()}
   assert row['median_ns']=={v:statistics.median(q) for v,q in values.items()};medians+=len(values)
   for label,ci in row['paired_ratios_95pct'].items():
    a,b=row['ratio_variants'][label];assert ci==list(M.ratio_ci(values[a],values[b]));intervals+=1
    if label.startswith(('backend_','proof_','combined_')) and ci[2]<1:adverse.append(dict(host=host,case=row['case'],input=row['input'],comparison=label,ratio_95pct=ci))
   for target,record in row['factorial_interactions'].items():
    a=[x/y for x,y in zip(values[f'ink_old_prior_{target}'],values[f'ink_old_checked_{target}'])];b=[x/y for x,y in zip(values[f'ink_new_prior_{target}'],values[f'ink_new_checked_{target}'])]
    assert record['paired_ratio_95pct']==list(M.ratio_ci(a,b));interactions+=1
 if report_sha:assert sha(R/'REPORT.md')==report_sha
 result=dict(status='Final review passes' if report_sha else 'data-review-passes-report-pending',host_rows=host_rows,independently_recomputed_web_intervals=intervals,independently_recomputed_factorial_interactions=interactions,medians=medians,all_adverse_rows=adverse,report_sha256=report_sha,scope='Four exact backend/proof variants per target; same selected core across old/new C+JS helper emission independently bound. Full capture and synchronous borrowed cohorts separately calibrated/shuffled/consumed. Original staged validation-only; strong experts already inline/hoist/fuse valid traversals and preserve right-fold order. Three genuine independent-list tasks truncate to min length and all declared inputs captured. Empty/extrema/unequal/4096 correctness complete output frames. Dynamic unique GPU fingerprints and counters; actual dispatch/fallback separate and fresh/reference attribution follows task role. No universal language ranking.',bindings={str(p.relative_to(B)):sha(p) for p in [Path(__file__),R/'metadata.json',R/'protocol-compiled-preflight-review.json',R/'node-results.json',R/'browser-results.json',R/'node-summary.json',R/'browser-summary.json',R/'browser-batches/manifest.json']+([R/'REPORT.md'] if report_sha else [])})
 (R/'protocol-final-review.json').write_text(json.dumps(result,indent=2)+'\n');(R/'protocol-final-review.md').write_text(result['status']+'.\n\n'+result['scope']+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['bindings','all_adverse_rows','scope']}))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--report-sha');main(parser.parse_args().report_sha)
