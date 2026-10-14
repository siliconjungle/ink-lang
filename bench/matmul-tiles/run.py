#!/usr/bin/env python3
"""Wrapping-u32 matrix kernels: complete owned calls, all output cells checked."""
import argparse,hashlib,json,os,pathlib,statistics,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'bench'));import methodology
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def call(args,**kwargs):return subprocess.run(list(map(str,args)),check=True,**kwargs)
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=pathlib.Path,default=ROOT/'target/debug/ink');p.add_argument('--build-only',action='store_true');p.add_argument('--measure-only',action='store_true');p.add_argument('--rounds',type=int,default=8);a=p.parse_args()
 assert a.rounds>=2
 build=ROOT/'build/matmul-tiles';project=build/'compiled';build.mkdir(parents=True,exist_ok=True)
 sources=[HERE/'main.ink',HERE/'driver.rs',HERE/'run.py',ROOT/'knowledge/libraries/workload_kernels.ink',ROOT/'knowledge/libraries/matrix_tiles.ink',ROOT/'knowledge/producers/inline_laws.py',ROOT/'bench/cross-domain/prepare.py']
 hashes={str(s.relative_to(ROOT)):digest(s)for s in sources};meta_path=build/'build.json';binary=project/'target/release/compiled-state';src=project/'src/lib.rs'
 if not a.measure_only:
  call(['python3',ROOT/'bench/cross-domain/prepare.py','--compiler',a.compiler,'--source',HERE/'main.ink','--scalar-calls','--output',build/'plan'])
  call([a.compiler,'emit-plan',HERE/'main.ink',build/'plan/plan.json','--target','rust-wasm','-o',project])
  (project/'src/main.rs').write_text('use compiled_state::*;\n'+(HERE/'driver.rs').read_text())
  cargo=project/'Cargo.toml';cargo.write_text(cargo.read_text().replace('["rlib","cdylib","staticlib"]','["rlib"]')+'\n[profile.release]\nlto=false\n')
  call(['cargo','build','--release','--manifest-path',cargo],env={**os.environ,'RUSTFLAGS':'-C target-cpu=native'})
  meta=dict(schema=1,environment=methodology.environment(),source_hashes=hashes,compiler_sha256=digest(a.compiler),generated_sha256=digest(src),binary_sha256=digest(binary),plan_sha256=digest(build/'plan/plan.json'),dependency_lock=(project/'Cargo.lock').read_text(),flags='release, target-cpu=native, no LTO')
  meta_path.write_text(json.dumps(meta,indent=2)+'\n')
 else:
  meta=json.loads(meta_path.read_text());assert meta['source_hashes']==hashes;assert meta['generated_sha256']==digest(src);assert meta['binary_sha256']==digest(binary)
 if a.build_only:return
 processes=[]
 for i in range(a.rounds):
  rows=[json.loads(line)for line in subprocess.check_output([binary],text=True).splitlines()];assert all(r['validated']for r in rows);processes.append(rows);print('Completed process',i+1,flush=True)
 results=[]
 for cell in processes[0]:
  medians={name:[statistics.median(next(r['samples_ns'][index]for r in rows if (r['side'],r['short'])==(cell['side'],cell['short'])))for rows in processes]for index,name in enumerate(['baseline','tiled','rust','rust_tiled'])}
  ratios={label:dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(medians[left],medians[right])))for label,left,right in [('tiled_over_baseline','tiled','baseline'),('tiled_over_rust_tiled','tiled','rust_tiled'),('baseline_over_rust','baseline','rust'),('rust_tiled_over_rust','rust_tiled','rust')]}
  results.append(dict(side=cell['side'],short=cell['short'],output_len=cell['output_len'],process_medians_ns=medians,median_ns={k:statistics.median(v)for k,v in medians.items()},**ratios))
 assert digest(binary)==meta['binary_sha256']
 (build/'results.json').write_text(json.dumps(dict(schema=1,method=__doc__,scope='Exact wrapping-u32 CPU kernels, not floating-point BLAS or a proved algorithm rewrite',build=meta,rounds=a.rounds,finished_unix=time.time(),results=results,processes=processes),indent=2)+'\n')
if __name__=='__main__':main()
