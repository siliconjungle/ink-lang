"""Collect exact existing observations; publication waits for corpus terminal."""
from pathlib import Path
import hashlib,json,subprocess
from ink_knowledge import Store,identity
b=Path('build/v8-variable-power-cases');out=Path('bench/v8-learning/variable-power');objects=[]
for variant in ['original','refined']:
 for target in ['javascript','rust']:
  d=b/('runtime-'+target+(''if variant=='original'else'-refined'));store=Store(d/'knowledge')
  for split in ['training','holdout']:
   r=json.loads((d/(split+'-report.json')).read_bytes());assert not r['acquisition']['rejected']
   for ident in r['acquisition']['observations']:
    obj=json.loads((store.data/'observations'/(ident+'.json')).read_bytes());assert identity(obj)==ident;objects.append(obj)
for name in ['runtime-gpu','runtime-gpu-refined']:
 r=json.loads((b/name/'receipt.json').read_bytes());objects.extend(r['observation_proposals'])
assert len(objects)==282 and len({identity(o)for o in objects})==282
for obj in objects:Store.validate_observation(obj);assert obj['entries']==[]and len(obj['metrics']['complete_call_ns'])in [11,33]
(out/'observation-proposals.json').write_text(json.dumps(dict(schema=1,objects=objects,scope='Exact192 CPU and90 explicit-device immutable timing rows, including the measured zero-first prototype; no automatic placement/profile/policy or proof snapshot change.'),indent=2)+'\n')
def git(path,*a):return subprocess.check_output(['git','-C',str(path),*a],text=True).strip()
paths=['knowledge/ink_knowledge/proposal_views.py','knowledge/producers/v8_integer_laws.py','knowledge/producers/data/v8-integer-laws/index.json','knowledge/tests/test_proposal_view_membership.py','knowledge/tests/test_v8_variable_power.py','knowledge/tests/test_v8_integer_laws.py','knowledge/tests/fixtures/v8-variable-power/source.ink']
source=dict(schema=1,distribution_source=git('.', 'rev-parse','HEAD'),core_tree=git('.','rev-parse','HEAD:core'),core_package=json.loads(Path('core-package.json').read_bytes()),knowledge_before=git('knowledge','rev-parse','HEAD'),pins={name:git(name,'rev-parse','HEAD')for name in ['planner','runtime','abi','native-support','lowerings/rust','lowerings/js','lowerings/wasm','lowerings/gpu']},compiler=dict(path='build/v8-proof-dependencies-final-cli/frozen/ink-integrated',sha256=hashlib.sha256(Path('build/v8-proof-dependencies-final-cli/frozen/ink-integrated').read_bytes()).hexdigest(),source='7e6e1dc608e1079ae8c99f6b680299797796eab6'),inputs={p:hashlib.sha256(Path(p).read_bytes()).hexdigest()for p in paths},scope='Exact prepublication producer/proof/test bytes. No new core/backend/ABI/runtime source, compiler rebuild, budget or policy. Historical and prototype measurements remain tied to their exact plans/contexts.')
(out/'source-pins.json').write_text(json.dumps(source,indent=2)+'\n');print('Collected282 exact immutable observations')
