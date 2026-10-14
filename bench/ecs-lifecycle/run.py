#!/usr/bin/env python3
"""Complete bounded ECS histories and canonical snapshots; no whole-engine ranking."""
import argparse,hashlib,json,os,pathlib,re,statistics,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'bench'));import methodology
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=pathlib.Path,default=ROOT/'target/debug/ink');p.add_argument('--upstreams',type=pathlib.Path,required=True);p.add_argument('--build-only',action='store_true');p.add_argument('--measure-only',action='store_true');p.add_argument('--rounds',type=int,default=8);a=p.parse_args()
build=ROOT/'build/ecs-lifecycle';project=build/'ink-planned';up=a.upstreams.resolve();build.mkdir(parents=True,exist_ok=True)
def call(args,**kw):return subprocess.run(list(map(str,args)),check=True,**kw)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def revision(p):return subprocess.check_output(['git','-C',str(p),'rev-parse','HEAD'],text=True).strip()
source_paths=[HERE/'main.ink',HERE/'adapter.rs',HERE/'driver.cpp',HERE/'run.py',ROOT/'knowledge/libraries/sparse_ecs.ink',ROOT/'knowledge/libraries/sparse_ecs_indexed.ink',ROOT/'bench/cross-domain/prepare.py']
hashes={str(p.relative_to(ROOT)):digest(p)for p in source_paths};meta_path=build/'build.json';suffix=methodology.shared_suffix();lib=project/'target/release'/('libcompiled_state.'+suffix);driver=build/'driver'
if not a.measure_only:
 call(['python3',ROOT/'bench/cross-domain/prepare.py','--compiler',a.compiler,'--source',HERE/'main.ink','--scalar-calls','--output',build/'plan'])
 call([a.compiler,'emit-plan',HERE/'main.ink',build/'plan/plan.json','--target','rust-wasm','-o',project])
 src=project/'src/lib.rs';text=src.read_text();command=re.search(r'pub fn function_l_run\(&self,\w+:u32,\w+:Vec<([^>]+)>',text)[1];snapshot=re.search(r'pub fn function_l_run\([^\n]+?\)->(\w+)',text)[1];src.write_text(text+'\ntype Snapshot='+snapshot+';\ntype Command='+command+';\n'+(HERE/'adapter.rs').read_text())
 cargo=project/'Cargo.toml';cargo.write_text(cargo.read_text().replace('["rlib","cdylib","staticlib"]','["cdylib"]')+'\n[profile.release]\nlto=false\n')
 call(['cargo','build','--release','--lib','--manifest-path',cargo],env={**os.environ,'RUSTFLAGS':'-C target-cpu=native'})
 flags=['-O3',methodology.native_cpu_flag()];include=up/'flecs/distr'
 call(['clang',*flags,'-DNDEBUG','-I'+str(include),'-c',include/'flecs.c','-o',build/'flecs.o'])
 call(['clang++',*flags,'-std=c++20','-I'+str(up/'entt/src'),'-I'+str(include),HERE/'driver.cpp',build/'flecs.o','-o',driver])
 meta=dict(schema=1,method=__doc__,environment=methodology.environment(),compiler_sha256=digest(a.compiler),source_hashes=hashes,generated_sha256=digest(src),binary_sha256=digest(lib),driver_sha256=digest(driver),plan_sha256=digest(build/'plan/plan.json'),dependency_lock=(project/'Cargo.lock').read_text(),upstreams={name:dict(revision=revision(up/name),dirty=bool(subprocess.check_output(['git','-C',str(up/name),'status','--porcelain'],text=True).strip()))for name in ['entt','flecs']},flags=dict(rust='release, target-cpu=native, no LTO',cpp='O3, native CPU, c++20, assertions enabled',flecs='O3, native CPU, NDEBUG'))
 meta_path.write_text(json.dumps(meta,indent=2)+'\n')
else:
 meta=json.loads(meta_path.read_text());assert meta['source_hashes']==hashes;assert meta['binary_sha256']==digest(lib);assert meta['driver_sha256']==digest(driver)
if a.build_only:sys.exit(0)
processes=[]
for i in range(a.rounds):
 result=subprocess.check_output([driver,lib],text=True);processes.append([json.loads(line)for line in result.splitlines()]);print('Completed process',i+1,flush=True)
results=[]
for cell in processes[0]:
 key=tuple(cell[k]for k in ['variant','capacity','pattern']);medians=[]
 for process in processes:
  row=next(r for r in process if tuple(r[k]for k in ['variant','capacity','pattern'])==key);medians.append(statistics.median(row['samples_ns']))
 results.append(dict(variant=key[0],capacity=key[1],pattern=key[2],commands=cell['commands'],output_words=cell['output_words'],process_medians_ns=medians,median_ns=statistics.median(medians)))
for row in results:
 if row['variant']not in ['ink','ink_indexed']:continue
 row['relative_to']={}
 for variant in ['ink','slot_oracle','packed_control','indexed_control','entt','flecs']:
  other=next(r for r in results if r['variant']==variant and r['capacity']==row['capacity']and r['pattern']==row['pattern']);row['relative_to'][variant]=dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(row['process_medians_ns'],other['process_medians_ns'])))
report=dict(schema=1,build=meta,measured_unix=time.time(),rounds=a.rounds,results=results,processes=processes)
(build/'results.json').write_text(json.dumps(report,indent=2)+'\n');print('Saved',build/'results.json')
