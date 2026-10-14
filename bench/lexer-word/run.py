#!/usr/bin/env python3
"""Paired original lexer builds: checked range law versus ordinary helper expansion."""
import argparse,hashlib,json,os,pathlib,re,statistics,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[2];HERE=pathlib.Path(__file__).resolve().parent
sys.path.insert(0,str(ROOT/'bench'));import methodology
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def call(args,**kw):subprocess.run(list(map(str,args)),check=True,**kw)
def main():
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument('--compiler',type=pathlib.Path,default=ROOT/'build/word-checker-target/debug/ink')
 p.add_argument('--build-only',action='store_true');p.add_argument('--measure-only',action='store_true');p.add_argument('--rounds',type=int,default=8)
 a=p.parse_args();a.compiler=a.compiler.resolve();build=ROOT/'build/lexer-word';build.mkdir(parents=True,exist_ok=True)
 source=ROOT/'bench/lexer-runs/main.ink'
 paths=[source,HERE/'driver.rs',HERE/'run.py',ROOT/'bench/cross-domain/prepare.py',ROOT/'tools/prepare_word_example.py',ROOT/'knowledge/libraries/workload_kernels.ink',ROOT/'knowledge/producers/inline_laws.py',ROOT/'knowledge/producers/word_laws.py',ROOT/'knowledge/producers/data/source-word-laws.json.gz']
 hashes={str(x.relative_to(ROOT)):digest(x)for x in paths};metadata={};binaries={}
 for name in ['baseline','word']:
  folder=build/name;project=folder/'compiled';folder.mkdir(parents=True,exist_ok=True);plan=folder/'plan';meta_path=folder/'build.json';binary=project/'target/release/compiled-state';src=project/'src/lib.rs'
  if not a.measure_only:
   script=ROOT/('bench/cross-domain/prepare.py' if name=='baseline' else 'tools/prepare_word_example.py')
   option='--scalar-calls' if name=='baseline' else '--unfold'
   call([sys.executable,script,'--compiler',a.compiler,'--source',source,option,'--output',plan])
   call([a.compiler,'emit-plan',source,plan/'plan.json','--target','rust-wasm','-o',project])
   carrier=re.search(r'pub fn function_l_baseline\([^\n]+?\)->Vec<([^>]+)>',src.read_text())[1]
   (project/'src/main.rs').write_text('use compiled_state::*;\ntype Token='+carrier+';\n'+(HERE/'driver.rs').read_text())
   cargo=project/'Cargo.toml';cargo.write_text(cargo.read_text().replace('["rlib","cdylib","staticlib"]','["rlib"]')+'\n[profile.release]\nlto=false\n')
   call(['cargo','build','--release','--manifest-path',cargo],env={**os.environ,'RUSTFLAGS':'-C target-cpu=native'})
   meta=dict(schema=1,source_hashes=hashes,compiler_sha256=digest(a.compiler),generated_sha256=digest(src),binary_sha256=digest(binary),plan_sha256=digest(plan/'plan.json'),dependency_lock=(project/'Cargo.lock').read_text(),flags='release,target-cpu=native,no LTO',environment=methodology.environment())
   meta_path.write_text(json.dumps(meta,indent=2)+'\n')
  else:meta=json.loads(meta_path.read_text())
  assert meta['source_hashes']==hashes and meta['generated_sha256']==digest(src) and meta['binary_sha256']==digest(binary)
  metadata[name]=meta;binaries[name]=binary
 if a.build_only:return
 started=time.time();processes={k:[]for k in binaries};orders=[]
 for r in range(a.rounds):
  order=['baseline','word'] if r%2==0 else ['word','baseline'];orders.append(order)
  for name in order:
   rows=[json.loads(x)for x in subprocess.check_output([binaries[name]],text=True).splitlines()]
   assert len(rows)==24 and all(x['validated']for x in rows)
   processes[name].append(rows)
  print('Completed paired process round',r+1,flush=True)
 results=[]
 for cell in processes['baseline'][0]:
  key=(cell['n'],cell['pattern']);samples={}
  for name in processes:
   for index,label in enumerate([name,name+'_rust']):
    samples[label]=[statistics.median(next(x['samples_ns'][index]for x in rows if (x['n'],x['pattern'])==key))for rows in processes[name]]
  ratio=lambda x,y:dict(zip(['ratio','ci_low','ci_high'],methodology.ratio_ci(samples[x],samples[y])))
  results.append(dict(n=cell['n'],pattern=cell['pattern'],output_tokens=cell['output_tokens'],process_medians_ns=samples,median_ns={k:statistics.median(v)for k,v in samples.items()},word_over_baseline=ratio('word','baseline'),word_over_rust=ratio('word','word_rust')))
 for name,binary in binaries.items():assert digest(binary)==metadata[name]['binary_sha256']
 (build/'results.json').write_text(json.dumps(dict(schema=1,method=__doc__,builds=metadata,started_unix=started,finished_unix=time.time(),rounds=a.rounds,process_order=orders,results=results,processes=processes),indent=2)+'\n')
if __name__=='__main__':main()
