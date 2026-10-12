#!/usr/bin/env python3
"""Pinned upstream comparisons, shared separately compiled C timing driver.

No cross-boundary LTO. Every cell validates complete outputs before timing.
Ink RLE, LZ4 and Zstd have different formats: report size and speed together.
Before/after compiler binaries must be built from the same source except the
lexical last-use emission change. Fresh upstream checkouts can be prepared by
passing --upstreams; no upstream code is vendored into Ink's trusted core.
"""
import argparse,hashlib,json,os,shlex,statistics,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'bench'));import methodology
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--before',type=Path,required=True);p.add_argument('--after',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--upstreams',type=Path,required=True);p.add_argument('--output',type=Path,default=HERE/'results.json');a=p.parse_args()
up=a.upstreams.resolve();build=ROOT/'build/competitive-bench';build.mkdir(parents=True,exist_ok=True)
def call(argv,**kw):return subprocess.run(list(map(str,argv)),check=True,**kw)
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
metadata={}
for name in ['block-mesh','flecs','lz4','zstd']:
 path=up/name;metadata[name]=dict(revision=subprocess.check_output(['git','-C',str(path),'rev-parse','HEAD'],text=True).strip(),dirty=bool(subprocess.check_output(['git','-C',str(path),'status','--porcelain'],text=True).strip()))
libs=[];compilation=[]
for name,compiler in [('before',a.before.resolve()),('after',a.after.resolve())]:
 project=build/name;t=time.perf_counter_ns();call([compiler,'build',HERE/'main.ink','--target','rust','-o',project],cwd=ROOT)
 # Separate cdylib boundary; no Rust/C cross-language LTO.
 cargo=project/'Cargo.toml';s=cargo.read_text().replace('["rlib","cdylib","staticlib"]','["cdylib"]');s=s.replace('[workspace]',f'block-mesh={{path={json.dumps(str(up/"block-mesh"))}}}\n[profile.release]\nlto=false\n[workspace]');cargo.write_text(s)
 lib=project/'src/lib.rs';lib.write_text(lib.read_text()+'\n'+(HERE/'adapter.rs').read_text().replace('use compiled_state::{State,l_Particle};',''))
 if (HERE/'Cargo.lock').exists(): (project/'Cargo.lock').write_bytes((HERE/'Cargo.lock').read_bytes())
 call(['cargo','build','--release','--lib','--locked'],cwd=project,env={**os.environ,'RUSTFLAGS':'-C target-cpu=native'})
 if not (HERE/'Cargo.lock').exists(): (HERE/'Cargo.lock').write_bytes((project/'Cargo.lock').read_bytes())
 libs.append(project/'target/release'/('libcompiled_state.'+methodology.shared_suffix()));compilation.append(dict(variant=name,ns=time.perf_counter_ns()-t,compiler_sha256=digest(compiler),emitted_sha256=digest(lib)))
flags=shlex.split(subprocess.check_output(['pkg-config','--cflags','--libs','liblz4','libzstd'],text=True))
include=up/'flecs/distr';cc=['clang','-O3','-DNDEBUG',methodology.native_cpu_flag(),'-I'+str(include)]
# Assertions validate outputs; retain assertions in the driver and adapters.
cc.remove('-DNDEBUG')
call([*cc,'-DNDEBUG','-c',include/'flecs.c','-o',build/'flecs.o'])
call([*cc,'-DNDEBUG','-c',HERE/'flecs-adapter.c','-o',build/'flecs-adapter.o'])
call([*cc,HERE/'driver.c',build/'flecs.o',build/'flecs-adapter.o',*flags,'-o',build/'driver'])
raw=subprocess.check_output([str(build/'driver'),*map(str,libs)],text=True);all_rows=[json.loads(line)for line in raw.splitlines()];rows=[r for r in all_rows if 'samples_ns'in r];observations=[r for r in all_rows if 'observation'in r]
for row in rows:row['median_ns']=statistics.median(row['samples_ns']);row['input_bytes']=row['n']*4 if row['family']=='codec' else None
for row in rows:
 key=(row['family'],row['pattern'],row['n'],row['phase']);comparison=[r for r in rows if (r['family'],r['pattern'],r['n'],r['phase'])==key and r['variant']in {'ink_before','ink_rle_before'}]
 if comparison:row['relative_to_before']=dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(row['samples_ns'],comparison[0]['samples_ns'])))
report=dict(schema=1,rounds=11,seed=104729,method=__doc__,environment=methodology.environment(),upstreams=metadata,installed_codecs={name:subprocess.check_output(['pkg-config','--modversion',name],text=True).strip()for name in ['liblz4','libzstd']},compilation=compilation,flags={'rust':'-C target-cpu=native, release, no LTO','flecs':'-O3 -DNDEBUG, native CPU','driver':'-O3, native CPU, assertions enabled'},source_hashes={str(path.relative_to(ROOT)):digest(path)for path in [HERE/'main.ink',HERE/'adapter.rs',HERE/'driver.c',HERE/'flecs-adapter.c',ROOT/'knowledge/libraries/voxel_surface.ink',ROOT/'knowledge/libraries/codecs.ink']},observations=observations,results=rows)
a.output.write_text(json.dumps(report,indent=2)+'\n');print('Saved',len(rows),'cells to',a.output)
