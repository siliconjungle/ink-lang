"""Independent replay from raw measurements; no new timing or canonical writes."""
from pathlib import Path
import collections,hashlib,json,math,random
R=Path(__file__).resolve().parents[1];P=R/'targets-final'
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
analysis=read(R/'analysis.json');metadata=read(P/'metadata.json');fixtures={f['id']:f for f in read(P/'fixtures.json')['frames']}
checks={}
checks['all316_metadata_bindings']=all(sha(P/p)==h for p,h in metadata['bindings'].items())
checks['all_analysis_bindings']=all(sha(R/p)==h for p,h in analysis['bindings'].items())
checks['corrected_metadata_frozen']=read(R/'timing-freeze.json')['metadata_sha256']==sha(P/'metadata.json')
checks['compiler_unchanged']=sha(metadata['compiler'])==metadata['compiler_sha256']
source=read(R.parent/'web-stack-proofs-32-2026-10-11/main-integration/published-compiler-binding.json')
base=R.parents[1]
checks['all122_production_sources_unchanged']=all(sha(base/f)==h for f,h in source['source_bindings'].items())
native_meta=read(P/'native/metadata.json')
checks['all107_native_bindings']=all(sha(P/'native'/f)==h for f,h in native_meta['bindings'].items())
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
proof=[c for c in replayed if c['reference'].startswith('prior')]
assert len(proof)==216
classes=collections.Counter(c['classification']for c in proof)
assert classes==dict(faster=194,inconclusive=22)
assert analysis['prior_regressions']==[c for c in proof if c['classification']=='slower']
# Actual device calls and independently derived physical contracts.
gpu_rows=[];gpu_calls=0
for x in read(P/'browser-results.json')['samples']:
    if not x['variant'].endswith('_gpu_requested'):continue
    f=fixtures[x['frame']];version=x['variant'].split('_')[0]
    fn=next(z for z in read(P/'targets'/f['task']/version/'manifest.json')['functions']if z['name']==f['task'])
    nx,ny=len(f['xs']),len(f['ys']);capacity=max(nx,ny);n=len(f['expected']);payload=nx+ny+2
    expected=dict(dispatches=len(fn['graph']['nodes']),upload_bytes=4*(payload+2),readback_bytes=4*(n+1))if fn.get('graph_required')else dict(dispatches=int(capacity>0),upload_bytes=4*(payload+2+len(fn['params'])+1),readback_bytes=4*(capacity+1))
    assert x['actual_backend_counts']=={'gpu':x['iterations']}
    assert x['contract']==expected
    assert x['counters_total']=={k:v*x['iterations']for k,v in expected.items()}
    gpu_rows.append(x);gpu_calls+=x['iterations']
assert len(gpu_rows)==648
checks.update(all_raw_samples_valid=True,all672_paired_bootstrap_replayed=True,all_aggregates_recomputed=True,all216_prior_cells_retained=True,all648_timed_gpu_rows_actual_device=True,physical_contracts_independent=True)
report=dict(status='passed',checks=checks,samples=counts,total_samples=7560,raw_groups=840,replayed_comparisons=672,bootstrap_draws_each=4000,prior_proof_cells=dict(total=216,faster=194,slower=0,inconclusive=22,point_estimates_below_one=sum(c['ratio_reference_over_current']<1 for c in proof)),uncertain_point_losses=[c for c in proof if c['ratio_reference_over_current']<1],actual_timed_gpu=dict(rows=648,calls=gpu_calls,fallbacks=0),prior_aggregates=[a for a in analysis['aggregates']if a['reference'].startswith('prior')],strong_expert_aggregates=[a for a in analysis['aggregates']if a['reference'].startswith(('expert','rust'))],limits=['Four U32 source contexts of one erasure mechanism; generic proofs U32/I32/U64, no F32 scan or GPU U64 claim.','Single machine with paired nine rounds; nominal per-cell95% intervals, no multiplicity correction; aggregate geometric means descriptive.','Eight prior comparison point estimates fall below1 with intervals crossing1; no classified prior regression is not a guarantee against regressions.','Full Wasm largely transport bound; handwritten strong controls usually faster; GPU requests remain far slower than CPU controls.','GPU legacy capacity uses maximum input length; transfer/live-buffer costs may increase despite scan erasure.','Compile-time proof selection under a frozen structural model, no runtime load/state adaptation.','Node/browser length+first+last timed consumption versus native full-vector consumption; host/boundary ratios are not pooled.'],bindings=dict(analysis=sha(R/'analysis.json'),metadata=sha(P/'metadata.json'),script=sha(Path(__file__))))
assert all(checks.values())
(R/'review/final-performance-review.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(dict(status=report['status'],samples=7560,comparisons=672,proof=report['prior_proof_cells'],actual_gpu=report['actual_timed_gpu'])))
