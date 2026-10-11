"""Independent replay from raw measurements; no new timing or canonical writes."""
from pathlib import Path
import collections,hashlib,json,math,random
R=Path(__file__).resolve().parents[1];P=R/'targets-measured'
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
families={t['name']:t['family'] for t in read(P/'spec.json')['tasks']}
analysis=read(R/'analysis.json');metadata=read(P/'metadata.json');fixtures={f['id']:f for f in read(P/'fixtures.json')['frames']}
checks={}
checks['all394_metadata_bindings']=len(metadata['bindings'])==394 and all(sha(P/p)==h for p,h in metadata['bindings'].items())
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
    left=groups[(host,boundary,frame,ref)] if (host,boundary,frame,ref) in groups else groups[(host,'captured-js-value' if ref=='expert_js_value' else 'captured-wasm-value',frame,ref)]
    right=groups[(host,boundary,frame,current)]
    xs=[math.log(left[i]['ns_per_call']/right[i]['ns_per_call'])for i in range(9)]
    web_gpu_cross=host=='browser' and current=='checked_gpu_requested_value' and ref in ('expert_js_value','rust_wasm_value')
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
old=read(R/'prior-observation-bindings.json');assert old['count']==24260==len(old['files'])
checks['all24260_prior_observations_unchanged']=all(sha(base/'knowledge/store/observations'/f)==h for f,h in old['files'].items())
assert len(analysis['strata'])==112 and len(analysis['aggregates'])==28
regressions=read(R/'regressions.json');assert regressions['rows']==analysis['prior_regressions'] and regressions['count']==len(regressions['rows'])
proof=[c for c in replayed if c['reference'].startswith('prior')];assert len(proof)==216
classes=collections.Counter(c['classification']for c in proof);assert classes==dict(faster=190,slower=6,inconclusive=20)
assert analysis['prior_regressions']==[c for c in proof if c['classification']=='slower']
# Scalar samples consume the complete returned U32, including native and web cohorts.
for group in groups.values():
 for sample in group.values():assert int(sample['checksum'])==(fixtures[sample['frame']]['expected']*sample['iterations'])%(2**(64 if 'native' in sample['boundary'] else 32))
# Recompute graph output capacities by named primary and graph reference; no route inference from stage count alone.
gpu_rows=[];gpu_calls=0;route_counts=collections.Counter()
for x in read(P/'browser-results.json')['samples']:
 if '_gpu_'not in x['variant']:continue
 f=fixtures[x['frame']];version=x['variant'].split('_')[0];mf=read(P/'targets'/f['task']/version/'manifest.json');fn=next(z for z in mf['functions']if z['name']==f['task']);assert fn['graph_required']is True and fn['result']['kind']=='u32'
 g=fn['graph'];inputs=[len(f['xs']),len(f['ys']),1,1];caps=[];node_bytes=0
 for node in g['nodes']:
  lengths=[inputs[a['param']]if'param'in a else caps[a['node']]for a in node['args']];c=node['capacity'];values=[lengths[i]for i in c['args']];cap=1 if c['kind']=='one'else(values[0]if c['kind']=='same'else(sum(values)if c['kind']=='sum'else min(values)));caps.append(cap);node_bytes+=4*(cap+(1 if node['result']['kind']=='list'else 0))
  if node['op']=='foldr':assert node['ordered']and node['workgroup_size']==1
 upload=4*(sum(inputs)+2);expected=dict(dispatches=len(g['nodes']),upload_bytes=upload,readback_bytes=4)
 assert x['actual_backend_counts']=={'gpu':x['iterations']} and x['contract']==expected and x['counters_total']=={k:v*x['iterations']for k,v in expected.items()}
 assert x['stage_capacity_model']==dict(capacities=caps,outputCount=1) and x['gpu_live_buffer_bytes_max']==upload+node_bytes+4
 gpu_rows.append(x);gpu_calls+=x['iterations'];route_counts[(families[f['task']],version,len(g['nodes']))]+=1
assert len(gpu_rows)==648
# Verify archived pre-timing fairness fix preserves every emitted source/selection artifact.
correction=read(R/'benchmark-preparation/rust-scalar32-correction.json');O=R/'targets-final'
assert correction['timed']is False and correction['after_metadata_sha256']==sha(P/'metadata.json') and correction['parent_metadata_sha256']==sha(O/'metadata.json')
for f,v in correction['changes'].items():assert sha(O/f)==v['before']and sha(P/f)==v['after']
om=read(O/'metadata.json');changed={f for f in om['bindings']if om['bindings'][f]!=metadata['bindings'].get(f)}
assert changed==set(correction['changed_prepared_files']) and set(metadata['bindings'])-set(om['bindings'])==set(correction['added_prepared_files'])
r=(P/'runner.mjs').read_text();assert 'rust.bench_eval_scalar32(index,xp,xs.length,yp,ys.length,f.seed,f.k)>>>0'in r and 'rust.bench_eval('not in r and 'BigInt(words[0])'not in r and 'BigInt(changedWords[0])'not in r
expert=(P/'expert.rs').read_text();oe=(O/'expert.rs').read_text();assert expert.split('#[no_mangle]',1)[0]==oe.split('#[no_mangle]',1)[0]
body=lambda s:s.split(' let mut acc=seed;',1)[1].split('_=>std::hint::unreachable_unchecked()',1)[0]
assert body(expert)==body(oe) and '*out=bench_eval_scalar32(task,x,nx,y,ny,seed,k);*out.add(1)=0;2'in expert
checks.update(all_raw_samples_valid=True,complete_scalar_checksums=True,all672_paired_bootstrap_replayed=True,all28_aggregates_recomputed=True,all112_family_strata_recomputed=True,all216_prior_cells_retained=True,all648_timed_gpu_rows_actual_device=True,physical_contracts_independent=True,pre_timing_scalar_control_correction_preserves_algorithms=True)
assert all(checks.values()),{k:v for k,v in checks.items()if not v}
by={}
for axis in ['family','mode','size']:
 d=collections.defaultdict(collections.Counter)
 for c in proof:
  f=fixtures[c['frame']];key=families[f['task']]if axis=='family'else(f['mode']if axis=='mode'else str(len(f['xs'])));d[key][c['classification']]+=1
 by[axis]={k:dict(v)for k,v in sorted(d.items())}
strong=[c for c in replayed if c['reference'].startswith(('expert','rust'))]
limits=['Four content-bound U32 source deployments of already-canonical generic ordered fold laws; zero new generic mathematics. No F32/GPU U64 benchmark claim.','Single machine, nine paired rounds; 4000 seeded draws and nominal per-cell95% intervals without multiplicity correction. Geometric means descriptive; correlated cells are not independent replications.','Six classified prior GPU regressions retained along with all uncertainty and point losses. Structural selection is static and does not guarantee profitable target rewrites.','Strong already-fused JS/Rust usually remain faster. No general native-beating claim follows from beating older Ink output.','All GPU primaries graph-required; actual dispatch reductions2/3/3/4 to1/1/1/2. Ordered reducers remain serial descending shaders; lower stages/buffers do not ensure faster full GPU calls.','Scalar complete-value consumption applies to both native and web; captured ingress and resident inputs remain separate. Unused ys transport is retained consistently. CPU heap peaks not measured.','Filtered joint cohorts use pre-timing seeds2/6 and k7 with varying word range/shape, not an independently crossed selectivity experiment. Composition probes named heldout are not statistical holdouts.','Frozen compiler/cost model with compile-time proof selection; no runtime load/state adaptive routing. Backend correspondence tests are finite and separate from proof soundness.']
report=dict(status='passed',checks=checks,samples=counts,total_samples=7560,raw_groups=840,replayed_comparisons=672,bootstrap_draws_each=4000,prior_proof_cells=dict(total=216,**classes,point_estimates_below_one=sum(c['ratio_reference_over_current']<1 for c in proof)),adverse_cell_summary=by,all_prior_classified_regressions=[c for c in proof if c['classification']=='slower'],all_prior_uncertain_cells=[c for c in proof if c['classification']=='inconclusive'],all_prior_point_losses=[c for c in proof if c['ratio_reference_over_current']<1],all_strong_control_regressions=[c for c in strong if c['classification']=='slower'],all_strong_control_uncertain=[c for c in strong if c['classification']=='inconclusive'],all_strong_point_losses=[c for c in strong if c['ratio_reference_over_current']<1],actual_timed_gpu=dict(rows=648,calls=gpu_calls,fallbacks=0,physical_routes=[dict(family=k[0],variant=k[1],stages=k[2],rows=v)for k,v in sorted(route_counts.items())]),prior_aggregates=[a for a in analysis['aggregates']if a['reference'].startswith('prior')],strong_expert_aggregates=[a for a in analysis['aggregates']if a['reference'].startswith(('expert','rust'))],limits=limits,bindings=dict(analysis=sha(R/'analysis.json'),metadata=sha(P/'metadata.json'),native_metadata=sha(P/'native/metadata.json'),scalar_correction=sha(R/'benchmark-preparation/rust-scalar32-correction.json'),proof_staging_review=sha(R/'review/proof-staging-review.json'),target_preflight_review=sha(R/'review/target-preflight-review.json'),script=sha(Path(__file__))))
(R/'review/final-performance-review.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(dict(status='passed',prior=report['prior_proof_cells'],gpu=report['actual_timed_gpu'],adverse=by)))
