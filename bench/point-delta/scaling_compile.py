#!/usr/bin/env python3
"""Separate proof admission, literal emission, and native compilation timings."""
import argparse,json,subprocess,time,hashlib
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();root=Path(__file__).resolve().parents[2];compiler=a.compiler.resolve();directory=root/'build/scaling-compile';directory.mkdir(parents=True,exist_ok=True)
graph=subprocess.run(['cargo','build','--locked','--release','--lib','--message-format=json'],cwd=root,check=True,capture_output=True,text=True);artifacts=[json.loads(x)for x in graph.stdout.splitlines()if x.startswith('{')];libs={}
for name in ['serde_json','sha2','num_bigint']:
 matches=[Path(f)for x in artifacts if x.get('reason')=='compiler-artifact'and x['target']['name']==name for f in x['filenames']if f.endswith('.rlib')];assert len(matches)==1,(name,matches);libs[name]=matches[0]
def timed(command):
 start=time.perf_counter_ns();subprocess.run(command,cwd=root,check=True,capture_output=True);return time.perf_counter_ns()-start
samples=[]
for round in range(3):
 for label in (['direct','refresh','delta']if round%2==0 else ['delta','refresh','direct']):
  source=root/'examples/point-query-delta.ink';request=root/f'knowledge/research/point-delta/{label}.json';body=directory/f'{label}.rs';binary=directory/label
  checking=timed([str(compiler),'check-representation',str(source),str(request)])
  checked_emission=timed([str(compiler),'emit-representation',str(source),str(request),'-o',str(body)])
  body.write_text(body.read_text()+"\nfn main(){let mut state=State::new().unwrap();std::hint::black_box(state.invoke_json(\"zero\",&serde_json::json!([])).unwrap());}\n")
  command=['rustc','--edition=2021',str(body),'-o',str(binary),'-L','dependency='+str(root/'target/release/deps'),'-O','-C','lto=thin','-C','embed-bitcode=yes']
  for name,path in libs.items():command+=['--extern',name+'='+str(path)]
  compilation=timed(command);subprocess.run([str(binary)],check=True,capture_output=True)
  samples.append(dict(candidate=label,round=round,check_ns=checking,checked_emission_ns=checked_emission,rustc_ns=compilation))
report=dict(schema=1,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),scope='CLI check includes source parsing; CLI emit includes checking again; rustc timed separately with prebuilt dependencies; standalone production state, no checker/runtime linked; samples independent of state row count',samples=samples)
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n')
