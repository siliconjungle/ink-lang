#!/usr/bin/env python3
"""Ablations of explicit physical choices using the existing real-upstream driver.

Same compiler and source, same foreign-call boundaries, independent full-output
oracle. Includes setup/destruction and persistent ECS phases, 11 interleaved rounds.
"""
import argparse,json,subprocess,os,sys,re,statistics,shlex,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'bench'),str(ROOT/'knowledge')];import methodology
from producers.physical_capabilities import produce,base,write
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--upstreams',type=Path,required=True);p.add_argument('--output',type=Path,default=ROOT/'bench/physical-capabilities/results.json');a=p.parse_args();a.compiler=a.compiler.resolve();up=a.upstreams.resolve();d=ROOT/'build/physical-bench';d.mkdir(parents=True,exist_ok=True);source=ROOT/'bench/competitive-workloads/main.ink'
def run(*args,cwd=None,**kw):
 r=subprocess.run(list(map(str,args)),cwd=cwd,check=True,**kw);return r
variants=['baseline','direct','dense','packed','bounds'];libs={};metadata=[]
for name in variants:
 plan_dir=ROOT/'build/competitive-capabilities'/name
 if name=='baseline':
  plan_dir.mkdir(parents=True,exist_ok=True);core=d/'core.json';run(a.compiler,'emit-core',source,'-o',core,capture_output=True);source_id=json.loads(core.read_bytes())
  # Use a physical plan with no specialised choices as the matched baseline.
  receipt=json.loads(subprocess.check_output([a.compiler,'emit-bounds-obligations',source,'-o',d/'obligations.json'],text=True));sid=json.loads((d/'obligations.json').read_bytes())['source'];write(plan_dir/'plan.json',dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=sid,steps=[dict(kind='physical',package=base(sid))]))
 if not (plan_dir/'plan.json').exists():produce(source,a.compiler,plan_dir,['Particle']if name in ['dense','packed']else[],8 if name=='packed'else 0,bounds=name=='bounds')
 project=d/name;run(a.compiler,'emit-plan',source,plan_dir/'plan.json','--target','rust-wasm','-o',project,capture_output=True)
 cargo=project/'Cargo.toml';s=cargo.read_text().replace('["rlib","cdylib","staticlib"]','["cdylib"]');s=s.replace('[workspace]',f'block-mesh={{path={json.dumps(str(up/"block-mesh"))}}}\n[profile.release]\nlto=false\n[workspace]');cargo.write_text(s)
 lib=project/'src/lib.rs';s=lib.read_text();adapter=(ROOT/'bench/competitive-workloads/adapter.rs').read_text().replace('use compiled_state::{State,l_Particle};','')
 if name in ['dense','packed']:
  carrier=re.search(r'pub fn function_l_particles\(&self,[^:]+:([^,)]+)',s).group(1)
  adapter=adapter.replace('particles:Vec<l_Particle>',f'particles:{carrier}').replace('.particles[i].l_position','.particles.get(i).unwrap().l_position').replace('.particles.as_ptr() as usize','.particles.storage_identity()')
  # Construction converts rows only once, in the timed lifecycle phase.
  adapter=adapter.replace('l_velocity:(i%7)as u32}).collect(),','l_velocity:(i%7)as u32}).collect::<Vec<_>>().into(),')
 lib.write_text(s+'\n'+adapter);(project/'Cargo.lock').write_bytes((ROOT/'bench/competitive-workloads/Cargo.lock').read_bytes());run('cargo','build','--release','--lib','--locked',cwd=project,env={**os.environ,'RUSTFLAGS':'-C target-cpu=native'},capture_output=True)
 if name in ['dense','packed']:
  adapter_payload='\n#[no_mangle]pub unsafe extern "C" fn ink_ecs_payload(p:*const std::ffi::c_void)->usize{(&*p.cast::<World>()).particles.payload_bytes()}\n'
 else:adapter_payload='\n#[no_mangle]pub unsafe extern "C" fn ink_ecs_payload(p:*const std::ffi::c_void)->usize{(&*p.cast::<World>()).particles.len()*std::mem::size_of::<l_Particle>()}\n'
 # This export is diagnostic only, outside the timed workloads.
 lib.write_text(lib.read_text()+adapter_payload);run('cargo','build','--release','--lib','--locked',cwd=project,env={**os.environ,'RUSTFLAGS':'-C target-cpu=native'},capture_output=True)
 libs[name]=project/'target/release'/('libcompiled_state.'+methodology.shared_suffix());metadata.append(dict(variant=name,source_sha256=hashlib.sha256(lib.read_bytes()).hexdigest(),plan_sha256=hashlib.sha256((plan_dir/'plan.json').read_bytes()).hexdigest()))
flags=shlex.split(subprocess.check_output(['pkg-config','--cflags','--libs','liblz4','libzstd'],text=True));cc=['clang','-O3',methodology.native_cpu_flag(),'-I'+str(up/'flecs/distr')];run(*cc,'-DNDEBUG','-c',up/'flecs/distr/flecs.c','-o',d/'flecs.o');run(*cc,'-DNDEBUG','-c',ROOT/'bench/competitive-workloads/flecs-adapter.c','-o',d/'flecs-adapter.o');run(*cc,ROOT/'bench/competitive-workloads/driver.c',d/'flecs.o',d/'flecs-adapter.o',*flags,'-o',d/'driver')
results=[];observations=[]
import ctypes
for name,path in libs.items():
 api=ctypes.CDLL(str(path));api.ink_ecs_new.argtypes=[ctypes.c_size_t,ctypes.c_uint32];api.ink_ecs_new.restype=ctypes.c_void_p;api.ink_ecs_payload.argtypes=[ctypes.c_void_p];api.ink_ecs_payload.restype=ctypes.c_size_t;api.ink_ecs_free.argtypes=[ctypes.c_void_p]
 for n in [1024,8192,65536]:
  world=api.ink_ecs_new(n,0);observations.append(dict(observation='ecs_payload_bytes',physical=name,n=n,bytes=api.ink_ecs_payload(world)));api.ink_ecs_free(world)

for name in variants[1:]:
 raw=subprocess.check_output([d/'driver',libs['baseline'],libs[name]],text=True)
 for line in raw.splitlines():
  row=json.loads(line);row['physical']=name
  if 'samples_ns'in row:row['median_ns']=statistics.median(row['samples_ns']);results.append(row)
  else:observations.append(row)
 print(name,'complete output validation and timings passed',flush=True)
for row in results:
 key=(row['physical'],row['family'],row['pattern'],row['n'],row['phase']);baseline=next((r for r in results if (r['physical'],r['family'],r['pattern'],r['n'],r['phase'])==key and r['variant']in ['ink_before','ink_rle_before']),None)
 if baseline:row['relative_to_baseline']=dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(row['samples_ns'],baseline['samples_ns'])))
report=dict(schema=1,method=__doc__,environment=methodology.environment(),rounds=11,seed=104729,compiler_sha256=hashlib.sha256(a.compiler.read_bytes()).hexdigest(),source_hashes={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest()for p in [source,ROOT/'bench/competitive-workloads/adapter.rs',ROOT/'bench/competitive-workloads/driver.c',ROOT/'bench/competitive-workloads/flecs-adapter.c',ROOT/'lowerings/rust/src/columns.rs',ROOT/'lowerings/rust/src/pure_rust.rs',ROOT/'native-support/src/owned-values.rs.txt']},variants=metadata,upstreams={n:subprocess.check_output(['git','-C',up/n,'rev-parse','HEAD'],text=True).strip()for n in ['block-mesh','flecs','lz4','zstd']},codecs={n:subprocess.check_output(['pkg-config','--modversion',n],text=True).strip()for n in ['liblz4','libzstd']},observations=observations,results=results);a.output.write_text(json.dumps(report,indent=2)+'\n')
