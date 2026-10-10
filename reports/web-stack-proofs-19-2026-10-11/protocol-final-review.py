"""Independent frozen-protocol audit; consumes saved data only, no timing/builds."""
import argparse,collections,hashlib,json,math,statistics
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
CPU={f'ink_{k}_{b}' for k in ['baseline','prior','checked'] for b in ['js','wasm']}|{'ink_checked_borrowed_js','js_literal','js_expert','js_expert_borrowed','rust_literal_wasm','rust_expert_wasm'}
GPU={f'ink_{k}_gpu' for k in ['baseline','prior','checked']}
MASK=2**64-1

def observation(v):
 if not isinstance(v,list):return str(v),int(v)
 s=sum(v)&0xffffffff;w=sum((i+1)*v for i,v in enumerate(v))&0xffffffff
 return f'array:{len(v)}:{s}:{w}',(s+(w<<32)+len(v))&MASK

def counters(m,t,x):
 c=m['gpu_manifest']['checked'][t['name']];n=len(x['xs'])
 if c['schema']==2:return dict(dispatches=int(n>0),upload_bytes=n*4+24,readback_bytes=n*4)
 assert c['aggregate']=='sum' and len(c['stages'])==1 and c['stages'][0]['kind']=='map'
 passes=0;cap=max(1,n)
 while True:
  passes+=1;cap=(cap+255)//256
  if cap<=1:break
 return dict(dispatches=1+passes,upload_bytes=n*4+16,readback_bytes=4)

def main(report_sha=None):
 m=read(R/'metadata.json');f=read(R/'fixtures.json');s=read(R/'spec.json');tasks={t['name']:t for t in s['tasks']};inputs={x['id']:x for x in f['inputs']};cells={(c['case'],f['inputs'][c['input']]['id']) for c in f['cells']}
 for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
 assert len(m['artifact_hashes'])==998
 assert sha(m['compiler_path'])==m['compiler_sha256'];guard=read(R/'source-boundary-before.json')
 for p,h in guard.items():assert sha(B/p)==h,p
 assert read(R/'source-boundary-after.json')['after']==guard and len(guard)==102
 raw_hosts={h:read(R/f'{h}-results.json') for h in ['node','browser']}
 phase_count=0;median_count=0;hostrows={};counts=collections.defaultdict(collections.Counter);regressions=[];controlcounts=collections.defaultdict(collections.Counter)
 for host,raw in raw_hosts.items():
  assert raw['status']=='passed' and raw['parameters']==f['parameters'] and raw['parameters']['warmup']==2
  expected_variants=CPU|({'ink_checked_gpu'} if host=='browser' else set())
  wanted={(case,inp,v) for case,inp in cells for v in expected_variants}
  seen={phase:set() for phase in ['samples','warmups','calibration']};group=collections.defaultdict(lambda:collections.defaultdict(list))
  for phase in seen:
   for row in raw[phase]:
    key=(row['case'],row['input'],row['variant']);assert key in wanted
    i=row['iterations'];seconds=row['seconds'];assert isinstance(i,int) and i>0 and seconds>0 and math.isfinite(seconds)
    single,code=observation(inputs[row['input']]['expected'][row['case']]);assert row['single']==single and row['checksum']==str(code*i&MASK)
    assert math.isclose(row['ns_per_call'],seconds*1e9/i,rel_tol=1e-9)
    if row['variant'].endswith('_gpu'):
     wanted_counter={k:v*i for k,v in counters(m,tasks[row['case']],inputs[row['input']]).items()};assert row['gpu_counters']==wanted_counter
    else:assert row['gpu_counters'] is None
    index=row['round'] if phase=='samples' else row['warmup'] if phase=='warmups' else None
    record=(*key,index);assert record not in seen[phase];seen[phase].add(record);phase_count+=1
    if phase=='samples':group[(row['case'],row['input'])][row['variant']].append(row)
  assert seen['samples']=={(*key,i) for key in wanted for i in range(9)}
  assert seen['warmups']=={(*key,i) for key in wanted for i in range(2)}
  assert seen['calibration']=={(*key,None) for key in wanted}
  requests=CPU|(GPU if host=='browser' else set());availability=raw['availability']
  assert {(q['case'],q['input'],q['variant']) for q in availability}=={(c,i,v) for c,i in cells for v in requests} and len(availability)==len(cells)*len(requests)
  for q in availability:
   if q['variant'] in GPU:
    current=q['variant']=='ink_checked_gpu';assert (q['actual_backend']=='gpu')==current
    if current:
     c=q['counters'];wanted_c=counters(m,tasks[q['case']],inputs[q['input']]);assert all(c[k]==v for k,v in wanted_c.items())
   else:assert q['actual_backend']==('cpu' if q['variant'].startswith('ink_') and q['variant'].endswith('_wasm') else 'rust-wasm' if q['variant'].startswith('rust_') else 'javascript')
  expected_checks=len(f['inputs'])*len(requests)+len(cells)*len(requests)
  assert raw['validation']['comparisons']==expected_checks and raw['validation']['fixtures']==104
  if host=='browser':
   records=raw['gpu_validation']['records'];assert len(records)==312
   assert {(q['case'],q['input'],q['variant']) for q in records}=={(x['case'],x['id'],v) for x in f['inputs'] for v in GPU}
   actual=0;schemas=collections.Counter()
   for q in records:
    current=q['variant']=='ink_checked_gpu';assert (q['actual_backend']=='gpu')==current
    if current:
     actual+=1;contract=m['gpu_manifest']['checked'][q['case']];schemas[contract['schema']]+=1;c=q['counters'];w=counters(m,tasks[q['case']],inputs[q['input']]);assert all(c.get(k)==v for k,v in w.items())
     if contract['schema']==1:assert set(c)==set(w)
     else:assert set(c)==set(w)|{'live_buffer_bytes'} and isinstance(c['live_buffer_bytes'],int) and c['live_buffer_bytes']>=0 and c['live_buffer_bytes']%4==0
    else:assert q['counters'] is None or q['counters']==dict(dispatches=0,upload_bytes=0,readback_bytes=0)
   assert actual==104 and schemas=={1:78,2:26}
   assert (raw['gpu_validation']['actual_gpu'],raw['gpu_validation']['fallbacks'])==(104,208)
  summary=read(R/f'{host}-summary.json');assert len(summary['measurements'])==48
  for row in summary['measurements']:
   g=group[(row['case'],row['input'])];values={v:[q['ns_per_call'] for q in sorted(rs,key=lambda q:q['round'])] for v,rs in g.items()}
   assert row['median_ns']=={v:statistics.median(xs) for v,xs in values.items()};median_count+=len(values)
   for label,ci in row['paired_ratios_95pct'].items():
    a,b=row['ratio_variants'][label];assert ci[0]==statistics.median(values[a])/statistics.median(values[b]) and ci[1]<=ci[2]
    if label.startswith('prior_over_checked_'):
     verdict='faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive';counts[(host,label)][verdict]+=1
     if verdict=='slower':regressions.append(dict(host=host,case=row['case'],input=row['input'],comparison=label,ratio_95pct=ci))
    if 'expert' in label:
     inknum=a.startswith('ink_');verdict=('Ink_faster' if ci[2]<1 else 'expert_faster' if ci[1]>1 else 'inconclusive') if inknum else ('Ink_faster' if ci[1]>1 else 'expert_faster' if ci[2]<1 else 'inconclusive');controlcounts[(host,label)][verdict]+=1
  hostrows[host]=dict(samples=len(raw['samples']),calibration=len(raw['calibration']),warmups=len(raw['warmups']),complete_comparisons=raw['validation']['comparisons'])
 browser=raw_hosts['browser'];manifest=read(R/'browser-batches/manifest.json');assert sha(R/'metadata.json')==manifest['main_metadata_sha256'] and sha(R/'fixtures.json')==manifest['main_fixture_sha256'] and sha(R/'spec.json')==manifest['main_spec_sha256']
 parts=[];subinputs=[];subcells=[];subtasks=[]
 for b in manifest['batches']:
  folder=R/'browser-batches'/f'b{b["batch"]}';part=read(folder/'browser-results.json');assert part['status']=='passed';parts.append(part)
  assert sha(folder/'fixtures.json')==b['fixtures_sha256'] and sha(folder/'spec.json')==b['spec_sha256']
  sub=read(folder/'fixtures.json');sp=read(folder/'spec.json');subinputs+=sub['inputs'];subtasks+=sp['tasks'];subcells +=[(c['case'],sub['inputs'][c['input']]['id']) for c in sub['cells']]
  assert part['host']==browser['host'] and part['parameters']==browser['parameters']
  assert dict(part['gpu_adapter'],features=sorted(part['gpu_adapter']['features']))==dict(browser['gpu_adapter'],features=sorted(browser['gpu_adapter']['features']))
 assert subinputs==f['inputs'] and subtasks==s['tasks'] and subcells==[(c['case'],f['inputs'][c['input']]['id']) for c in f['cells']]
 for phase in ['samples','warmups','calibration','availability']:assert browser[phase]==[q for part in parts for q in part[phase]]
 assert browser['gpu_validation']['records']==[q for part in parts for q in part['gpu_validation']['records']]
 assert browser['elapsed_seconds']==sum(p['elapsed_seconds'] for p in parts)
 assert browser['startup_ms']=={k:sum(p['startup_ms'].get(k,0) for p in parts) for k in browser['startup_ms']}
 assert browser['first_validation_call_ms']==parts[0]['first_validation_call_ms']
 native=read(R/'native-final-review.json');assert native['status']=='passed'
 native_raw=read(R/'native/results.json');assert len(native_raw['samples'])==4320 and len(native_raw['warmups'])==960 and len(native_raw['calibration'])==480
 assert read(R/'native/validation.json')['exact_comparisons']==520
 native_counts={}
 for row in read(R/'native/summary.json')['measurements']:
  for label,ci in row['paired_ratios_95pct'].items():
   if label=='prior_over_checked':counts[('native:'+row['mode'],label)]['faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive']+=1
   if label=='checked_over_rust_expert':controlcounts[('native:'+row['mode'],label)]['Ink_faster' if ci[2]<1 else 'expert_faster' if ci[1]>1 else 'inconclusive']+=1
 outcome=read(R/'outcome-tables.json')
 for (host,label),c in list(counts.items())+list(controlcounts.items()):
  host,mode=host.split(':') if ':' in host else (host,'');key='|'.join(['fresh',host,mode,label,'all']);assert outcome['counts'][key]==dict(c),(key,c,outcome['counts'][key])
 ci_receipt=read(R/'root-interval-verification.json');assert ci_receipt['status']=='passed' and ci_receipt['intervals_recomputed']==1104
 assert native['independently_recomputed_paired_intervals']==384
 catalogue=read(R/'catalogue-review.json');assert catalogue['status']=='passed' and not catalogue['errors']
 obs=catalogue['observations'];assert obs['status']=='passed' and (obs['prior'],obs['current'],obs['added'])==(11106,11586,480) and obs['hosts']=={'node':240,'browser':240}
 assert obs['index']=={'proofs':1343,'members':1343,'observations':11586}
 report=R/'REPORT.md'
 if report_sha:
  assert sha(report)==report_sha
  import re
  for _,target in re.findall(r'\[([^\]]+)\]\(([^)]+)\)',report.read_text()):
   if not target.startswith('http') and target!='verification.json':assert (R/target).exists(),target
 bindings={str(p.relative_to(B)):sha(p) for p in [Path(__file__),R/'metadata.json',R/'fixtures.json',R/'spec.json',R/'node-results.json',R/'browser-results.json',R/'browser-batches/manifest.json',R/'native-final-review.json',R/'outcome-tables.json',R/'root-interval-verification.json',R/'catalogue-review.json']}
 if report_sha:bindings[str(report.relative_to(B))]=report_sha
 result=dict(status='Final review passes' if report_sha else 'Raw protocol review passes; final report wording pending',bindings=bindings,host_counts=hostrows,native_samples=4320,total_samples=15120,total_complete_comparisons=4624,independently_checked_web_phase_rows=phase_count,independently_checked_saved_medians=median_count,actual_gpu_validation_calls=104,gpu_validation_fallbacks=208,gpu_schema_counts={'schema1':78,'schema2':26},actual_gpu_timed_cells=48,actual_gpu_timed_samples=432,gpu_availability_fallbacks=96,prior_current_counts={str(k):dict(v) for k,v in counts.items()},strong_control_counts={str(k):dict(v) for k,v in controlcounts.items()},web_regressions=regressions,
   caveats=['Every complete output is compared before timing and for availability; timediterations consume exact modular checksums, not full-array goldens periteration.', 'All baseline/prior GPU requests fall back and all current requests run GPU: eligibility and cross-backend evidence only, no prior/current GPU speedup.', 'Current scalar mappings allocate intermediate arrays and paired JS uses sharing IIFEs; expert controls already fuse alltraversals and weighted experts apply two scalarweights afterloop.', 'Two disjoint bounded contexts preserve exact104fixtures48cells and globalRustindices; mergedcold first_validation_call map describes firstcontext only, rawparts retain both.', 'Stale validation.oracle label mentions18 score/projection; actual frozen19goldens/sourceverified forpartition+pairedvalue math.', 'Preset alternate callbacks are not independentexternalcorpus; no native language-isolation or expertWGSLcomparison. Current21fresh IDs relative1322effectiveprior exclude24sharedold bridges.', 'Existing15ms/9rounds/2warmups exploratoryindividualCIs have correlated views and no simultaneouscorrection. Alladversecells retained.'],independent_native_receipt_sha256=sha(R/'native-final-review.json'),independently_recomputed_intervals_by_other_reviewers=1488,canonical_wasm_observations_added=480,canonical_wasm_observations_total=11586)
 (R/'protocol-final-review.json').write_text(json.dumps(result,indent=2)+'\n')
 text=f'''# Round19 independent protocol review

{result['status']}. The 998 frozen artifacts and 102 source guards pass. The separate compiled preflight checked all 32 selection receipts and 40 bundle ABIs. No measured source, inputs, policy or programs changed.

Accepted samples are Node 5,184, browser 5,616 and native 4,320, totaling 15,120. The runners completed 1,824, 2,280 and 520 full-output comparisons respectively (4,624 total). Timed calls separately consume exact scalar/vector modular checksums. Independent saved web phase checks cover {phase_count:,} rows and {median_count:,} medians. The peer native review independently binds all 384 native intervals and the complete adaptive trial journal.

All 104 current GPU edge calls executed: 78 schema1 scalar reductions and 26 schema2 vector calls, including empty vectors with zero dispatch. Another 208 baseline/prior edge calls fell back. The 48 current timed GPU cells yielded 432 samples; 96 baseline/prior availability calls remain fallbacks. Counter expectations include every upload, recursive reduction dispatch and readback. No matched prior-GPU/current-GPU speedup exists.

Two bounded four-task browser contexts preserve the exact 104 frames, 48 cells, global Rust indices and raw phase concatenation. Startup costs sum both contexts. The merged first-validation-call map represents the first context only; both raw maps retain their cold calls.

Strong experts implement the original semantics with redundant stages removed. The weighted expert uses two accumulators and applies scalar weights after the loop, whereas selected Ink applies weights per element. Scalar Ink still materializes mapped arrays, and paired JS uses scalar-sharing IIFEs. Captured and borrowed JS, and native resident and snapshot boundaries, remain separate.

All supported, inconclusive and adverse views remain in saved summaries. The JSON receipt lists {len(regressions)} adverse web prior/current rows; the native peer reports four adverse rows per boundary. GPU eligibility does not establish profitability or a language ranking. The saved intervals are individual exploratory intervals with correlated views and no simultaneous correction.

The copied validation.oracle label describes round18 algorithms. The actual round19 source and golden values are independently corroborated complementary partitions and paired mapped values. Generic proofs, checked static deployments, shared old parity support and preset callback instantiations are counted separately. Earlier failed conditional certificates remain archived and excluded.
'''
 if report_sha:text+=f'\nFinal REPORT.md reviewed and bound: `{report_sha}`. No pending wording corrections.\n'
 (R/'protocol-final-review.md').write_text(text)
 print(json.dumps(dict(status=result['status'],phase_rows=phase_count,medians=median_count,web_regressions=len(regressions))))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--report-sha');main(p.parse_args().report_sha)
