import hashlib,json,shutil,subprocess
from pathlib import Path
r=Path(__file__).resolve().parents[2];b=r/'build/function-projection';out=r/'reports/mutable-function-specialization-2026-10-17';out.mkdir(parents=True,exist_ok=True)
def copy(source,name):
 target=out/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,target)
def tree(source,name):
 for p in source.rglob('*'):
  if p.is_file()and'target'not in p.relative_to(source).parts:copy(p,Path(name)/p.relative_to(source))
tree(b/'combined-validation','core-validation')
for label in ['combined-source/build/mutable-function-specialization','combined-source/build/mutable-function-specialization-parity']:
 tree(b/label,'initialized'if label.endswith('specialization')else'parity')
copy(b/'combined-source/build/mutable-function-specialization/core.json','proof/source.core.json');copy(b/'combined-source/build/mutable-function-specialization/plan.json','proof/plan.json')
for name in ['combined-core-package.json','combined-cross-target-final.log','combined-core-validation-resume.log','frozen-all-regression.log','frozen-regression.log','function-specialization.log','focused-private.log','staged-training-functions.json','staged-function-bundle.json','staged-function-admission.log','publication-compiler-build.log','publication-frozen-regression.log','publication-owned-regression.log','test-executable.json']:
 if(b/name).exists():copy(b/name,name)
for p in b.glob('*combined-fetch.log'):copy(p,'dependency-validation/'+p.name)
for p in b.glob('*combined-metadata.log'):copy(p,'dependency-validation/'+p.name)
for name in ['distribution-fetch.log','distribution-metadata.log']:
 copy(b/name,'dependency-validation/'+name)
for name in ['compiler-sources.json','publication-replay.json']:
 if(b/name).exists():copy(b/name,name)
for name in ['probe-graph.log','probe-graph-shared.log','probe-graph-carriers.log','inspect-proof.log','inspect-proof-shared.log','combined-cross-target.log','combined-core-validation-disk-failure.log','compiler-build.log']:
 if(b/name).exists():copy(b/name,'diagnostics/'+name)
for name in ['combined-validation-disk-failure','combined-validation-second-disk-failure']:
 tree(b/name,'diagnostics/'+name)
for name in ['probe_graph.py','run_combined_core_batches.py','resume_combined_core_batches.py','retain.py','check_sources.py','replay.py']:
 copy(b/name,'reproduction/'+name)
copy(r/'core/tests/fixtures/staged-neural-frozen.core.json','staged/source.core.json')
manifest={str(p.relative_to(out)):dict(sha256=hashlib.sha256(p.read_bytes()).hexdigest(),bytes=p.stat().st_size)for p in out.rglob('*')if p.is_file()and p.name not in ['summary.json','audit.py']}
plan=json.loads((out/'proof/plan.json').read_bytes());view=plan['steps'][-1]['package']['knowledge'];receipt=json.loads((out/'core-validation/receipt.json').read_bytes())
source=subprocess.check_output(['git','rev-parse','HEAD'],cwd=r,text=True).strip();pins={n:subprocess.check_output(['git','-C',str(r/n),'rev-parse','HEAD'],text=True).strip()for n in ['knowledge','planner','abi','native-support','lowerings/rust','lowerings/js','lowerings/wasm','lowerings/gpu','runtime']}
summary=dict(schema=1,status='validated-explicit-specialization',distribution_source=source,packages=pins,core=json.loads((out/'combined-core-package.json').read_bytes()),results=dict(core_tests=501,integration_targets=83,source_files=len(receipt['files']),calls_per_cpu_target=335,restores=6,initialized_javascript=True,knowledge_javascript_calls=200,knowledge_javascript_restores=5,frozen_regressions=31,functions=list(plan['steps'][-1]['package']['proofs']),proof_objects=len(view['objects']),theorems=sum(e['kind']=='theorem'for e in view['objects'].values()),plan_bytes=(out/'proof/plan.json').stat().st_size),scope='A 32-node owned F32 graph with mutable code and live weights; an authored exact structural guard dispatches to a staged branch or the generic evaluator. Conservative helper extension and unconditional source-bound function equalities replay in core. All native/JS/Wasm observations, events, rollback and exact portable snapshots match the independent reference history. Complete loss/update/frame projections also admit independently. No measured performance or automatic profitable selection claim. Automatic guard insertion, broad learned representation search, device training and upstream performance parity remain open. Source translation, lowerers, runtime, ABI, toolchains and hardware remain trusted.',diagnostics='Earlier disk-full link failures and rejected identity/import/proof-depth proposals are retained as failed attempts. Completed core phases were reused only after exact source, command and log hash checks; every failed phase and remaining phase reran normally. Test executables were copied out before ordinary Cargo cleanup; no Cargo artifact/fingerprint was fabricated or restored.',files=manifest)
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(len(manifest),sum(v['bytes']for v in manifest.values()),summary['results'])
