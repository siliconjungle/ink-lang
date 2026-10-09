#!/usr/bin/env python3
"""Count allocations in separate instrumented builds; never use these for timing."""
import ctypes, hashlib, importlib.util, json, shutil, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'reports/wide-cache-phase1';BUILD=ROOT/'build/cache-allocation-audit'
INSTRUMENT=r'''
mod allocation_audit {
 use std::alloc::{GlobalAlloc,Layout,System};
 use std::sync::atomic::{AtomicBool,AtomicU64,Ordering::Relaxed};
 static ENABLED:AtomicBool=AtomicBool::new(false);
 static CALLS:AtomicU64=AtomicU64::new(0);
 static BYTES:AtomicU64=AtomicU64::new(0);
 struct Counted;
 fn count(size:usize){if ENABLED.load(Relaxed){CALLS.fetch_add(1,Relaxed);BYTES.fetch_add(size as u64,Relaxed);}}
 unsafe impl GlobalAlloc for Counted {
  unsafe fn alloc(&self,layout:Layout)->*mut u8{count(layout.size());System.alloc(layout)}
  unsafe fn alloc_zeroed(&self,layout:Layout)->*mut u8{count(layout.size());System.alloc_zeroed(layout)}
  unsafe fn realloc(&self,p:*mut u8,layout:Layout,size:usize)->*mut u8{count(size);System.realloc(p,layout,size)}
  unsafe fn dealloc(&self,p:*mut u8,layout:Layout){System.dealloc(p,layout)}
 }
 #[global_allocator] static ALLOCATOR:Counted=Counted;
 #[no_mangle] pub extern "C" fn allocation_begin(){ENABLED.store(false,Relaxed);CALLS.store(0,Relaxed);BYTES.store(0,Relaxed);ENABLED.store(true,Relaxed);}
 #[no_mangle] pub extern "C" fn allocation_end(){ENABLED.store(false,Relaxed);}
 #[no_mangle] pub extern "C" fn allocation_calls()->u64{CALLS.load(Relaxed)}
 #[no_mangle] pub extern "C" fn allocation_bytes()->u64{BYTES.load(Relaxed)}
}
'''
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    spec=importlib.util.spec_from_file_location('wide_cache',ROOT/'bench/wide-cache.py');wide=importlib.util.module_from_spec(spec);spec.loader.exec_module(wide)
    env=wide.state.environment();env['RUSTFLAGS']='-C target-cpu=native -C panic=abort';env['CARGO_TARGET_DIR']=str(BUILD/'target')
    metadata=json.loads((OUT/'metadata.json').read_text());rows=[];hashes={};commands=[]
    for variant in wide.VARIANTS:
        source=OUT/variant/'src/lib.rs';assert sha(source)==metadata['artifact_sha256'][str(source.relative_to(OUT))]
        project=BUILD/variant;(project/'src').mkdir(parents=True,exist_ok=True)
        (project/'src/lib.rs').write_text(source.read_text()+INSTRUMENT)
        shutil.copyfile(OUT/variant/'Cargo.toml',project/'Cargo.toml');shutil.copyfile(OUT/variant/'Cargo.lock',project/'Cargo.lock')
        command=['cargo','build','--release','--offline','--lib','--manifest-path',str(project/'Cargo.toml')]+(['--features','baseline'] if variant=='rust_bigint' else [])
        subprocess.run(command,env=env,cwd=ROOT,check=True,capture_output=True);commands.append(command)
        library=BUILD/f'{variant}.dylib';shutil.copyfile(BUILD/'target/release/libcompiled_state.dylib',library);hashes[variant]=sha(library)
        lib=ctypes.CDLL(str(library));ptr=ctypes.c_void_p;u32=ctypes.c_uint32
        for name,args,result in [('wide_new',[u32,u32],ptr),('wide_set',[ptr,u32],u32),('wide_observe',[ptr],ptr),('wide_string_free',[ptr],None),('wide_free',[ptr],None),
                                 ('allocation_begin',[],None),('allocation_end',[],None),('allocation_calls',[],ctypes.c_uint64),('allocation_bytes',[],ctypes.c_uint64)]:
            getattr(lib,name).argtypes=args;getattr(lib,name).restype=result
        for bits in [64,512,4096,8192]:
            for profile in [0,1]:
                context=lib.wide_new(bits,profile)
                try:
                    lib.allocation_begin()
                    for step in range(128):assert lib.wide_set(context,(step*19)%32)==0
                    lib.allocation_end();calls=lib.allocation_calls();requested=lib.allocation_bytes()
                    raw=lib.wide_observe(context)
                    try:observed=json.loads(ctypes.string_at(raw))
                    finally:lib.wide_string_free(raw)
                    inputs=wide.values(bits,profile);assert observed==wide.observation(bits,inputs[(127*19)%32],128)
                    rows.append(dict(variant=variant,bits=bits,profile=profile,steps=128,allocation_and_reallocation_calls=calls,
                                     requested_bytes=requested,calls_per_update=calls/128,requested_bytes_per_update=requested/128))
                finally:lib.allocation_end();lib.wide_free(context)
    data=dict(status='passed',rows=rows,instrumentation=INSTRUMENT,commands=commands,binary_sha256=hashes,
              measured_source_sha256={v:sha(OUT/v/'src/lib.rs') for v in wide.VARIANTS},
              scope='Separate instrumented builds: allocation/reallocation calls and requested bytes for updates only. Not timings, live memory, peak RSS or retained capacity. Setup, observations and query digests excluded. Original measured sources/timing samples unchanged.')
    (OUT/'allocations.json').write_text(json.dumps(data,indent=2)+'\n')
    print(json.dumps({'status':'passed','cases':len(rows),'8192_small_calls':{r['variant']:r['calls_per_update'] for r in rows if r['bits']==8192 and r['profile']==0}},indent=2))
if __name__=='__main__':main()
