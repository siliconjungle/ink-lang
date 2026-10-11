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
 assert len(tasks)==12 and len(inputs)==228 and len(cells)==120
 assert sum(t['fresh_proof_required'] for t in tasks.values())==12
 for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
 assert sha(m['compiler_path'])==m['compiler_sha256'];guard=read(R/'source-boundary-before.json');assert len(guard)==102
 for p,h in guard.items():assert sha(B/p)==h,p
 assert read(R/'source-boundary-after.json')['after']==guard
 policy=read(R/'policy-freeze.json');assert policy['status']=='frozen-before-performance'
 for p,h in policy['artifacts'].items():assert sha(B/p)==h,p
 for t in tasks.values():
  assert t['list_inputs']==['xs'] and t['params']==['xs','seed','k'] and t['scalar_words']==(2 if t['output_kind']=='u64' else 1)
  info=m['tasks'][t['name']]
  if t['fresh_proof_required']:assert info['checked_changes_prior'] and info['new_laws']
  else:assert not info['checked_changes_prior']
  eligible={kind:m['gpu_manifest'][kind][t['name']]['timing_eligible'] for kind in KINDS}
  if t['output_kind']=='list_u32':assert eligible['checked'] and m['gpu_manifest']['checked'][t['name']]['schema']==2
 for x in inputs.values():assert x['ys']==[]
 phases=medians=0;counts=collections.defaultdict(collections.Counter);controls=collections.defaultdict(collections.Counter);regressions=[];host_rows={};raws={h:read(R/f'{h}-results.json') for h in ['node','browser']};gpu_pre=collections.Counter();gpu_timed=0;gpu_availability_fallbacks=0;gpu_pre_fallbacks=0
 for host,raw in raws.items():
  assert raw['status']=='passed' and raw['parameters']==f['parameters'] and raw['parameters']['repeats']==9 and raw['parameters']['warmup']==2 and raw['parameters']['seed']==20261101
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
  assert seen['warmups']=={(*q,w) for q in wanted for w in range(2)} and seen['calibration']=={(*q,None) for q in wanted}
  requests=CPU|(GPU if host=='browser' else set());available=raw['availability'];assert len(available)==len(cells)*len(requests) and {(q['case'],q['input'],q['variant']) for q in available}=={(c,i,v) for c,i in cells for v in requests}
  for q in available:
   if q['variant'] in GPU:
    eligible=m['gpu_manifest'][q['variant'].split('_')[1]][q['case']]['timing_eligible'];assert (q['actual_backend']=='gpu')==eligible
    if eligible:counter_record(m,tasks[q['case']],inputs[q['input']],q['variant'],q['counters']);gpu_timed+=1
    else:gpu_availability_fallbacks+=1
   else:assert q['actual_backend']==('cpu' if q['variant'].startswith('ink_') and q['variant'].endswith('_wasm') else 'rust-wasm' if q['variant'].startswith('rust_') else 'javascript')
  assert raw['validation']['comparisons']==(len(inputs)+len(cells))*len(requests) and raw['validation']['fixtures']==228
  if host=='browser':
   records=raw['gpu_validation']['records'];assert len(records)==684 and {(q['case'],q['input'],q['variant']) for q in records}=={(x['case'],x['id'],v) for x in f['inputs'] for v in GPU}
   for q in records:
    x=inputs[q['input']];eligible=m['gpu_manifest'][q['variant'].split('_')[1]][q['case']]['timing_eligible'];output=x['expected'][q['case']];positive=bool(len(output)) if isinstance(output,list) else True
    if eligible and positive:assert q['actual_backend']=='gpu'
    if q['actual_backend']=='gpu':
     assert eligible;counter_record(m,tasks[q['case']],x,q['variant'],q['counters']);gpu_pre[m['gpu_manifest'][q['variant'].split('_')[1]][q['case']]['schema']]+=1
    else:
     assert not eligible or not positive
     assert q['counters'] is None or q['counters']==dict(dispatches=0,upload_bytes=0,readback_bytes=0);gpu_pre_fallbacks+=1
   assert raw['gpu_validation']['actual_gpu']==sum(gpu_pre.values()) and raw['gpu_validation']['fallbacks']==gpu_pre_fallbacks
  summary=read(R/f'{host}-summary.json');assert len(summary['measurements'])==120
  for q in summary['measurements']:
   values={v:[r['ns_per_call'] for r in sorted(rows,key=lambda r:r['round'])] for v,rows in groups[(q['case'],q['input'])].items()}
   assert q['median_ns']=={v:statistics.median(x) for v,x in values.items()};medians+=len(values)
   for label,ci in q['paired_ratios_95pct'].items():
    a,b=q['ratio_variants'][label];assert ci[0]==statistics.median(values[a])/statistics.median(values[b]) and ci[1]<=ci[2]
    if label.startswith('prior_over_checked_'):
     scope='fresh' if tasks[q['case']]['fresh_proof_required'] else 'reference'
     verdict='faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive';counts[(scope,host,'',label)][verdict]+=1
     if verdict=='slower' and scope=='fresh':regressions.append(dict(host=host,case=q['case'],input=q['input'],comparison=label,ratio_95pct=ci))
    if 'expert' in label:
     verdict=('Ink_faster' if ci[2]<1 else 'expert_faster' if ci[1]>1 else 'inconclusive') if a.startswith('ink_') else ('Ink_faster' if ci[1]>1 else 'expert_faster' if ci[2]<1 else 'inconclusive');controls[('fresh' if tasks[q['case']]['fresh_proof_required'] else 'reference',host,'',label)][verdict]+=1
  host_rows[host]=dict(samples=len(raw['samples']),warmups=len(raw['warmups']),calibration=len(raw['calibration']),complete_comparisons=raw['validation']['comparisons'])
 manifest=read(R/'browser-batches/manifest.json');assert len(manifest['batches'])==3 and manifest['main_metadata_sha256']==sha(R/'metadata.json') and manifest['main_fixture_sha256']==sha(R/'fixtures.json') and manifest['main_spec_sha256']==sha(R/'spec.json')
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
 native_raw=read(R/'native/results.json');assert len(native_raw['samples'])==10800 and len(native_raw['warmups'])==2400 and len(native_raw['calibration'])==1200
 native_validation=read(R/'native/validation.json');assert native_validation['exact_comparisons']==1140
 for q in read(R/'native/summary.json')['measurements']:
  for label,ci in q['paired_ratios_95pct'].items():
   if label=='prior_over_checked':counts[('fresh' if tasks[q['case']]['fresh_proof_required'] else 'reference','native',q['mode'],label)]['faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive']+=1
   if label=='checked_over_rust_expert':controls[('fresh' if tasks[q['case']]['fresh_proof_required'] else 'reference','native',q['mode'],label)]['Ink_faster' if ci[2]<1 else 'expert_faster' if ci[1]>1 else 'inconclusive']+=1
 outcome=read(R/'outcome-tables.json')
 for k,c in list(counts.items())+list(controls.items()):
  key='|'.join([*k,'all']);assert outcome['counts'][key]==dict(c),(key,c,outcome['counts'][key])
 interval=read(R/'root-interval-verification.json');assert interval['status']=='passed'
 shape=read(R/'code-shape-review.json');assert shape['status']=='passed' and shape['metadata_sha256']==sha(R/'metadata.json')
 for p,h in shape['bindings'].items():assert sha(R/p)==h,p
 native_review=R/'native-final-review.json';native_receipt=read(native_review) if native_review.exists() else None
 if native_receipt:assert native_receipt['status']=='passed' and native_receipt['independently_recomputed_paired_intervals']==960
 catalogue_path=R/'catalogue-review.json';catalogue=read(catalogue_path) if catalogue_path.exists() else None
 if catalogue:
  assert catalogue['status']=='passed' and not catalogue['errors'];obs=catalogue['observations'];assert obs['status']=='passed' and obs['added']==1200 and obs['hosts']=={'node':600,'browser':600}
 report=R/'REPORT.md'
 if report_sha:
  assert native_receipt and catalogue and sha(report)==report_sha
  for _,target in re.findall(r'\[([^\]]+)\]\(([^)]+)\)',report.read_text()):
   if not target.startswith('http') and target not in ['verification.json','final-binding.json','protocol-final-review.json']:assert (R/target).exists(),target
 paths=[Path(__file__),R/'metadata.json',R/'harness.py',R/'fixtures.json',R/'spec.json',R/'fixture-profile.json',R/'policy-freeze.json',R/'node-results.json',R/'browser-results.json',R/'browser-batches/manifest.json',R/'outcome-tables.json',R/'root-interval-verification.json',R/'native/results.json',R/'code-shape-review.json',R/'make-report.py',R/'protocol-compiled-preflight-review.json',B/'bench/compact_selection22.py',B/'planner/ink_planner/semantic_search.py']
 for p in [native_review,catalogue_path]:
  if p.exists():paths.append(p)
 if report_sha:paths.append(report)
 total_samples=sum(q['samples'] for q in host_rows.values())+len(native_raw['samples']);total_comparisons=sum(q['complete_comparisons'] for q in host_rows.values())+native_validation['exact_comparisons']
 result=dict(status='Final review passes' if report_sha else 'Raw protocol review passes; final report and peer bindings pending',bindings={str(p.relative_to(B)):sha(p) for p in paths},host_counts=host_rows,native_samples=10800,total_samples=total_samples,total_complete_comparisons=total_comparisons,fresh_tasks=12,reference_tasks=0,independently_checked_web_phase_rows=phases,independently_checked_saved_medians=medians,actual_GPU_prevalidation=sum(gpu_pre.values()),GPU_prevalidation_fallbacks=gpu_pre_fallbacks,GPU_schema_counts=dict(gpu_pre),actual_GPU_timed_variant_cells=gpu_timed,actual_GPU_timed_samples=gpu_timed*9,GPU_availability_fallbacks=gpu_availability_fallbacks,fresh_matched_prior_current_GPU_cells=sum(1 for c,i in cells if m['gpu_manifest']['prior'][c]['timing_eligible'] and m['gpu_manifest']['checked'][c]['timing_eligible'] and tasks[c]['fresh_proof_required']),new_GPU_eligibility_cells=sum(1 for c,i in cells if not m['gpu_manifest']['prior'][c]['timing_eligible'] and m['gpu_manifest']['checked'][c]['timing_eligible']),prior_current_counts={str(k):dict(v) for k,v in counts.items()},expert_counts={str(k):dict(v) for k,v in controls.items()},web_adverse_rows=regressions,
  caveats=['External dependency-closed admission batching retains all discovered roots; ordinary minimal-closure kernel checks authenticate every proposal/final selection without compiler/planner policy changes.', 'Complete web/native snapshot calls capture every declared input list even when the selected cardinality or lookup is O(1). Borrowed JS and native resident boundaries remain separate.', 'Fixture/availability calls compare all scalar words/vector outputs and input nonmutation. Timed iterations consume exact scalar/vector modular checksums, not complete goldens every iteration.', 'Strong experts already count length, early-exit forward first matches, erase unused prefix scans, or reuse vector scratch. Selected lookup folds may still scan all words and are not equivalent performance algorithms to early-exit experts.', 'First/interior/absent locations are frozen independently at every size/distribution; prefix words are remapped with exact donor before/after hashes. These are synthetic location profiles, not an external production corpus.', 'True U64 cardinality uses two Wasm result words and direct native scalar helpers. Scalar transport/copy cost remains part of full calls.', 'Actual GPU eligibility/counters are metadata-based for every variant; fallbacks are validated and excluded from timed GPU trials. No handwritten WGSL expert is included.', 'Three bounded contexts reset the shuffled-order seed; complete input/cell/global Rust indices and phase rows are retained. Merged first-call map contains only first context; all three raw maps remain.', 'Three common native untimed algorithm prewarm calls differ from two journaled warmups.', 'Exploratory confidence intervals are unadjusted and correlated; preset callbacks and machine-specific measurements do not establish broad language superiority.'],independently_recomputed_intervals_by_other_reviewers=interval['intervals_recomputed']+(960 if native_receipt else 0),canonical_observations=catalogue['observations']['current'] if catalogue else None)
 (R/'protocol-final-review.json').write_text(json.dumps(result,indent=2)+'\n')
 text=f"""# Round23 independent protocol review

{result['status']}.

All {len(m['artifact_hashes'])} frozen artifacts, {len(policy['artifacts'])} policy bindings and102 guarded sources are unchanged. Pretime review independently reconstructs every discovery/admission/proposal dependency closure and compiled ABI. Natural single-list sources, faithful staged controls, genuine U64 cardinality lanes and direct native scalar helpers are bound. All twelve CPU recipes are fresh under the fair prior/current catalogues.

Node contributes {host_rows['node']['samples']:,} samples, browser {host_rows['browser']['samples']:,} and native10,800: {total_samples:,} total. There are {total_comparisons:,} complete comparisons, {phases:,} authenticated web phase rows and {medians:,} exact medians. Nine-round shuffled order, calibration normalization and all checksums/counters are independently checked. Native journal and960 independently recomputed intervals are bound separately.

Every first/interior/absent lookup profile is fixed at each size/distribution; cardinality experts count length directly and lookup experts stop at first match, while selected folds may still traverse all input. Original stages remain materialized; scan experts erase unused state. Snapshot/captured calls still copy declared inputs, so kernel O(1) does not imply a complete O(1) call.

Actual GPU records include {sum(gpu_pre.values())} full-fixture executions, {gpu_pre_fallbacks} validated fallbacks and {gpu_timed} timed variant/cells. Schema1/schema2 upload/readback/dispatch counters, including empty outputs, are authenticated separately. Matching GPU prior/current pairs and new eligibility are different evidence; no missing/fallback sample is treated as slower GPU.

All {len(regressions)} adverse fresh web rows and every inconclusive/expert verdict are preserved with correct ratio orientation. Three browser context unions/phase concatenations are exact; only first context appears in the merged cold-call map. The report hash and independent catalogue/native/interval/code-shape receipts are bound. No algorithms, proof authority, policy, timed input or trial bytes were edited and no benchmark was rerun by this review.
"""
 (R/'protocol-final-review.md').write_text(text)
 print(json.dumps(dict(status=result['status'],phase_rows=phases,medians=medians,web_adverse=len(regressions),total_samples=total_samples,total_comparisons=total_comparisons)))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--report-sha');main(p.parse_args().report_sha)
