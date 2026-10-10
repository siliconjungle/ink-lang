"""Frozen compiled bytes/ABI/certificate pretime audit; no builds or timing."""
import hashlib,json,re,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store,identity,semantic_entry
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text())
def main():
    m=read(R/'metadata.json');f=read(R/'fixtures.json');s=read(R/'spec.json')
    assert len(m['artifact_hashes'])==998 and len(m['tasks'])==8 and len(f['inputs'])==104 and len(f['cells'])==48
    for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
    assert sha(m['compiler_path'])==m['compiler_sha256']=='45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08'
    guard=read(R/'source-boundary-before.json');assert len(guard)==102
    for p,h in guard.items():assert sha(B/p)==h,p
    prep=read(R/'input-preparation/preparation.json');assert sha(R/'input-preparation/preparation.json')==m['input_preparation_sha256']
    old=Store(prep['prior_overlay']);new=Store(m['knowledge_root'],B/f'knowledge/store/snapshots/{m["new_snapshot"]}.json')
    assert old.snapshot_id==m['effective_prior_snapshot'] and len(old.members())==1322 and new.snapshot_id==m['new_snapshot'] and len(new.members())==1343
    assert set(old.members())<=set(new.members());fresh=set(new.members())-set(old.members());assert len(fresh)==21
    assert set(prep['shared_old_witness_ids'])==set(m['shared_old_witness_ids']) and len(m['shared_old_witness_ids'])==24
    selections=0;packages=0;new_selected=set();rows=[]
    for t in s['tasks']:
        name=t['name'];info=m['tasks'][name];td=R/'tasks'/name
        assert t['list_inputs']==['xs'] and t['params']==['xs','seed','k'] and info['list_input_count']==1
        assert info['fresh_proof_required'] and info['checked_changes_prior'] and set(info['new_laws'])<=fresh and info['new_laws']
        new_selected.update(info['new_laws'])
        for kind,pin in [('prior',old.snapshot_id),('checked',new.snapshot_id)]:
            for prefix,model in [('',m['cost_model_sha256']),('gpu-',m['gpu_cost_model_sha256'])]:
                receipt=read(td/f'{prefix}{kind}-selection.receipt.json');selected=read(td/f'{prefix}{kind}-selection.json')
                assert receipt['status']=='checked' and not receipt['search']['exhausted'] and receipt['search']['cost_model']['sha256']==model
                assert receipt['check']['snapshot_sha256']==pin and receipt['check']['input_core_sha256']==info['core_sha256']
                assert receipt['check']['applied_laws']==[q['law'] for q in selected['applications']]
                assert sha(td/f'{prefix}{kind}-selection.json')==receipt['compact_selection_sha256'];selections+=1
        for output in ['baseline','prior','checked','gpu-prior','gpu-checked']:
            folder=R/output/name;manifest=read(folder/'manifest.json');js=read_json_metadata(folder/'program.mjs')
            assert manifest['cpu_c_sha256']==sha(folder/'cpu.c') and manifest['core_sha256']==js['core_sha256']
            fn=manifest['functions'][0];assert fn['name']==name and len(fn['params'])==3 and [p['name'] for p in fn['params']]==t['params']
            assert [p['name'] for p in js['functions'][0]['params']]==t['params'] and js['abi']=='ink-javascript-trusted-values-v2'
            assert (folder/'cpu.wasm').read_bytes()[:8]==b'\x00asm\x01\x00\x00\x00';packages+=1
        for kind in ['baseline','prior']:assert not m['gpu_manifest'][kind][name]['timing_eligible']
        gpu=m['gpu_manifest']['checked'][name];assert gpu['timing_eligible'] and gpu['parameter_count']==3
        assert gpu['schema']==(2 if t['output_kind']=='list_u32' else 1)
        rows.append(dict(task=name,new_selected_laws=info['new_laws'],prior_equals_original=info['prior_equals_original'],gpu_prior_actual_possible=False,gpu_current_schema=gpu['schema']))
    v=read(R/'node-validation.json');assert v['status']=='validation-passed' and v['validation']['comparisons']==1248 and v['validation']['fixtures']==104 and not v['samples']
    native=read(R/'native/metadata.json');nv=read(R/'native/validation.json');assert native['main_metadata_sha256']==sha(R/'metadata.json') and nv['metadata_sha256']==sha(R/'native/metadata.json') and nv['status']=='passed' and nv['exact_comparisons']==520
    for p,h in native['artifact_hashes'].items():assert sha(R/'native'/p)==h,p
    result=dict(status='compiled-pretime-review-passes',metadata_sha256=sha(R/'metadata.json'),compiler_sha256=m['compiler_sha256'],frozen_artifacts_verified=998,source_guard_unchanged=102,compact_replayed_selections=selections,compiled_bundle_ABIs=packages,old_entries=1322,current_entries=1343,current_minus_effective_prior=21,distinct_fresh_selected_ids=len(new_selected),tasks=rows,web_validation_complete_outputs=1248,native_validation_complete_outputs=520,native_frozen_artifacts=len(native['artifact_hashes']),
        scope='Natural xs/seed/k ABI matched; 8currentselected bodies genuinely differ from fair prior1322. Same CPU/GPU costs across stores; currentGPU8eligible and priorGPU0. This permits eligibility/cross-backend comparisons only, not a matched priorGPU/currentGPU speedup. Current scalar JS/C may still allocate mapped intermediates; pairedJS uses scalar sharing IIFEs while C binds mapper values. Strong experts already fuse/sinkweights.',
        limitation='Copied runner validation.oracle label still refers to score/fixed-point algorithms from18; actual frozen19fixtures/source/oracles are complementary partitions and paired mapped values. This descriptive label is not proof or computation authority. No measured result claim yet.',
        bindings={str(p.relative_to(B)):sha(p) for p in [Path(__file__),R/'metadata.json',R/'fixtures.json',R/'spec.json',R/'node-validation.json',R/'native/metadata.json',R/'native/validation.json',R/'protocol-preflight-review.json']})
    (R/'protocol-pretime-review.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['status','frozen_artifacts_verified','compact_replayed_selections','compiled_bundle_ABIs','web_validation_complete_outputs','native_validation_complete_outputs']}))
def read_json_metadata(p):
    text=Path(p).read_text();match=re.search(r'export const metadata = (\{.*\});',text);assert match,p
    return json.loads(match.group(1))
if __name__=='__main__':main()
