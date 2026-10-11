#!/usr/bin/env python3
"""Matched complete-call/lifecycle control for immutable column chunks.

The same admitted column representation is emitted with ordinary Arc spines and
with the explicit packed Rust target. Timings use a separate uninstrumented
binary; allocation counts and requested live bytes use a counting allocator.
Neither result changes candidate selection or establishes a universal speedup.
"""
import argparse
import hashlib
import json
import os
import platform
import statistics
import subprocess
import time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
DRIVER = r'''
mod baseline;
mod packed;
use std::{alloc::{GlobalAlloc,Layout,System},hint::black_box,sync::atomic::{AtomicUsize,Ordering},time::Instant};
use serde_json::{Value as Json,json};
use sha2::{Digest,Sha256};
struct Count;
static LIVE:AtomicUsize=AtomicUsize::new(0);
static PEAK:AtomicUsize=AtomicUsize::new(0);
static ALLOCS:AtomicUsize=AtomicUsize::new(0);
fn added(n:usize){ALLOCS.fetch_add(1,Ordering::Relaxed);let live=LIVE.fetch_add(n,Ordering::Relaxed)+n;PEAK.fetch_max(live,Ordering::Relaxed);}
unsafe impl GlobalAlloc for Count {
 unsafe fn alloc(&self,l:Layout)->*mut u8 {let p=System.alloc(l);if !p.is_null(){added(l.size());}p}
 unsafe fn dealloc(&self,p:*mut u8,l:Layout){System.dealloc(p,l);LIVE.fetch_sub(l.size(),Ordering::Relaxed);}
 unsafe fn realloc(&self,p:*mut u8,l:Layout,n:usize)->*mut u8 {let q=System.realloc(p,l,n);if !q.is_null(){ALLOCS.fetch_add(1,Ordering::Relaxed);if n>=l.size(){let live=LIVE.fetch_add(n-l.size(),Ordering::Relaxed)+n-l.size();PEAK.fetch_max(live,Ordering::Relaxed);}else{LIVE.fetch_sub(l.size()-n,Ordering::Relaxed);}}q}
}
#[cfg(counted)] #[global_allocator] static GLOBAL:Count=Count;
trait Database:Sized {
 fn new()->Self;
 fn restore(b:&[u8])->Self;
 fn checkpoint(&self)->Vec<u8>;
 fn call(&mut self,name:&str,args:&Json)->Json;
 fn ack(&mut self);
 fn typed_get(&self,key:u64);
 fn typed_put(&mut self,key:u64,value:u64,fail:bool);
}
macro_rules! adapter {($module:ident)=>{impl Database for $module::State{
 fn new()->Self{Self::new().unwrap()}
 fn restore(b:&[u8])->Self{Self::restore(b).unwrap()}
 fn checkpoint(&self)->Vec<u8>{Self::checkpoint(self).unwrap()}
 fn call(&mut self,name:&str,args:&Json)->Json{self.invoke_json(name,args).unwrap()}
 fn ack(&mut self){self.acknowledge_through(u64::MAX,u64::MAX)}
 fn typed_get(&self,key:u64){black_box(self.query_get(key));}
 fn typed_put(&mut self,key:u64,value:u64,fail:bool){let outcome=self.invoke_view_put(key,value,true,false,true,fail).unwrap();black_box((outcome.result,outcome.version,outcome.committed));}
}}}
adapter!(baseline);adapter!(packed);
fn phase(repeats:usize,mut f:impl FnMut())->Json {
 let before=LIVE.load(Ordering::Relaxed);PEAK.store(before,Ordering::Relaxed);ALLOCS.store(0,Ordering::Relaxed);
 let start=Instant::now();for _ in 0..repeats{f();}let ns=start.elapsed().as_nanos();
 let allocations=ALLOCS.load(Ordering::Relaxed);let peak=PEAK.load(Ordering::Relaxed)-before;
 let after=LIVE.load(Ordering::Relaxed);
 json!({"repeats":repeats,"total_ns":ns as u64,"allocations":allocations,"peak_added_bytes":peak,"live_delta_bytes":after as i64-before as i64})
}
fn sample<D:Database>(n:usize)->Json {
 let startup=phase(64,||{black_box(D::new());});
 let before=LIVE.load(Ordering::Relaxed);let mut state=None;
 let initialise=phase(1,||{let mut s=D::new();for i in 0..n{s.call("put",&json!([i,i as u64,true,false,true,false]));s.ack();}state=Some(s);});
 let state_bytes=LIVE.load(Ordering::Relaxed)-before;
 let mut state=state.unwrap();let middle=(n/2)as u64;
 let expected=json!({"Some":{"value":middle,"active":true,"visible":false,"selected":true}});
 let args=json!([middle]);assert_eq!(state.call("get",&args)["result"],expected);
 let query_json=phase(256,||{assert_eq!(black_box(state.call("get",&args))["result"],expected);});
 let query_typed=phase(256,||{state.typed_get(black_box(middle));});
 let updates=json!([middle,u64::MAX,true,false,true,false]);
 let update_json=phase(32,||{let r=state.call("put",&updates);assert_eq!(r["committed"],true);state.ack();});
 let update_typed=phase(32,||{state.typed_put(black_box(middle),black_box(u32::MAX as u64+1),false);state.ack();});
 let saved=state.checkpoint();
 let abort=phase(32,||{state.typed_put(middle,17,true);});assert_eq!(state.checkpoint(),saved);
 let checkpoint=phase(16,||{black_box(state.checkpoint());});
 let restore=phase(16,||{let restored=D::restore(&saved);black_box(restored);});
 assert_eq!(D::restore(&saved).checkpoint(),saved);
 let digest=format!("{:x}",Sha256::digest(&saved));
 let teardown=phase(1,||{drop(state.take_state());});
 json!({"startup":startup,"initialise":initialise,"query_json":query_json,"query_typed":query_typed,"update_json":update_json,"update_typed":update_typed,"abort":abort,"checkpoint":checkpoint,"restore":restore,"teardown":teardown,"state_requested_bytes":state_bytes,"snapshot_sha256":digest})
}
fn main(){let args:Vec<String>=std::env::args().collect();let n=args[2].parse().unwrap();let result=if args[1]=="packed"{sample::<packed::State>(n)}else{sample::<baseline::State>(n)};println!("{result}");}
'''.replace('let teardown=phase(1,||{drop(state.take_state());});', 'let mut drop_state=Some(state);let teardown=phase(1,||{drop(drop_state.take());});')


def command(args, **kwargs):
    return subprocess.check_output([str(a) for a in args], text=True, **kwargs)


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('-o', '--output', type=Path)
    p.add_argument('--column-points', action='store_true', help='measure independently proved direct column point reads')
    p.add_argument('--column-mutations', action='store_true', help='measure proved direct column mutations and private-state erasure')
    p.add_argument('--rounds', type=int, default=7)
    a = p.parse_args()
    a.output = a.output or ROOT/('reports/frontier-extensions/column-mutation-storage-results.json' if a.column_mutations else 'reports/frontier-extensions/column-point-storage-results.json' if a.column_points else 'reports/frontier-extensions/packed-storage-results.json')
    work = ROOT/('build/frontier-column-mutation-bench' if a.column_mutations else 'build/frontier-column-point-bench' if a.column_points else 'build/frontier-packed-bench')
    (work/'src').mkdir(parents=True, exist_ok=True)
    compiler = Path(os.environ.get('INK_COMPILER', ROOT/'target/debug/ink'))
    source = ROOT/'examples/frontier-packed-flags.ink'
    command([compiler,'emit-action-model',source,'-o',work/'model.json'])
    command(['python3',ROOT/'knowledge/producers/representations.py',work/'model.json','--column-mutations' if a.column_mutations else '--column-points' if a.column_points else '--columnar','-o',work/'proposals.json'])
    request = json.loads((work/'proposals.json').read_text())['requests'][0]
    (work/'request.json').write_text(json.dumps(request,separators=(',',':')))
    for variant,target in [('baseline','rust'),('packed','rust-packed')]:
        command([compiler,'emit-representation',source,work/'request.json','--target',target,'-o',work/'src'/f'{variant}.rs'])
    (work/'src/main.rs').write_text(DRIVER)
    (work/'Cargo.toml').write_text('[package]\nname="ink-packed-storage-bench"\nversion="0.1.0"\nedition="2021"\n[workspace]\n[dependencies]\nserde_json={version="1",features=["float_roundtrip"]}\nsha2="0.10"\nnum-bigint="0.4"\n[profile.release]\nlto="thin"\ncodegen-units=1\n')
    compile_times=[]
    for name,flags in [('timing','-Awarnings'),('memory','-Awarnings --cfg counted')]:
        start=time.perf_counter_ns()
        command(['cargo','build','--offline','--release','--quiet','--manifest-path',work/'Cargo.toml','--target-dir',work/name],env={**os.environ,'RUSTFLAGS':flags})
        compile_times.append({'binary':name,'compile_ns':time.perf_counter_ns()-start})
    inputs={'source.ink':source.read_bytes(),'model.json':(work/'model.json').read_bytes(),'request.json':(work/'request.json').read_bytes(),
            'baseline.rs':(work/'src/baseline.rs').read_bytes(),'packed.rs':(work/'src/packed.rs').read_bytes(),
            'driver.rs':(work/'src/main.rs').read_bytes(),'Cargo.toml':(work/'Cargo.toml').read_bytes(),'Cargo.lock':(work/'Cargo.lock').read_bytes()}
    hashes={name:hashlib.sha256(data).hexdigest() for name,data in inputs.items()}
    artifact_id=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest()
    evidence=a.output.parent/'benchmark-inputs'/artifact_id
    evidence.mkdir(parents=True,exist_ok=True)
    for name,data in inputs.items():(evidence/name).write_bytes(data)
    results=[]
    for n in [1,64,256,1024]:
        samples=[]
        for r in range(a.rounds):
            for variant in (['baseline','packed'] if r%2==0 else ['packed','baseline']):
                sample=json.loads(command([work/'timing/release/ink-packed-storage-bench',variant,n]))
                samples.append({'variant':variant,'round':r,**sample})
        assert len({s['snapshot_sha256'] for s in samples})==1
        memory={v:json.loads(command([work/'memory/release/ink-packed-storage-bench',v,n])) for v in ['baseline','packed']}
        assert len({m['snapshot_sha256'] for m in memory.values()})==1
        phases=[k for k,v in samples[0].items() if isinstance(v,dict)]
        median={v:{phase:statistics.median(s[phase]['total_ns']/s[phase]['repeats'] for s in samples if s['variant']==v) for phase in phases} for v in ['baseline','packed']}
        results.append({'rows':n,'samples':samples,'memory':memory,'median_ns_per_operation':median})
        print(n,median,flush=True)
    a.output.parent.mkdir(parents=True,exist_ok=True)
    a.output.write_text(json.dumps({'schema':1,'machine':platform.platform(),'architecture':platform.machine(),'rustc':command(['rustc','--version']).strip(),'compile':compile_times,'artifact_directory':str(evidence.relative_to(a.output.parent)),'artifact_sha256':hashes,'column_points':a.column_points or a.column_mutations,'column_mutations':a.column_mutations,'rustflags':{'timing':'-Awarnings','memory':'-Awarnings --cfg counted'},'cargo_profile':'release, thin LTO, one codegen unit','source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'request_sha256':hashlib.sha256((work/'request.json').read_bytes()).hexdigest(),'scope':'Identical checked column representation and source, ordinary Arc scalar spines versus immutable packed chunks. Complete typed and JSON calls include observation, publication and acknowledgement. Exact portable snapshots and abort preservation checked; startup, population, checkpoint, restore and teardown measured separately. Uninstrumented alternating samples and separate requested-heap counting allocator. No C/JS/Wasm timing, automatic selection or universal performance claim. Restore timing includes teardown of restored state; acknowledgement is included in update phases. Snapshot digest verifies the two artifacts execute the same workload.','results':results},indent=2)+'\n')
    print(a.output)

if __name__=='__main__':main()
