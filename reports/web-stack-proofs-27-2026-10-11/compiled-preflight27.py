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
def source_guard():
 guard=read(R/'source-boundary-before.json');pins=read(R/'initial-pins.json');allowed=set(pins['expected_source_changes']);assert len(guard)==102
 changed=[]
 for p,h in guard.items():
  if sha(B/p)!=h:
   assert p in allowed,p;assert sha(R/'original-source'/p)==h,p;changed.append(p)
 assert set(changed)==allowed
 return changed

def main():
 m=read(R/'metadata.json');f=read(R/'fixtures.json');s=read(R/'spec.json');changed=source_guard()
 asset_review=read(R/'preflight-receipt.json');frames=len(f['inputs']);cells=len(f['cells']);assert (frames,cells,len(s['tasks']))==(148,32,8);assert frames==asset_review['inputs'] and cells==asset_review['cells'] and len(s['tasks'])==asset_review['tasks']
 for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
 assert set(m['compilers'])=={'old','new'}
 for k,tool in m['compilers'].items():assert sha(tool['path'])==tool['sha256']==m['compiler_hashes'][k]
 assert m['compilers']['old']['sha256']==read(R/'initial-pins.json')['prior_compiler_sha256']
 assert m['compiler_path']==m['compilers']['new']['path'] and m['compiler_sha256']==m['compilers']['new']['sha256']
 assert m['compilers']['old']['sha256']!=m['compilers']['new']['sha256']
 prep=read(R/'input-preparation/preparation.json');assert sha(R/'input-preparation/preparation.json')==m['input_preparation_sha256']
 old=Store(prep['prior_overlay']);new=Store(m['knowledge_root'],B/f'knowledge/store/snapshots/{m["new_snapshot"]}.json')
 assert old.snapshot_id==m['effective_prior_snapshot'] and new.snapshot_id==m['new_snapshot'] and set(old.members())<=set(new.members())
 fresh=set(new.members())-set(old.members());rows=[];orchestration_rows=[];packages=0
 for i,t in enumerate(s['tasks']):
  name=t['name'];info=m['tasks'][name];td=R/'tasks'/name;vector=t['output_kind']=='list_u32'
  assert t['index']==i and t['list_inputs'] in [['xs'],['xs','ys']] and t['params']==t['list_inputs']+['seed','k']
  assert t['scalar']==(not vector) and t['scalar_words']==(2 if t['output_kind']=='u64' else 1)
  assert set(info['new_laws'])<=fresh
  bodies=[read(td/f'{proof}-selected.core.json')['program']['functions'][0]['body'] for proof in ['prior','checked']]
  assert info['checked_changes_prior']==(bodies[0]!=bodies[1])
  if t['fresh_proof_required']:assert info['checked_changes_prior'] and info['new_laws']
  for proof,pin in [('prior',old.snapshot_id),('checked',new.snapshot_id)]:
   receipt=read(td/f'{proof}-selection.receipt.json');selected=read(td/f'{proof}-selection.json')
   assert receipt['status']=='passed' and not receipt['search']['exhausted'] and receipt['search']['cost_model']['sha256']==m['cost_model_sha256']
   assert receipt['check']['snapshot_sha256']==pin and receipt['check']['input_core_sha256']==info['core_sha256']
   assert receipt['check']['applied_laws']==[q['law'] for q in selected['applications']]
   assert sha(td/f'{proof}-selection.json')==receipt['compact_selection_sha256']
   orchestration_rows.append(dict(task=name,variant=proof,**orchestration(receipt,selected,old if proof=='prior' else new,info['core_sha256'])))
   selected_hash=sha(td/f'{proof}-selected.core.json');assert selected_hash==info['selections'][proof]['selected_core_sha256']
   core_bindings=[]
   for backend in ['old','new']:
    folder=R/backend/proof/name;manifest=read(folder/'manifest.json');js=metadata(folder/'program.mjs');fn=manifest['functions'][0]
    assert manifest['cpu_c_sha256']==sha(folder/'cpu.c') and manifest['core_sha256']==js['core_sha256']
    assert fn['name']==name and [p['name'] for p in fn['params']]==t['params'] and js['abi']=='ink-javascript-trusted-values-v2'
    assert [p['name'] for p in js['functions'][0]['params']]==t['params']
    assert (folder/'cpu.wasm').read_bytes()[:8]==b'\x00asm\x01\x00\x00\x00'
    binding=info['matrix_bundles'][backend+'_'+proof];assert binding['selected_core_sha256']==selected_hash and binding['program_sha256']==sha(folder/'program.mjs') and binding['manifest_sha256']==sha(folder/'manifest.json')
    core_bindings.append(manifest['core_sha256']);packages+=1
   assert len(set(core_bindings))==1,('backend received different core',name,proof)
  rows.append(dict(task=name,output=t['output_kind'],fresh_proof_required=t['fresh_proof_required'],selected_core_hashes={p:info['selections'][p]['selected_core_sha256'] for p in ['prior','checked']}))
 for variant,byTask in m['gpu_manifest'].items():
  for name,d in byTask.items():
   folder=R/d['bundle'];fp=d['fingerprint_inputs']
   for p,h in fp['files'].items():assert sha(folder/p)==h
   assert hashlib.sha256(json.dumps(fp,sort_keys=True,separators=(',',':')).encode()).hexdigest()==d['fingerprint']
   fn=read(folder/'manifest.json')['functions'][0];assert d['timing_eligible']==bool(fn.get('gpu') or fn.get('shader'))
 for x in f['inputs']:
  task=next(t for t in s['tasks'] if t['name']==x['case']);assert (len(task['list_inputs'])==2 or not x['ys']) and list(x['expected'])==[x['case']]
 profile=read(R/'fixture-profile.json');assert profile['status']=='frozen' and len(profile['profiles'])==frames
 for p in profile['profiles']:
  assert p['declared_list_inputs']==len(next(t for t in s['tasks'] if t['name']==p['case'])['list_inputs'])
  if 'min_length' in p:assert p['min_length']==min(p['length'],p['second_length'])
 native=read(R/'native/metadata.json');nv=read(R/'native/validation.json');v=read(R/'node-validation.json')
 assert v['status']=='validation-passed' and v['validation']['fixtures']==frames and v['validation']['comparisons']==frames*17 and not v['samples']
 assert native['main_metadata_sha256']==sha(R/'metadata.json') and nv['metadata_sha256']==sha(R/'native/metadata.json') and nv['status']=='passed' and nv['exact_comparisons']==frames*6
 for p,h in native['artifact_hashes'].items():assert sha(R/'native'/p)==h,p
 for mode in ['literal','expert']:
  rust=(R/f'{mode}.rs').read_text();adapter=(R/f'native/rust-{mode}.rs').read_text()
  assert 'pub fn bench_scalar(' in rust and '*out=bench_scalar(case,xs,ys,seed,k) as u32;1' in rust
  assert 'scalar:bench_scalar(task,xs,ys,seed,k)' in adapter
 runner=(R/'runner.mjs').read_text();assert 'function sampleSync' in runner and 'const entry=variants[v],leaf=entry.bind(name,args);' in runner
 sync=runner[runner.index('    function sampleSync'):runner.index('    const iterations={};')];assert 'await' not in sync and '.slice(' not in sync
 preflight=read(R/'preflight-receipt.json');assert preflight['status']=='passed' and preflight['js']['comparisons']==frames*2
 for name,h in preflight['bindings'].items():assert sha(R/name)==h,name
 for name,h in preflight['source_author_bindings'].items():assert sha(B/name)==h,name
 result=dict(status='compiled-pretime-review-passes',frozen_artifacts=len(m['artifact_hashes']),source_guards=102,intentional_source_changes=changed,compact_replayed_selections=len(orchestration_rows),compiled_bundle_ABIs=packages,frames=frames,timed_cells=cells,CPU_validation=v['validation']['comparisons'],native_validation=nv['exact_comparisons'],tasks=rows,catalogue_orchestration=orchestration_rows,scope='One prior/current selected core per task compiled unchanged by old/new C+JS helper-lowering bundles. Full captured JS/Wasm and separately synchronous borrowed JS. Eight recipes/148 complete frames/32 cells: two fresh independent nested zip fusions plus six helper references. Three natural two-list ABIs/min lengths. Strong experts inline and hoist legal captures, fuse filter-map and nested zip, retain ordered reverse reducer. Original stages validate only. C/Wasm byte equality is not required because C emission changes. GPU actual/fallback and exact fingerprint dedup manifest-derived, fresh versus reference task roles preserved. No measured profitability claim.',bindings={str(p.relative_to(B)):sha(p) for p in [Path(__file__),R/'metadata.json',R/'fixtures.json',R/'spec.json',R/'fixture-profile.json',R/'node-validation.json',R/'native/metadata.json',R/'native/validation.json',R/'preflight-receipt.json',R/'harness.py',B/'bench/compact_selection22.py',B/'planner/ink_planner/semantic_search.py']})
 (R/'protocol-compiled-preflight-review.json').write_text(json.dumps(result,indent=2)+'\n')
 (R/'protocol-compiled-preflight-review.md').write_text('Compiled pretime review passes.\n\n'+result['scope']+'\n')
 print(json.dumps({k:result[k] for k in ['status','frozen_artifacts','compact_replayed_selections','compiled_bundle_ABIs','CPU_validation','native_validation']}))
if __name__=='__main__':main()
