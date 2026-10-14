#!/usr/bin/env python3
"""Validate ownership-taking Ink CRDT calls against the pinned native oracle.

Separate from timing and the historical transactional control, which lacks some
valid frontier capabilities. Exercise retained prefixes, operation-log restore,
future merges, full text, canonical logs and exact duplicate document images.
"""
import argparse,hashlib,json,os,re,shutil,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for name in ['compiler','source','cases','project','cargo-target-directory']:p.add_argument('--'+name,type=Path,required=True)
p.add_argument('--plan',type=Path);p.add_argument('-o',type=Path,required=True);a=p.parse_args();root=Path(__file__).resolve().parents[2];project=a.project.resolve();(project/'src/bin').mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve()
if a.plan:subprocess.run([compiler,'emit-plan',a.source.resolve(),a.plan.resolve(),'--target','rust','-o',project/'src/lib.rs'],check=True,capture_output=True)
else:subprocess.run([compiler,'build',a.source.resolve(),'--target','rust','-o',project],check=True,capture_output=True)
core=json.loads((a.plan if a.plan else project/'plan.json').read_text())['input_core_sha256'];code=(project/'src/lib.rs').read_text();ty=re.search(r'pub fn function_l_merge\(&self,l_document:[^,]+,l_incoming:Vec<([^>]+)>',code)[1]
adapter=Path(__file__).with_name('persistent_compare.rs').read_text().split('mod native{',1)[1].split('\nfn main(){',1)[0];harness=Path(__file__).with_name('owned_oracle.rs').read_text().replace('NATIVE_ADAPTER','mod native{'+adapter).replace('CHANGE_TYPE',ty);(project/'src/bin/validate_owned.rs').write_text(harness)
shutil.copy2(Path(__file__).with_name('persistent_diamond.rs'),project/'src/bin/persistent_diamond.rs')
(project/'Cargo.toml').write_text('[package]\nname="ink-owned-document-oracle"\nversion="0.1.0"\nedition="2021"\nautolib=false\n[dependencies]\nnum-bigint="=0.4.8"\nsha2="=0.10.9"\nserde_json={version="=1.0.151",features=["float_roundtrip"]}\ndiamond-types={path='+json.dumps(str(root/'build/crdt/upstreams/diamond-types'))+'}\n[profile.release]\nlto="thin"\ncodegen-units=1\n[workspace]\n')
env={**os.environ,'CARGO_HOME':str(root/'build/cargo-home'),'RUSTFLAGS':'-C target-cpu=native'};subprocess.run(['cargo','build','--offline','--release','--manifest-path',project/'Cargo.toml','--bin','validate_owned','--target-dir',a.cargo_target_directory.resolve()],env=env,check=True)
(project/'target/release').mkdir(parents=True,exist_ok=True);exe=project/'target/release/validate_owned';shutil.copy2(a.cargo_target_directory/'release/validate_owned',exe);report=json.loads(subprocess.check_output([exe,a.cases.resolve()],env=env,text=True));assert report['status']=='passed'
cases=json.loads(a.cases.read_text());assert {(row['case'],row['split'])for row in report['results']}=={(c['name'],n)for c in cases for n in {0,min(1,len(c['changes'])),len(c['changes'])//2,len(c['changes'])}}
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest();report.update(schema=1,scope='Pinned native DT full-text oracle; multiple retained prefixes, future batches, canonical operation-log save/load, exact duplicate Ink document images. No timing or universal equivalence claim.',compiler_sha256=sha(compiler),source_sha256=sha(a.source),input_core_sha256=core,input_sha256=sha(a.cases),emitted_sha256=sha(project/'src/lib.rs'),harness_sha256=sha(project/'src/bin/validate_owned.rs'),adapter_source_sha256=sha(Path(__file__).with_name('persistent_compare.rs')),adapter_include_sha256=sha(project/'src/bin/persistent_diamond.rs'),executable_sha256=sha(exe),diamond_types_revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root/'build/crdt/upstreams/diamond-types',text=True).strip())
if a.plan:report['plan_sha256']=sha(a.plan)
else:report['source_build_manifest_sha256']=sha(project/'plan.json')
a.o.write_text(json.dumps(report,indent=2)+'\n')
