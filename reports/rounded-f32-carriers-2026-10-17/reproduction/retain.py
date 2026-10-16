"""Retain exact acquisition files without rewriting historical receipts."""
import gzip,hashlib,json,shutil,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2];b=root/'build/float-islands';out=root/'reports/rounded-f32-carriers-2026-10-17'
artifacts={}
sha=lambda data:hashlib.sha256(data).hexdigest()
def keep(source,name):
    data=source.read_bytes();compress=len(data)>50000
    target=out/(name+'.gz'if compress else name);target.parent.mkdir(parents=True,exist_ok=True)
    stored=gzip.compress(data,compresslevel=9,mtime=0)if compress else data
    target.write_bytes(stored)
    artifacts[name]=dict(stored=str(target.relative_to(out)),encoding='gzip'if compress else'identity',bytes=len(data),sha256=sha(data),stored_sha256=sha(stored))
def tree(source,name):
    for p in sorted(source.rglob('*')):
        if p.is_file()and 'target'not in p.relative_to(source).parts:keep(p,str(Path(name)/p.relative_to(source)))
for name in ['cohort-1','cohort-compact','cohort-warm']:tree(b/name,'scalar/'+name)
tree(b/'controls-final','controls/micro');tree(b/'controls-complete','controls/final')
keep(b/'micro-final.mjs','scalar/final.mjs');keep(b/'micro-final-emission.json','scalar/final-emission.json')
for name in ['neural','staged-neural']:
    for child in ['baseline.mjs','baseline.mjs.plan.json','source.core.json','model.snapshot','contexts.json','reference-history.json','new.mjs','new-build.json','final.mjs','final-emission.json','measure.mjs','run.py','prepare.py','reference.log','cohort-1.log']:
        file=b/name/child
        if file.exists():keep(file,name+'/'+child)
    tree(b/name/'cohort-1',name+'/cohort-1')
    if(b/name/'pilot').exists():tree(b/name/'pilot','diagnostics/'+name+'/pilot')
    if(b/name/'pilot.log').exists():keep(b/name/'pilot.log','diagnostics/'+name+'/pilot.log')
tree(b/'pilot-1','diagnostics/scalar-pilot');tree(b/'first-emission-sources','diagnostics/first-emission-sources')
for name in ['focused.log','focused-bounded.log','focused-capture.log','focused-compact-emission.log','focused-state-expressions.log']:
    keep(b/name,'validation/'+name)
for name in ['final-sources.json','package-complete.log','package-complete-receipt.json','emitter-final-build.log','emitter-final-receipt.json','gpu-metadata.log','gpu-fetch.log','runtime-metadata.log','runtime-fetch.log','distribution-metadata.log','distribution-fetch.log']:
    keep(b/name,'validation/'+name)
for name in ['sources.json','receipt.json','compile.log','numerical-state.log','function-specialization.log']:
    keep(b/'integration'/name,'validation/integration/'+name)
parity=b/'integration/source/build/float-island-state-parity'
tree(parity,'parity')
keep(parity/'rust/target/wasm32-unknown-unknown/debug/compiled_state.wasm','parity/compiled_state.wasm')
if(b/'gpu-validation/receipt.json').exists():tree(b/'gpu-validation','validation/gpu')
for name in ['integrate.py','validate_gpu.py','retain.py']:
    keep(b/name,'reproduction/'+name)
keep(root/'tests/numerical_state.rs','reproduction/numerical_state.rs')
keep(root/'lowerings/js/tests/float_islands.rs','reproduction/float_islands.rs')
keep(root/'lowerings/js/tests/fixtures/float-islands.ink','reproduction/float-islands.ink')
git=lambda repo,*args:subprocess.check_output(['git','-C',str(repo),*args],text=True).strip()
integration=json.loads((b/'integration/receipt.json').read_bytes());assert integration['status']=='passed'
for name in ['neural','staged-neural']:
    assert (b/name/'new.mjs').read_bytes()==(b/name/'final.mjs').read_bytes()
assert (b/'micro-final.mjs').read_bytes()==(b/'cohort-warm/new.mjs').read_bytes()
cohorts={**{'scalar/'+n:'scalar'for n in ['cohort-1','cohort-compact','cohort-warm']},'neural/cohort-1':'neural','staged-neural/cohort-1':'neural'}
summary=dict(schema=1,status='validated-measured-unadmitted',distribution_source=integration['distribution'],packages={n:git(root/n,'rev-parse','HEAD')for n in ['lowerings/js','lowerings/gpu','runtime','abi','native-support','lowerings/rust','lowerings/wasm','knowledge','planner']},core='f625b7b6928d8535fba74390ad70d9a4eab5f710',cohorts=cohorts,artifacts=artifacts,
    scope='Literal rounded F32 intermediates in stateful JS, preserving source order and per-operation rounding. Local CPU training gains; prediction mostly flat. Shared-host diagnostics, no automatic planner admission, device training or upstream parity claim.',
    results=dict(package_tests=60,package_targets=47,pure_cases=3543,state_outcomes=208,restores=17,cross_target_outcomes=772,cross_target_restores=17,neural_reference_outcomes_per_process=27,dense_predictions_per_process=16),
    baseline_compiler=dict(sha256='10806dbd59d98dddc2bad26705737c03ef5d483d16b9a1d54e2f23c4de2c1ed4',inventory='../guarded-function-specialization-2026-10-17/compiler-sources.json'),
    files={str(p.relative_to(out)):dict(bytes=p.stat().st_size,sha256=sha(p.read_bytes()))for p in sorted(out.rglob('*'))if p.is_file()and p!=out/'summary.json'})
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(dict(artifacts=len(artifacts),files=len(summary['files']),stored_bytes=sum(v['bytes']for v in summary['files'].values()))))
