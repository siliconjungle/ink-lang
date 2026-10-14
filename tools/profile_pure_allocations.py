#!/usr/bin/env python3
"""Attribute allocation requests to generated pure functions, offline only.

Instrument a separate native module and compare its complete outputs with the
unmodified selected module. Counts are diagnostic; no timings, live/peak memory,
proof authority or runtime optimization probes are produced.
"""
import argparse,hashlib,json,os,re,shutil,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_planner.offline_measurements import read_workload
from ink_planner.native_measurements import manifest
p=argparse.ArgumentParser(description=__doc__)
for n in ['compiler','source','plan','workload','project','cargo-target-directory']:p.add_argument('--'+n,type=Path,required=True)
p.add_argument('--core',action='store_true');a=p.parse_args();spec,workload_sha=read_workload(a.workload)
if spec['schema']!=1:p.error('allocation profiling supports pure-call workloads only')
plan=json.loads(a.plan.read_text())
if any(step['kind']!='physical'for step in plan['steps']):p.error('this profiler currently requires a physical-only packet, so method coverage binds the input core exactly')
project=a.project.resolve();(project/'src/bin').mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve();core=project/'core.json'
if a.core:
 if a.source.resolve()!=core.resolve():shutil.copy2(a.source,core)
 r=subprocess.run([compiler,'check-core',core],check=True,capture_output=True,text=True,timeout=600)
else:r=subprocess.run([compiler,'emit-core',a.source.resolve(),'-o',core],check=True,capture_output=True,text=True,timeout=600)
source=json.loads(r.stdout)['core_sha256'];program=json.loads(core.read_text())['program'];assert source==plan['input_core_sha256']
subprocess.run([compiler,'emit-plan',core,a.plan.resolve(),'--core','--target','rust','-o',project/'src/lib.rs'],check=True,capture_output=True,timeout=600)
literal=(project/'src/lib.rs').read_text();(project/'src/literal.rs').write_text(literal);names=[f['name']for f in program['functions']];indices={n:i for i,n in enumerate(names)};seen={}
def instrument(m):
 name=m[2];seen[name]=seen.get(name,0)+1;return m[1]+f'let __ink_allocation_scope=__InkAllocationScope::enter({indices[name]});'
pattern=r'(?m)((?:pub(?:\([^)]*\))?\s+)?fn (?:ink_borrowed_)?function_l_([A-Za-z0-9_]+)\([^\n]*?\)->[^\n{]+\{)'
counted=re.sub(pattern,instrument,literal);assert set(seen)==set(names),'source method coverage differs'
counted=re.sub(r'(?m)^(\s*)#\[no_mangle\]\n(\s*)pub extern "C" fn (lang_[A-Za-z0-9_]*)',lambda m:m[1]+'#[export_name="ink_allocation_profile_'+m[3]+'"]\n'+m[2]+'pub extern "C" fn '+m[3],counted)
counted+='\n'+'''thread_local!{static __INK_CURRENT_FUNCTION:std::cell::Cell<usize>=const{std::cell::Cell::new(usize::MAX)};}
pub static __INK_CALLS:[std::sync::atomic::AtomicU64;COUNT]=[const{std::sync::atomic::AtomicU64::new(0)};COUNT];
pub static __INK_REQUESTS:[std::sync::atomic::AtomicU64;COUNT]=[const{std::sync::atomic::AtomicU64::new(0)};COUNT];
pub static __INK_REQUESTED_BYTES:[std::sync::atomic::AtomicU64;COUNT]=[const{std::sync::atomic::AtomicU64::new(0)};COUNT];
struct __InkAllocationScope{previous:usize}
impl __InkAllocationScope{fn enter(index:usize)->Self{__INK_CALLS[index].fetch_add(1,std::sync::atomic::Ordering::Relaxed);Self{previous:__INK_CURRENT_FUNCTION.with(|cell|cell.replace(index))}}}
impl Drop for __InkAllocationScope{fn drop(&mut self){let _=__INK_CURRENT_FUNCTION.try_with(|cell|cell.set(self.previous));}}
fn __ink_record_request(bytes:usize){let _=__INK_CURRENT_FUNCTION.try_with(|cell|{let index=cell.get();if index<COUNT{__INK_REQUESTS[index].fetch_add(1,std::sync::atomic::Ordering::Relaxed);__INK_REQUESTED_BYTES[index].fetch_add(bytes as u64,std::sync::atomic::Ordering::Relaxed);}});}
struct __InkAllocationProfiler;
unsafe impl std::alloc::GlobalAlloc for __InkAllocationProfiler{
 unsafe fn alloc(&self,layout:std::alloc::Layout)->*mut u8{let value=unsafe{std::alloc::GlobalAlloc::alloc(&std::alloc::System,layout)};if !value.is_null(){__ink_record_request(layout.size());}value}
 unsafe fn alloc_zeroed(&self,layout:std::alloc::Layout)->*mut u8{let value=unsafe{std::alloc::GlobalAlloc::alloc_zeroed(&std::alloc::System,layout)};if !value.is_null(){__ink_record_request(layout.size());}value}
 unsafe fn realloc(&self,pointer:*mut u8,layout:std::alloc::Layout,size:usize)->*mut u8{let value=unsafe{std::alloc::GlobalAlloc::realloc(&std::alloc::System,pointer,layout,size)};if !value.is_null(){__ink_record_request(size);}value}
 unsafe fn dealloc(&self,pointer:*mut u8,layout:std::alloc::Layout){unsafe{std::alloc::GlobalAlloc::dealloc(&std::alloc::System,pointer,layout)}}
}
#[global_allocator]static __INK_ALLOCATION_PROFILER:__InkAllocationProfiler=__InkAllocationProfiler;
'''.replace('COUNT',str(len(names)))
(project/'src/counted.rs').write_text(counted)
main='''#[path="../literal.rs"]mod literal;#[path="../counted.rs"]mod counted;
use serde_json::{Value,json};use std::sync::atomic::Ordering::Relaxed;
fn main(){let spec:Value=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let mut literal=literal::State::new();let mut counted=counted::State::new();let mut rows=vec![];
for(phase,entries)in spec["phases"].as_object().unwrap(){for entry in entries.as_array().unwrap(){let name=entry["function"].as_str().unwrap();let want=literal.call_json(name,&entry["args"]).unwrap();for counters in [&counted::__INK_CALLS,&counted::__INK_REQUESTS,&counted::__INK_REQUESTED_BYTES]{for counter in counters{counter.store(0,Relaxed);}}let got=counted.call_json(name,&entry["args"]).unwrap();assert_eq!(serde_json::to_vec(&got).unwrap(),serde_json::to_vec(&want).unwrap(),"{phase}: {name}");let calls:Vec<_>=counted::__INK_CALLS.iter().map(|c|c.load(Relaxed)).collect();let requests:Vec<_>=counted::__INK_REQUESTS.iter().map(|c|c.load(Relaxed)).collect();let bytes:Vec<_>=counted::__INK_REQUESTED_BYTES.iter().map(|c|c.load(Relaxed)).collect();rows.push(json!({"phase":phase,"function":name,"generated_method_entries":calls,"allocation_requests":requests,"requested_bytes":bytes,"output_bytes":serde_json::to_vec(&got).unwrap().len()}));}}
println!("{}",json!({"rows":rows,"outputs_equal":true}));}
'''
(project/'src/bin/profile_allocations.rs').write_text(main);(project/'Cargo.toml').write_text(manifest('ink-source-allocation-profile'))
env={**os.environ,'CARGO_HOME':str(ROOT/'build/cargo-home'),'RUSTFLAGS':'-C target-cpu=native'};target=a.cargo_target_directory.resolve()
subprocess.run(['cargo','build','--offline','--release','--manifest-path',project/'Cargo.toml','--bin','profile_allocations','--target-dir',target],env=env,check=True,timeout=600)
(project/'target/release').mkdir(parents=True,exist_ok=True);exe=project/'target/release/profile_allocations';shutil.copy2(target/'release/profile_allocations',exe)
raw=json.loads(subprocess.check_output([exe,a.workload.resolve()],env=env,text=True,timeout=600));assert raw['outputs_equal'];(project/'allocations.json').write_text(json.dumps(dict(names=names,method_variants=seen,**raw),indent=2)+'\n')
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();(project/'receipt.json').write_text(json.dumps(dict(source=source,compiler_sha256=sha(compiler),plan_sha256=sha(a.plan),workload_sha256=workload_sha,literal_sha256=sha(project/'src/literal.rs'),instrumented_sha256=sha(project/'src/counted.rs'),harness_sha256=sha(project/'src/bin/profile_allocations.rs'),tool_sha256=sha(__file__),executable_sha256=sha(exe),result_sha256=sha(project/'allocations.json'),scope='Offline diagnostic allocation/reallocation request counts and gross requested bytes, attributed exclusively to the innermost generated source method, including owning/borrowed variants. Complete selected literal outputs compared. No timings, live/peak memory, proof authority, or automatic planner publication.'),indent=2)+'\n');shutil.copy2(__file__,project/'profile-tool.py');print(json.dumps(dict(status='recorded',functions=len(names),outputs_equal=True)))
