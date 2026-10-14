#!/usr/bin/env python3
"""ASCII u32-code-unit lexer: complete owned calls, tokens checked before timing."""
import argparse,hashlib,json,os,pathlib,re,statistics,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'bench'));import methodology
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def call(args,**kwargs):return subprocess.run(list(map(str,args)),check=True,**kwargs)
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=pathlib.Path,default=ROOT/'target/debug/ink');p.add_argument('--build-only',action='store_true');p.add_argument('--measure-only',action='store_true');p.add_argument('--rounds',type=int,default=8);a=p.parse_args()
 build=ROOT/'build/lexer-runs';project=build/'compiled';build.mkdir(parents=True,exist_ok=True)
 sources=[HERE/'main.ink',HERE/'driver.rs',HERE/'run.py',ROOT/'knowledge/libraries/workload_kernels.ink',ROOT/'knowledge/producers/inline_laws.py',ROOT/'bench/cross-domain/prepare.py']
 hashes={str(s.relative_to(ROOT)):digest(s)for s in sources};meta_path=build/'build.json';binary=project/'target/release/compiled-state';src=project/'src/lib.rs'
 if not a.measure_only:
  call(['python3',ROOT/'bench/cross-domain/prepare.py','--compiler',a.compiler,'--source',HERE/'main.ink','--scalar-calls','--output',build/'plan'])
  call([a.compiler,'emit-plan',HERE/'main.ink',build/'plan/plan.json','--target','rust-wasm','-o',project])
  carrier=re.search(r'pub fn function_l_runs\([^\n]+?\)->Vec<([^>]+)>',src.read_text())[1]
  (project/'src/main.rs').write_text('use compiled_state::*;\ntype Token='+carrier+';\n'+(HERE/'driver.rs').read_text())
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
  medians={name:[statistics.median(next(r['samples_ns'][index]for r in rows if (r['n'],r['pattern'])==(cell['n'],cell['pattern'])))for rows in processes]for index,name in enumerate(['baseline','runs','rust'])}
  results.append(dict(n=cell['n'],pattern=cell['pattern'],output_tokens=cell['output_tokens'],process_medians_ns=medians,median_ns={k:statistics.median(v)for k,v in medians.items()},runs_over_baseline=dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(medians['runs'],medians['baseline']))),runs_over_rust=dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(medians['runs'],medians['rust'])))))
 assert digest(binary)==meta['binary_sha256']
 (build/'results.json').write_text(json.dumps(dict(schema=1,method=__doc__,build=meta,rounds=a.rounds,finished_unix=time.time(),results=results,processes=processes),indent=2)+'\n')
if __name__=='__main__':main()
