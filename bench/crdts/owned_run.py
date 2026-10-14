#!/usr/bin/env python3
"""Compare literal ownership-taking Ink library calls with retained native DT."""
import argparse,hashlib,json,os,re,shutil,statistics,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('cases',type=Path);p.add_argument('--compiler',type=Path,required=True)
p.add_argument('--source',type=Path,default=Path('examples/crdts/owned_text_document.ink'))
p.add_argument('--plan',type=Path);p.add_argument('--rounds',type=int,default=31)
p.add_argument('--native-fast-path',action='store_true')
p.add_argument('--chunk',type=int,default=64);p.add_argument('--project',type=Path,required=True)
p.add_argument('--control-source',type=Path,default=Path('examples/crdts/persistent_causal_batches_rows.ink'))
p.add_argument('--control-plan',type=Path,default=Path('build/crdt/retained-storage-planner-v6/selected.json'))
p.add_argument('--cargo-target-directory',type=Path,required=True);p.add_argument('-o',type=Path,required=True)
a=p.parse_args();root=Path(__file__).resolve().parents[2]
if a.rounds<2 or a.chunk<1:p.error('positive chunks and at least two rounds required')
project=a.project.resolve();(project/'src/bin').mkdir(parents=True,exist_ok=True)
compiler=a.compiler.resolve()
if a.plan:
 subprocess.run([compiler,'emit-plan',a.source.resolve(),a.plan.resolve(),'--target','rust','-o',project/'src/lib.rs'],check=True,capture_output=True)
else:subprocess.run([compiler,'build',a.source.resolve(),'--target','rust','-o',project],check=True,capture_output=True)
# Bind the complete checked import closure, in addition to the entry file.
source_core=json.loads((a.plan if a.plan else project/'plan.json').read_text())['input_core_sha256']
subprocess.run([compiler,'emit-plan',a.control_source.resolve(),a.control_plan.resolve(),'--target','rust','-o',project/'src/control-original.rs'],check=True,capture_output=True)
control=(project/'src/control-original.rs').read_text()
(project/'src/control.rs').write_text(re.sub(r'(?m)^(\s*)#\[no_mangle\]\n(\s*)pub extern "C" fn (lang_[A-Za-z_][A-Za-z0-9_]*)',lambda m:m[1]+'#[export_name="ink_control_'+m[3]+'"]\n'+m[2]+'pub extern "C" fn '+m[3],control))
code=(project/'src/lib.rs').read_text()
ty=re.search(r'pub fn function_l_merge\(&self,l_document:[^,]+,l_incoming:Vec<([^>]+)>',code)[1]
control_ty=re.search(r'pub fn invoke_l_merge\(&mut self,l_changes:Vec<([^>]+)>',control)[1]
native=Path(__file__).with_name('persistent_compare.rs').read_text().split('mod native{',1)[1].split('\nfn main(){',1)[0]
if a.native_fast_path:native=native.rsplit('}',1)[0]+Path(__file__).with_name('diamond_direct_document.rs').read_text()+'\n}'
harness=Path(__file__).with_name('owned_compare.rs').read_text().replace('NATIVE_ADAPTER','mod native{'+native).replace('CONTROL_CHANGE_TYPE',control_ty).replace('CHANGE_TYPE',ty)
if a.native_fast_path:
 original='native::apply(&mut document.oplog,black_box(input));document.branch.merge(&document.oplog,document.oplog.cg.version.as_ref());'
 assert harness.count(original)==1
 harness=harness.replace(original,'native::apply_document(&mut document,black_box(input));')
 needle='assert_eq!(document.branch.content().to_string().chars().map(|c|c as u32).collect::<Vec<_>>(),want);'
 assert harness.count(needle)==1
 harness=harness.replace(needle,needle+'assert_eq!(document.oplog.encode(&diamond_types::list::encoding::ENCODE_FULL),oracle.encode(&diamond_types::list::encoding::ENCODE_FULL));')
(project/'src/bin/owned_compare.rs').write_text(harness)
shutil.copy2(Path(__file__).with_name('persistent_diamond.rs'),project/'src/bin/persistent_diamond.rs')
(project/'Cargo.toml').write_text('[package]\nname="ink-owned-document-comparison"\nversion="0.1.0"\nedition="2021"\nautolib=false\n[dependencies]\nnum-bigint="=0.4.8"\nsha2="=0.10.9"\nserde_json={version="=1.0.151",features=["float_roundtrip"]}\ndiamond-types={path='+json.dumps(str(root/'build/crdt/upstreams/diamond-types'))+'}\n[profile.release]\nlto="thin"\ncodegen-units=1\n[workspace]\n')
env={**os.environ,'CARGO_HOME':str(root/'build/cargo-home'),'RUSTFLAGS':'-C target-cpu=native','INK_LIFECYCLE_ROUNDS':str(a.rounds),'INK_LIFECYCLE_CHUNK':str(a.chunk)}
subprocess.run(['cargo','build','--offline','--release','--manifest-path',project/'Cargo.toml','--bin','owned_compare','--target-dir',a.cargo_target_directory.resolve()],env=env,check=True)
(project/'target/release').mkdir(parents=True,exist_ok=True)
exe=project/'target/release/owned_compare';shutil.copy2(a.cargo_target_directory/'release/owned_compare',exe)
raw=subprocess.check_output([exe,a.cases.resolve()],env=env,text=True);rows=[json.loads(line)for line in raw.splitlines()]
assert len(rows)==len(json.loads(a.cases.read_text()))*3
for row in rows:
 assert len(row['merge_samples_ns'])==a.rounds and all(v>0 for v in row['merge_samples_ns'])
 row['merge_median_ns']=statistics.median(row['merge_samples_ns'])
sha=lambda path:hashlib.sha256(Path(path).read_bytes()).hexdigest()
report=dict(schema=1,scope='Retained document merge only. Ownership-taking Ink source takes and returns a document value; no automatic rollback. Transactional Ink control and native DT measured in alternating order. Full text and Ink duplicate-state equality checked outside timing. Initial state/input preparation and final state destruction excluded. No snapshot, full trace or peak memory performance claim.',rounds=a.rounds,merge_chunk=a.chunk,results=rows,compiler_sha256=sha(compiler),source_sha256=sha(a.source),emitted_sha256=sha(project/'src/lib.rs'),input_sha256=sha(a.cases),harness_sha256=sha(project/'src/bin/owned_compare.rs'),native_adapter_sha256=sha(project/'src/bin/persistent_diamond.rs'),executable_sha256=sha(exe),control_source_sha256=sha(a.control_source),control_plan_sha256=sha(a.control_plan),control_emitted_sha256=sha(project/'src/control-original.rs'),control_link_wrapper_sha256=sha(project/'src/control.rs'),diamond_types_revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root/'build/crdt/upstreams/diamond-types',text=True).strip())
if a.plan:report['plan_sha256']=sha(a.plan)
if a.native_fast_path:report.update(native_fast_path=True,native_fast_source_sha256=sha(Path(__file__).with_name('diamond_direct_document.rs')))
report['input_core_sha256']=source_core
if not a.plan:report['source_build_manifest_sha256']=sha(project/'plan.json')
a.o.write_text(json.dumps(report,indent=2)+'\n')
