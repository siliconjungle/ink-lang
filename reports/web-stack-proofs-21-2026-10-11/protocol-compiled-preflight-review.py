"""Independent frozen-byte/ABI preflight; no compiler, test or timing jobs."""
import hashlib,json,re,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text())
def metadata(p):
 match=re.search(r'export const metadata = (\{.*\});',p.read_text());assert match,p
 return json.loads(match.group(1))
def main():
 m=read(R/'metadata.json');f=read(R/'fixtures.json');s=read(R/'spec.json');guard=read(R/'source-boundary-before.json')
 assert len(f['inputs'])==180 and len(f['cells'])==72 and len(s['tasks'])==12
 for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
 assert sha(m['compiler_path'])==m['compiler_sha256']=='45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08'
 assert len(guard)==102
 for p,h in guard.items():assert sha(B/p)==h,p
 prep=read(R/'input-preparation/preparation.json');assert sha(R/'input-preparation/preparation.json')==m['input_preparation_sha256']
 old=Store(prep['prior_overlay']);new=Store(m['knowledge_root'],B/f'knowledge/store/snapshots/{m["new_snapshot"]}.json')
 assert old.snapshot_id==m['effective_prior_snapshot'] and len(old.members())==1528
 assert new.snapshot_id==m['new_snapshot'] and len(new.members())==1588
 assert set(old.members())<=set(new.members());fresh=set(new.members())-set(old.members());assert len(fresh)==60
 assert set(m['shared_old_witness_ids'])==set(prep['shared_old_witness_ids']) and len(m['shared_old_witness_ids'])==156
 rows=[];selections=packages=0
 for i,t in enumerate(s['tasks']):
  name=t['name'];info=m['tasks'][name];td=R/'tasks'/name;vector=t['output_kind']=='list_u32'
  assert t['index']==i and t['list_inputs']==['xs'] and t['params']==['xs','seed','k']
  assert t['scalar']==(not vector) and t['scalar_words']==1 and vector==(i>=6)
  assert info['checked_changes_prior'] and info['new_laws'] and set(info['new_laws'])<=fresh
  for kind,pin in [('prior',old.snapshot_id),('checked',new.snapshot_id)]:
   for prefix,model in [('',m['cost_model_sha256']),('gpu-',m['gpu_cost_model_sha256'])]:
    receipt=read(td/f'{prefix}{kind}-selection.receipt.json');selected=read(td/f'{prefix}{kind}-selection.json')
    assert receipt['status']=='passed' and not receipt['search']['exhausted'] and receipt['search']['cost_model']['sha256']==model
    assert receipt['check']['snapshot_sha256']==pin and receipt['check']['input_core_sha256']==info['core_sha256']
    assert receipt['check']['applied_laws']==[q['law'] for q in selected['applications']]
    assert sha(td/f'{prefix}{kind}-selection.json')==receipt['compact_selection_sha256'];selections+=1
  for output in ['baseline','prior','checked','gpu-prior','gpu-checked']:
   folder=R/output/name;manifest=read(folder/'manifest.json');js=metadata(folder/'program.mjs');fn=manifest['functions'][0]
   assert manifest['cpu_c_sha256']==sha(folder/'cpu.c') and manifest['core_sha256']==js['core_sha256']
   assert fn['name']==name and [p['name'] for p in fn['params']]==t['params']
   assert [p['name'] for p in js['functions'][0]['params']]==t['params'] and js['abi']=='ink-javascript-trusted-values-v2'
   assert (folder/'cpu.wasm').read_bytes()[:8]==b'\x00asm\x01\x00\x00\x00';packages+=1
  eligible={kind:m['gpu_manifest'][kind][name]['timing_eligible'] for kind in ['baseline','prior','checked']}
  assert eligible==dict(baseline=False,prior=False,checked=vector),(name,eligible)
  if vector:assert m['gpu_manifest']['checked'][name]['schema']==2
  rows.append(dict(task=name,params=t['params'],output=t['output_kind'],new_CPU_laws=info['new_laws'],gpu_eligible=eligible))
 for x in f['inputs']:assert not x['ys'] and list(x['expected'])==[x['case']]
 profile=read(R/'fixture-profile.json');assert profile['status']=='frozen' and len(profile['profiles'])==72
 for p in profile['profiles']:
  assert p['declared_list_inputs']==1
  if p['case'].startswith('partition'):
   assert p['predicate_true']>0 and p['predicate_false']>0
   for side in ['positive','negative']:
    if p[f'{side}_mapper_true'] is not None:assert p[f'{side}_mapper_true']>0 and p[f'{side}_mapper_false']>0
  else:
   for stage in ['first','second']:assert p[f'{stage}_stage_true']>0 and p[f'{stage}_stage_false']>0
 native=read(R/'native/metadata.json');nv=read(R/'native/validation.json');v=read(R/'node-validation.json')
 assert v['status']=='validation-passed' and v['validation']['fixtures']==180 and v['validation']['comparisons']==2160 and not v['samples']
 assert native['main_metadata_sha256']==sha(R/'metadata.json') and nv['metadata_sha256']==sha(R/'native/metadata.json') and nv['status']=='passed' and nv['exact_comparisons']==900
 for p,h in native['artifact_hashes'].items():assert sha(R/'native'/p)==h,p
 for mode in ['literal','expert']:
  rust=(R/f'{mode}.rs').read_text();adapter=(R/f'native/rust-{mode}.rs').read_text()
  assert 'pub fn bench_scalar(' in rust and '*out=bench_scalar(case,xs,ys,seed,k) as u32;1' in rust
  assert 'scalar:bench_scalar(task,xs,ys,seed,k)' in adapter and 'scalar:v|((*out.add(1)' not in adapter
 expert=(R/'expert.rs').read_text();assert expert.count('a.wrapping_mul(k).wrapping_add(b.wrapping_mul(3))')==2
 runner=(R/'runner.mjs').read_text();assert 'result_words:task.scalar?task.scalar_words:null' in runner
 preflight=read(R/'preflight-receipt.json');assert preflight['status']=='passed' and preflight['js']['comparisons']==360
 result=dict(status='compiled-pretime-review-passes',frozen_artifacts=len(m['artifact_hashes']),source_guards=102,compact_replayed_selections=selections,compiled_bundle_ABIs=packages,frames=180,timed_cells=72,CPU_validation=2160,native_validation=900,native_frozen_artifacts=len(native['artifact_hashes']),effective_prior_entries=1528,current_entries=1588,fresh_difference=60,shared_old_certificates=156,tasks=rows,
  scope='All12 CPU bodies change with fresh checked laws under symmetric frozen policy. Six indexed vectors become actual eligible schema2 GPU programs; all prior/baseline and all scalar GPU programs fall back. Additional checked scalar GPU-shaped compositions still fall back because exact quot_or callbacks require schema2 scalar output. No same-GPU fresh prior/current comparison exists. All natural signatures declare only xs; unused adapter ys is empty and not captured. Original controls materialize source stages, strong experts already fuse and evaluate selected callbacks once; weighted experts sink weights after two accumulators. Indices wrap U32 and each staged indexed operator starts at0. No timing/profitability claim.',bindings={str(p.relative_to(B)):sha(p) for p in [Path(__file__),R/'metadata.json',R/'fixtures.json',R/'spec.json',R/'fixture-profile.json',R/'node-validation.json',R/'native/metadata.json',R/'native/validation.json',R/'preflight-receipt.json',R/'harness.py']})
 (R/'protocol-compiled-preflight-review.json').write_text(json.dumps(result,indent=2)+'\n')
 (R/'protocol-compiled-preflight-review.md').write_text(f'Compiled pretime review passes.\n\nVerified {len(m["artifact_hashes"])} frozen artifacts, 102 source guards, 48 compact replay receipts and 60 exact compiled bundle ABIs. Saved web2160/native900 complete-output validations pass. Twelve CPU bodies change under symmetric frozen policies with genuine fresh laws beyond the effective prior1528 overlay. The same156 old-only checked opportunities are available in both stores.\n\nAll recipes have the natural(xs,seed,k) ABI. Native scalar Rust shares the exact Wasm algorithm helper but returns directly, without an output-store asymmetry. Strong weighted experts keep two accumulators and apply scalar weights once; indexed experts use one loop and reusable output scratch. Both actual partition-selected callback predicates and indexed stage gates exercise both directions in frozen timed profiles. Zero divisor and wrapping-index correctness are distinct from timed physical sizes.\n\nOnly the six current indexed vectors are GPU eligible. All prior/baseline kernels and current scalar kernels fall back; the additional checked mapped-aggregate composition does not overcome the exact quot_or/schema2 scalar output limitation. GPU results will establish eligibility and cross-backend costs only, with no same-GPU fresh prior/current ratio. No performance conclusion is claimed.\n')
 print(json.dumps({k:result[k] for k in ['status','frozen_artifacts','compact_replayed_selections','compiled_bundle_ABIs','CPU_validation','native_validation']}))
if __name__=='__main__':main()
