#!/usr/bin/env python3
"""Complete static broadphase calls: own input, build, query, sort, destroy and drop output."""
import argparse,hashlib,json,os,pathlib,re,statistics,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'bench'));import methodology
NAMES=['ink_scan','ink_sweep','ink_bvh','rust_sweep','rust_bvh','box2d']
PIN='ac7c751eaeddbabdc1c4d41ae4f3a25d78627790'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def call(argv,**kw):return subprocess.run(list(map(str,argv)),check=True,**kw)
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=pathlib.Path,default=ROOT/'target/debug/ink');p.add_argument('--upstream',type=pathlib.Path,default=ROOT.parent/'upstreams/box2d');p.add_argument('--build-only',action='store_true');p.add_argument('--measure-only',action='store_true');p.add_argument('--rounds',type=int,default=8);a=p.parse_args();assert a.rounds>=3
 upstream=a.upstream.resolve();revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=upstream,text=True).strip();assert revision==PIN
 assert not subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],cwd=upstream,text=True).strip(),'upstream tracked files changed'
 build=ROOT/'build/broadphase';project=build/'compiled';build.mkdir(parents=True,exist_ok=True)
 sources=[HERE/x for x in ['main.ink','driver.rs','box2d-adapter.c','run.py']]+[ROOT/'knowledge/libraries/broadphase.ink',ROOT/'knowledge/producers/inline_laws.py',ROOT/'bench/cross-domain/prepare.py']
 hashes={str(s.relative_to(ROOT)):digest(s)for s in sources};native=[upstream/'src'/x for x in ['dynamic_tree.c','core.c','math_functions.c']];upstream_hashes={str(s.relative_to(upstream)):digest(s)for s in native+sorted(upstream.rglob('*.h'))}
 library=build/('libbox2d-broadphase.'+methodology.shared_suffix());binary=project/'target/release/compiled-state';src=project/'src/lib.rs';meta_path=build/'build.json'
 if not a.measure_only:
  command=['clang','-std=c17','-O3','-DNDEBUG',methodology.native_cpu_flag(),'-fPIC',methodology.shared_link_flag(),'-I'+str(upstream/'include'),'-I'+str(upstream/'src'),*native,HERE/'box2d-adapter.c','-o',library]
  call(command)
  call(['python3',ROOT/'bench/cross-domain/prepare.py','--compiler',a.compiler,'--source',HERE/'main.ink','--scalar-calls','--share-arguments','--output',build/'plan'])
  call([a.compiler,'emit-plan',HERE/'main.ink',build/'plan/plan.json','--target','rust-wasm','-o',project])
  generated=src.read_text();aabb=re.search(r'pub fn function_l_all_pairs\(&self,\w+:Vec<([^>]+)>',generated)[1];pair=re.search(r'pub fn function_l_all_pairs\([^\n]+?\)->Vec<([^>]+)>',generated)[1]
  (project/'src/main.rs').write_text('use compiled_state::*;\ntype Aabb='+aabb+';\ntype Pair='+pair+';\n'+(HERE/'driver.rs').read_text())
  cargo=project/'Cargo.toml';cargo.write_text(cargo.read_text().replace('["rlib","cdylib","staticlib"]','["rlib"]')+'\n[profile.release]\nlto=false\n')
  (project/'build.rs').write_text('fn main(){println!("cargo:rustc-link-search=native='+str(build)+'");println!("cargo:rustc-link-lib=dylib=box2d-broadphase");println!("cargo:rustc-link-arg=-Wl,-rpath,'+str(build)+'");}\n')
  flags='-C target-cpu=native';call(['cargo','build','--release','--manifest-path',cargo],env={**os.environ,'RUSTFLAGS':flags})
  meta=dict(schema=1,scope=__doc__,environment=methodology.environment(),source_hashes=hashes,upstream_revision=revision,upstream_hashes=upstream_hashes,c_command=list(map(str,command)),rust_flags=flags,compiler_sha256=digest(a.compiler),generated_sha256=digest(src),driver_sha256=digest(project/'src/main.rs'),binary_sha256=digest(binary),library_sha256=digest(library),plan_sha256=digest(build/'plan/plan.json'),dependency_lock=(project/'Cargo.lock').read_text())
  meta_path.write_text(json.dumps(meta,indent=2)+'\n');call([binary,'--check-only'])
 else:
  meta=json.loads(meta_path.read_text());assert meta['source_hashes']==hashes;assert meta['upstream_hashes']==upstream_hashes;assert meta['generated_sha256']==digest(src);assert meta['binary_sha256']==digest(binary);assert meta['library_sha256']==digest(library)
 if a.build_only:return
 processes=[]
 for i in range(a.rounds):
  rows=[json.loads(line)for line in subprocess.check_output([binary],text=True).splitlines()];assert len(rows)==36 and all(r['validated']for r in rows);processes.append(rows);print('Completed process',i+1,flush=True)
 results=[]
 for cell in processes[0]:
  medians={name:[statistics.median(next(r['samples_ns'][index]for r in rows if (r['mode'],r['n'])==(cell['mode'],cell['n'])))for rows in processes]for index,name in enumerate(NAMES)}
  pairs=[('ink_sweep_over_scan','ink_sweep','ink_scan'),('ink_bvh_over_scan','ink_bvh','ink_scan'),('ink_sweep_over_rust','ink_sweep','rust_sweep'),('ink_bvh_over_rust','ink_bvh','rust_bvh'),('ink_sweep_over_box2d','ink_sweep','box2d'),('ink_bvh_over_box2d','ink_bvh','box2d')]
  ratios={label:dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(medians[left],medians[right])))for label,left,right in pairs}
  results.append(dict(mode=cell['mode'],n=cell['n'],pair_count=cell['pair_count'],process_medians_ns=medians,median_ns={k:statistics.median(v)for k,v in medians.items()},**ratios))
 assert digest(binary)==meta['binary_sha256']and digest(library)==meta['library_sha256']
 (build/'results.json').write_text(json.dumps(dict(schema=1,scope=__doc__,variants=NAMES,build=meta,rounds=a.rounds,finished_unix=time.time(),results=results,processes=processes),indent=2)+'\n')
if __name__=='__main__':main()
