#!/usr/bin/env python3
"""Independent known-size allocation sequences check the benchmark probes."""
import hashlib, importlib.util, json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('state_bench',ROOT/'bench/state/run.py')
state=importlib.util.module_from_spec(spec);spec.loader.exec_module(state)
BUILD=ROOT/'build/allocation-probe-validation'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    BUILD.mkdir(parents=True,exist_ok=True);commands=[]
    def run(argv):
        commands.append(list(map(str,argv)))
        return subprocess.check_output(list(map(str,argv)),cwd=ROOT,env=state.environment(),text=True)
    checks='''
#include "allocation_probe.h"
int main(void){
 st_probe_reset();
 unsigned char*p=(unsigned char*)malloc(12),*q=(unsigned char*)calloc(20,1);
 assert((uintptr_t)p%_Alignof(max_align_t)==0);assert((uintptr_t)q%_Alignof(max_align_t)==0);
 ProbeStats s;st_probe_stats(&s);assert(s.calls==2&&s.resizes==0&&s.requested==32&&s.live==32&&s.peak==32);
 free(p);q=(unsigned char*)realloc(q,40);for(int i=0;i<20;i++)assert(q[i]==0);
 st_probe_stats(&s);assert(s.calls==3&&s.resizes==1&&s.requested==72&&s.live==40&&s.peak==40);
 free(q);st_probe_stats(&s);assert(s.live==0&&s.requested==72&&s.peak==40);
 st_probe_reset();st_probe_stats(&s);assert(s.calls==0&&s.live==0&&s.peak==0);return 0;
}
'''
    cpp='''
#include "allocation_probe.h"
int main(){
 st_probe_reset();auto*p=new unsigned char[12];auto*q=new unsigned char[20]{};
 assert((uintptr_t)p%alignof(max_align_t)==0);assert((uintptr_t)q%alignof(max_align_t)==0);
 ProbeStats s;st_probe_stats(&s);assert(s.calls==2&&s.resizes==0&&s.requested==32&&s.live==32&&s.peak==32);
 delete[]p;auto*r=new unsigned char[40];delete[]q;
 st_probe_stats(&s);assert(s.calls==3&&s.resizes==0&&s.requested==72&&s.live==40&&s.peak==60);
 delete[]r;st_probe_stats(&s);assert(s.live==0&&s.requested==72&&s.peak==60);
 st_probe_reset();st_probe_stats(&s);assert(s.calls==0&&s.live==0&&s.peak==0);return 0;
}
'''
    for name,text,cc,std in [('c',checks,'clang','c11'),('cpp',cpp,'clang++','c++20')]:
        src=BUILD/(name+('.cpp' if name=='cpp' else '.c'));src.write_text(text)
        run([cc,'-O0','-std='+std,'-Wall','-Wextra','-Werror','-I',ROOT/'bench/state',src,'-o',BUILD/name])
        run([BUILD/name])
    rust=(ROOT/'bench/state/allocation_probe.rs').read_text()+'''
#[no_mangle] pub unsafe extern "C" fn probe_smoke(){
 use std::alloc::{alloc,alloc_zeroed,dealloc,realloc,Layout};
 allocation_probe::st_probe_reset();
 let a=Layout::from_size_align(12,8).unwrap();let b=Layout::from_size_align(20,8).unwrap();
 let p=alloc(a);let q=alloc_zeroed(b);assert!(!p.is_null()&&!q.is_null());
 let mut stats=[0u64;5];allocation_probe::st_probe_stats(stats.as_mut_ptr() as *mut allocation_probe::Stats);
 assert_eq!(stats,[2,0,32,32,32]);dealloc(p,a);let q=realloc(q,b,40);assert!(!q.is_null());
 for i in 0..20{assert_eq!(*q.add(i),0);}
 allocation_probe::st_probe_stats(stats.as_mut_ptr() as *mut allocation_probe::Stats);assert_eq!(stats,[3,1,72,40,40]);
 dealloc(q,Layout::from_size_align(40,8).unwrap());
 allocation_probe::st_probe_stats(stats.as_mut_ptr() as *mut allocation_probe::Stats);assert_eq!(stats,[3,1,72,0,40]);
 allocation_probe::st_probe_reset();allocation_probe::st_probe_stats(stats.as_mut_ptr() as *mut allocation_probe::Stats);assert_eq!(stats,[0;5]);
}
'''
    (BUILD/'rust.rs').write_text(rust)
    (BUILD/'rust-host.c').write_text('extern void probe_smoke(void);int main(void){probe_smoke();return 0;}\n')
    run(['rustc','--crate-type=staticlib','--edition=2021','-C','panic=abort',BUILD/'rust.rs','-o',BUILD/'rust.a'])
    run(['clang',BUILD/'rust-host.c',BUILD/'rust.a','-liconv','-o',BUILD/'rust'])
    run([BUILD/'rust'])
    receipt=dict(status='passed',sequences=['C malloc/calloc/realloc/free','C++ new/delete and overlapping replacement buffers','Rust alloc/alloc_zeroed/realloc/dealloc'],
                 checks=['known requested/cumulative/live/peak bytes','successful allocation/reallocation counts','zero initialization and retained bytes','ordinary C/C++ alignment','zero live bytes after free','counter reset'],
                 source_sha256={str(p.relative_to(ROOT)):digest(p) for p in [Path(__file__).resolve(),ROOT/'bench/state/allocation_probe.h',ROOT/'bench/state/allocation_probe.rs']},
                 generated_source_sha256={p.name:digest(p) for p in BUILD.iterdir() if p.suffix in ['.c','.cpp','.rs']},
                 binary_sha256={str((BUILD/n).relative_to(ROOT)):digest(BUILD/n) for n in ['c','cpp','rust']},commands=commands,
                 scope='Known-size accounting checks; not allocator implementation/RSS verification or formal proof.')
    (BUILD/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt,indent=2))
if __name__=='__main__':main()
