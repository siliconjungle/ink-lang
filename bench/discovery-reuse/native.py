"""Original/selected traversal proofs through complete native/Rust-Wasm JSON calls."""
import argparse,hashlib,json,random,statistics,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
LIBRARY=r'''
std::thread_local!{static BENCH:std::cell::RefCell<Option<(State,String,serde_json::Value,String)>>=const{std::cell::RefCell::new(None)};}
#[no_mangle]pub extern "C" fn bench_prepare(n:u32,which:u32){
 let rows=(0..n).map(|i|serde_json::json!({"key":i,"label":format!("row-{}",i),"flag":i%2!=0})).collect::<Vec<_>>();
 let names=["visible","discarded","keep_left","keep_right","combined_count","combined_length"];
 let args=match which{0|1=>serde_json::json!([rows]),2=>serde_json::json!([rows,"seed-λ"]),3=>serde_json::json!([rows,u64::MAX]),_=>serde_json::json!([rows,rows[..(n/2)as usize]])};
 let original=args.to_string();BENCH.with(|s|*s.borrow_mut()=Some((State::new(),names[which as usize].into(),args,original)));
}
#[no_mangle]pub extern "C" fn bench_run(iterations:u32)->u64{BENCH.with(|s|{let mut s=s.borrow_mut();let(s,name,args,_)=s.as_mut().unwrap();let mut checksum=0u64;for _ in 0..iterations{let value=s.call_json(name,args).unwrap();let text=value.to_string();let hash=text.bytes().fold(0u64,|h,b|h.wrapping_mul(31).wrapping_add(b as u64));checksum=checksum.wrapping_add(hash);}checksum})}
#[no_mangle]pub extern "C" fn bench_immutable()->u32{BENCH.with(|s|{let s=s.borrow();let(_,_,args,before)=s.as_ref().unwrap();u32::from(&args.to_string()==before)})}
'''
DRIVER=r'''
fn main(){let args=std::env::args().skip(1).map(|a|a.parse::<u32>().unwrap()).collect::<Vec<_>>();let start=std::time::Instant::now();compiled_state::bench_prepare(args[0],args[1]);let setup=start.elapsed().as_nanos();let expected=compiled_state::bench_run(1);for _ in 0..8{std::hint::black_box(compiled_state::bench_run(1));}let start=std::time::Instant::now();let sum=compiled_state::bench_run(args[2]);let elapsed=start.elapsed().as_nanos();assert_eq!(compiled_state::bench_immutable(),1);println!("{}",serde_json::json!({"setup_ns":setup.to_string(),"call_ns":elapsed.to_string(),"expected":expected.to_string(),"checksum":sum.to_string()}));}
'''
def command(args):
 start=time.perf_counter();r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=600)
 if r.returncode:raise ValueError(r.stderr)
 return r.stdout,time.perf_counter()-start

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'build/traversal-elimination/native');a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);compiler=ROOT/'target/debug/ink';source=Path(__file__).with_name('traversals.ink');plan=ROOT/'build/traversal-elimination/plan.json';builds=[];lanes={}
 for lane in ['literal','selected']:
  project=out/lane;command([compiler,'build',source,'--target','rust','-o',project])
  if lane=='selected':command([compiler,'emit-plan',source,plan,'--target','rust','-o',project/'src/lib.rs'])
  lib=project/'src/lib.rs';lib.write_text(lib.read_text()+'\n'+LIBRARY);(project/'src/main.rs').write_text(DRIVER)
  for target in ['native','wasm32-unknown-unknown']:
   argv=['cargo','build','--release','--manifest-path',project/'Cargo.toml','--target-dir',out/'target']
   if target!='native':argv+=['--lib','--target',target]
   _,seconds=command(argv);builds.append(dict(lane=lane,target=target,seconds=seconds))
   src=out/'target'/('release/compiled-state'if target=='native'else'wasm32-unknown-unknown/release/compiled_state.wasm');dest=out/(lane+('.bin'if target=='native'else'.wasm'));dest.write_bytes(src.read_bytes())
   if target=='native':dest.chmod(0o755)
  lanes[lane]=dict(emitted_source_sha256=hashlib.sha256(lib.read_bytes()).hexdigest(),cargo_lock_sha256=hashlib.sha256((project/'Cargo.lock').read_bytes()).hexdigest())
 rng=random.Random(843);results=[]
 for size in [0,128,4096]:
  for which,name in enumerate(['visible','discarded','keep_left','keep_right','combined_count','combined_length']):
   samples={lane:[]for lane in lanes};setup={lane:[]for lane in lanes};iterations={};expected=None
   for lane in lanes:
    stdout,_=command([out/(lane+'.bin'),size,which,1]);row=json.loads(stdout)
    if expected is None:expected=row['expected']
    assert row['expected']==expected
    iterations[lane]=max(1,min(32768,int(8_000_000/max(1,int(row['call_ns'])))))
   for _ in range(7):
    order=list(lanes);rng.shuffle(order)
    for lane in order:
     stdout,_=command([out/(lane+'.bin'),size,which,iterations[lane]]);row=json.loads(stdout);assert row['expected']==expected;assert int(row['checksum'])==int(expected)*iterations[lane]%2**64
     samples[lane].append(int(row['call_ns'])/iterations[lane]);setup[lane].append(int(row['setup_ns']))
   results.append(dict(size=size,which=which,fn=name,expected=expected,samples_ns=samples,setup_samples_ns=setup,median_ns={lane:statistics.median(values)for lane,values in samples.items()}))
 report=dict(compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),lanes=lanes,builds=builds,results=results,boundary='Complete JSON call_json including input validation/conversion and output JSON serialization/hash consumption. Constructed inputs resident in the host outside call timer; setup measured separately. This boundary differs from caller-trusted JS, so ratios are within each backend, not comparisons between backends.')
 (out/'native.json').write_text(json.dumps(report,indent=2)+'\n');stdout,_=command(['node',Path(__file__).with_name('native.mjs'),out]);(out/'wasm.json').write_text(stdout+'\n');print('native and Rust-Wasm JSON-boundary samples complete')
if __name__=='__main__':main()
