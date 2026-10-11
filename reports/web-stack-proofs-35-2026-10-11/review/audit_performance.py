"""Independent replay from raw measurements; no new timing or canonical writes."""
from pathlib import Path
import collections,hashlib,json,math,random
R=Path(__file__).resolve().parents[1];P=R/'targets'
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
families={t['name']:t['family'] for t in read(P/'spec.json')['tasks']}
analysis=read(R/'analysis.json');metadata=read(P/'metadata.json');fixtures={f['id']:f for f in read(P/'fixtures.json')['frames']}
checks={}
checks['all396_metadata_bindings']=len(metadata['bindings'])==396 and all(sha(P/p)==h for p,h in metadata['bindings'].items())
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
old=read(R/'prior-observation-bindings.json')
assert old['count']==23420==len(old['files'])
checks['all23420_prior_observations_unchanged']=all(sha(base/'knowledge/store/observations'/f)==h for f,h in old['files'].items())
checks['all112_strata_recomputed']=len(analysis['strata'])==112
regressions=read(R/'regressions.json')
assert regressions['rows']==analysis['prior_regressions'] and regressions['count']==len(regressions['rows'])
proof=[c for c in replayed if c['reference'].startswith('prior')]
assert len(proof)==216
classes=collections.Counter(c['classification']for c in proof)
assert classes==dict(faster=140,inconclusive=51,slower=25)
assert analysis['prior_regressions']==[c for c in proof if c['classification']=='slower']
# Actual device calls and independently derived physical contracts.
gpu_rows=[];gpu_calls=0
for x in read(P/'browser-results.json')['samples']:
    if not x['variant'].endswith('_gpu_requested'):continue
    f=fixtures[x['frame']];version=x['variant'].split('_')[0]
    fn=next(z for z in read(P/'targets'/f['task']/version/'manifest.json')['functions']if z['name']==f['task'])
    assert fn['graph_required'] is False
    nx,ny=len(f['xs']),len(f['ys']);capacity=max(nx,ny);n=len(f['expected']);payload=nx+ny+2
    expected=dict(dispatches=len(fn['graph']['nodes']),upload_bytes=4*(payload+2),readback_bytes=4*(n+1))if fn.get('graph_required')else dict(dispatches=int(capacity>0),upload_bytes=4*(payload+2+len(fn['params'])+1),readback_bytes=4*(capacity+1))
    assert x['actual_backend_counts']=={'gpu':x['iterations']}
    assert x['contract']==expected
    assert x['counters_total']=={k:v*x['iterations']for k,v in expected.items()}
    if not fn.get('graph_required'):
        assert x['stage_capacity_model'] is None
        assert x['gpu_live_buffer_bytes_max']==4*(payload+2)+20+12*(capacity+1)
    gpu_rows.append(x);gpu_calls+=x['iterations']
assert len(gpu_rows)==648
checks.update(all_raw_samples_valid=True,all672_paired_bootstrap_replayed=True,all_aggregates_recomputed=True,all216_prior_cells_retained=True,all648_timed_gpu_rows_actual_device=True,physical_contracts_independent=True)
adverse_by={}
for axis in ['family','mode','size']:
    d=collections.defaultdict(collections.Counter)
    for c in proof:
        f=fixtures[c['frame']]
        k=families[f['task']] if axis=='family' else (f['mode'] if axis=='mode' else str(len(f['xs'])))
        d[k][c['classification']]+=1
    adverse_by[axis]={k:dict(v)for k,v in sorted(d.items())}
checks['all25_regressions_retained']=len(analysis['prior_regressions'])==25
report=dict(adverse_cell_summary=adverse_by,status='passed' ,checks=checks,samples=counts,total_samples=7560,raw_groups=840,replayed_comparisons=672,bootstrap_draws_each=4000,prior_proof_cells=dict(total=216,faster=140,slower=25,inconclusive=51,point_estimates_below_one=sum(c['ratio_reference_over_current']<1 for c in proof)),all_prior_classified_regressions=[c for c in proof if c['classification']=='slower'],all_prior_uncertain_cells=[c for c in proof if c['classification']=='inconclusive'],all_strong_control_regressions=[c for c in replayed if c['reference'].startswith(('expert','rust')) and c['classification']=='slower'],all_strong_control_uncertain=[c for c in replayed if c['reference'].startswith(('expert','rust')) and c['classification']=='inconclusive'],all_point_estimates_below_one=[c for c in proof if c['ratio_reference_over_current']<1],actual_timed_gpu=dict(rows=648,calls=gpu_calls,fallbacks=0),prior_aggregates=[a for a in analysis['aggregates']if a['reference'].startswith('prior')],strong_expert_aggregates=[a for a in analysis['aggregates']if a['reference'].startswith(('expert','rust'))],limits=['Four U32 left/right/both/nested source contexts of direct observed mapped-zip fusion; generic derived proofs U32/I32/U64, no F32 or GPU U64 claim.','Single machine with paired nine rounds; nominal per-cell 95% intervals, no multiplicity correction; aggregate geometric means descriptive.','Twenty-five classified prior regressions and forty-four point estimates below1 are retained. Profitability depends on target, family, joint shape/value cohort and size; automatic static selection can regress.','Full Wasm remains transport bound; strong handwritten controls usually faster; GPU requests remain far slower than CPU controls.','GPU legacy capacity uses maximum input length; all literal/prior/checked primaries use the legacy shader path, with equal prior/checked physical dispatch/upload/readback/live-buffer counts despite declared graph stage fusion.','Compile-time proof selection under a frozen structural model, no runtime load/state adaptation.','Node/browser length+first+last timed consumption versus native full-vector consumption; host/boundary ratios are not pooled.'],bindings=dict(analysis=sha(R/'analysis.json'),metadata=sha(P/'metadata.json'),script=sha(Path(__file__))))
assert all(checks.values())
(R/'review/final-performance-review.json').write_text(json.dumps(report,indent=2)+'\n')
lines=[
'# Batch35 independent performance review',
'',
'Independent replay passed: all 7,560 raw samples in 840 nine-round groups, all 672 seeded paired comparisons with 4,000 bootstrap draws each, all 28 aggregates and all 112 left/right/both/nested strata reproduce the recorded statistics. The 396 target, 107 native and 122 production bindings, timing freeze, raw/audit bindings and all 23,420 prior observation files are unchanged.',
'',
'Against the exact canonical prior, 216 cells contain 140 confirmed wins, 25 confirmed losses and 51 uncertain comparisons. Forty-four point estimates are below parity, comprising the 25 confirmed losses and 19 uncertain cells. Full adverse and uncertain rows are retained in final-performance-review.json; no measurements, controls or selection policy were changed.',
'',
'Losses occur in all four families: both 13, right 6, left 3 and nested 3. Twenty are in the joint low-word/ys=nx+7 cohort and five in the full-width/ys=floor(nx/3)+1 cohort. Twelve are at size 4,096, eleven at 65,536 and two at 32. These are counts of correlated host/boundary cells, not independent repetitions or one-factor causal experiments.',
'',
'The largest losses are browser right-map JS at 4,096 and 65,536 in both joint cohorts: prior/checked ratios 0.571–0.649, approximately 1.54–1.75 times slower after fusion. Both-map low-cohort resident Wasm and native large-size losses recur around 3–4%. This evidence establishes target/workload sensitivity; it does not establish a JIT, vectorization or allocation cause without profiling.',
'',
'Prior-relative descriptive geometric means: Node JS 1.187, browser JS 1.080; resident Wasm 1.372/1.374; native resident 1.742, copied-input 1.379; full Wasm 1.014/1.010; GPU 1.020. A positive aggregate does not hide per-cell regressions or confer a guaranteed profitable rewrite.',
'',
'All 648 timed GPU rows were actual device executions: 10,575 calls, zero fallback. Every selected primary function was resolved by name and has graph_required=false. Independently recomputed dispatch, upload, readback and live-buffer contracts match all raw counters. Prior and checked physical work is unchanged; declared graph stages 2/2/3/4 to 1/1/1/1 are not physical dispatch savings. GPU prior comparisons contain 2 wins, 2 losses and 20 uncertain cells, providing no general GPU gain.',
'',
'Already-fused controls remain essential. Checked/expert-relative performance uses reference/current ratios: native expert/Ink 0.887 resident and 0.927 copied, browser JS expert/Ink 0.887, Node JS 1.021; strong Rust full Wasm/Ink 0.452 browser and 0.428 Node. Node JS has 14 confirmed wins, 7 losses and 3 uncertain expert comparisons; this is a narrow mixed result, not broad native-language superiority. All strong-control losses and uncertain cells are retained.',
'',
'These proofs are semantically sound DB search shortcuts; the unchanged structural cost model still chooses all four source replacements despite observed regressions. Publication of correctness evidence must preserve these performance limits and adverse observations. There is no runtime load/state adaptation and no guaranteed cross-target win.',
'',
'Limits: four U32 composition probes, one machine, paired nine rounds, nominal per-cell 95% intervals without multiplicity correction. Family labels in names containing heldout do not establish a statistically independent holdout set. Web timing consumes length/first/last, native timing consumes complete vectors; hosts and ownership/transport boundaries are kept separate. CPU and GPU-driver peak heaps were not measured. Finite tests and target validation do not establish universal backend correspondence.'
]
(R/'review/performance-review.md').write_text('\n'.join(lines)+'\n')
print(json.dumps(dict(status=report['status'],samples=7560,comparisons=672,proof=report['prior_proof_cells'],actual_gpu=report['actual_timed_gpu'])))
