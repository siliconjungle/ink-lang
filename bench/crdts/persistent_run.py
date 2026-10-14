#!/usr/bin/env python3
"""Measure retained causal history merge, save and load on identical fixtures."""
import argparse,hashlib,json,os,re,shutil,statistics,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('cases',type=Path);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--rounds',type=int,default=11);p.add_argument('--chunk',type=int,default=64);p.add_argument('--control-source',type=Path);p.add_argument('--control-compiler',type=Path);p.add_argument('--plan',type=Path);p.add_argument('--control-plan',type=Path);p.add_argument('--cargo-target-directory',type=Path);p.add_argument('--project-directory',type=Path);p.add_argument('--source',type=Path,default=root/'examples/crdts/persistent_causal_batches.ink');p.add_argument('-o',type=Path,required=True)
p.add_argument('--snapshot-mode',choices=['host','document'],default='host');a=p.parse_args()
if a.rounds<2 or a.chunk<1:p.error('at least two rounds and positive merge chunk required')
if a.snapshot_mode=='document' and a.control_source:p.error('document mode compares document snapshots with Diamond Types; host controls need a separate acquisition')
if a.control_compiler and not a.control_source:p.error('control compiler requires control source')
if a.control_plan and not a.control_source:p.error('control plan requires control source')
project=(a.project_directory or root/'build/crdt'/('persistent-native-'+a.source.stem)).resolve();(project/'src/bin').mkdir(parents=True,exist_ok=True)
source=a.source.resolve()
def emit(compiler,source,project,plan):
 if plan:
  # Package the literal planned Rust module; no generated method body is edited.
  (project/'src').mkdir(parents=True,exist_ok=True)
  (project/'Cargo.toml').write_text('[package]\nname="compiled-state"\nversion="0.1.0"\nedition="2021"\n[dependencies]\nnum-bigint="=0.4.8"\nsha2="=0.10.9"\nserde_json={version="=1.0.151",features=["float_roundtrip"]}\n[workspace]\n')
  subprocess.run([compiler.resolve(),'emit-plan',source,plan.resolve(),'--target','rust','-o',project/'src/lib.rs'],check=True,capture_output=True)
 else:subprocess.run([compiler.resolve(),'build',source,'--target','rust','-o',project],check=True,capture_output=True)
emit(a.compiler,source,project,a.plan)
manifest=project/'Cargo.toml';s=manifest.read_text();s=s.replace('[workspace]',f'diamond-types={{path={json.dumps(str(root/"build/crdt/upstreams/diamond-types"))}}}\n[profile.release]\nlto="thin"\ncodegen-units=1\n[workspace]');manifest.write_text(s)
code=(project/'src/lib.rs').read_text();ty=re.search(r'pub fn invoke_l_merge\(&mut self,l_changes:Vec<([^>]+)>',code).group(1)
harness=Path(__file__).with_name('persistent_compare.rs').read_text().replace('CHANGE_TYPE',ty)
control={k:''for k in ['CONTROL_IMPORT','CONTROL_INPUT','CONTROL_SETUP','CONTROL_MEASURE']};control.update(VARIANT_NAMES='["ink_retained_causal","diamond_types_document"]',CHECKPOINT_BYTES='([ink_bytes.len(),dt_bytes.len()][variant])')
if a.control_source:
 control_project=project/'control';emit(a.control_compiler or a.compiler,a.control_source.resolve(),control_project,a.control_plan)
 # Generated host helpers are ordinary sibling modules. Keep their literal
 # bytes when linking a control module outside its original package.
 for helper in (control_project/'src').glob('*.rs'):
  if helper.name in ['lib.rs','main.rs']:continue
  dest=project/'src'/helper.name
  if dest.exists()and dest.read_bytes()!=helper.read_bytes():raise ValueError('different generated helper modules need separate link namespaces: '+helper.name)
  shutil.copy2(helper,dest)
 control_code=(control_project/'src/lib.rs').read_text();(project/'src/control.rs').write_text(re.sub(r'(?m)^(\s*)#\[no_mangle\]\n(\s*)pub extern \"C\" fn (lang_[A-Za-z_][A-Za-z0-9_]*)',lambda m:m[1]+'#[export_name=\"ink_control_'+m[3]+'\"]\n'+m[2]+'pub extern \"C\" fn '+m[3],control_code));control_ty=re.search(r'pub fn invoke_l_merge\(&mut self,l_changes:Vec<([^>]+)>',control_code).group(1)
 control.update(CONTROL_IMPORT='#[path="../control.rs"]mod control;',CONTROL_INPUT=f'let control_changes:Vec<control::{control_ty}>=control::Wire::from_json(&json!(raw)).unwrap();',CONTROL_SETUP='let mut control_base=control::State::new();assert!(control_base.invoke_l_merge(control_changes[..split].to_vec()).unwrap().committed);let control_bytes=control_base.checkpoint().unwrap();assert_eq!(control_base.invoke_l_visible().unwrap().result.unwrap(),native::text(&dt));',VARIANT_NAMES='["ink_retained_causal","diamond_types_document","ink_control"]',CHECKPOINT_BYTES='([ink_bytes.len(),dt_bytes.len(),control_bytes.len()][variant])',CONTROL_MEASURE="""let mut state=control::State::restore(&control_bytes).unwrap();let inputs:Vec<_>=control_changes[split..].chunks(chunk).map(|c|c.to_vec()).collect();let mut committed=true;let start=Instant::now();for input in inputs{let result=state.invoke_l_merge(black_box(input)).unwrap();committed=committed&&result.committed;drop(black_box(result));}let ns=start.elapsed().as_nanos()as u64;assert!(committed);if round>=2{merge[2].push(ns);}assert_eq!(state.invoke_l_visible().unwrap().result.unwrap(),want);let start=Instant::now();drop(black_box(control_base.checkpoint().unwrap()));let ns=start.elapsed().as_nanos()as u64;if round>=2{save[2].push(ns);}let start=Instant::now();let loaded=control::State::restore(black_box(&control_bytes)).unwrap();let ns=start.elapsed().as_nanos()as u64;if round>=2{load[2].push(ns);}drop(black_box(loaded));""")
for k,v in control.items():harness=harness.replace(k,v)
# Both Vec and checked column carriers expose the same ordered logical values.
# Conversion is solely in the full-output oracle, outside every timing boundary.
harness=harness.replace('invoke_l_visible().unwrap().result.unwrap()', 'invoke_l_visible().unwrap().result.unwrap().into_iter().collect::<Vec<_>>()')
if a.snapshot_mode=='document':
 # Conversion into and out of an actual byte stream is inside each timer.
 # Retained indexes are rebuilt by the source library's ordinary load action.
 harness=harness.replace('base.checkpoint().unwrap()', 'save_document(&mut base)').replace('State::restore(&ink_bytes).unwrap()', 'load_document(&ink_bytes)').replace('State::restore(black_box(&ink_bytes)).unwrap()', 'load_document(black_box(&ink_bytes))')
 harness+='''
fn save_document(state:&mut State)->Vec<u8>{
 let outcome=state.invoke_l_save().unwrap();assert!(!outcome.committed);
 outcome.result.unwrap().into_iter().flat_map(u32::to_le_bytes).collect()
}
fn load_document(bytes:&[u8])->State{
 assert_eq!(bytes.len()%4,0);
 let words=bytes.chunks_exact(4).map(|w|u32::from_le_bytes(w.try_into().unwrap())).collect();
 let mut state=State::new();let outcome=state.invoke_l_load(words).unwrap();assert!(outcome.committed);drop(outcome);state
}
'''
 harness=harness.replace('load restores retained history; DT also restores visible branch;', 'load decodes document bytes and replays retained history to rebuild indexes and visible state;')
(project/'src/bin/persistent_compare.rs').write_text(harness);(project/'src/bin/persistent_diamond.rs').write_text(Path(__file__).with_name('persistent_diamond.rs').read_text())
env={**os.environ,'CARGO_HOME':str(root/'build/cargo-home'),'RUSTFLAGS':'-C target-cpu=native','INK_LIFECYCLE_ROUNDS':str(a.rounds),'INK_LIFECYCLE_CHUNK':str(a.chunk)}
command=['cargo','build','--offline','--release','--manifest-path',manifest,'--bin','persistent_compare']
if a.cargo_target_directory:command+=['--target-dir',a.cargo_target_directory.resolve()]
subprocess.run(command,env=env,check=True)
if a.cargo_target_directory:
 (project/'target/release').mkdir(parents=True,exist_ok=True);shutil.copy2(a.cargo_target_directory/'release/persistent_compare',project/'target/release/persistent_compare')
exe=project/'target/release/persistent_compare';out=subprocess.check_output([exe,a.cases.resolve()],env=env,text=True);rows=[json.loads(line)for line in out.splitlines()]
cases=json.loads(a.cases.read_text());assert len(rows)==len(cases)*(3 if a.control_source else 2)
for row in rows:
 for phase in ['merge','save','load']:
  samples=row[phase+'_samples_ns'];assert len(samples)==a.rounds and all(x>0 for x in samples);row[phase+'_median_ns']=statistics.median(samples)
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
report=dict(schema=1,scope='Retained causal batch histories on supplied fixtures; Native document projection and Ink merge are timed separately from validated text extraction; finite smoke evidence only; no full trace, universal equivalence or peak-memory claim',rounds=a.rounds,merge_chunk=a.chunk,results=rows,compiler_sha256=sha(a.compiler),source_sha256=sha(source),emitted_sha256=sha(project/'src/lib.rs'),input_sha256=sha(a.cases),harness_sha256=sha(project/'src/bin/persistent_compare.rs'),native_adapter_sha256=sha(project/'src/bin/persistent_diamond.rs'),executable_sha256=sha(exe),diamond_types_revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root/'build/crdt/upstreams/diamond-types',text=True).strip(),rustflags=env['RUSTFLAGS'])
report['snapshot_mode']=a.snapshot_mode
report['auxiliary_emitted_sha256']={str(f.relative_to(project)):sha(f)for f in sorted((project/'src').glob('*.rs'))if f.name not in ['lib.rs','main.rs','control.rs']}
if a.snapshot_mode=='document':report['scope']='Document operation-log persistence; save includes conversion to little-endian bytes and byte destruction; load includes byte decoding, new state and index reconstruction by source replay. Host transaction version and outbox are outside this document format. Exact future document text checked for both; no full-trace, universal proof or peak-memory claim.'
if a.control_source:report.update(control_compiler_sha256=sha(a.control_compiler or a.compiler),control_source_sha256=sha(a.control_source),control_emitted_sha256=hashlib.sha256(control_code.encode()).hexdigest(),control_link_wrapper_sha256=sha(project/'src/control.rs'),control_link_scope='Only exported ABI symbol names are namespaced to link two unchanged method bodies')
if a.plan:report['plan_sha256']=sha(a.plan)
if a.control_plan:report['control_plan_sha256']=sha(a.control_plan)
a.o.write_text(json.dumps(report,indent=2)+'\n')
