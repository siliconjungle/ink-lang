#!/usr/bin/env python3
"""Matched complete A* calls with sparse versus reusable dense scratch maps."""
import argparse,gzip,hashlib,json,os,platform,runpy,statistics,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
DRIVER=runpy.run_path(str(ROOT/'bench/frontier-packed-storage.py'))['DRIVER']
COUNT=DRIVER[DRIVER.index('use std::'):DRIVER.index('trait Database')]
PHASE=DRIVER[DRIVER.index('fn phase('):DRIVER.index('fn sample<')]
RUST='mod before;mod after;\n'+COUNT+PHASE+r'''
trait Database:Sized{fn new()->Self;fn call(&mut self,args:&Json)->Json;fn checkpoint(&self)->Vec<u8>;fn restore(b:&[u8])->Self;}
macro_rules! adapter{($m:ident)=>{impl Database for $m::State{fn new()->Self{Self::new()}fn call(&mut self,args:&Json)->Json{self.invoke_json("route",args).unwrap()}fn checkpoint(&self)->Vec<u8>{Self::checkpoint(self).unwrap()}fn restore(b:&[u8])->Self{Self::restore(b).unwrap()}}}}adapter!(before);adapter!(after);
fn sample<D:Database>(width:usize)->Json{
 let args=json!([vec![0u32;width*width],width,0,width*width-1,width*width*8]);
 let startup=phase(32,||{black_box(D::new());});let mut state=D::new();let saved=state.checkpoint();let mut expected=None;
 let cold=phase(1,||{expected=Some(state.call(&args));});let expected=expected.unwrap();assert_eq!(expected["result"]["found"],true);assert_eq!(expected["result"]["distance"],2*(width-1));
 let warm=phase(32,||{assert_eq!(black_box(state.call(&args)),expected);});assert_eq!(state.checkpoint(),saved);
 let checkpoint=phase(32,||{black_box(state.checkpoint());});let restore=phase(32,||{black_box(D::restore(&saved));});let retained=LIVE.load(Ordering::Relaxed);
 let mut state=Some(state);let teardown=phase(1,||{drop(state.take());});
 json!({"startup":startup,"cold_query":cold,"warm_query":warm,"checkpoint":checkpoint,"restore":restore,"teardown":teardown,"requested_live_bytes_after_warm":retained,"snapshot_sha256":format!("{:x}",Sha256::digest(&saved)),"result_sha256":format!("{:x}",Sha256::digest(serde_json::to_vec(&expected).unwrap()))})
}
fn main(){let args:Vec<String>=std::env::args().collect();let width=args[2].parse().unwrap();let v=if args[1]=="before"{sample::<before::State>(width)}else{sample::<after::State>(width)};println!("{v}");}
'''
def command(args,**kwargs):
 p=subprocess.run([str(a)for a in args],capture_output=True,text=True,**kwargs)
 if p.returncode:raise RuntimeError(p.stderr)
 return p.stdout

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--rounds',type=int,default=7);a=p.parse_args()
 work=ROOT/'build/frontier-scratch-bench';(work/'src').mkdir(parents=True,exist_ok=True)
 source=(ROOT/'examples/local-pathfinding.ink').read_text()+'\nquery route(grid:List<u32>,width:u32,start:u32,goal:u32,limit:u32)->Route{return astar(grid,width,start,goal,limit);}\n'
 (work/'source.ink').write_text(source);compiler=Path(os.environ.get('INK_COMPILER',ROOT/'target/debug/ink'))
 command([compiler,'build',work/'source.ink','--target','rust','-o',work/'native'])
 emitted=(work/'native/src/lib.rs').read_text();emitted=emitted.split('\n#[cfg(not(target_arch = "wasm32"))]\npub mod durable;',1)[0].replace('#[no_mangle]', '');assert 'OwnedMap::new()'in emitted
 (work/'src/after.rs').write_text(emitted);(work/'src/before.rs').write_text(emitted.replace('OwnedMap::new()','OwnedMap::new_sparse()'))
 (work/'src/main.rs').write_text(RUST);(work/'Cargo.toml').write_text('[package]\nname="ink-scratch-bench"\nversion="0.1.0"\nedition="2021"\n[workspace]\n[dependencies]\nserde_json={version="1",features=["float_roundtrip"]}\nsha2="0.10"\nnum-bigint="0.4"\n[profile.release]\nlto="thin"\ncodegen-units=1\n')
 costs=[]
 for name,flags in [('timing','-Awarnings'),('memory','-Awarnings --cfg counted')]:
  start=time.perf_counter_ns();command(['cargo','build','--release','--offline','--quiet','--manifest-path',work/'Cargo.toml','--target-dir',work/name],env={**os.environ,'RUSTFLAGS':flags});costs.append(dict(binary=name,compile_ns=time.perf_counter_ns()-start))
 inputs={n:(work/n).read_bytes()for n in ['source.ink','Cargo.toml','Cargo.lock']};inputs.update({n+'.rs':(work/'src'/(n+'.rs')).read_bytes()for n in ['before','after','main']})
 hashes={n:hashlib.sha256(d).hexdigest()for n,d in inputs.items()};identity=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest();evidence=ROOT/'reports/frontier-extensions/benchmark-inputs'/identity;evidence.mkdir(parents=True,exist_ok=True)
 for n,d in inputs.items():(evidence/(n+'.gz')).write_bytes(gzip.compress(d,mtime=0))
 rows=[]
 for width in [4,24,64,72]:
  samples=[]
  for round in range(a.rounds):
   for variant in (['before','after']if round%2==0 else['after','before']):samples.append(dict(round=round,variant=variant,**json.loads(command([work/'timing/release/ink-scratch-bench',variant,width]))))
  memory={v:json.loads(command([work/'memory/release/ink-scratch-bench',v,width]))for v in ['before','after']}
  for field in ['snapshot_sha256','result_sha256']:assert len({s[field]for s in [*samples,*memory.values()]})==1
  medians={v:{phase:statistics.median(s[phase]['total_ns']/s[phase]['repeats']for s in samples if s['variant']==v)for phase in ['startup','cold_query','warm_query','checkpoint','restore','teardown']}for v in ['before','after']}
  rows.append(dict(width=width,cells=width*width,samples=samples,memory=memory,median_ns=medians));print(width,medians,flush=True)
 report=dict(schema=1,machine=platform.platform(),rustc=command(['rustc','--version']).strip(),compile=costs,artifact_directory='benchmark-inputs/'+identity,artifact_sha256=hashes,compression='gzip, mtime zero; hashes bind decompressed exact bytes',rounds=a.rounds,measurements=rows,scope='Same fixed source heap/A* and complete native JSON route query. Only map creation chooses sparse control versus exact dense scratch with fallback. Open grids, same paths/distances/expanded/limited fields and snapshots. Warm includes repeated invocation and JSON. Generation tests independently cover wrap/reclamation/aliasing. Fixed primitive lowering remains trusted; this is not a universal theorem replacing A* with BFS.')
 (ROOT/'reports/frontier-extensions/scratch-results.json').write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__':main()
