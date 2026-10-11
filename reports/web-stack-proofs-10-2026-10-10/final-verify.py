import hashlib,importlib.util,json,re,sys
from pathlib import Path
p=Path(__file__).resolve().parent;root=p.parents[1];sys.path.insert(0,str(root/'knowledge'))
from ink_knowledge import Store,identity
sha=lambda path:hashlib.sha256(Path(path).read_bytes()).hexdigest()
read=lambda path:json.loads(Path(path).read_text())
meta=read(p/'metadata.json');pub=read(p/'publication.json');imp=read(p/'observation-import.json');interval=read(p/'root-interval-verification.json');profit=read(p/'profitability.json')
assert sha(meta['compiler_path'])==meta['compiler_sha256']==pub['compiler_sha256']
assert sha(root/'bench/methodology.py')==meta['methodology_sha256']
for name,h in meta['artifact_hashes'].items():assert sha(p/name)==h,name
for name,h in read(p/'source-boundary-before.json').items():assert sha(root/name)==h,name
for name in ['literal.mjs','literal.rs','runner.mjs','node.mjs','browser.html','analyse.py','README.md','kernels.ink']:assert sha(root/'bench/web-stack-proofs-10'/name)==sha(p/name),name
assert sha(root/'bench/web-stack-proofs-10.py')==sha(p/'harness.py')
for producer in pub['producers']:assert sha(root/'knowledge/producers'/f"{producer['producer']}.py")==producer['source_sha256']
s=Store(root/'knowledge');old=Store(root/'knowledge',root/'knowledge/store/snapshots'/f"{pub['previous_snapshot']}.json")
assert s.snapshot_id==pub['snapshot']==meta['new_snapshot']==imp['snapshot'];members=set(s.members());oldmembers=set(old.members());assert len(members)==935 and len(oldmembers)==914 and oldmembers<=members and members-oldmembers==set(pub['batch_entries']) and len(pub['batch_entries'])==21
for i in members:assert identity(s.object(i))==i
prior=read(p/'prior-selection.json');new=read(p/'checked-selection.json');assert not prior['applications'] and len(new['applications'])==6
assert all(meta['prior_core_equals_original'].values()) and all(meta['prior_to_new_core_changed'].values())
assert set(a['law'] for a in new['applications'])<=set(pub['batch_entries'])
for kind in ['prior','checked']:
 receipt=read(p/f'{kind}-selection-check.json');assert receipt['input_core_sha256']==sha(p/'core.json');assert receipt['selected_core_sha256']==sha(p/f'{kind}-selected.core.json');assert receipt['snapshot_sha256']==(pub['previous_snapshot'] if kind=='prior' else pub['snapshot'])
 assert set(receipt['applied_laws'])==set(a['law'] for a in (prior if kind=='prior' else new)['applications'])
log=(p/'knowledge-tests.log').read_text();test=re.search(r'Ran (\d+) tests in ([\d.]+)s\s+OK\s*$',log);assert test and int(test[1])==103
fixture=read(p/'fixtures.json')
for cell in fixture['cells']:assert len(set(fixture['inputs'][cell['input']]['expected'][cell['case']]))>1
pre=read(p/'control-preflight.json');val=read(p/'node-validation.json');assert pre['comparisons']==78 and pre['python_literal_checks']==276 and val['validation']['comparisons']==858
spec=importlib.util.spec_from_file_location('h',root/'bench/web-stack-proofs-10.py');h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
raws=[]
for host in ['node','browser']:
 h.audit(p,host);data=read(p/f'{host}-results.json');raws.append(dict(run=host,path=f'{host}-results.json',sha256=sha(p/f'{host}-results.json'),samples=len(data['samples']),exact_comparisons=data['validation']['comparisons'],actual_gpu_samples=sum(r['variant'].endswith('_gpu') for r in data['samples'])))
assert sum(r['samples'] for r in raws)==6048 and sum(r['exact_comparisons'] for r in raws)==2616 and sum(r['actual_gpu_samples'] for r in raws)==504
assert interval['intervals_recomputed']==828 and interval['actual_gpu_variant_cells']==72 and interval['gpu_fallback_variant_cells']==36
assert sum(profit['counts'].values())==234
assert len(imp['records'])==288 and imp['after']==5022 and imp['before']==4734
for r in imp['records']:
 source=p/r['source'];assert sha(source)==r['source_sha256'];obj=read(source);assert identity(obj)==r['id'];assert read(s.data/'observations'/f"{r['id']}.json")==obj
assert len(list((s.data/'observations').glob('*.json')))==5022
compute=root/'knowledge/research/web-stack-proofs-10/compute';e=read(compute/'evidence.json')
for name,hsh in e['artifact_hashes'].items():assert sha(compute/name)==hsh,name
review=root/'knowledge/research/web-stack-proofs-10/review.md';assert 'Final review passes' in review.read_text()
confirmation=None
if (p/'gpu-confirmation.json').exists():
 confirmation=read(p/'gpu-confirmation.json');repeat=Path(confirmation['path']);assert not confirmation['pooled'] and confirmation['canonical_observations_imported']==0
 for name,hsh in confirmation['receipt_hashes'].items():assert sha(repeat/name)==hsh,name
 for match in confirmation['identical_gpu_artifacts']:assert sha(p/match['main_path'])==sha(repeat/match['repeat_path'])==match['sha256']
 for name,hsh in read(repeat/'metadata.json')['artifact_hashes'].items():assert sha(repeat/name)==hsh,name
 h.audit(repeat,'browser')
receipts=['publication.json','knowledge-tests.log','metadata.json','source-boundary-before.json','root-interval-verification.json','profitability.json','backend-routing.json','artifact-sizes.json','observation-import.json','control-preflight.json','checked-selection-check.json','REPORT.md','browser-evidence.jpg','write-report.py','final-write-report.py','final-verify.py','generate-controls.py']
if confirmation:receipts+=['gpu-confirmation.json','final-confirm.py']
result=dict(schema=1,status='passed',previous_snapshot=pub['previous_snapshot'],snapshot=s.snapshot_id,previous_entries=914,entries=935,added_entries=21,objects_authenticated=935,compiler_sha256=pub['compiler_sha256'],frozen_artifact_hashes_verified=len(meta['artifact_hashes']),source_boundary_hashes_verified=len(read(p/'source-boundary-before.json')),old914_bodies_preserved=True,fresh_default_applications=6,knowledge_tests=103,hash_valid_false_controls=5,typed_interpreter_frames=dict(compute=36,collection=63),timed_samples=6048,exact_backend_comparisons=2616,actual_gpu_samples=504,actual_gpu_variant_cells=72,gpu_fallback_variant_cells=36,paired_intervals_recomputed=828,profitability=profit['counts'],new_observations=288,canonical_observations=5022,gpu_confirmation=confirmation,raw_files=raws,receipt_hashes={name:sha(p/name) for name in receipts},independent_review=dict(path=str(review),sha256=sha(review)),analysis_sources={'bench/web-stack-proofs-10/analyse.py':sha(root/'bench/web-stack-proofs-10/analyse.py')},scope='21 typed laws; six U32 finite-difference/pipeline representatives; exact full-call CPU/GPU evidence and adverse comparisons retained. No compiler/runtime/backend source changes or caller validators; all local.')
(p/'verification.json').write_text(json.dumps(result,indent=2)+'\n');print({k:result[k] for k in ['status','entries','frozen_artifact_hashes_verified','source_boundary_hashes_verified','timed_samples','actual_gpu_samples','canonical_observations']})
