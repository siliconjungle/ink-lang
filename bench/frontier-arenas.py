#!/usr/bin/env python3
"""Matched temporary-constructor allocation control, not a database benchmark.

Compile the production arena text and the previous Vec<Box<T>> storage, with
identical values, work and lifetimes. Timings exclude allocator instrumentation;
a separate binary records requested heap bytes and allocation counts.
"""
import argparse
import json
import platform
import statistics
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRIVER = r'''
use std::{alloc::{GlobalAlloc,Layout,System},hint::black_box,sync::atomic::{AtomicUsize,Ordering},time::Instant};
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
trait Storage {fn new()->Self;fn push(&mut self,v:(u64,u64))->*const(u64,u64);fn rewind(&mut self);}
struct Boxes(Vec<Box<(u64,u64)>>);
impl Storage for Boxes {
 fn new()->Self{Self(vec![])}
 fn push(&mut self,v:(u64,u64))->*const(u64,u64){self.0.push(Box::new(v));self.0.last().unwrap().as_ref()}
 fn rewind(&mut self){self.0.clear();}
}
impl Storage for NativeArena<(u64,u64)> {
 fn new()->Self{NativeArena::new()}
 fn push(&mut self,v:(u64,u64))->*const(u64,u64){self.push(v)}
 fn rewind(&mut self){self.rewind(0)}
}
fn call<S:Storage>(s:&mut S,n:usize)->u64 {
 let mut sum=0u64;
 for i in 0..n {let p=s.push(black_box((i as u64,(i as u64).wrapping_mul(7))));sum=sum.wrapping_add(unsafe{black_box((*p).0.wrapping_add((*p).1))});}
 s.rewind();black_box(sum)
}
fn sample<S:Storage>(n:usize,repeats:usize) {
 let before=LIVE.load(Ordering::Relaxed);let mut s=S::new();
 PEAK.store(before,Ordering::Relaxed);ALLOCS.store(0,Ordering::Relaxed);
 let cold_start=Instant::now();let cold=call(&mut s,n);let cold_ns=cold_start.elapsed().as_nanos();
 let cold_allocs=ALLOCS.load(Ordering::Relaxed);let cold_peak=PEAK.load(Ordering::Relaxed)-before;
 ALLOCS.store(0,Ordering::Relaxed);PEAK.store(LIVE.load(Ordering::Relaxed),Ordering::Relaxed);
 let start=Instant::now();let mut sum=0u64;for _ in 0..repeats{sum=sum.wrapping_add(call(&mut s,n));}let ns=start.elapsed().as_nanos();
 assert_eq!(sum,cold.wrapping_mul(repeats as u64));assert_eq!(cold,(n as u64).wrapping_mul((n as u64).saturating_sub(1)).wrapping_mul(4));
 let allocs=ALLOCS.load(Ordering::Relaxed);let retained=LIVE.load(Ordering::Relaxed)-before;let peak=PEAK.load(Ordering::Relaxed)-before;
 let teardown=Instant::now();drop(s);let teardown_ns=teardown.elapsed().as_nanos();assert_eq!(LIVE.load(Ordering::Relaxed),before);
 println!("{{\"cold_ns\":{cold_ns},\"cold_allocations\":{cold_allocs},\"cold_peak_bytes\":{cold_peak},\"warm_total_ns\":{ns},\"warm_allocations\":{allocs},\"retained_bytes\":{retained},\"warm_peak_bytes\":{peak},\"teardown_ns\":{teardown_ns}}}");
}
fn main(){let a:Vec<String>=std::env::args().collect();let n=a[2].parse().unwrap();let repeats=a[3].parse().unwrap();if a[1]=="arena"{sample::<NativeArena<(u64,u64)>>(n,repeats);}else{sample::<Boxes>(n,repeats);}}
'''


def run(command):
    return subprocess.check_output(command, text=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('-o', '--output', type=Path,
                        default=ROOT / 'reports/frontier-extensions/arena-results.json')
    args = parser.parse_args()
    work = ROOT / 'build/frontier-arenas'
    work.mkdir(parents=True, exist_ok=True)
    arena = ROOT / 'lowerings/rust/src/constructor_arena.rs.txt'
    source = work / 'control.rs'
    source.write_text(arena.read_text() + DRIVER)
    compile_results = []
    for name, flags in [('timing', []), ('memory', ['--cfg', 'counted'])]:
        import time
        start = time.perf_counter_ns()
        subprocess.run(['rustc', '--edition=2021', '-O', '-Awarnings', *flags,
                        str(source), '-o', str(work / name)], check=True)
        compile_results.append({'binary': name, 'ns': time.perf_counter_ns() - start})
    results = []
    for size in [1, 64, 256, 4096]:
        repeats = 2000 if size < 4096 else 200
        samples = []
        for round_number in range(7):
            order = ['boxes', 'arena'] if round_number % 2 == 0 else ['arena', 'boxes']
            for variant in order:
                samples.append({'variant': variant, 'round': round_number,
                                **json.loads(run([str(work / 'timing'), variant,
                                                  str(size), str(repeats)]))})
        memory = {v: json.loads(run([str(work / 'memory'), v, str(size), str(repeats)]))
                  for v in ['boxes', 'arena']}
        medians = {v: statistics.median(x['warm_total_ns'] / repeats for x in samples
                                        if x['variant'] == v) for v in ['boxes', 'arena']}
        results.append({'constructors_per_call': size, 'repeats': repeats,
                        'uninstrumented_samples': samples, 'memory': memory,
                        'median_warm_call_ns': medians})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({
        'schema': 1, 'machine': platform.platform(), 'architecture': platform.machine(),
        'rustc': run(['rustc', '--version']).strip(), 'compile': compile_results,
        'scope': 'Temporary scalar-pair constructor storage control only; identical values, pointer reads, checksums and call rewind. No database, FFI, Arc fields, proof checking or JSON. Cold and teardown regions reported separately. Warm timings exclude construction and allocator instrumentation.',
        'memory_scope': 'Requested live heap bytes, peak bytes and allocations in a separate instrumented binary; allocator headers, stack and RSS excluded. A warmed arena retains one 256-element chunk; oversize temporary chunks are freed each call.',
        'results': results,
    }, indent=2) + '\n')
    print(args.output)
    for result in results:
        print(result['constructors_per_call'], result['median_warm_call_ns'],
              {v: x['warm_allocations'] / result['repeats']
               for v, x in result['memory'].items()})


if __name__ == '__main__':
    main()
