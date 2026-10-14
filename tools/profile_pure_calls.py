#!/usr/bin/env python3
"""Record offline source-function call frequencies for planner proposal order.

Instrument a diagnostic copy of literal native emission, compare every complete
output with an unmodified copy, and publish ordinary usage data. The instrumented
code is never a performance candidate, proof, or emitted application artifact.
"""
import argparse,hashlib,json,os,platform,re,shutil,subprocess,sys,uuid
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical
from ink_knowledge.usage_profiles import publish,validate,SEMANTICS
from ink_planner.offline_measurements import read_workload
from ink_planner.native_measurements import manifest
p=argparse.ArgumentParser(description=__doc__)
for name in ['compiler','source','workload','project','cargo-target-directory']:p.add_argument('--'+name,type=Path,required=True)
p.add_argument('--knowledge-root',type=Path);p.add_argument('--core',action='store_true');a=p.parse_args();spec,workload_sha=read_workload(a.workload)
if spec['schema']!=1:p.error('source-call profiling currently supports pure-call workloads only')
project=a.project.resolve();(project/'src/bin').mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve();core=project/'core.json'
if a.core:
 if a.source.resolve()!=core.resolve():shutil.copy2(a.source,core)
 r=subprocess.run([compiler,'check-core',core],capture_output=True,text=True,check=True,timeout=600)
else:r=subprocess.run([compiler,'emit-core',a.source.resolve(),'-o',core],capture_output=True,text=True,check=True,timeout=600)
source=json.loads(r.stdout)['core_sha256'];program=json.loads(core.read_text())['program']
subprocess.run([compiler,'build',core,'--core','--target','rust','-o',project],capture_output=True,text=True,check=True,timeout=600)
literal=(project/'src/lib.rs').read_text();(project/'src/literal.rs').write_text(literal);names=[]
def instrument(m):
 index=len(names);names.append(m[2]);return m[1]+f'__INK_CALL_COUNTS[{index}].fetch_add(1,std::sync::atomic::Ordering::Relaxed);'
pattern=r'(?m)((?:pub(?:\([^)]*\))?\s+)?fn function_l_([A-Za-z0-9_]+)\([^\n]*?\)->[^\n{]+\{)'
counted=re.sub(pattern,instrument,literal);assert len(names)==len(set(names))and set(names)=={f['name']for f in program['functions']},'function coverage mismatch'
counted=re.sub(r'(?m)^(\s*)#\[no_mangle\]\n(\s*)pub extern "C" fn (lang_[A-Za-z0-9_]*)',lambda m:m[1]+'#[export_name="ink_profile_'+m[3]+'"]\n'+m[2]+'pub extern "C" fn '+m[3],counted)
counted+=f'\npub static __INK_CALL_COUNTS:[std::sync::atomic::AtomicU64;{len(names)}]=[const{{std::sync::atomic::AtomicU64::new(0)}};{len(names)}];\n'
(project/'src/counted.rs').write_text(counted)
main='''#[path="../literal.rs"]mod literal;
#[path="../counted.rs"]mod counted;
use serde_json::{Value,json};use std::sync::atomic::Ordering::Relaxed;
fn main(){let spec:Value=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let mut literal=literal::State::new();let mut counted=counted::State::new();let mut totals=vec![0u64;counted::__INK_CALL_COUNTS.len()];let mut rows=vec![];
for(phase,entries)in spec["phases"].as_object().unwrap(){for entry in entries.as_array().unwrap(){let name=entry["function"].as_str().unwrap();let want=literal.call_json(name,&entry["args"]).unwrap();for counter in &counted::__INK_CALL_COUNTS{counter.store(0,Relaxed);}let got=counted.call_json(name,&entry["args"]).unwrap();assert_eq!(serde_json::to_vec(&got).unwrap(),serde_json::to_vec(&want).unwrap(),"{phase}: {name}");let counts:Vec<_>=counted::__INK_CALL_COUNTS.iter().map(|c|c.load(Relaxed)).collect();let weight=spec["profile"][phase].as_u64().unwrap();for(total,count)in totals.iter_mut().zip(&counts){*total=total.checked_add(count.checked_mul(weight).expect("profile weight overflow")).expect("profile count overflow");}rows.push(json!({"phase":phase,"function":name,"counts":counts,"output_bytes":serde_json::to_vec(&got).unwrap().len()}));}}
println!("{}",json!({"totals":totals,"rows":rows,"outputs_equal":true}));}
'''
(project/'src/bin/profile_calls.rs').write_text(main);(project/'Cargo.toml').write_text(manifest('ink-source-call-profile'))
env={**os.environ,'CARGO_HOME':str(ROOT/'build/cargo-home'),'RUSTFLAGS':'-C target-cpu=native'};target=a.cargo_target_directory.resolve()
subprocess.run(['cargo','build','--offline','--release','--manifest-path',project/'Cargo.toml','--bin','profile_calls','--target-dir',target],env=env,check=True,timeout=600)
(project/'target/release').mkdir(parents=True,exist_ok=True);exe=project/'target/release/profile_calls';shutil.copy2(target/'release/profile_calls',exe)
raw=json.loads(subprocess.check_output([exe,a.workload.resolve()],env=env,text=True,timeout=600));assert raw['outputs_equal']
all_counts={'call:'+name:n for name,n in zip(names,raw['totals'])if n};total=sum(all_counts.values());limit=1_000_000_000;counts=dict(sorted(all_counts.items(),key=lambda x:(-x[1],x[0]))[:64]);saturated=total>limit or len(all_counts)>64
if total>limit:counts={k:(v*limit)//total for k,v in counts.items()if(v*limit)//total};events=limit
else:events=total
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();toolchain='compiler:'+sha(compiler)+';diagnostic-native-call-counts:'+sha(__file__)
profile=dict(schema=1,semantics=SEMANTICS,recording_id=str(uuid.uuid4()),source=source,target=dict(hardware=platform.machine()+':'+platform.node(),driver=platform.system()+':'+platform.release(),toolchain=toolchain,backend='rust',bridge='instrumented-source-function-counts;complete-literal-output-equality;not-timing-evidence'),workload=dict(spec['workload'],shape=dict(inputs_sha256=workload_sha,declared=spec['workload']['shape'])),counts=counts,shapes=[],peak_pending=0,peak_pending_bytes=0,events=events,failed=0,saturated=saturated)
validate(profile);(project/'usage-profile.json').write_bytes(canonical(profile)+b'\n');(project/'counts.json').write_text(json.dumps(dict(names=names,**raw),indent=2)+'\n')
receipt=dict(source=source,compiler_sha256=sha(compiler),workload_sha256=workload_sha,literal_sha256=sha(project/'src/literal.rs'),instrumented_sha256=sha(project/'src/counted.rs'),harness_sha256=sha(project/'src/bin/profile_calls.rs'),executable_sha256=sha(exe),profile_sha256=sha(project/'usage-profile.json'),counts_sha256=sha(project/'counts.json'),scope='Untrusted frequency guidance only; two complete native outputs compared per supplied call; no timings, proof authority, or runtime probes.')
if a.knowledge_root:receipt['publication_snapshot']=publish(Store(a.knowledge_root),profile).snapshot_id
(project/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(dict(status='recorded',functions=len(names),observed_functions=len(all_counts),events=total,published=a.knowledge_root is not None)))
