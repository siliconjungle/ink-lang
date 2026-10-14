#!/usr/bin/env python3
"""Sample literal emitted retained-state merges; diagnostic, not timing evidence."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--project', type=Path, required=True)
p.add_argument('--cases', type=Path, required=True)
p.add_argument('--case', required=True)
p.add_argument('--output', type=Path, required=True)
p.add_argument('--iterations', type=int, default=2048)
p.add_argument('--seconds', type=int, default=2)
p.add_argument('--gate-seconds', type=int, default=1)
p.add_argument('--chunk', type=int, default=64)
p.add_argument('--cargo-target-directory', type=Path, required=True)
p.add_argument('--owned-document', action='store_true')
a = p.parse_args()
if not 1 <= a.iterations <= 4096 or not 2 <= a.seconds <= 15 or not 1 <= a.gate_seconds < a.seconds or a.chunk < 1:
    p.error('bounded iterations, sample duration and positive chunk required')
root = Path(__file__).resolve().parents[2]
project = a.project.resolve()
code = (project / 'src/lib.rs').read_bytes()
signature = rb'pub fn function_l_merge\(&self,l_document:l_Document,l_incoming:Vec<([^>]+)>' if a.owned_document else rb'pub fn invoke_l_merge\(&mut self,l_changes:Vec<([^>]+)>'
ty = re.search(signature, code)
if not ty:
    raise ValueError('expected literal typed merge entry')
runner = r'''
#[path="../lib.rs"] mod emitted;
use emitted::{State, Wire, CHANGE_TYPE};
mod native {
 include!("persistent_diamond.rs");
 pub fn expected(changes:&[Value])->Vec<u32>{let mut log=ListOpLog::new();append(&mut log,changes);visible(&log)}
}
use std::hint::black_box;
use std::io::{BufRead, Write};
use std::sync::atomic::{AtomicBool,AtomicU64,Ordering::Relaxed};
static COUNT:AtomicBool=AtomicBool::new(false);
static ALLOCS:AtomicU64=AtomicU64::new(0);
static BYTES:AtomicU64=AtomicU64::new(0);
static REALLOCS:AtomicU64=AtomicU64::new(0);
struct CountAlloc;
unsafe impl std::alloc::GlobalAlloc for CountAlloc {
 unsafe fn alloc(&self,l:std::alloc::Layout)->*mut u8 {
  if COUNT.load(Relaxed){ALLOCS.fetch_add(1,Relaxed);BYTES.fetch_add(l.size() as u64,Relaxed);}
  std::alloc::System.alloc(l)
 }
 unsafe fn dealloc(&self,p:*mut u8,l:std::alloc::Layout){std::alloc::System.dealloc(p,l)}
 unsafe fn realloc(&self,p:*mut u8,l:std::alloc::Layout,n:usize)->*mut u8 {
  if COUNT.load(Relaxed){REALLOCS.fetch_add(1,Relaxed);BYTES.fetch_add(n as u64,Relaxed);}
  std::alloc::System.realloc(p,l,n)
 }
}
#[global_allocator]static ALLOC:CountAlloc=CountAlloc;
#[inline(never)]
fn retained_merge(state:&mut State,input:Vec<CHANGE_TYPE>){
 let out=black_box(state.invoke_l_merge(black_box(input)).unwrap());assert!(out.committed);drop(out);
}
fn main(){
 let args:Vec<String>=std::env::args().collect();
 let cases:serde_json::Value=serde_json::from_slice(&std::fs::read(&args[1]).unwrap()).unwrap();
 let case=cases.as_array().unwrap().iter().find(|c|c["name"]==args[2]).unwrap();
 let changes:Vec<CHANGE_TYPE>=Wire::from_json(&case["changes"]).unwrap();
 let expected=native::expected(case["changes"].as_array().unwrap());
 let count:usize=args[3].parse().unwrap();let chunk:usize=args[4].parse().unwrap();let split=changes.len()/2;
 let mut base=State::new();assert!(base.invoke_l_merge(changes[..split].to_vec()).unwrap().committed);
 let bytes=base.checkpoint().unwrap();let mut checked=State::restore(&bytes).unwrap();
 for input in changes[split..].chunks(chunk){retained_merge(&mut checked,input.to_vec());}
 assert_eq!(checked.invoke_l_visible().unwrap().result.unwrap().into_iter().collect::<Vec<_>>(),expected);
 let mut states:Vec<_>=(0..count).map(|_|State::restore(&bytes).unwrap()).collect();
 let inputs:Vec<Vec<Vec<_>>>=(0..count).map(|_|changes[split..].chunks(chunk).map(|c|c.to_vec()).collect()).collect();
 println!("ready");std::io::stdout().flush().unwrap();let mut line=String::new();std::io::stdin().lock().read_line(&mut line).unwrap();
 COUNT.store(true,Relaxed);
 for(state,input)in states.iter_mut().zip(inputs){for batch in input{retained_merge(state,batch);}}
 COUNT.store(false,Relaxed);
 for state in &mut states{assert_eq!(state.invoke_l_visible().unwrap().result.unwrap().into_iter().collect::<Vec<_>>(),expected);}
 println!("{}",serde_json::json!({"status":"passed","iterations":count,"allocations":ALLOCS.load(Relaxed),"reallocations":REALLOCS.load(Relaxed),"allocated_bytes":BYTES.load(Relaxed)}));
}
'''.replace('CHANGE_TYPE', ty[1].decode())
if a.owned_document:
    adapter = r'''
struct State{kernel:emitted::State,document:Option<emitted::l_Document>}
struct Merged{committed:bool}
struct Visible{result:Result<Vec<u32>,String>}
impl State{
 fn new()->Self{let kernel=emitted::State::new();let document=Some(kernel.function_l_empty());Self{kernel,document}}
 fn invoke_l_merge(&mut self,input:Vec<CHANGE_TYPE>)->Result<Merged,String>{
  let document=self.document.take().unwrap();self.document=Some(self.kernel.function_l_merge(document,input).map_err(|e|format!("{e:?}"))?);Ok(Merged{committed:true})
 }
 fn invoke_l_visible(&mut self)->Result<Visible,String>{Ok(Visible{result:self.kernel.function_l_visible(self.document.as_ref().unwrap().clone()).map(|v|v.into_iter().collect()).map_err(|e|format!("{e:?}"))})}
 fn checkpoint(&self)->Result<emitted::l_Document,String>{Ok(self.document.as_ref().unwrap().clone())}
 fn restore(document:&emitted::l_Document)->Result<Self,String>{Ok(Self{kernel:emitted::State::new(),document:Some(document.clone())})}
}
'''.replace('CHANGE_TYPE', ty[1].decode())
    runner = runner.replace('use emitted::{State, Wire,', 'use emitted::{Wire,') + adapter
(project / 'src/bin/retained_profile.rs').write_text(runner)
out = a.output.resolve()
out.parent.mkdir(parents=True, exist_ok=True)
env = {**os.environ, 'CARGO_HOME': str(root / 'build/cargo-home'), 'RUSTFLAGS': '-C target-cpu=native'}
with Path(str(out) + '.build.log').open('w') as log:
    subprocess.run(['cargo', 'build', '--offline', '--release', '--manifest-path', str(project / 'Cargo.toml'), '--bin', 'retained_profile', '--target-dir', str(a.cargo_target_directory.resolve())], env=env, stdout=log, stderr=log, check=True)
exe = Path(str(out) + '.executable')
shutil.copy2(a.cargo_target_directory.resolve() / 'release/retained_profile', exe)
child = subprocess.Popen([str(exe), str(a.cases.resolve()), a.case, str(a.iterations), str(a.chunk)], stdout=subprocess.PIPE, stdin=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
try:
    if child.stdout.readline().strip() != 'ready':
        raise RuntimeError('profile preparation failed: ' + child.stderr.read())
    with Path(str(out) + '.sample.log').open('w') as log:
        sample = subprocess.Popen(['sample', str(child.pid), str(a.seconds), '-file', str(out) + '.sample.txt'], stdout=log, stderr=log)
        # Sampling starts before the workload gate opens; setup is excluded.
        time.sleep(a.gate_seconds)
        child.stdin.write('go\n')
        child.stdin.flush()
        stdout, stderr = child.communicate(timeout=180)
        if sample.wait(timeout=a.seconds + 30):
            raise RuntimeError('sampling failed')
    Path(str(out) + '.run.log').write_text(stdout + stderr)
    if child.returncode:
        raise RuntimeError('profile validation/run failed')
finally:
    if child.poll() is None:
        child.terminate()
        child.wait()
if (project / 'src/lib.rs').read_bytes() != code:
    raise RuntimeError('emitted source changed during sampling')
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
sampled_merges = 'retained_merge' in Path(str(out) + '.sample.txt').read_text()
Path(str(out) + '.receipt.json').write_text(json.dumps(dict(schema=1, sampled_merges=sampled_merges, emitted_sha256=hashlib.sha256(code).hexdigest(), executable_sha256=sha(exe), cases_sha256=sha(a.cases), runner_sha256=sha(project / 'src/bin/retained_profile.rs'), case=a.case, iterations=a.iterations, chunk=a.chunk, sample_seconds=a.seconds, owned_document=a.owned_document, scope='Allocation-instrumented finite diagnostic; only merge calls, results and input destruction counted; state restore/initial document cloning and input preparation excluded. Sampling can include other phases; inspect retained_merge stacks separately. Full output checked before and after. No elapsed-time or peak-memory claim.'), indent=2) + '\n')
if not sampled_merges:
    raise RuntimeError('allocation/output validation passed, but sampling captured no retained merges')
print('Saved', out)
