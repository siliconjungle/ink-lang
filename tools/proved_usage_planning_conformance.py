#!/usr/bin/env python3
"""Executable certificates, database capacity strategies and frozen emission.
Outputs and malformed input behaviour are compared with the complete source.
"""
import argparse,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.refinement_laws import examples
from producers.contextual_properties import propose
from producers.capacity_plans import propose as capacities
from producers.resource_plans import propose as resources

def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('--root',type=Path,required=True);a=p.parse_args();d=a.root.resolve();d.mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve()
 def run(*args):
  result=subprocess.run(list(map(str,args)),text=True,capture_output=True,timeout=600,env=dict(os.environ,CARGO_INCREMENTAL='0',CARGO_PROFILE_DEV_DEBUG='0'))
  if result.returncode:raise AssertionError(f'{args}: {result.stderr[-6000:]}')
  return result.stdout
 def cli(*args):return json.loads(run(compiler,*args))
 def save(name,v):path=d/name;path.write_bytes(canonical(v));return path
 source=d/'source.ink';source.write_text('module bounded;fn select(xs:List<u32>)->List<u32>{return xs.filter(fn(x)=>x>3);}')
 core=d/'core.json';cli('emit-core',source,'-o',core);original=json.loads(core.read_bytes());source_id=cli('check-core',core)['core_sha256']
 knowledge=d/'knowledge';laws=examples();store=Store.publish(knowledge,[semantic_entry(l) for l in laws.values()]);store.rebuild()
 context=dict(source=source_id,core=original,compiler=str(compiler),knowledge_root=str(knowledge),knowledge_snapshot=store.snapshot_id)
 packets=list(propose(context));bound=next(p for p in packets if p['step']['package']['facts'][0]['value']=={'sort':{'Value':'Bool'},'node':{'Bool':True}} and p['step']['package']['facts'][0]['context']['node'].get('Op',[None])[0]=='binary:<=')
 cli('check-properties',core,save('properties.json',bound['step']['package']),'--core')
 context['properties']=[bound['step']['package']];context['representation']=None
 physical=next(capacities(context));plan=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=source_id,steps=[bound['step'],physical['step']]);plan_path=save('plan.json',plan)
 cli('check-plan',core,plan_path,'--core','--target','rust');cli('emit-plan',core,plan_path,'--core','--target','rust','-o',d/'reserved.rs')
 emitted=(d/'reserved.rs').read_text();assert 'Vec::with_capacity(ink_reserved_capacity)' in emitted
 # Tampered capacities cannot borrow an unrelated fact or a different source.
 wrong=json.loads(canonical(plan));wrong['steps'][-1]['package']['reservations'][0]['parameter']='unknown'
 result=subprocess.run([str(compiler),'check-plan',str(core),str(save('forged.json',wrong)),'--core'],capture_output=True);assert result.returncode
 # Rust-Wasm receives the same literal collector; the other CPU lanes execute
 # the source with erased properties (capacity is capability-gated).
 for target in ['rust','javascript','rust-wasm']:
  output=d/target
  if target in ['rust','rust-wasm']:cli('emit-plan',core,plan_path,'--core','--target',target,'-o',output)
  else:cli('emit-plan',core,save('erased-plan.json',dict(plan,steps=[bound['step']])),'--core','--target',target,'-o',output)
 # Emitted native Rust runner exercises the actual selected implementation.
 package=d/'runner';(package/'src').mkdir(parents=True,exist_ok=True)
 (package/'Cargo.toml').write_text('[package]\nname="capacity-conformance"\nversion="0.1.0"\nedition="2021"\n[dependencies]\nserde_json={version="1",features=["float_roundtrip"]}\nnum-bigint="0.4"\nsha2="0.10"\n[workspace]\n')
 (package/'src/main.rs').write_text(emitted+'\nfn main(){let mut state=State::new();for args in [serde_json::json!([[]]),serde_json::json!([[0u32,3,4,4294967295u32]]),serde_json::json!([[4,4,0,9]])]{println!("{}",state.call_json("select",&args).unwrap());}}')
 results=[json.loads(x) for x in run('cargo','run','--offline','--quiet','--manifest-path',package/'Cargo.toml').splitlines()]
 assert results==[[],[4,4294967295],[4,4,9]],results
 print(json.dumps(dict(source=source_id,plan=identity(plan),facts=len(packets),reserved_outputs=results,targets=['rust','javascript','rust-wasm'],scope='proof and literal emission; target execution parity separately tested')))
if __name__=='__main__':main()
