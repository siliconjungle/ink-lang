#!/usr/bin/env python3
"""Compare complete causal batch ingestion/materialisation with pinned Diamond Types."""
import argparse,hashlib,json,os,platform,re,statistics,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];B=ROOT/'build/crdt';sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from producers.physical_capabilities import produce
p=argparse.ArgumentParser(description=__doc__);p.add_argument('cases',type=Path);p.add_argument('--inline-hints',action='store_true');p.add_argument('--allocation-probe',action='store_true');p.add_argument('--rounds',type=int,default=11);p.add_argument('--compiled-plan',type=Path);p.add_argument('--control-plan',type=Path);p.add_argument('--control-compiler',type=Path);p.add_argument('--source',type=Path,default=ROOT/'examples/crdts/batched_graph.ink');p.add_argument('--control-source',type=Path);p.add_argument('--core',action='store_true');p.add_argument('--control-core',action='store_true');p.add_argument('--result',type=Path);p.add_argument('--compiler',type=Path,default=ROOT/'build/compiler/debug/ink');a=p.parse_args();compiler=a.compiler.resolve();source=a.source.resolve();source_flags=['--core']if a.core else[];plan=B/'batch-plan';project=B/(((source.stem+'-')if source.stem!='batched_graph'else'')+('batch-native-controlled'if a.control_plan else'batch-native-planned'if a.compiled_plan else'batch-native-hints'if a.inline_hints else'batch-native'))
if a.control_plan and not a.compiled_plan:raise ValueError('control plan requires a compiled main plan')
if a.control_core and not a.control_plan:raise ValueError('control-core requires a control plan')
if a.control_compiler and not a.control_plan:raise ValueError('control-compiler requires a control plan')
control_compiler=(a.control_compiler or a.compiler).resolve()
if a.rounds<1:raise ValueError('positive sample count required')
if a.compiled_plan:
 if a.inline_hints:raise ValueError('planned benchmarks preserve literal emitted library code')
 packet=a.compiled_plan.resolve();target='rust'
 from ink_planner.native_measurements import manifest
 (project/'src').mkdir(parents=True,exist_ok=True);(project/'Cargo.toml').write_text(manifest());output=project/'src/lib.rs'
else:
 produce(source,compiler,plan,[],0,bounds=False,buffers='direct',source_core=a.core);packet=plan/'plan.json';target='rust-wasm';output=project
subprocess.run([compiler,'emit-plan',source,packet,*source_flags,'--target',target,'-o',output],check=True,capture_output=True)
code=(project/'src/lib.rs').read_text()
if a.inline_hints:code=re.sub(r'(?m)^(pub )?(fn function_)',lambda m:'#[inline(always)]\n'+(m[1]or'')+m[2],code);(project/'src/lib.rs').write_text(code)
ty=re.search(r'pub fn function_l_materialize\(&self,l_changes:Vec<([^>]+)>',code).group(1)
cargo=project/'Cargo.toml';cargo.write_text(cargo.read_text().replace('[profile.release]',f'diamond-types={{path={json.dumps(str(B/"upstreams/diamond-types"))}}}\n[profile.release]')if a.compiled_plan else cargo.read_text().replace('[workspace]',f'diamond-types={{path={json.dumps(str(B/"upstreams/diamond-types"))}}}\n[profile.release]\nlto="thin"\ncodegen-units=1\n[workspace]'))
cargo.write_text(cargo.read_text()+'\n[features]\nallocation-probe=[]\n')
harness=Path(__file__).with_name('batch_native.rs').read_text().replace('CHANGE_TYPE',ty)
control={key:''for key in ['CONTROL_IMPORT','CONTROL_SETUP','CONTROL_INPUT','CONTROL_CLONE','CONTROL_CALL']}
control['VARIANT_NAMES']='["ink_batched_graph","diamond_types"]'
control_code=None
if a.control_plan:
 control_path=project/'src/control.rs'
 subprocess.run([control_compiler,'emit-plan',(a.control_source or source).resolve(),a.control_plan.resolve(),*(['--core']if a.control_core else[]),'--target','rust','-o',control_path],check=True,capture_output=True)
 control_code=control_path.read_text();control_type=re.search(r'pub fn function_l_materialize\(&self,l_changes:Vec<([^>]+)>',control_code).group(1)
 control.update(CONTROL_IMPORT='#[path="../control.rs"] mod control;',CONTROL_SETUP='let control_state=control::State::new();',
  CONTROL_INPUT=f'let control_changes:Vec<{"control::"+control_type}>=<Vec<{"control::"+control_type}> as control::Wire>::from_json(&case["changes"]).unwrap();assert_eq!(control_state.function_l_materialize(control_changes.clone()).unwrap(),want,"control {{}}",case["name"]);',
  CONTROL_CLONE='let control_input=if variant==1{Some(control_changes.clone())}else{None};',
  CONTROL_CALL='1=>control_state.function_l_materialize(black_box(control_input.unwrap())).unwrap(),',
  VARIANT_NAMES='["ink_batched_graph","ink_control","diamond_types"]')
for key,value in control.items():harness=harness.replace(key,value)
(project/'src/bin').mkdir(exist_ok=True);(project/'src/bin/bench.rs').write_text(harness)
env={**os.environ,'CARGO_HOME':str(ROOT/'build/cargo-home'),'RUSTFLAGS':'-C target-cpu=native','INK_BATCH_ROUNDS':str(a.rounds)};subprocess.run(['cargo','build','--release','--bin','bench',*(['--features','allocation-probe']if a.allocation_probe else[])],cwd=project,env=env,check=True)
rows=[]
with subprocess.Popen([project/'target/release/bench',a.cases.resolve()],env=env,stdout=subprocess.PIPE,text=True)as child:
 for line in child.stdout:
  row=json.loads(line);row['median_ns']=statistics.median(row['samples_ns']);rows.append(row);print(row['case'],row['variant'],round(row['median_ns']/1e6,3),'ms',flush=True)
 if child.wait():raise RuntimeError('benchmark output or semantic validation failed')
for row in rows:row['ratio_to_diamond']=row['median_ns']/next(x['median_ns']for x in rows if x['case']==row['case']and x['variant']=='diamond_types')
report=dict(schema=1,source=str(source),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),source_core=a.core,phase=__doc__,timing_boundary='call-and-output-destruction;input-clones-excluded',experimental_inline_hints=a.inline_hints,allocation_probe=a.allocation_probe,timing_eligible=not a.allocation_probe,compiled_plan=str(packet),plan_sha256=hashlib.sha256(packet.read_bytes()).hexdigest(),target=target,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),emitted_sha256=hashlib.sha256(code.encode()).hexdigest(),input_sha256=hashlib.sha256(a.cases.read_bytes()).hexdigest(),harness_sha256=hashlib.sha256(harness.encode()).hexdigest(),rounds=a.rounds,results=rows)
report.update(crate_placement='sibling-modules-in-benchmark-binary',upstream_pins=json.loads((B/'upstreams/pins.json').read_text()),environment=dict(platform=platform.platform(),machine=platform.machine(),rustflags=env['RUSTFLAGS']))
if a.compiled_plan:
 receipt=Path(str(a.compiled_plan)+'.receipt.json')
 if receipt.exists():report['selection_receipt_sha256']=hashlib.sha256(receipt.read_bytes()).hexdigest()
if a.control_plan:report.update(control_compiler_sha256=hashlib.sha256(control_compiler.read_bytes()).hexdigest(),control_source=str((a.control_source or source).resolve()),control_source_core=a.control_core,control_source_sha256=hashlib.sha256((a.control_source or source).resolve().read_bytes()).hexdigest(),control_plan=str(a.control_plan.resolve()),control_plan_sha256=hashlib.sha256(a.control_plan.read_bytes()).hexdigest(),control_emitted_sha256=hashlib.sha256(control_code.encode()).hexdigest())
(a.result or B/('batch-allocation-results.json'if a.allocation_probe else'batch-native-controlled-results.json'if a.control_plan else'batch-native-planned-results.json'if a.compiled_plan else'batch-native-results.json')).write_text(json.dumps(report,indent=2)+'\n')
