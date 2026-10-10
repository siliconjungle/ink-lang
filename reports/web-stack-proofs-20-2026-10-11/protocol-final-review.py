"""Independent saved-data protocol audit. No timing, compiler or test execution."""
import argparse,collections,hashlib,json,math,statistics,re
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
KINDS=['baseline','prior','checked'];GPU={f'ink_{k}_gpu' for k in KINDS}
CPU={f'ink_{k}_{b}' for k in KINDS for b in ['js','wasm']}|{'ink_checked_borrowed_js','js_literal','js_expert','js_expert_borrowed','rust_literal_wasm','rust_expert_wasm'}
MASK=2**64-1

def observation(v):
 if not isinstance(v,list):return str(v),int(v)
 s=sum(v)&0xffffffff;w=sum((i+1)*x for i,x in enumerate(v))&0xffffffff
 return f'array:{len(v)}:{s}:{w}',(s+(w<<32)+len(v))&MASK

def counters(m,t,x,variant):
 c=m['gpu_manifest'][variant.split('_')[1]][t['name']];n=len(x['xs'])
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
 want=counters(m,t,x,variant);schema=m['gpu_manifest'][variant.split('_')[1]][t['name']]['schema'];assert c and all(c.get(k)==v for k,v in want.items())
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

def shuffled_order(raw,fixture,m):
 rng=RNG(fixture['parameters']['seed']);lists={p:[] for p in ['calibration','warmups','samples']};iterations={}
 for cell in fixture['cells']:
  x=fixture['inputs'][cell['input']];name=cell['case'];available=[]
  for kind in KINDS:
   available.extend([f'ink_{kind}_js',f'ink_{kind}_wasm'])
   if raw['browser'] and m['gpu_manifest'][kind][name]['timing_eligible']:available.append(f'ink_{kind}_gpu')
  # Borrowed checked JS is inserted after checked backend entries.
  available+=['ink_checked_borrowed_js','rust_literal_wasm','rust_expert_wasm','js_literal','js_expert','js_expert_borrowed']
  for v in rng.shuffle(available):lists['calibration'].append((name,x['id'],v))
  for w in range(2):
   for v in rng.shuffle(available):lists['warmups'].append((name,x['id'],v,w))
  for round in range(9):
   for v in rng.shuffle(available):lists['samples'].append((name,x['id'],v,round))
 for phase,want in lists.items():
  actual=[(q['case'],q['input'],q['variant'],q['warmup'] if phase=='warmups' else q['round']) if phase!='calibration' else (q['case'],q['input'],q['variant']) for q in raw[phase]]
  assert actual==want,('seeded order',phase)
 for q in raw['calibration']:
  assert q['iterations']<=1000000 and q['iterations']&(q['iterations']-1)==0 and (q['iterations'].bit_length()-1)%2==0
  iterations[(q['case'],q['input'],q['variant'])]=max(1,min(1000000,math.ceil(fixture['parameters']['seconds']/(q['seconds']/q['iterations']))))
 for phase in ['warmups','samples']:
  for q in raw[phase]:assert q['iterations']==iterations[(q['case'],q['input'],q['variant'])]

def main(report_sha=None):
 m=read(R/'metadata.json');f=read(R/'fixtures.json');s=read(R/'spec.json');tasks={t['name']:t for t in s['tasks']};inputs={x['id']:x for x in f['inputs']};cells={(c['case'],f['inputs'][c['input']]['id']) for c in f['cells']}
 assert len(m['artifact_hashes'])==926 and len(inputs)==128 and len(cells)==72
 for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
 assert sha(m['compiler_path'])==m['compiler_sha256'];guard=read(R/'source-boundary-before.json');assert len(guard)==102
 for p,h in guard.items():assert sha(B/p)==h,p
 assert read(R/'source-boundary-after.json')['after']==guard
 policy=read(R/'policy-freeze.json');assert policy['status']=='frozen-before-performance' and len(policy['artifacts'])==52
 for p,h in policy['artifacts'].items():assert sha(B/p)==h,p
 count='gated_predicate_count_u32';pm=read(R/f'gpu-prior/{count}/manifest.json');cm=read(R/f'gpu-checked/{count}/manifest.json');assert pm['core_sha256']==cm['core_sha256']
 for p in (R/f'gpu-prior/{count}').glob('*.wgsl'):assert sha(p)==sha(R/f'gpu-checked/{count}'/p.name)
 assert m['tasks'][count]['gpu_selections']['prior']['laws']==m['tasks'][count]['gpu_selections']['checked']['laws']==[]
 phases=medians=0;counts=collections.defaultdict(collections.Counter);controls=collections.defaultdict(collections.Counter);regressions=[];host_rows={};raws={h:read(R/f'{h}-results.json') for h in ['node','browser']};gpu_pre=collections.Counter()
 for host,raw in raws.items():
  assert raw['status']=='passed' and raw['parameters']==f['parameters'] and raw['parameters']['repeats']==9 and raw['parameters']['warmup']==2
  wanted={(c,i,v) for c,i in cells for v in CPU}
  if host=='browser':wanted|={(c,i,v) for c,i in cells for v in GPU if m['gpu_manifest'][v.split('_')[1]][c]['timing_eligible']}
  seen={p:set() for p in ['samples','warmups','calibration']};groups=collections.defaultdict(lambda:collections.defaultdict(list))
  for phase in seen:
   for q in raw[phase]:
    key=(q['case'],q['input'],q['variant']);assert key in wanted
    n=q['iterations'];seconds=q['seconds'];assert isinstance(n,int) and n>0 and math.isfinite(seconds) and seconds>0
    single,code=observation(inputs[q['input']]['expected'][q['case']]);assert q['single']==single and q['checksum']==str(code*n&MASK)
    assert math.isclose(q['ns_per_call'],seconds*1e9/n,rel_tol=1e-9)
    if q['variant'] in GPU:assert q['gpu_counters']=={k:v*n for k,v in counters(m,tasks[q['case']],inputs[q['input']],q['variant']).items()}
    else:assert q['gpu_counters'] is None
    ix=q['round'] if phase=='samples' else q['warmup'] if phase=='warmups' else None;record=(*key,ix);assert record not in seen[phase];seen[phase].add(record);phases+=1
    if phase=='samples':groups[(q['case'],q['input'])][q['variant']].append(q)
  assert seen['samples']=={(*q,r) for q in wanted for r in range(9)}
  assert seen['warmups']=={(*q,w) for q in wanted for w in range(2)}
  assert seen['calibration']=={(*q,None) for q in wanted}
  requests=CPU|(GPU if host=='browser' else set());available=raw['availability'];assert len(available)==len(cells)*len(requests) and {(q['case'],q['input'],q['variant']) for q in available}=={(c,i,v) for c,i in cells for v in requests}
  for q in available:
   if q['variant'] in GPU:
    eligible=m['gpu_manifest'][q['variant'].split('_')[1]][q['case']]['timing_eligible'];assert (q['actual_backend']=='gpu')==eligible
    if eligible:counter_record(m,tasks[q['case']],inputs[q['input']],q['variant'],q['counters'])
   else:assert q['actual_backend']==('cpu' if q['variant'].startswith('ink_') and q['variant'].endswith('_wasm') else 'rust-wasm' if q['variant'].startswith('rust_') else 'javascript')
  assert raw['validation']['comparisons']==(len(inputs)+len(cells))*len(requests) and raw['validation']['fixtures']==128
  if host=='browser':
   records=raw['gpu_validation']['records'];assert len(records)==384 and {(q['case'],q['input'],q['variant']) for q in records}=={(x['case'],x['id'],v) for x in f['inputs'] for v in GPU}
   for q in records:
    eligible=m['gpu_manifest'][q['variant'].split('_')[1]][q['case']]['timing_eligible'];assert (q['actual_backend']=='gpu')==eligible
    if eligible:
     counter_record(m,tasks[q['case']],inputs[q['input']],q['variant'],q['counters']);gpu_pre[m['gpu_manifest'][q['variant'].split('_')[1]][q['case']]['schema']]+=1
    else:assert q['counters'] is None or q['counters']==dict(dispatches=0,upload_bytes=0,readback_bytes=0)
   assert gpu_pre=={1:57,2:26} and raw['gpu_validation']['actual_gpu']==83 and raw['gpu_validation']['fallbacks']==301
  summary=read(R/f'{host}-summary.json');assert len(summary['measurements'])==72
  for q in summary['measurements']:
   values={v:[r['ns_per_call'] for r in sorted(rows,key=lambda r:r['round'])] for v,rows in groups[(q['case'],q['input'])].items()}
   assert q['median_ns']=={v:statistics.median(x) for v,x in values.items()};medians+=len(values)
   for label,ci in q['paired_ratios_95pct'].items():
    a,b=q['ratio_variants'][label];assert ci[0]==statistics.median(values[a])/statistics.median(values[b]) and ci[1]<=ci[2]
    scope='reference' if 'gpu' in label and q['case']==count else 'fresh'
    if label.startswith('prior_over_checked_'):
     verdict='faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive';counts[(scope,host,'',label)][verdict]+=1
     if verdict=='slower' and scope=='fresh':regressions.append(dict(host=host,case=q['case'],input=q['input'],comparison=label,ratio_95pct=ci))
    if 'expert' in label:
     verdict=('Ink_faster' if ci[2]<1 else 'expert_faster' if ci[1]>1 else 'inconclusive') if a.startswith('ink_') else ('Ink_faster' if ci[1]>1 else 'expert_faster' if ci[2]<1 else 'inconclusive');controls[(scope,host,'',label)][verdict]+=1
  host_rows[host]=dict(samples=len(raw['samples']),warmups=len(raw['warmups']),calibration=len(raw['calibration']),complete_comparisons=raw['validation']['comparisons'])
 manifest=read(R/'browser-batches/manifest.json');assert manifest['main_metadata_sha256']==sha(R/'metadata.json') and manifest['main_fixture_sha256']==sha(R/'fixtures.json') and manifest['main_spec_sha256']==sha(R/'spec.json')
 parts=[];part_inputs=[];part_tasks=[];part_cells=[]
 for b in manifest['batches']:
  folder=R/f'browser-batches/b{b["batch"]}';sub=read(folder/'fixtures.json');sp=read(folder/'spec.json');part=read(folder/'browser-results.json');assert part['status']=='passed';parts.append(part)
  assert sha(folder/'fixtures.json')==b['fixtures_sha256'] and sha(folder/'spec.json')==b['spec_sha256']
  part_inputs+=sub['inputs'];part_tasks+=sp['tasks'];part_cells +=[(c['case'],sub['inputs'][c['input']]['id']) for c in sub['cells']]
  assert part['host']==raws['browser']['host'] and dict(part['gpu_adapter'],features=sorted(part['gpu_adapter']['features']))==dict(raws['browser']['gpu_adapter'],features=sorted(raws['browser']['gpu_adapter']['features']))
  for name,h in manifest['linked_artifacts'].items():assert sha(folder/name)==h,name
  shuffled_order(part,sub,m)
 assert part_inputs==f['inputs'] and part_tasks==s['tasks'] and part_cells==[(c['case'],f['inputs'][c['input']]['id']) for c in f['cells']]
 browser=raws['browser']
 for phase in ['samples','warmups','calibration','availability']:assert browser[phase]==[q for p in parts for q in p[phase]]
 assert browser['gpu_validation']['records']==[q for p in parts for q in p['gpu_validation']['records']]
 assert browser['elapsed_seconds']==sum(p['elapsed_seconds'] for p in parts) and browser['startup_ms']=={k:sum(p['startup_ms'].get(k,0) for p in parts) for k in browser['startup_ms']}
 assert browser['first_validation_call_ms']==parts[0]['first_validation_call_ms'];shuffled_order(raws['node'],f,m)
 native_raw=read(R/'native/results.json');assert len(native_raw['samples'])==6480 and len(native_raw['warmups'])==1440 and len(native_raw['calibration'])==720
 assert read(R/'native/validation.json')['exact_comparisons']==640
 for q in read(R/'native/summary.json')['measurements']:
  for label,ci in q['paired_ratios_95pct'].items():
   if label=='prior_over_checked':counts[('fresh','native',q['mode'],label)]['faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive']+=1
   if label=='checked_over_rust_expert':controls[('fresh','native',q['mode'],label)]['Ink_faster' if ci[2]<1 else 'expert_faster' if ci[1]>1 else 'inconclusive']+=1
 outcome=read(R/'outcome-tables.json')
 for k,c in list(counts.items())+list(controls.items()):
  key='|'.join([*k,'all']);assert outcome['counts'][key]==dict(c),(key,c,outcome['counts'][key])
 interval=read(R/'root-interval-verification.json');assert interval['status']=='passed' and interval['intervals_recomputed']==1440
 shape=read(R/'code-shape-review.json');assert shape['status']=='passed' and shape['metadata_sha256']==sha(R/'metadata.json')
 for p,h in shape['bindings'].items():assert sha(R/p)==h,p
 for kind,alloc,loops in [('prior',7,12),('checked',3,8)]:
  totals=shape['totals'][kind];assert totals['js_allocations']==totals['c_allocations']==alloc and totals['js_for_sites']==totals['c_for_sites']==loops and totals['scalar_bridge_allocations']==3
 native_review=R/'native-final-review.json';native_receipt=read(native_review) if native_review.exists() else None
 if native_receipt:assert native_receipt['status']=='passed' and native_receipt['independently_recomputed_paired_intervals']==576
 catalogue_path=R/'catalogue-review.json';catalogue=read(catalogue_path) if catalogue_path.exists() else None
 if catalogue:
  assert catalogue['status']=='passed' and not catalogue['errors'];obs=catalogue['observations'];assert obs['status']=='passed' and (obs['prior'],obs['current'],obs['added'])==(11586,12306,720) and obs['hosts']=={'node':360,'browser':360}
 report=R/'REPORT.md'
 if report_sha:
  assert native_receipt and catalogue and sha(report)==report_sha
  for _,target in re.findall(r'\[([^\]]+)\]\(([^)]+)\)',report.read_text()):
   if not target.startswith('http') and target not in ['verification.json','final-binding.json']:assert (R/target).exists(),target
 paths=[Path(__file__),R/'metadata.json',R/'fixtures.json',R/'spec.json',R/'policy-freeze.json',R/'node-results.json',R/'browser-results.json',R/'browser-batches/manifest.json',R/'outcome-tables.json',R/'root-interval-verification.json',R/'native/results.json',R/'code-shape-review.json',R/'make-report.py']
 for p in [native_review,catalogue_path]:
  if p.exists():paths.append(p)
 if report_sha:paths.append(report)
 result=dict(status='Final review passes' if report_sha else 'Raw protocol review passes; final report and peer bindings pending',bindings={str(p.relative_to(B)):sha(p) for p in paths},host_counts=host_rows,native_samples=6480,total_samples=22464,total_complete_comparisons=6040,independently_checked_web_phase_rows=phases,independently_checked_saved_medians=medians,actual_GPU_prevalidation=83,GPU_prevalidation_fallbacks=301,GPU_schema_counts={'schema1':57,'schema2':26},actual_GPU_timed_variant_cells=48,actual_GPU_timed_samples=432,GPU_availability_fallbacks=168,matched_prior_current_GPU_reference_cells=12,fresh_matched_prior_current_GPU_cells=0,new_vector_GPU_eligibility_cells=12,prior_current_counts={str(k):dict(v) for k,v in counts.items()},expert_counts={str(k):dict(v) for k,v in controls.items()},web_adverse_rows=regressions,
  caveats=['Disabled computations still capture each declared list in full web/native snapshot calls; borrowedJS/native resident isolate the input-resident boundary.', 'All complete outputs and input nonmutation are checked in fixture/availability calls; timed iterations consume exact scalar/vector modular checksums rather than full goldens each iteration.', 'The GPU count programs are identical prior/current references with zero proof applications; no new matched GPU speedup exists. The independent vectors demonstrate eligibility only.', 'Schema1 U64 count readback uses one physical word for tested array lengths; genuine two-lane U64 Wasm controls and native scalar output preserved. No high-word stress fixture is claimed.', 'Strong experts already hoist gates and fuse stages. Original release compilers may independently hoist loops or remove redundant stages.', 'Two bounded contexts reset shuffled-order seed; exact frames/cells/globalRustindices/raw phases preserved. Merged cold-call map is first context only; raw maps retain both.', 'Native driver uses three common untimed resident-input prewarm calls per invocation, distinct from two journaled warmup rows per variant/cell.', 'Individual paired exploratory intervals have correlated views and no simultaneous correction. All adverse outcomes retained; callback instantiations are not an external corpus or language isolation.'],independently_recomputed_intervals_by_other_reviewers=2016 if native_receipt else 1440,canonical_observations=12306 if catalogue else None)
 (R/'protocol-final-review.json').write_text(json.dumps(result,indent=2)+'\n')
 text=f'''# Round20 independent protocol review

{result['status']}.

All 926 frozen artifacts, 52 policy bindings and 102 source guards are unchanged. The pretime review checked 32 compact replay packages, 40 compiled bundle ABIs and direct native scalar Rust return through the same algorithm helper as Wasm. Genuine U64 count uses two Wasm control lanes, though the tested physical counts do not exercise a nonzero high word.

Node contributes 7,776 samples, browser 8,208 and native 6,480: 22,464 total. Complete-output checks are 2,400, 3,000 and 640 respectively: 6,040 total. Independent web phase review covers {phases:,} rows and {medians:,} saved medians. All nine rounds and two warmups have exact coverage, normalized timings, output checksums, actual transfer/dispatch/readback aggregates and independently reproduced seeded shuffled order. Native source/trial/interval coverage is separately bound by the peer review. The native driver also performs three common untimed resident-input prewarm calls per invocation, distinct from the two journaled warmup rows per variant/cell.

Browser full-fixture GPU prevalidation contains 83 actual calls (57 schema1 count references, 26 schema2 independent vectors), including empty vectors with zero dispatch. Another 301 requests fall back. Timed availability has 48 actual GPU variant/cells and 168 fallbacks; actual timing contributes 432 GPU samples. The 12 matched prior/current GPU count cells use identical core and shader bytes with no proof applications: they are references, never fresh-proof wins. The 12 new vector GPU cells have no eligible prior counterpart; they establish eligibility and cross-backend measurements only.

Disabled gates skip compute loops in strong controls while still copying every declared input at full captured web and native snapshot boundaries. Borrowed JS and native resident results remain separate. Ordered reductions preserve reverse/right-fold order; paired vectors compare every output and truncate to independent shorter ys. Original controls retain source stages; strong controls already unswitch/fuse and may reuse vector scratch.

Two disjoint bounded contexts preserve 128 exact frames, 72 cells, global Rust indices, all raw phase rows and adapter features normalized as a set. Startup sums contexts; merged first-validation-call timings are from the first context only. Both raw cold-call maps remain available. No failed or missing context is omitted.

The JSON receipt preserves {len(regressions)} adverse web prior/current rows and every supported/inconclusive/expert verdict with the correct ratio direction. Identical count-GPU comparisons remain in the reference category. Individual intervals are exploratory and correlated; the bounded source instantiations and mixed toolchains do not establish a broad language or expert advantage.
'''
 if report_sha:text+=f'\nFinal REPORT.md reviewed and bound: `{report_sha}`. No pending factual or wording correction.\n'
 (R/'protocol-final-review.md').write_text(text)
 print(json.dumps(dict(status=result['status'],phase_rows=phases,medians=medians,web_adverse=len(regressions),peer_native_bound=bool(native_receipt),catalogue_bound=bool(catalogue))))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--report-sha');main(p.parse_args().report_sha)
