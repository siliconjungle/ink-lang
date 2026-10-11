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
 assert len(f['inputs'])==228 and len(f['cells'])==120 and len(s['tasks'])==12
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
  assert t['scalar']==(not vector) and t['scalar_words']==(2 if t['output_kind']=='u64' else 1) and vector==(t['operation'] in ['scan_left_project','scan_right_project'])
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
  if vector:assert eligible['checked'] and m['gpu_manifest']['checked'][name]['schema']==2
  rows.append(dict(task=name,params=t['params'],output=t['output_kind'],fresh_proof_required=t['fresh_proof_required'],new_CPU_laws=info['new_laws'],gpu_eligible=eligible))
 for x in f['inputs']:assert not x['ys'] and list(x['expected'])==[x['case']]
 profile=read(R/'fixture-profile.json');assert profile['status']=='frozen' and len(profile['profiles'])==120
 for p in profile['profiles']:
  assert p['declared_list_inputs']==1
  if p['match_location'] is not None:assert p['first_match_index']==(0 if p['match_location']=='first' else p['length']//2 if p['match_location']=='interior' else None)
 native=read(R/'native/metadata.json');nv=read(R/'native/validation.json');v=read(R/'node-validation.json')
 assert v['status']=='validation-passed' and v['validation']['fixtures']==228 and v['validation']['comparisons']==2736 and not v['samples']
 assert native['main_metadata_sha256']==sha(R/'metadata.json') and nv['metadata_sha256']==sha(R/'native/metadata.json') and nv['status']=='passed' and nv['exact_comparisons']==1140
 for p,h in native['artifact_hashes'].items():assert sha(R/'native'/p)==h,p
 for mode in ['literal','expert']:
  rust=(R/f'{mode}.rs').read_text();adapter=(R/f'native/rust-{mode}.rs').read_text()
  assert 'pub fn bench_scalar(' in rust and '*out=bench_scalar(case,xs,ys,seed,k) as u32;1' in rust
  assert 'scalar:bench_scalar(task,xs,ys,seed,k)' in adapter and 'scalar:v|((*out.add(1)' not in adapter
 expert=(R/'expert.rs').read_text();literal=(R/'literal.rs').read_text()
 assert expert.count('xs.len() as u64')==2 and expert.count('for &x in xs{if ')==4 and expert.count('let first=xs.first().copied().unwrap_or(seed)')==2
 for rust in [expert,literal]:assert rust.count('*out.add(1)=(value>>32) as u32;2')==2
 assert sum(t['fresh_proof_required'] for t in s['tasks'])==12
 runner=(R/'runner.mjs').read_text();assert 'result_words:task.scalar?task.scalar_words:null' in runner
 preflight=read(R/'preflight-receipt.json');assert preflight['status']=='passed' and preflight['js']['comparisons']==456
 preflight_role_delta={name:dict(historical=h,current=sha(R/name)) for name,h in preflight['bindings'].items() if sha(R/name)!=h}
 assert not preflight_role_delta
 for name,h in preflight['source_author_bindings'].items():assert sha(B/name)==h,name
 result=dict(status='compiled-pretime-review-passes',frozen_artifacts=len(m['artifact_hashes']),source_guards=102,compact_replayed_selections=selections,compiled_bundle_ABIs=packages,frames=228,timed_cells=120,CPU_validation=2736,native_validation=1140,native_frozen_artifacts=len(native['artifact_hashes']),effective_prior_entries=len(old.members()),current_entries=len(new.members()),fresh_difference=len(fresh),shared_old_certificates=len(m['shared_old_witness_ids']),fresh_tasks=12,reference_tasks=0,catalogue_orchestration=orchestration_rows,historical_preflight_role_delta=preflight_role_delta,tasks=rows,
  scope='All twelve CPU recipes require changed bodies and fresh checked evidence. All discovered roots and proposal/final closures are authenticated under identical prior/current policies. Natural single-list signatures capture xs only. True U64 counts use two Rust/Wasm result lanes and direct native scalar returns; scalar U32 uses one lane. Original controls materialize filter/map/scan/zip stages. Strong experts count length, forward early-exit or erase scan/zip entirely. Lookup first/interior/absent modes are fixed at every size and distribution; exact parameters are fixed across sizes. GPU eligibility and counters are actual manifest facts, separately recorded for every variant. No timed profitability claim.',bindings={str(p.relative_to(B)):sha(p) for p in [Path(__file__),R/'metadata.json',R/'fixtures.json',R/'spec.json',R/'fixture-profile.json',R/'node-validation.json',R/'native/metadata.json',R/'native/validation.json',R/'preflight-receipt.json',R/'harness.py',B/'bench/compact_selection22.py',B/'planner/ink_planner/semantic_search.py']})
 (R/'protocol-compiled-preflight-review.json').write_text(json.dumps(result,indent=2)+'\n')
 (R/'protocol-compiled-preflight-review.md').write_text(f"Compiled pretime review passes.\n\nVerified {len(m['artifact_hashes'])} frozen artifacts,102 source guards,48 compact replay receipts and60 exact compiled ABIs. Saved web2736/native1140 complete-output validations pass. Every discovery/admission/proposal closure is authenticated, with no candidate omitted and unchanged compiler/search/cost policy.\n\nAll twelve tasks are fresh under fair prior/current stores. Eight scalar results include two genuine U64 cardinalities; four vectors preserve input length. Natural signatures declare only(xs,seed,k), while empty adapter ys is not captured. Literal stages and strongest count/early-exit/scan-erasure experts are exact. Lookup locations first/interior/absent are preset at all sizes/distributions; CPU snapshots remain timed even for O(1) consumers. Actual GPU coverage is manifest-based, with eligibility and matched same-backend comparisons kept separate. No timing claims.\n")
 print(json.dumps({k:result[k] for k in ['status','frozen_artifacts','compact_replayed_selections','compiled_bundle_ABIs','CPU_validation','native_validation']}))
if __name__=='__main__':main()
