"""Independent frozen-byte, compiled binding and prevalidation review; no execution jobs."""
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
    assert len(m['artifact_hashes'])==926 and len(f['inputs'])==128 and len(f['cells'])==72 and len(s['tasks'])==8
    for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
    assert sha(m['compiler_path'])==m['compiler_sha256']=='45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08'
    assert len(guard)==102
    for p,h in guard.items():assert sha(B/p)==h,p
    prep=read(R/'input-preparation/preparation.json');assert sha(R/'input-preparation/preparation.json')==m['input_preparation_sha256']
    old=Store(prep['prior_overlay']);new=Store(m['knowledge_root'],B/f'knowledge/store/snapshots/{m["new_snapshot"]}.json')
    assert old.snapshot_id==m['effective_prior_snapshot'] and len(old.members())==1344 and new.snapshot_id==m['new_snapshot'] and len(new.members())==1372
    assert set(old.members())<=set(new.members());fresh=set(new.members())-set(old.members());assert len(fresh)==28 and len(m['shared_old_witness_ids'])==1
    assert set(m['shared_old_witness_ids'])==set(prep['shared_old_witness_ids'])
    rows=[];selections=packages=0
    for t in s['tasks']:
        name=t['name'];info=m['tasks'][name];td=R/'tasks'/name;vector=t['output_kind']=='list_u32'
        assert t['list_inputs']==(['xs','ys'] if vector else ['xs']) and t['params']==(['xs','ys','seed','k'] if vector else ['xs','seed','k'])
        assert t['scalar']==(not vector) and t['scalar_words']==(2 if t['output_kind']=='u64' else 1)
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
        assert eligible==({'baseline':True,'prior':True,'checked':True} if t['output_kind']=='u64' else {'baseline':False,'prior':False,'checked':vector})
        rows.append(dict(task=name,params=t['params'],output=t['output_kind'],scalar_words=t['scalar_words'],new_CPU_laws=info['new_laws'],gpu_eligible=eligible))
    count='gated_predicate_count_u32';prior=R/'gpu-prior'/count;current=R/'gpu-checked'/count
    assert read(prior/'manifest.json')['core_sha256']==read(current/'manifest.json')['core_sha256']
    shaders=sorted(p.name for p in prior.glob('*.wgsl'));assert shaders and shaders==sorted(p.name for p in current.glob('*.wgsl'))
    for name in shaders:assert sha(prior/name)==sha(current/name),name
    assert m['tasks'][count]['gpu_selections']['prior']['laws']==m['tasks'][count]['gpu_selections']['checked']['laws']==[]
    count_cells=[c for c in f['cells'] if c['case']==count];assert len(count_cells)==12
    for t in s['tasks'][:4]:
        cells=[c for c in f['cells'] if c['case']==t['name']];assert len(cells)==12
        for distribution in ['small','full']:
            for n in f['parameters']['sizes']:
                selected=[f['inputs'][c['input']] for c in cells if f['inputs'][c['input']]['id'].endswith(f'{distribution}-{n}')]
                assert len(selected)==2 and {x['feature_enabled'] for x in selected}=={True,False}
                assert selected[0]['xs']==selected[1]['xs'] and selected[0]['seed']==selected[1]['seed']
    native=read(R/'native/metadata.json');nv=read(R/'native/validation.json');v=read(R/'node-validation.json')
    assert v['status']=='validation-passed' and v['validation']['fixtures']==128 and v['validation']['comparisons']==1536 and not v['samples']
    assert native['main_metadata_sha256']==sha(R/'metadata.json') and nv['metadata_sha256']==sha(R/'native/metadata.json') and nv['status']=='passed' and nv['exact_comparisons']==640
    for p,h in native['artifact_hashes'].items():assert sha(R/'native'/p)==h,p
    for mode in ['literal','expert']:
        rust=(R/f'{mode}.rs').read_text();adapter=(R/f'native/rust-{mode}.rs').read_text()
        assert 'pub fn bench_scalar(' in rust and '*out.add(1)=(value>>32) as u32;2' in rust
        assert 'scalar:bench_scalar(task,xs,ys,seed,k)' in adapter
        assert 'scalar:v|((*out.add(1)' not in adapter
    runner=(R/'runner.mjs').read_text();assert "BigInt(values[0])+(BigInt(values[1])<<32n)" in runner and 'result_words:task.scalar?task.scalar_words:null' in runner
    assert 'expected_gpu' in (R/'harness.py').read_text()
    result=dict(status='compiled-pretime-review-passes',frozen_artifacts=926,source_guards=102,compact_replayed_selections=selections,compiled_bundle_ABIs=packages,frames=128,timed_cells=72,CPU_validation=1536,native_validation=640,native_frozen_artifacts=len(native['artifact_hashes']),effective_prior_entries=1344,current_entries=1372,fresh_difference=28,shared_old_certificates=1,tasks=rows,unchanged_GPU_count_reference_cells=12,count_core_sha256=read(prior/'manifest.json')['core_sha256'],count_shader_hashes={p:sha(prior/p) for p in shaders},
        scope='All8 CPU bodies change with fresh checked laws under symmetric frozen policies. GPU count retains identical prior/current core/shaders and zero proof applications: all12 matched GPU cells are references, never evidence of fresh-law gains. Two independent vectors are new GPU eligibility transitions; remaining recipes use CPU fallback. Natural declared-list copies remain timed even for disabled control. BorrowedJS/native resident separate. Count is U64 with two Wasm lanes; tested physical counts remain below2^32. Native scalar expert/literal share direct algorithm helpers without output-store asymmetry. No timing or profitability claim.',bindings={str(p.relative_to(B)):sha(p) for p in [Path(__file__),R/'metadata.json',R/'fixtures.json',R/'spec.json',R/'node-validation.json',R/'native/metadata.json',R/'native/validation.json',R/'analyse-reviewed.py',R/'summarise-outcomes-reviewed.py']})
    (R/'protocol-compiled-preflight-review.json').write_text(json.dumps(result,indent=2)+'\n')
    (R/'protocol-compiled-preflight-review.md').write_text('Compiled pretime review passes.\n\nVerified 926 frozen artifacts, 102 source guards, 32 compact replay receipts and 40 exact per-task bundles. Saved web1536/native640 complete-output prevalidations pass. Eight CPU bodies change under symmetric policies. Gated modes use the same arrays with enabled/disabled parameters. Natural per-task ABIs and U64 count two-lane Wasm results agree; native scalar Rust returns the shared helper directly.\n\nThe 12 matched GPU count cells are references: prior/current core and shader bytes are identical and no law is applied. Only the two independent vectors become newly eligible GPU kernels; all other recipes fall back. No performance result is claimed yet. Tested counts are below2^32; full U64 ABI preservation does not establish high-word stress coverage.\n')
    print(json.dumps({k:result[k] for k in ['status','frozen_artifacts','compact_replayed_selections','compiled_bundle_ABIs','CPU_validation','native_validation','unchanged_GPU_count_reference_cells']}))
if __name__=='__main__':main()
