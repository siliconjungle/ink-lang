"""Independent replay from raw measurements; no new timing or canonical writes."""
from pathlib import Path
import collections,hashlib,json,math,random
R=Path(__file__).resolve().parents[1];P=R/'targets'
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
families={t['name']:t['family']+('_composed'if t['secondary']else '_plain')for t in read(P/'spec.json')['tasks']}
analysis=read(R/'analysis.json');metadata=read(P/'metadata.json');fixtures={f['id']:f for f in read(P/'fixtures.json')['frames']}
checks={}
checks['all324_metadata_bindings']=len(metadata['bindings'])==324 and all(sha(P/p)==h for p,h in metadata['bindings'].items())
checks['all_analysis_bindings']=all(sha(R/p)==h for p,h in analysis['bindings'].items())
checks['all_timing_freeze_bindings']=all(sha(R/f)==h for f,h in read(R/'timing-freeze.json')['bindings'].items())
checks['compiler_unchanged']=sha(metadata['compiler'])==metadata['compiler_sha256']
source=read(R.parent/'web-stack-proofs-32-2026-10-11/main-integration/published-compiler-binding.json')
base=R.parents[1]
checks['all122_production_sources_unchanged']=all(sha(base/f)==h for f,h in source['source_bindings'].items())
native_meta=read(P/'native/metadata.json')
checks['all107_native_bindings']=len(native_meta['bindings'])==107 and all(sha(P/'native'/f)==h for f,h in native_meta['bindings'].items())
checks['native_exact_main_metadata']=native_meta['main_metadata_sha256']==sha(P/'metadata.json')
for host in ('node','browser'):
    for suffix,result_suffix in [('-audit.json','-results.json'),('-validation-audit.json','-validation.json')]:
        audit=read(P/(host+suffix));checks[host+suffix+'_bound']=audit['status']=='passed' and audit['bindings']['metadata']==sha(P/'metadata.json') and audit['bindings']['results']==sha(P/(host+result_suffix))
audit=read(P/'native/audit.json')
checks['native_audit_bound']=audit['status']=='passed' and audit['bindings']==dict(metadata=sha(P/'native/metadata.json'),results=sha(P/'native/results.json'),journal=sha(P/'native/journal.json'))
groups={};counts={}
for host,f in [('node','node-results.json'),('browser','browser-results.json'),('native','native/results.json')]:
    result=read(P/f);assert result['status']=='passed'
    counts[host]=len(result['samples'])
    for sample in result['samples']:
        key=(host,sample['boundary'],sample['frame'],sample['variant']);rounds=groups.setdefault(key,{})
        assert sample['round'] not in rounds and sample['iterations']>0 and sample['ns_per_call']>0 and sample['elapsed_ms']>0
        assert math.isclose(sample['ns_per_call'],sample['elapsed_ms']*1e6/sample['iterations'],rel_tol=1e-12)
        rounds[sample['round']]=sample
assert counts==dict(node=2592,browser=3240,native=1728)
assert all(set(g)==set(range(9)) for g in groups.values())
assert len(groups)==840 and sum(counts.values())==7560
# Pair each raw measured round; derive the recorded seeded draw stream independently.
replayed=[]
for c in analysis['comparisons']:
    host,boundary,frame,ref,current=[c[k]for k in ['host','boundary','frame','reference','current']]
    left=groups[(host,boundary,frame,ref)] if (host,boundary,frame,ref) in groups else groups[(host,'captured-js-owned' if ref=='expert_js_owned' else 'captured-wasm-owned',frame,ref)]
    right=groups[(host,boundary,frame,current)]
    xs=[math.log(left[i]['ns_per_call']/right[i]['ns_per_call'])for i in range(9)]
    web_gpu_cross=host=='browser' and current=='checked_gpu_requested' and ref in ('expert_js_owned','rust_wasm_full')
    key=host+'/'+boundary+'/'+frame+'/'+ref+'/'+current if host=='native' or web_gpu_cross else frame+'/'+ref+'/'+current
    seed=int(hashlib.sha256(key.encode()).hexdigest()[:16],16);assert seed==c['bootstrap_seed']
    rng=random.Random(seed)
    draws=[]
    for _ in range(4000):
        # random.choices without weights selects floor(random()*population_length).
        indices=[int(rng.random()*9)for _ in range(9)]
        draws.append(math.exp(math.fsum(xs[i]for i in indices)/9))
    draws.sort();lo,hi=draws[100],draws[3899];ratio=math.exp(math.fsum(xs)/9)
    classification='faster'if lo>1 else 'slower'if hi<1 else 'inconclusive'
    assert math.isclose(ratio,c['ratio_reference_over_current'],rel_tol=1e-12)
    assert all(math.isclose(v,w,rel_tol=1e-12)for v,w in zip([lo,hi],c['ci95']))
    assert classification==c['classification']
    replayed.append(c)
assert len(replayed)==672
assert len({tuple(c[k]for k in ['host','boundary','frame','reference','current'])for c in replayed})==672
for a in analysis['aggregates']:
    cells=[c for c in replayed if all(c[k]==a[k]for k in ['host','boundary','reference','current'])]
    assert len(cells)==a['cells']==24
    gm=math.exp(math.fsum(math.log(c['ratio_reference_over_current'])for c in cells)/24)
    assert math.isclose(gm,a['geomean'],rel_tol=1e-12)
    assert sum(c['classification']=='faster'for c in cells)==a['wins']
    assert sum(c['classification']=='slower'for c in cells)==a['losses']
    assert sum(c['classification']=='inconclusive'for c in cells)==a['inconclusive']
for a in analysis['strata']:
    cells=[c for c in replayed if all(c[k]==a[k] for k in ['host','boundary','reference','current']) and families[fixtures[c['frame']]['task']]==a['cohort']]
    assert len(cells)==a['cells']==6
    gm=math.exp(math.fsum(math.log(c['ratio_reference_over_current']) for c in cells)/6)
    assert math.isclose(gm,a['geomean'],rel_tol=1e-12)
    assert sum(c['classification']=='faster' for c in cells)==a['wins']
    assert sum(c['classification']=='slower' for c in cells)==a['losses']
    assert sum(c['classification']=='inconclusive' for c in cells)==a['inconclusive']
old=read(R/'prior-observation-bindings.json');assert old['count']==25100==len(old['files'])
checks['all25100_prior_observations_unchanged']=all(sha(base/'knowledge/store/observations'/f)==h for f,h in old['files'].items())
assert len(analysis['strata'])==112 and len(analysis['aggregates'])==28
regressions=read(R/'regressions.json');assert regressions['rows']==analysis['prior_regressions']and regressions['count']==len(regressions['rows'])
proof=[c for c in replayed if c['reference'].startswith('prior')];assert len(proof)==216
classes=collections.Counter(c['classification']for c in proof);assert classes==dict(faster=164,slower=5,inconclusive=47)
assert analysis['prior_regressions']==[c for c in proof if c['classification']=='slower']
# Reconstruct all-word web consumption from expected vectors, independently of saved consumption codes.
consumption={};web_results={}
for host in ['node','browser']:
 d=read(P/f'{host}-results.json');web_results[host]=d;total=0;elements=0
 bykey=collections.defaultdict(list)
 for row in d['calibration']+d['samples']:
  a=fixtures[row['frame']]['expected'];code=(len(a)+sum((i+1)*x for i,x in enumerate(a)))%(2**32);assert code==fixtures[row['frame']]['web_consumption_code'];assert int(row['checksum'])==code*row['iterations']%(2**32)
  assert row['consumed_elements_per_call']==len(a)and row['consumed_elements']==len(a)*row['iterations'] and 'every returned vector word read inside timer'in row['checksum_semantics'];total+=int(row['checksum']);elements+=row['consumed_elements']
  assert row['iterations']>0 and math.isclose(row['ns_per_call'],row['elapsed_ms']*1e6/row['iterations'],rel_tol=1e-12)
  if 'round'not in row:bykey[(row['frame'],row['variant'])].append(row)
 assert d['observable']==total%(2**32)
 assert len(bykey)==(288 if host=='node'else 360)
 for (frame,variant),rows in bykey.items():
  assert rows[0]['iterations']==1 and all(b['iterations']==2*a['iterations']and a['elapsed_ms']<8 for a,b in zip(rows,rows[1:]));assert rows[-1]['elapsed_ms']>=8 or rows[-1]['iterations']==65536
  assert all(x['iterations']==rows[-1]['iterations']for x in d['samples']if x['frame']==frame and x['variant']==variant)
 assert len(d['warmups'])==2*len(bykey) and all(r['passed']for r in d['warmups'])
 consumption[host]={'samples':len(d['samples']),'calibration_batches':len(d['calibration']),'warmup_calls':len(d['warmups']),'consumed_elements_samples_and_calibration':elements,'all_checksum_count_journal_recomputed':True}
# Native consumes a U64 code built from complete U32 sum and weighted sum.
nr=read(P/'native/results.json');cal=collections.defaultdict(list)
def native_code(frame):
 a=fixtures[frame]['expected'];s=sum(a)%2**32;w=sum((i+1)*x for i,x in enumerate(a))%2**32
 return f'array:{len(a)}:{s}:{w}',(s+(w<<32)+len(a))%2**64
for row in nr['calibration']+nr['samples']:
 _,code=native_code(row['frame']);assert int(row['checksum'])==code*row['iterations']%2**64
 if 'round'not in row:cal[(row['frame'],row['variant'],row['boundary'])].append(row)
assert len(cal)==192
for (frame,variant,boundary),rows in cal.items():
 assert rows[0]['iterations']==1 and all(b['iterations']==2*a['iterations']and a['elapsed_ms']<8 for a,b in zip(rows,rows[1:]));assert rows[-1]['elapsed_ms']>=8 or rows[-1]['iterations']==65536
 assert all(x['iterations']==rows[-1]['iterations']for x in nr['samples']if x['frame']==frame and x['variant']==variant and x['boundary']==boundary)
rng=random.Random(native_meta['protocol']['seed']);wanted=[]
for f in [f for f in fixtures.values()if f['timed']]:
 for boundary in ['resident-native-destination','captured-native-destination']:
  for variant in native_meta['libraries']:wanted+=cal[(f['id'],variant,boundary)]
  for r in range(9):
   order=list(native_meta['libraries']);rng.shuffle(order)
   for variant in order:wanted.append(groups[('native',boundary,f['id'],variant)][r])
assert len(wanted)==len(nr['journal'])and nr['journal']==read(P/'native/journal.json')
for row,j in zip(wanted,nr['journal']):
 argv=j['argv'];f=fixtures[row['frame']];tasks=read(P/'spec.json')['tasks'];task=next(t for t in tasks if t['name']==f['task']);assert j['exit_code']==0
 assert Path(argv[0]).resolve()==(P/'native/driver').resolve() and argv[1]==native_meta['libraries'][row['variant']]and argv[2]==native_meta['binaries'][row['frame']]
 assert argv[3:]==list(map(str,[tasks.index(task),1,row['iterations'],int(row['boundary']=='captured-native-destination'),2]))
 value=json.loads(j['stdout']);single,code=native_code(row['frame']);assert value['single']==single and int(value['code'])==code and value['iterations']==row['iterations']and value['checksum']==row['checksum']and math.isclose(value['seconds']*1000,row['elapsed_ms'],rel_tol=1e-12,abs_tol=1e-15)
consumption['native']={'samples':len(nr['samples']),'calibration_batches':len(nr['calibration']),'complete_u64_checksums_and_subprocess_journal_recomputed':True}
# Named primary routes and physical counters; logical stage removal is inactive under legacy shaders.
gpu_rows=[];gpu_calls=0;cal_gpu_calls=0
for scope,rows in [('samples',web_results['browser']['samples']),('calibration',web_results['browser']['calibration'])]:
 for x in rows:
  if not x['variant'].endswith('_gpu_requested'):continue
  f=fixtures[x['frame']];version=x['variant'].split('_')[0];fn=next(z for z in read(P/'targets'/f['task']/version/'manifest.json')['functions']if z['name']==f['task']);assert fn['graph_required']is False
  nx,ny=len(f['xs']),len(f['ys']);capacity=max(nx,ny);words=nx+ny+4;expected=dict(dispatches=int(capacity>0),upload_bytes=4*(words+len(fn['params'])+1),readback_bytes=4*(capacity+1))
  assert x['actual_backend_counts']=={'gpu':x['iterations']} and x['contract']==expected and x['counters_total']=={k:v*x['iterations']for k,v in expected.items()}and x['stage_capacity_model']is None
  assert x['gpu_live_buffer_bytes_max']==4*words+20+12*(capacity+1)
  if scope=='samples':gpu_rows.append(x);gpu_calls+=x['iterations']
  else:cal_gpu_calls+=x['iterations']
assert len(gpu_rows)==648
checks.update(all_raw_samples_valid=True,all672_paired_bootstrap_replayed=True,all28_aggregates_recomputed=True,all112_orientation_composition_strata_recomputed=True,all216_prior_cells_retained=True,all648_timed_gpu_rows_actual_device=True,physical_contracts_independent=True,all_word_web_checksum_iterations_element_counts_and_calibration_recomputed=True,complete_native_u64_and_process_journal_recomputed=True)
assert all(checks.values()),{k:v for k,v in checks.items()if not v}
strong=[c for c in replayed if c['reference'].startswith(('expert','rust'))];by={}
for axis in ['recipe','mode','size']:
 d=collections.defaultdict(collections.Counter)
 for c in proof:
  f=fixtures[c['frame']];k=families[f['task']]if axis=='recipe'else(f['mode']if axis=='mode'else str(len(f['xs'])));d[k][c['classification']]+=1
 by[axis]={k:dict(v)for k,v in sorted(d.items())}
limits=['One backend-neutral independent indexed-map demand-erasure law family, six U32/I32/U64 endpoints plus12proof supports; four helper-bound U32 vector deployments. No F32/GPU U64 performance claim.','Single machine, nine paired rounds,4000seeded draws; nominal per-cell95% intervals without multiplicity correction, descriptive aggregate geometric means, correlated cells not independent repetitions.','Five classified prior losses and all point losses/uncertainty retained. Static structural selection can regress; correctness and profitability distinct.','All literal/prior/checked named primaries use legacy GPU shader paths; physical dispatch/upload/readback/live buffers unchanged despite declared2→1graph nodes. Driver dead-code removal is a possible explanation, not profiled evidence.','Already-fused native Rust/JS controls usually faster or near parity. Native Ink is C emitted and built with clang against Rust expert; this is not Ink-to-Rust lowering.','All output words consumed inside timer. Web uses weighted modulo U32, native independent complete-vector U64code. Separate captured/resident destination/owned boundaries and host-specific consumption overhead; no pooled host ranking.','Four orientation/plain/composed recipes are not four mathematical families. Names containing heldout are composition probes, not independent statistical holdouts. Joint shape/value regimes are not one-factor experiments.','No runtime load/state adaptation, new routing policy, core/compiler/cost model changes. CPU peak heap/driver heap unmeasured; finite output/checksum validation is not universal backend correspondence.']
report=dict(status='passed',checks=checks,samples=counts,total_samples=7560,raw_groups=840,replayed_comparisons=672,bootstrap_draws_each=4000,prior_proof_cells=dict(total=216,**classes,point_estimates_below_one=sum(c['ratio_reference_over_current']<1 for c in proof)),adverse_cell_summary=by,all_prior_classified_regressions=[c for c in proof if c['classification']=='slower'],all_prior_uncertain_cells=[c for c in proof if c['classification']=='inconclusive'],all_prior_point_losses=[c for c in proof if c['ratio_reference_over_current']<1],all_strong_control_regressions=[c for c in strong if c['classification']=='slower'],all_strong_control_uncertain=[c for c in strong if c['classification']=='inconclusive'],all_strong_point_losses=[c for c in strong if c['ratio_reference_over_current']<1],actual_timed_gpu=dict(rows=648,calls=gpu_calls,fallbacks=0,calibration_calls=cal_gpu_calls,all_named_primaries_legacy=True,physical_prior_checked_counts_equal=True),full_output_consumption=consumption,prior_aggregates=[a for a in analysis['aggregates']if a['reference'].startswith('prior')],strong_expert_aggregates=[a for a in analysis['aggregates']if a['reference'].startswith(('expert','rust'))],limits=limits,bindings=dict(analysis=sha(R/'analysis.json'),metadata=sha(P/'metadata.json'),script=sha(Path(__file__)),proof_review=sha(R/'review/proof-staging-review.json'),preflight_review=sha(R/'review/target-preflight-review.json')))
(R/'review/final-performance-review.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'passed','prior':report['prior_proof_cells'],'gpu':report['actual_timed_gpu'],'consumption':consumption,'adverse':by}))
