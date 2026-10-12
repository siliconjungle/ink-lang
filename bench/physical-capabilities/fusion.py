#!/usr/bin/env python3
"""Checked record/scalar fusion; complete output oracle and lifecycle timings."""
import json,subprocess,os,sys,statistics,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'bench'));import methodology
compiler=ROOT/'target/debug/ink';d=ROOT/'build/fusion-bench';d.mkdir(parents=True,exist_ok=True);source=ROOT/'examples/physical-capabilities/main.ink';selection=ROOT/'core/tests/fixtures/carrier-fusion.selection.json'
def run(*args,**kw):return subprocess.run(list(map(str,args)),check=True,capture_output=True,**kw)
libs=[];artifacts=[]
for name in ['baseline','fused']:
 project=d/name;flags=['--selection',selection]if name=='fused'else[];run(compiler,'build',source,'--target','rust',*flags,'-o',project)
 cargo=project/'Cargo.toml';cargo.write_text(cargo.read_text().replace('["rlib","cdylib","staticlib"]','["cdylib"]')+'\n[profile.release]\nlto=false\n')
 lib=project/'src/lib.rs';lib.write_text(lib.read_text()+'''\n#[no_mangle]pub unsafe extern "C" fn pipeline_run(xs:*const u32,n:usize,mode:u32)->*mut std::ffi::c_void{let xs=std::slice::from_raw_parts(xs,n).iter().enumerate().map(|(i,&v)|l_Particle{l_position:v,l_velocity:(i%7)as u32,l_active:i%2==0}).collect();let state=State::new();let out=if mode==0{state.function_l_projected(xs)}else{vec![state.function_l_reduced(xs)]};Box::into_raw(Box::new(out)).cast()}
#[no_mangle]pub unsafe extern "C" fn pipeline_len(p:*const std::ffi::c_void)->usize{(&*p.cast::<Vec<u32>>()).len()}
#[no_mangle]pub unsafe extern "C" fn pipeline_get(p:*const std::ffi::c_void,i:usize)->u32{(&*p.cast::<Vec<u32>>())[i]}
#[no_mangle]pub unsafe extern "C" fn pipeline_free(p:*mut std::ffi::c_void){drop(Box::from_raw(p.cast::<Vec<u32>>()));}
''');run('cargo','build','--release','--offline','--lib','--manifest-path',cargo,env={**os.environ,'RUSTFLAGS':'-C target-cpu=native'});libs.append(project/'target/release'/('libcompiled_state.'+methodology.shared_suffix()));artifacts.append(dict(variant=name,emitted_sha256=hashlib.sha256(lib.read_bytes()).hexdigest(),lock_sha256=hashlib.sha256((project/'Cargo.lock').read_bytes()).hexdigest()))
run('clang','-O3',methodology.native_cpu_flag(),ROOT/'bench/physical-capabilities/fusion-driver.c','-o',d/'driver');rows=[json.loads(line)for line in subprocess.check_output([d/'driver',*libs],text=True).splitlines()]
for r in rows:
 r['median_ns']=statistics.median(r['samples_ns']);b=next(x for x in rows if(x['family'],x['n'],x['variant'])==(r['family'],r['n'],'baseline'));r['relative_to_baseline']=dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(r['samples_ns'],b['samples_ns'])))
(ROOT/'bench/physical-capabilities/fusion.json').write_text(json.dumps(dict(schema=1,method=__doc__,environment=methodology.environment(),rounds=11,seed=104729,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),selection_sha256=hashlib.sha256(selection.read_bytes()).hexdigest(),artifacts=artifacts,results=rows),indent=2)+'\n')
print('Full output validation and fusion timings passed')
