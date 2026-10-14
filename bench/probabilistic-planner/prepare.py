#!/usr/bin/env python3
import argparse,json,subprocess,sys,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];BUILD=ROOT/'build/probabilistic-planner'
sys.path[:0]=[str(ROOT/'planner'),str(ROOT/'knowledge')]
from ink_knowledge import Store,semantic_entry
from producers.semantic_laws import examples
p=argparse.ArgumentParser();p.add_argument('--zig',required=True);a=p.parse_args();BUILD.mkdir(parents=True,exist_ok=True)
compiler=ROOT/'target/debug/ink'
source=BUILD/'program.ink';source.write_text('module ProbabilisticPlanner;\nfn scalar(x:u32)->u32{return '+'+'.join(['x']*13)+';}\nfn many(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>scalar(x));}\n')
subprocess.run([compiler,'emit-core',source,'-o',BUILD/'core.json'],cwd=ROOT,check=True)
store=Store.publish(BUILD/'knowledge',[semantic_entry(law) for law in examples()]);store.rebuild()
subprocess.run([sys.executable,'-m','ink_planner.synthesis','--compiler',compiler,'--core',BUILD/'core.json','--function','scalar','--output-store',BUILD/'synthesized','--seed','173','-o',BUILD/'selection.json'],cwd=ROOT,check=True,env={**__import__('os').environ,'PYTHONPATH':str(ROOT/'planner')+':'+str(ROOT/'knowledge')})
for label,src,selection in [('ink',ROOT/'planner/ink_planner/kernels/planner.ink',None),('before',source,None),('after',source,BUILD/'selection.json')]:
 command=[compiler, 'build', src, '--target', 'webgpu', '-o', BUILD / label]
 if selection:command += ['--selection',selection]
 subprocess.run(command,cwd=ROOT,check=True)
shutil.copyfile(ROOT/'planner/ink_planner/hosts/planner-kernels.mjs',BUILD/'planner-kernels.mjs')
