#!/usr/bin/env python3
"""Finite macOS sampling of an unchanged emitted Rust library; not timing evidence."""
import argparse,hashlib,json,os,re,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--project',type=Path,required=True);p.add_argument('--cases',type=Path,required=True)
p.add_argument('--case',required=True);p.add_argument('--output',type=Path,required=True)
p.add_argument('--iterations',type=int,default=100);p.add_argument('--delay',type=int,default=3);p.add_argument('--seconds',type=int,default=5)
a=p.parse_args()
if not 1<=a.iterations<=10000 or not 0<=a.delay<=30 or not 1<=a.seconds<=30:p.error('bounded positive iterations/sample duration required')
root=Path(__file__).resolve().parents[2];project=a.project.resolve();output=a.output.resolve()
code=(project/'src/lib.rs').read_bytes();match=re.search(rb'pub fn function_l_materialize\(&self,l_changes:Vec<([^>]+)>',code)
if not match:raise ValueError('expected emitted materialize entry')
ty=match[1].decode()
runner='''#[path="../lib.rs"] mod treatment;
use treatment::{State,Wire,CHANGE_TYPE};
use serde_json::Value;use std::hint::black_box;
fn main(){let args:Vec<String>=std::env::args().collect();let cases:Value=serde_json::from_slice(&std::fs::read(&args[1]).unwrap()).unwrap();let case=cases.as_array().unwrap().iter().find(|c|c["name"]==args[2]).unwrap();let input:Vec<CHANGE_TYPE>=Wire::from_json(&case["changes"]).unwrap();let state=State::new();let expected=case["expected"].as_array().expect("diagnostic requires supplied expected text");assert_eq!(state.function_l_materialize(input.clone()).unwrap(),expected.iter().map(|v|v.as_u64().unwrap() as u32).collect::<Vec<_>>());std::thread::sleep(std::time::Duration::from_secs(args[4].parse().unwrap()));for _ in 0..args[3].parse::<usize>().unwrap(){drop(black_box(state.function_l_materialize(black_box(input.clone())).unwrap()));}}
'''.replace('CHANGE_TYPE',ty)
(project/'src/bin/profile.rs').write_text(runner)
env={**os.environ,'CARGO_HOME':str(root/'build/cargo-home'),'RUSTFLAGS':'-C target-cpu=native'}
output.parent.mkdir(parents=True,exist_ok=True)
with Path(str(output)+'.build.log').open('w') as log:subprocess.run(['cargo','build','--offline','--release','--bin','profile'],cwd=project,env=env,stdout=log,stderr=log,check=True)
exe=project/'target/release/profile'
with Path(str(output)+'.run.log').open('w') as log:
 child=subprocess.Popen([exe,a.cases.resolve(),a.case,str(a.iterations),str(a.delay)],stdout=log,stderr=log)
 try:
  time.sleep(a.delay+0.2)
  if child.poll() is not None:raise RuntimeError('profile process ended before sampling')
  with Path(str(output)+'.sample.log').open('w') as samplelog:subprocess.run(['sample',str(child.pid),str(a.seconds),'-file',str(output)+'.sample.txt'],stdout=samplelog,stderr=samplelog,check=True)
  if child.wait(timeout=180):raise RuntimeError('profile validation/run failed')
 finally:
  if child.poll() is None:child.terminate();child.wait()
if (project/'src/lib.rs').read_bytes()!=code:raise RuntimeError('emitted source changed during sampling')
Path(str(output)+'.receipt.json').write_text(json.dumps(dict(schema=1,emitted_sha256=hashlib.sha256(code).hexdigest(),executable_sha256=hashlib.sha256(exe.read_bytes()).hexdigest(),cases_sha256=hashlib.sha256(a.cases.read_bytes()).hexdigest(),case=a.case,iterations=a.iterations,delay_seconds=a.delay,sample_seconds=a.seconds,scope='Finite diagnostic; input cloning included; no eligible elapsed-time or peak-memory claim'),indent=2)+'\n')
print('Saved',output)
