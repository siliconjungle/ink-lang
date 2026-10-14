"""Actual wgpu complete calls: packing, upload, dispatch, wait, decode included."""
import argparse,json,subprocess,time,statistics,random,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--output',type=Path,default=ROOT/'build/proof-growth-epoch3/gpu');p.add_argument('--selections',type=Path,default=ROOT/'build/proof-growth-epoch3');a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True);commands=[];binaries={}
def run(cmd):
 start=time.perf_counter();r=subprocess.run(list(map(str,cmd)),capture_output=True,text=True,timeout=600);commands.append(dict(argv=list(map(str,cmd)),seconds=time.perf_counter()-start,exit_code=r.returncode,stderr=r.stderr))
 if r.returncode:raise ValueError(r.stderr)
 return r.stdout
for count in [0,11,16]:
 bundle=a.output/str(count);cmd=[a.compiler.resolve(),'build',Path(__file__).with_name('corpus.ink').resolve(),'--target','webgpu','-o',bundle.resolve()]
 if count:cmd+=['--selection',(a.selections/('db'+str(count))/'selection.json').resolve()]
 cmd+=[] if os.environ.get('INK_TEST_ZIG') else []
 run(cmd);manifest=json.loads((bundle/'manifest.json').read_text());assert next(f for f in manifest['functions']if f['name']=='numeric_left')['gpu']
 projects=list((bundle/'gpu').glob('*/native'));assert len(projects)==1
 project=projects[0];cargo=(project/'Cargo.toml').read_text();import re
 name=re.search(r'name\s*=\s*"([^"]+)"',cargo).group(1).replace('-','_');directory=project/'src/bin';directory.mkdir(exist_ok=True)
 (directory/'bench.rs').write_text('''use NAME::{Engine,Backend};fn main(){let a=std::env::args().skip(1).collect::<Vec<_>>();let args:serde_json::Value=serde_json::from_slice(&std::fs::read(&a[0]).unwrap()).unwrap();let iterations=a[1].parse::<u32>().unwrap();let backend=Backend::parse(&a[2]).unwrap();let wanted=if a[2]=="cpu"{"cpu"}else{"gpu"};let mut engine=Engine::new();let mut single=serde_json::Value::Null;for _ in 0..4{single=engine.call("numeric_left",&args,backend).unwrap();assert_eq!(single["backend"],wanted);}let start=std::time::Instant::now();let mut checksum=0u64;for _ in 0..iterations{let reply=engine.call("numeric_left",&args,backend).unwrap();assert_eq!(reply["backend"],wanted);checksum=checksum.wrapping_add(reply["value"].as_u64().unwrap());}println!("{}",serde_json::json!({"single":single,"iterations":iterations,"checksum":checksum.to_string(),"nanoseconds":start.elapsed().as_nanos().to_string()}));}'''.replace('NAME',name))
 run(['cargo','build','--offline','--release','--bin','bench','--manifest-path',project/'Cargo.toml','--target-dir',a.output/'target']);binary=a.output/('bench-'+str(count));binary.write_bytes((a.output/'target/release/bench').read_bytes());binary.chmod(0o755);binaries[count]=binary
(a.output/'builds.json').write_text(json.dumps(commands,indent=2)+'\n');rng=random.Random(9913);results=[]
for size in [128,4096,65536]:
 values=[((i+17)*1664525+1013904223)%2**32>>23 for i in range(size)];expected=19
 for x in values:expected=(x*17+3-expected)%2**32
 path=a.output/('args-'+str(size)+'.json');path.write_text(json.dumps([values]));counts={};lanes=[(backend,c)for backend in ['gpu-required','cpu']for c in binaries];samples={backend+'-'+str(c):[]for backend,c in lanes}
 def call(count,iterations,backend):
  r=subprocess.run([str(binaries[count]),str(path),str(iterations),backend],capture_output=True,text=True);assert r.returncode==0,r.stderr
  row=json.loads(r.stdout);assert row['single']['backend']==('cpu'if backend=='cpu'else'gpu')and row['single']['value']==expected;assert int(row['checksum'])==expected*iterations%2**64;return int(row['nanoseconds'])
 for backend,count in lanes:
  iterations=1
  while True:
   elapsed=call(count,iterations,backend)
   if elapsed>=6_000_000 or iterations>=128:break
   iterations*=2
  counts[backend,count]=iterations
 for round in range(9):
  order=list(lanes);rng.shuffle(order)
  for backend,count in order:samples[backend+'-'+str(count)].append(call(count,counts[backend,count],backend)/counts[backend,count])
 results.append(dict(size=size,name='numeric_left',samples_ns=samples,median_ns={k:statistics.median(v)for k,v in samples.items()}))
(a.output/'execution.json').write_text(json.dumps(dict(schema=1,scope='Actual gpu-required wgpu calls, resident engine/pipelines; host packing, per-call upload, dispatch/wait/readback and decoding included. Device/context setup and source compilation excluded. Numeric fixed-width eligibility only; no GPU claim for string-containing records.',rounds=9,results=results),indent=2)+'\n');print(json.dumps(dict(results=str(a.output/'execution.json'))))
