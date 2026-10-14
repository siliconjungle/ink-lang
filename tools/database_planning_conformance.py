#!/usr/bin/env python3
"""Real checked cross-layer compilation, using a separate reference oracle."""
import argparse,copy,json,os,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity
from ink_knowledge.store import entry
from producers import planning_recipes as recipes
from producers.representations import refs
from producers.action_replacement import call,var,convert

def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('--root',type=Path,required=True);a=p.parse_args()
 d=a.root.resolve();d.mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve()
 def run(*args,env=None):
  result=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=600,env=dict(os.environ,**(env or{})))
  if result.returncode:raise AssertionError(f'{args}: {result.stderr[-8000:]}')
  return result.stdout
 def cli(*args):
  output=run(compiler,*args);return json.loads(output)if output.lstrip().startswith(('{','['))else output
 def save(name,value):
  path=d/name;path.write_bytes(canonical(value)+b'\n');return path
 original=d/'original.json';cli('emit-core',d/'source.ink','-o',original)
 model=d/'model.json';cli('emit-action-model',original,'--core','-o',model)
 original_core=json.loads(original.read_bytes());source=json.loads(model.read_bytes())['source']
 package=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=source,steps=[])
 def check():return cli('check-plan',original,save('plan.json',package),'--core')['state']
 state=check()
 def context(state,root=ROOT/'knowledge'):
  source=save('selected.json',state['core']);cli('emit-action-model',source,'--core','-o',model)
  return dict(state,model=json.loads(model.read_bytes()),compiler=str(compiler),python=sys.executable,knowledge_root=str(root),emit_target='wgpu',representation_pool=[])
 c=context(state)
 proposals=list(recipes.action_coalescing(c,[dict(first='remove',second='remove',drop='first')]))
 rewrite=next(r for r in proposals if r['status']=='proposal');package['steps'].append(rewrite['step']);state=check()
 assert state['source']!=source,'whole-action alternative must change source'
 c=context(state);direct=next(recipes.representations(c));assert direct['status']=='proposal',direct
 package['steps'].append(direct['step']);state=check();c=context(state)
 compact=next(recipes.compact(c));assert compact['status']=='proposal',compact
 package['steps'].append(compact['step']);state=check();c=context(state)
 residual=next(recipes.residual(c));assert residual['status']=='proposal',residual
 package['steps'].append(residual['step']);state=check();c=context(state)
 properties=list(recipes.properties(c));assert properties,'expected mapped-length properties'
 for proposal in properties:
  if proposal['status']=='proposal':package['steps'].append(proposal['step']);state=check()
 # Author a new endpoint theorem with ordinary conversion, then discover it
 # through the generic database matcher. No planner theorem dispatch is added.
 current=state['representation'];rp=current['knowledge']['objects'][current['representation']]['payload'];export=rp['encode']
 f=current['knowledge']['objects'][export]['payload']['declaration']['Function'];g=copy.deepcopy(f)
 g['body']={'If':dict(condition={'Bool':True},on_true=f['body'],on_false=f['body'])}
 obj=entry('definition','first-order-inductive-equality-v1',dict(declaration={'Function':g}),refs(g),parameters=dict(g['params']),result=g['result']);gid=identity(obj)
 args=[var(n)for n,_ in f['params']];left,right=call(export,args),call(gid,args)
 theorem=dict(params=f['params'],conditions=[],**{'from':left,'to':right},proof=convert(left,right))
 law=entry('theorem','first-order-inductive-equality-v1',dict(declaration={'Theorem':theorem}),refs(theorem),parameters=dict(f['params']),result=f['result'])
 store=Store.publish(d/'endpoint-knowledge',[*current['knowledge']['objects'].values(),obj,law]);store.refresh_index()
 c=context(state,store.root);choices=list(recipes.definitions(c));assert choices,'generic definition discovery must offer the new theorem'
 accepted=None
 for proposal in choices:
  package['steps'].append(proposal['step'])
  try:state=check();accepted=proposal;break
  except AssertionError:package['steps'].pop()
 assert accepted is not None,'no definition theorem admitted'
 assert state['definition_choices'].get(export)!=export
 # Repeated layer composition remains a whole-chain replay.
 shared=dict(schema=1,semantics='ink-physical-plan-v1',input_core_sha256=state['source'],representation=state['representation']['representation'],tables='ordered',definitions='shared',borrow_reads=[],borrow_rows=[],packed_datatypes=[],memo_functions=[])
 package['steps'].append(dict(kind='physical',package=shared));check()
 frozen=save('plan.json',package)
 oracle=(d/'oracle.json').read_text();target=d/'target'
 for lane in ['rust-wasm','javascript']:
  project=d/lane;project.mkdir(exist_ok=True)
  if lane=='javascript':
   cli('emit-plan',original,frozen,'--core','--target',lane,'-o',project/'program.mjs')
  else:cli('emit-plan',original,frozen,'--core','--target',lane,'-o',project)
  shutil.copyfile(ROOT/'runtime/hosts/state-wasm.mjs',project/'state-wasm.mjs');shutil.copyfile(d/'oracle.json',project/'oracle.json')
  shutil.copyfile(ROOT/'tests/representation-parity-runner.mjs',project/'check.mjs')
  if lane=='javascript':run('node',project/'check.mjs');continue
  (project/'src/bin').mkdir(exist_ok=True)
  runner=(ROOT/'tests/representation-parity-runner.rs.txt').read_text().replace(' ink_compiled_representation::check_calls_do_not_encode_snapshot();','')
  (project/'src/bin/check.rs').write_text('use ink_compiled_representation::State;use serde_json::{Value as Json,json};const ORACLE:&str='+json.dumps(oracle)+';\n'+runner)
  run('cargo','build','--offline','--quiet','--manifest-path',project/'Cargo.toml','--target-dir',target,env=dict(CARGO_INCREMENTAL='0'))
  run(target/'debug/check')
  if lane in {'rust-wasm'}:
   zig=os.environ.get('INK_TEST_WASM')
   if not zig:
    assert not os.environ.get('INK_PARITY_REQUIRE_ALL'),'Wasm parity requires INK_TEST_WASM'
    continue
   run('cargo','build','--offline','--quiet','--lib','--target','wasm32-unknown-unknown','--manifest-path',project/'Cargo.toml','--target-dir',target,env=dict(CARGO_INCREMENTAL='0'))
   shutil.copyfile(target/'wasm32-unknown-unknown/debug/ink_compiled_representation.wasm',project/'program.wasm');run('node',project/'check.mjs',env=dict(INK_REP_WASM='1'))
 # Rust literal file uses the same project adapter; previous lane exercises it.
 rust=d/'rust.rs';cli('emit-plan',original,frozen,'--core','--target','rust','-o',rust);assert 'logic::Term'not in rust.read_text()
 if not os.environ.get('INK_TEST_WGPU'):
  save('checks.json',dict(status='passed',cpu='native/JS and configured Wasm lanes',gpu='not requested'));return
 # Select the scalar total entry rather than mapped-list output.
 route=next(r for r in recipes.whole_entry_routing(context(state),['gpu'])if r['step']['package']['package']['entry']=='total')
 package['steps'].append(route['step']);state=check();frozen=save('routed-plan.json',package)
 project=d/'composed';cli('emit-plan',original,frozen,'--core','--target','wgpu','-o',project)
 (project/'src/bin').mkdir(exist_ok=True)
 runner=(ROOT/'tests/representation-parity-runner.rs.txt').read_text().replace(' ink_compiled_representation::check_calls_do_not_encode_snapshot();','')
 runner=runner.replace(' println!("{} exact standalone requests passed",oracle.len());',''' let before=state.checkpoint().unwrap();let values:Vec<u32>=(0..4096).collect();let result=state.call_json("total",&json!([values])).unwrap();assert_eq!(result["value"],json!(8386560));assert!(result["stages"].as_array().unwrap().iter().any(|s|s["backend"]=="gpu"),"actual routed GPU required: {result}");assert_eq!(state.checkpoint().unwrap(),before);println!("state history and actual routed GPU passed");''')
 (project/'src/bin/check.rs').write_text('use ink_composed_plan::State;use serde_json::{Value as Json,json};const ORACLE:&str='+json.dumps(oracle)+';\n'+runner)
 run('cargo','build','--offline','--quiet','--manifest-path',project/'Cargo.toml','--target-dir',d/'gpu-target',env=dict(CARGO_INCREMENTAL='0'));run(d/'gpu-target/debug/check')
 # CPU lane must reject an unimplemented placement rather than ignore it.
 result=subprocess.run([str(compiler),'emit-plan',str(original),str(frozen),'--core','--target','-o',str(d/'bad-c')],capture_output=True,text=True)
 assert result.returncode and 'placement requires'in result.stderr
 save('checks.json',dict(status='passed',steps=[s['kind']for s in package['steps']],cpu=['rust','javascript','rust-wasm'],gpu='actual wgpu pure entry; maintained state exact oracle',source=source,selected=state['source']))
 print('Recursive action/representation/observer/property/definition/physical/routing plan: all CPU lanes and actual GPU passed')

def shlex_quote(value):
 import shlex
 return shlex.quote(value)
if __name__=='__main__':main()
