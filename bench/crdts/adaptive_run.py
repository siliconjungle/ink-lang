#!/usr/bin/env python3
"""Compare pinned native adaptive-host overhead with proved typed CRDT variants.

All variants come from normal planner candidates of one source. This experiment
does not switch between different CRDT sources or infer a representation bridge.
Training is independent of heldout timing; unknown real-trace cohorts keep the
initial plan. A separate instrumented binary measures requested live allocations;
its timings are never admitted as prices.
"""
import argparse, hashlib, json, os, re, shutil, statistics, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNTIME = 'eb3d6aa65051df8a2002d9c84d717b447d652841'
ABI = '607d5b6391093e00b6bbe1d64b02f05b45dff722'
DISTRIBUTION = 'e7f3ec47'

def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p): return json.loads(Path(p).read_text())
def write(p, value): Path(p).write_text(json.dumps(value, indent=2) + '\n')

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for n in ['compiler','source','variants','workload','cases','project','cargo-target-directory']:
  p.add_argument('--'+n,type=Path,required=True)
 p.add_argument('--rounds',type=int,default=35);p.add_argument('--chunk',type=int,default=64);p.add_argument('--resume-preparation',action='store_true');p.add_argument('--native-fast-path',action='store_true')
 a=p.parse_args()
 if a.rounds<7 or a.rounds%7 or a.chunk<1:p.error('positive chunk and complete seven-mode process rotations required')
 project=a.project.resolve()
 if project.exists()and not a.resume_preparation:p.error('use a fresh project directory')
 (project/'src/bin').mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve()
 if a.resume_preparation:
  prepared=read(project/'preparation.json')
  if prepared['compiler']!=sha(compiler)or prepared['source']!=sha(a.source):raise ValueError('preparation binding changed')
 bindings={};emissions={};plans={};source_core=None
 for i in range(3):
  plan=a.variants/f'v{i}.json';package=read(plan)
  if source_core is None:source_core=package['input_core_sha256']
  if source_core!=package['input_core_sha256']:raise ValueError('variants need one original source')
  original=project/f'v{i}-original.rs'
  if a.resume_preparation:
   if prepared['variants'][f'v{i}']!={'plan':sha(plan),'emitted':sha(original)}:raise ValueError('prepared variant changed')
  else:subprocess.run([compiler,'emit-plan',a.source.resolve(),plan.resolve(),'--target','rust','-o',original],check=True,capture_output=True)
  text=original.read_text();ty=re.search(r'pub fn function_l_merge\(&self,l_document:l_Document,l_incoming:Vec<([^>]+)>',text)[1]
  # Link-only export names distinguish modules; computation bodies are unchanged.
  wrapped=re.sub(r'(?m)^(\s*)#\[no_mangle\]\n(\s*)pub extern "C" fn (lang_[A-Za-z_][A-Za-z0-9_]*)',lambda m:m[1]+f'#[export_name="ink_adaptive_v{i}_'+m[3]+'"]\n'+m[2]+'pub extern "C" fn '+m[3],text)
  wrapped+='\npub type CHANGE_TYPE='+ty+';\n'
  (project/f'src/v{i}.rs').write_text(wrapped);bindings[f'v{i}']=sha(original);emissions[f'v{i}']={'original':sha(original),'linked':sha(project/f'src/v{i}.rs')};plans[f'v{i}']=sha(plan)
  shutil.copy2(plan,project/f'v{i}.plan.json')
  if i==0:types={}
  types[f'v{i}']=ty
 host=subprocess.check_output(['git','-C',ROOT/'runtime','show',f'{RUNTIME}:src/adaptive.rs'])
 (project/'src/adaptive_host.rs').write_bytes(host)
 abi=project/'abi';abi.mkdir(exist_ok=True)
 archive=subprocess.run(['git','-C',ROOT/'abi','archive',ABI],capture_output=True,check=True)
 subprocess.run(['tar','-x','-C',abi],input=archive.stdout,check=True)
 native=(ROOT/'bench/crdts/persistent_compare.rs').read_text().split('mod native{',1)[1].split('\nfn main(){',1)[0]
 if a.native_fast_path:
  native=native.rsplit('}',1)[0]+(ROOT/'bench/crdts/diamond_direct_document.rs').read_text()+'\n}'
 harness=Path(__file__).with_name('adaptive_compare.rs').read_text().replace('NATIVE_ADAPTER','mod native{'+native)
 harness=harness.replace('DT_APPLY','native::apply_document(&mut doc,black_box(changes));'if a.native_fast_path else'native::apply(&mut doc.oplog,black_box(changes));doc.branch.merge(&doc.oplog,doc.oplog.cg.version.as_ref());')
 for variant,ty in types.items():harness=harness.replace(variant+'::CHANGE_TYPE',variant+'::'+ty)
 (project/'src/bin/adaptive_compare.rs').write_text(harness)
 shutil.copy2(ROOT/'bench/crdts/persistent_diamond.rs',project/'src/bin/persistent_diamond.rs')
 write(project/'preparation.json',dict(compiler=sha(compiler),source=sha(a.source),variants={f'v{i}':dict(plan=plans[f'v{i}'],emitted=bindings[f'v{i}'])for i in range(3)}))
 (project/'Cargo.toml').write_text('[package]\nname="ink-crdt-adaptive-comparison"\nversion="0.1.0"\nedition="2021"\nautolib=false\n[features]\nmemory=[]\n[dependencies]\nnum-bigint="=0.4.8"\nsha2="=0.10.9"\nserde_json={version="=1.0.151",features=["float_roundtrip"]}\nink-abi={path="abi"}\ndiamond-types={path='+json.dumps(str(ROOT/'build/crdt/upstreams/diamond-types'))+'}\n[profile.release]\nlto="thin"\ncodegen-units=1\n[workspace]\nexclude=["abi"]\n')
 env={**os.environ,'CARGO_HOME':str(ROOT/'build/cargo-home'),'RUSTFLAGS':'-C target-cpu=native'};target=a.cargo_target_directory.resolve()
 outputs={}
 for instrumented in [False,True]:
  command=['cargo','build','--offline','--release','--manifest-path',project/'Cargo.toml','--bin','adaptive_compare','--target-dir',target]
  if instrumented:command+=['--features','memory']
  subprocess.run(command,env=env,check=True)
  exe=project/('memory_compare'if instrumented else'adaptive_compare');shutil.copy2(target/'release/adaptive_compare',exe)
  outputs[instrumented]=read_output=subprocess.check_output([exe,'acquire',a.workload.resolve()],env=env,text=True)
  write(project/('memory-acquisition.json'if instrumented else'time-acquisition.json'),json.loads(read_output))
 times=json.loads(outputs[False]);memory=json.loads(outputs[True]);assert times['outputs_equal']and memory['outputs_equal']
 binding=dict(source=source_core,compiler=sha(compiler),target='native-arm64;'+os.uname().nodename+';rust-target-cpu-native',boundary='typed-retained-library-call;captured-inputs;native-synchronous-adaptive-host',variants=bindings)
 variants={v:dict(cells={},peak_bytes=0)for v in bindings};migration={}
 state_sizes=[len(rows[0]['args'][0]['state']['history'])for rows in read(a.workload)['phases'].values()]
 for t,m in zip(times['rows'],memory['rows']):
  assert {k:v for k,v in t.items()if k not in ['samples_ns','peak_requested_live_bytes']}=={k:v for k,v in m.items()if k not in ['samples_ns','peak_requested_live_bytes']}
  peak=max(m['peak_requested_live_bytes']);assert peak>0
  if 'variant'in t:
   v=variants[t['variant']];v['cells']['action:merge@'+t['phase']]=dict(low_ns=min(t['samples_ns']),high_ns=max(t['samples_ns']));v['peak_bytes']=max(v['peak_bytes'],peak)
  else:
   key=t['from'],t['to'];row=migration.setdefault(key,dict(from_=t['from'],to=t['to'],high_ns=0,peak_bytes=0,max_pause_ns=0,min_state_elements=min(state_sizes),max_state_elements=max(state_sizes)))
   row['high_ns']=max(row['high_ns'],max(t['samples_ns']));row['max_pause_ns']=row['high_ns'];row['peak_bytes']=max(row['peak_bytes'],peak)
 for row in migration.values():row['from']=row.pop('from_')
 policy=dict(horizon_calls=4096,min_residence_calls=1024,stable_windows=3,min_gain=.15,migration_margin=2.,memory_limit_bytes=1024*1024*1024,max_pause_ns=1e9,max_switches=32)
 config=dict(binding=binding,profile=dict(binding=binding,variants=variants,migrations=list(migration.values())),policy=policy)
 write(project/'profile.json',config)
 raw=subprocess.check_output([project/'adaptive_compare','compare',project/'profile.json',a.cases.resolve(),str(a.rounds),str(a.chunk)],env=env,text=True)
 rows=[json.loads(line)for line in raw.splitlines()];assert len(rows)==len(read(a.cases))*7
 for row in rows:
  assert len(row['merge_samples_ns'])==a.rounds;row['merge_median_ns']=statistics.median(row['merge_samples_ns'])
 report=dict(schema=1,scope='Retained merge with latest unchanged native adaptive host. Three ordinary source-proof-replayed variants. Inputs and initial instance preparation outside timing; dispatch, sampled recording, window decisions and any in-session migration included. Unknown real-trace cohorts must retain baseline; these development prices cannot authorize their migration. This is a fallback/overhead control, not evidence of profitable adaptive switches. Complete raw Doc images and native DT full text verified outside timing. Peak requested live allocation diagnostics come from a separate instrumented binary, not OS RSS.',rounds=a.rounds,merge_chunk=a.chunk,results=rows,binding=binding,profile_sha256=sha(project/'profile.json'),input_sha256=sha(a.cases),workload_sha256=sha(a.workload),compiler_sha256=sha(compiler),source_sha256=sha(a.source),input_core_sha256=source_core,plans=plans,emissions=emissions,harness_sha256=sha(project/'src/bin/adaptive_compare.rs'),adaptive_host_sha256=sha(project/'src/adaptive_host.rs'),executable_sha256=sha(project/'adaptive_compare'),memory_executable_sha256=sha(project/'memory_compare'),runtime_revision=RUNTIME,abi_revision=ABI,distribution_revision=subprocess.check_output(['git','rev-parse',DISTRIBUTION],cwd=ROOT,text=True).strip(),diamond_types_revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT/'build/crdt/upstreams/diamond-types',text=True).strip())
 report.update(native_fast_path=a.native_fast_path,tool_sha256=sha(__file__),native_adapter_sha256=sha(project/'src/bin/persistent_diamond.rs'))
 write(project/'results.json',report);print(json.dumps({'status':'measured','report':str(project/'results.json')}))

if __name__=='__main__':main()
