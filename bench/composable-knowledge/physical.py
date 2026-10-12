"""Checked independent storage capabilities, full state calls and Wasm parity."""
import argparse,copy,hashlib,json,random,statistics,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import canonical
from ink_knowledge.recipes import load
from producers.planning_recipes import physical
from run import command
DRIVER=r'''
use compiled_state::{bench_prepare,bench_run,bench_snapshot,bench_validate,bench_validate_hash};
fn main(){let a=std::env::args().skip(1).map(|x|x.parse::<u32>().unwrap()).collect::<Vec<_>>();let validation=bench_validate();let validation_hash=bench_validate_hash();let start=std::time::Instant::now();bench_prepare(a[0]);let setup=start.elapsed().as_nanos();let snapshot=bench_snapshot();let expected=bench_run(a[1],1);for _ in 0..8{std::hint::black_box(bench_run(a[1],1));}let start=std::time::Instant::now();let sum=bench_run(a[1],a[2]);let elapsed=start.elapsed().as_nanos();println!("{}",serde_json::json!({"setup_ns":setup.to_string(),"call_ns":elapsed.to_string(),"snapshot":snapshot,"expected":expected.to_string(),"checksum":sum.to_string(),"validation":validation,"validation_hash":validation_hash.to_string()}));}
'''
LIBRARY=r'''
std::thread_local!{static BENCH_STATE:std::cell::RefCell<Option<State>>=const{std::cell::RefCell::new(None)};}
pub fn bench_validate()->serde_json::Value{
 fn record(s:&mut State,out:&mut Vec<serde_json::Value>,name:&str,args:serde_json::Value){let reply=s.invoke_json(name,&args).unwrap();out.push(serde_json::json!([reply,s.checkpoint().unwrap()]));}
 let mut s=State::new().unwrap();let mut out=vec![];
 record(&mut s,&mut out,"put",serde_json::json!([0,17]));record(&mut s,&mut out,"put",serde_json::json!([u64::MAX,u64::MAX]));
 record(&mut s,&mut out,"erase",serde_json::json!([0,true]));record(&mut s,&mut out,"get",serde_json::json!([0]));
 let saved=s.checkpoint().unwrap();s.begin_transaction().unwrap();record(&mut s,&mut out,"put",serde_json::json!([9,7]));s.rollback_transaction();assert_eq!(s.checkpoint().unwrap(),saved);
 s=State::restore(&saved).unwrap();record(&mut s,&mut out,"get",serde_json::json!([u64::MAX]));
 let mut corrupt=saved.clone();let last=corrupt.len()-1;corrupt[last]^=1;assert!(State::restore(&corrupt).is_err());assert_eq!(s.checkpoint().unwrap(),saved);
 record(&mut s,&mut out,"erase",serde_json::json!([0,false]));record(&mut s,&mut out,"get",serde_json::json!([0]));serde_json::json!(out)
}
#[no_mangle]pub extern "C" fn bench_validate_hash()->u64{bench_validate().to_string().bytes().fold(0u64,|hash,b|hash.wrapping_mul(31).wrapping_add(b as u64))}
#[no_mangle]pub extern "C" fn bench_prepare(n:u32){let mut s=State::new().unwrap();for i in 0..n{s.invoke_json("put",&serde_json::json!([i,i*17])).unwrap();}BENCH_STATE.with(|p|*p.borrow_mut()=Some(s));}
pub fn bench_snapshot()->Vec<u8>{BENCH_STATE.with(|p|p.borrow().as_ref().unwrap().checkpoint().unwrap())}
#[no_mangle]pub extern "C" fn bench_run(key:u32,iterations:u32)->u64{BENCH_STATE.with(|p|{let mut s=p.borrow_mut();let s=s.as_mut().unwrap();let mut checksum=0u64;for _ in 0..iterations{let reply=s.invoke_json("get",&serde_json::json!([key])).unwrap();let bytes=reply.to_string();let mut hash=0u64;for b in bytes.bytes(){hash=hash.wrapping_mul(31).wrapping_add(b as u64);}checksum=checksum.wrapping_add(hash);}checksum})}
'''

def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--output',type=Path,default=ROOT/'build/composable-knowledge/physical');p.add_argument('--validate-only',action='store_true');a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);compiler=out/'frozen-ink';compiler.write_bytes(a.compiler.resolve().read_bytes());compiler.chmod(0o755);source=ROOT/'examples/action-transitions.ink'
 model=out/'model.json';proposals=out/'proposals.json';command([compiler,'emit-action-model',source,'-o',model]);command([sys.executable,ROOT/'knowledge/producers/representations.py',model,'-o',proposals]);req=json.loads(proposals.read_bytes())['requests'][0]
 packet=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=req['input_core_sha256'],steps=[dict(kind='representation',package=req)]);path=out/'baseline.plan.json';path.write_bytes(canonical(packet));stdout,_=command([compiler,'check-plan',source,path]);ctx=json.loads(stdout)['state'];ctx['emit_target']='rust'
 recipe=next(r for r in load()[0]['recipes']if r['id']=='literal-physical-alternatives');alternatives=[r['step']['package']for r in physical(ctx,**recipe['parameters'])]
 both=max((p for p in alternatives if p['packed_datatypes']and p['memo_functions']),key=lambda p:len(p['packed_datatypes'])+len(p['memo_functions']))
 lanes={};builds=[]
 for name,packed,memo in [('shared',False,False),('packed',True,False),('memo',False,True),('composed',True,True)]:
  plan=copy.deepcopy(both);plan['packed_datatypes']=both['packed_datatypes']if packed else[];plan['memo_functions']=both['memo_functions']if memo else[]
  variant=copy.deepcopy(packet);variant['steps'].append(dict(kind='physical',package=plan));path=out/(name+'.plan.json');path.write_bytes(canonical(variant));command([compiler,'check-plan',source,path])
  # Fake reachable sites and a legacy exclusive tag still fail admission.
  if name=='composed':
   for bad in [dict(plan,memo_functions=['0'*64]),dict(plan,definitions='packed')]:
    forged=copy.deepcopy(variant);forged['steps'][-1]['package']=bad;badpath=out/'bad.plan.json';badpath.write_bytes(canonical(forged));r=subprocess.run([str(compiler),'check-plan',str(source),str(badpath)],capture_output=True);assert r.returncode!=0
  project=out/name;command([compiler,'build',source,'--target','rust','-o',project]);command([compiler,'emit-plan',source,path,'--target','rust','-o',project/'src/lib.rs']);lib=project/'src/lib.rs';lib.write_text(lib.read_text()+'\n'+LIBRARY);(project/'src/main.rs').write_text(DRIVER)
  for target in ['native','wasm32-unknown-unknown']:
   argv=['cargo','build','--release','--manifest-path',project/'Cargo.toml','--target-dir',out/'target']
   if target!='native':argv+=['--lib','--target',target]
   _,seconds=command(argv);builds.append(dict(lane=name,target=target,seconds=seconds))
   src=out/'target'/('release/compiled-state'if target=='native'else'wasm32-unknown-unknown/release/compiled_state.wasm');dest=out/(name+('.wasm'if target!='native'else'.bin'));dest.write_bytes(src.read_bytes())
   if target=='native':dest.chmod(0o755)
  lanes[name]=dict(packed_sites=len(plan['packed_datatypes']),memo_sites=len(plan['memo_functions']),plan_sha256=hashlib.sha256(canonical(variant)).hexdigest(),emitted_source_sha256=hashlib.sha256(lib.read_bytes()).hexdigest(),cargo_lock_sha256=hashlib.sha256((project/'Cargo.lock').read_bytes()).hexdigest())
 rng=random.Random(718);results=[];validation=None;validation_hash=None
 for size in ([16]if a.validate_only else[16,128,512]):
  for key in [0,size-1,size+1]:
   samples={name:[]for name in lanes};setup={name:[]for name in lanes};expected=None;snapshot=None;iterations=256
   for round_ in range(1 if a.validate_only else 9):
    names=list(lanes);rng.shuffle(names)
    for name in names:
     stdout,_=command([out/(name+'.bin'),size,key,iterations]);row=json.loads(stdout)
     if expected is None:expected=row['expected'];snapshot=row['snapshot']
     if validation is None:validation=row['validation'];validation_hash=row['validation_hash']
     assert row['validation']==validation and row['validation_hash']==validation_hash
     assert row['expected']==expected and row['snapshot']==snapshot
     assert int(row['checksum'])==(int(expected)*iterations)%2**64
     samples[name].append(int(row['call_ns'])/iterations);setup[name].append(int(row['setup_ns']))
   results.append(dict(size=size,key=key,expected=expected,samples_ns=samples,setup_samples_ns=setup,median_ns={n:statistics.median(v)for n,v in samples.items()}))
 (out/'native.json').write_text(json.dumps(dict(compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),lanes=lanes,builds=builds,results=results,validation=validation,validation_hash=validation_hash,boundary='Complete JSON state query calls and consumed replies; initial construction and insertion costs separately measured; exact prepared portable snapshots compared across all variants. Independent capability compositions also compare rollback, host rollback, events, full-word values, restore and corrupt-snapshot rejection.'),indent=2)+'\n')
 stdout,_=command(['node',Path(__file__).with_name('physical.mjs'),out]);(out/'wasm.json').write_text(stdout+'\n');print('physical native/Wasm measurements and snapshot parity complete')
if __name__=='__main__':main()
