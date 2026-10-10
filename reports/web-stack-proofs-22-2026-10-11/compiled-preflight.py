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
def encoded(value):return json.dumps(value,separators=(',',':')).encode()+b'\n'
def orchestration(receipt,selected,store,core_hash):
 o=receipt['orchestration'];assert o['schema']==1
 assert o['helper_sha256']==sha(B/'bench/compact_selection22.py')
 assert o['planner_sha256']==sha(B/'planner/ink_planner/semantic_search.py')
 roots=sorted(set().union(*(set(q['roots']) for q in o['queries'])))
 assert roots==o['discovery_roots']
 view=store.bundle(roots);closure=sorted(view['objects'])
 assert closure==o['discovery_closure'] and len(roots)==receipt['full_roots'] and len(closure)==receipt['full_objects']
 assert hashlib.sha256(encoded(view)).hexdigest()==o['discovery_view_sha256'] and len(encoded(view))==o['discovery_view_bytes']
 admitted=set()
 for a in o['admissions']:
  bundle=store.bundle(a['roots']);assert sorted(bundle['objects'])==a['closure']
  assert hashlib.sha256(encoded(bundle)).hexdigest()==a['view_sha256'] and len(encoded(bundle))==a['view_bytes']
  if a['exit_code']==0:
   check=json.loads(a['stdout']);assert check['status']=='checked' and check['snapshot_sha256']==store.snapshot_id and set(check['entries'])==set(bundle['objects'])
   assert a['action']=='accepted';admitted.update(a['roots'])
  else:
   assert a['action']=='split aggregate budget' and 'semantic proof work/depth limit' in a['stderr'] and len(a['roots'])>1
 assert admitted==set(roots) and o['admission_initial_max_roots']==64
 assert o['selection_checks'] and o['selection_checks'][0]['roots']==[] and o['selection_checks'][0]['exit_code']==0
 for proposal in o['selection_checks']:
  assert set(proposal['roots'])<=set(roots)
  bundle=store.bundle(proposal['roots']);assert sorted(bundle['objects'])==proposal['closure']
  if proposal['exit_code']==0:
   check=json.loads(proposal['stdout']);assert check['snapshot_sha256']==store.snapshot_id and check['input_core_sha256']==core_hash and set(check['closure'])==set(bundle['objects'])
 assert o['selection_checks'][-1]['exit_code']==0 and o['selection_checks'][-1]['applications_sha256']==receipt['applications_sha256']
 assert receipt['selected_roots']==selected['knowledge']['roots'] and len(selected['knowledge']['objects'])==receipt['loaded_dependency_objects']
 assert selected['knowledge']==store.bundle(receipt['selected_roots'])
 assert hashlib.sha256(encoded(selected['applications'])).hexdigest()==receipt['applications_sha256']
 return dict(discovered_roots=len(roots),discovery_closure=len(closure),admission_attempts=len(o['admissions']),proposal_checks=len(o['selection_checks']))
def main():
 m=read(R/'metadata.json');f=read(R/'fixtures.json');s=read(R/'spec.json');guard=read(R/'source-boundary-before.json')
 assert len(f['inputs'])==180 and len(f['cells'])==72 and len(s['tasks'])==12
 for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
 assert sha(m['compiler_path'])==m['compiler_sha256']=='45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08'
 assert len(guard)==102
 for p,h in guard.items():assert sha(B/p)==h,p
 prep=read(R/'input-preparation/preparation.json');assert sha(R/'input-preparation/preparation.json')==m['input_preparation_sha256']
 old=Store(prep['prior_overlay']);new=Store(m['knowledge_root'],B/f'knowledge/store/snapshots/{m["new_snapshot"]}.json')
 assert old.snapshot_id==m['effective_prior_snapshot']
 assert new.snapshot_id==m['new_snapshot']
 assert set(old.members())<=set(new.members());fresh=set(new.members())-set(old.members())
 assert set(m['shared_old_witness_ids'])==set(prep['shared_old_witness_ids'])
 rows=[];selections=packages=0;orchestration_rows=[]
 for i,t in enumerate(s['tasks']):
  name=t['name'];info=m['tasks'][name];td=R/'tasks'/name;vector=t['output_kind']=='list_u32'
  assert t['index']==i and t['list_inputs']==['xs'] and t['params']==['xs','seed','k']
  assert t['scalar']==(not vector) and t['scalar_words']==1 and vector==(i>=6)
  assert set(info['new_laws'])<=fresh
  bodies=[read(td/f'{kind}-selected.core.json')['program']['functions'][0]['body'] for kind in ['prior','checked']]
  assert info['checked_changes_prior']==(bodies[0]!=bodies[1])
  if t['fresh_proof_required']:assert info['checked_changes_prior'] and info['new_laws']
  else:assert not info['checked_changes_prior']
  for kind,pin in [('prior',old.snapshot_id),('checked',new.snapshot_id)]:
   for prefix,model in [('',m['cost_model_sha256']),('gpu-',m['gpu_cost_model_sha256'])]:
    receipt=read(td/f'{prefix}{kind}-selection.receipt.json');selected=read(td/f'{prefix}{kind}-selection.json')
    assert receipt['status']=='passed' and not receipt['search']['exhausted'] and receipt['search']['cost_model']['sha256']==model
    assert receipt['check']['snapshot_sha256']==pin and receipt['check']['input_core_sha256']==info['core_sha256']
    assert receipt['check']['applied_laws']==[q['law'] for q in selected['applications']]
    assert sha(td/f'{prefix}{kind}-selection.json')==receipt['compact_selection_sha256'];selections+=1
    orchestration_rows.append(dict(task=name,variant=prefix+kind,**orchestration(receipt,selected,old if kind=='prior' else new,info['core_sha256'])))
  for output in ['baseline','prior','checked','gpu-prior','gpu-checked']:
   folder=R/output/name;manifest=read(folder/'manifest.json');js=metadata(folder/'program.mjs');fn=manifest['functions'][0]
   assert manifest['cpu_c_sha256']==sha(folder/'cpu.c') and manifest['core_sha256']==js['core_sha256']
   assert fn['name']==name and [p['name'] for p in fn['params']]==t['params']
   assert [p['name'] for p in js['functions'][0]['params']]==t['params'] and js['abi']=='ink-javascript-trusted-values-v2'
   assert (folder/'cpu.wasm').read_bytes()[:8]==b'\x00asm\x01\x00\x00\x00';packages+=1
  eligible={kind:m['gpu_manifest'][kind][name]['timing_eligible'] for kind in ['baseline','prior','checked']}
  assert eligible==dict(baseline=False,prior=False,checked=vector),(name,eligible)
  if vector:assert m['gpu_manifest']['checked'][name]['schema']==2
  rows.append(dict(task=name,params=t['params'],output=t['output_kind'],fresh_proof_required=t['fresh_proof_required'],new_CPU_laws=info['new_laws'],gpu_eligible=eligible))
 for x in f['inputs']:assert not x['ys'] and list(x['expected'])==[x['case']]
 profile=read(R/'fixture-profile.json');assert profile['status']=='frozen' and len(profile['profiles'])==72
 for p in profile['profiles']:
  assert p['declared_list_inputs']==1
  if p['case'].startswith('guard'):
   assert p['guard_true']>0 and p['guard_false']>0
  else:
   for side in ['left','right']:
    if p[f'{side}_index_true'] is not None:assert p[f'{side}_index_true']>0 and p[f'{side}_index_false']>0
 native=read(R/'native/metadata.json');nv=read(R/'native/validation.json');v=read(R/'node-validation.json')
 assert v['status']=='validation-passed' and v['validation']['fixtures']==180 and v['validation']['comparisons']==2160 and not v['samples']
 assert native['main_metadata_sha256']==sha(R/'metadata.json') and nv['metadata_sha256']==sha(R/'native/metadata.json') and nv['status']=='passed' and nv['exact_comparisons']==900
 for p,h in native['artifact_hashes'].items():assert sha(R/'native'/p)==h,p
 for mode in ['literal','expert']:
  rust=(R/f'{mode}.rs').read_text();adapter=(R/f'native/rust-{mode}.rs').read_text()
  assert 'pub fn bench_scalar(' in rust and '*out=bench_scalar(case,xs,ys,seed,k) as u32;1' in rust
  assert 'scalar:bench_scalar(task,xs,ys,seed,k)' in adapter and 'scalar:v|((*out.add(1)' not in adapter
 expert=(R/'expert.rs').read_text();assert expert.count('let q=')==6 and 'let m=x.wrapping_mul(k)' in expert
 assert 'if k!=0{q}else{seed}' in expert
 assert sum(t['fresh_proof_required'] for t in s['tasks'])==8 and sum(not t['fresh_proof_required'] for t in s['tasks'])==4
 runner=(R/'runner.mjs').read_text();assert 'result_words:task.scalar?task.scalar_words:null' in runner
 preflight=read(R/'preflight-receipt.json');assert preflight['status']=='passed' and preflight['js']['comparisons']==360
 preflight_role_delta={name:dict(historical=h,current=sha(R/name)) for name,h in preflight['bindings'].items() if sha(R/name)!=h}
 assert set(preflight_role_delta)<=set(['spec.py','spec.json'])
 for name,h in preflight['source_author_bindings'].items():assert sha(B/name)==h,name
 result=dict(status='compiled-pretime-review-passes',frozen_artifacts=len(m['artifact_hashes']),source_guards=102,compact_replayed_selections=selections,compiled_bundle_ABIs=packages,frames=180,timed_cells=72,CPU_validation=2160,native_validation=900,native_frozen_artifacts=len(native['artifact_hashes']),effective_prior_entries=len(old.members()),current_entries=len(new.members()),fresh_difference=len(fresh),shared_old_certificates=len(m['shared_old_witness_ids']),fresh_tasks=8,reference_tasks=4,catalogue_orchestration=orchestration_rows,historical_preflight_role_delta=preflight_role_delta,tasks=rows,
  scope='Eight CPU tasks require changed bodies with fresh proof evidence; four complementary guarded tasks retain identical fair-old/current bodies and are references. Six indexed vectors become actual eligible schema2 GPU programs; all prior/baseline and all scalar GPU programs fall back. No same-GPU fresh prior/current comparison exists. All natural signatures declare only xs; unused adapter ys is empty and not captured. Original controls materialize source stages, strong experts already fuse and evaluate selected callbacks once; guard experts evaluate the predicate once and reuse legal quotient/product work. Indices wrap U32 and each staged indexed operator starts at0. Historical preflight predates role metadata correction; only spec.py/spec.json may differ while source/fixtures/controls stay exact. No timing/profitability claim.',bindings={str(p.relative_to(B)):sha(p) for p in [Path(__file__),R/'metadata.json',R/'fixtures.json',R/'spec.json',R/'fixture-profile.json',R/'node-validation.json',R/'native/metadata.json',R/'native/validation.json',R/'preflight-receipt.json',R/'harness.py',B/'bench/compact_selection22.py',B/'planner/ink_planner/semantic_search.py']})
 (R/'protocol-compiled-preflight-review.json').write_text(json.dumps(result,indent=2)+'\n')
 (R/'protocol-compiled-preflight-review.md').write_text(f'Compiled pretime review passes.\n\nVerified {len(m["artifact_hashes"])} frozen artifacts,102 source guards,48 compact replay receipts and60 exact compiled ABIs. Saved web2160/native900 full-output validations pass. Symmetric prior/current policies and checked old-only opportunities are bound. All discovered catalogue roots remain available: dependency-closed ordinary admission batches split only aggregate work/depth failures, with every proposed/final selection independently checked through its exact minimal closure. This external orchestration does not change the checker, planner search, candidate query or cost policy. Eight CPU tasks require actual fresh proof effects; four complementary guard tasks are exact-body references.\n\nAll natural signatures are(xs,seed,k). Strong expert controls merge guards and reuse valid quotient/product work, or fuse indexed mapped operands into one loop with scratch reuse. Original controls preserve source stages. Scalar divisor/cutoff pairs vary by size under pre-timing presets; top guards and indexed position periods have both outcomes, while inner callbacks and mapped comparisons may be one-sided. Native scalar Rust returns its shared algorithm directly.\n\nOnly six current indexed vectors are actually GPU eligible; scalar/prior/baseline programs fall back. Eligibility alone supplies no fresh same-GPU prior/current gain. No timed profitability claim.\n')
 print(json.dumps({k:result[k] for k in ['status','frozen_artifacts','compact_replayed_selections','compiled_bundle_ABIs','CPU_validation','native_validation']}))
if __name__=='__main__':main()
