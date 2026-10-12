"""Complete owned Rust calls, identical resident inputs in Rust-Wasm."""
import argparse,json,subprocess,hashlib,random,statistics,time
from pathlib import Path
from physical import packet
ROOT=Path(__file__).resolve().parents[2];p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--option',action='store_true');p.add_argument('--borrow',action='store_true');p.add_argument('--selections',type=Path,default=ROOT/'build/proof-growth-epoch3');p.add_argument('--output',type=Path,default=ROOT/'build/proof-growth-epoch3');a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);source=Path(__file__).with_name('corpus.ink');commands=[];binaries={}
def run(cmd):
 start=time.perf_counter();r=subprocess.run(list(map(str,cmd)),capture_output=True,text=True,timeout=600);commands.append(dict(argv=list(map(str,cmd)),seconds=time.perf_counter()-start,exit_code=r.returncode,stderr=r.stderr))
 if r.returncode:raise ValueError(r.stderr)
 return r.stdout
lanes=[0,11,16]+([18]if a.option else[])
for count in lanes:
 project=out/('rust-'+str(count));cmd=[a.compiler.resolve(),'build',source.resolve(),'--target','rust','-o',project]
 if a.borrow:
  plan=packet(a.compiler.resolve(),source.resolve(),a.selections/('db'+str(count))/'selection.json',out/('physical'+str(count)))
  if project.exists()and project.is_file():project.rename(project.with_suffix('.rs'))
  run(cmd)
  cmd=[a.compiler.resolve(),'emit-plan',source.resolve(),plan,'--target','rust','-o',project/'src/lib.rs']
 elif count:cmd+=['--selection',a.selections/('option18'if count==18 else'db'+str(count))/'selection.json']
 run(cmd);lib=project/'src/lib.rs';lib.write_text(lib.read_text()+'\n'+Path(__file__).with_name('native.rs').read_text());(project/'src/main.rs').write_text('''use compiled_state::{bench_prepare,bench_run};fn main(){let a=std::env::args().skip(1).map(|s|s.parse::<u32>().unwrap()).collect::<Vec<_>>();bench_prepare(a[0],a[1]);let single=bench_run(a[2],1);for _ in 0..8{std::hint::black_box(bench_run(a[2],1));}let start=std::time::Instant::now();let checksum=bench_run(a[2],a[3]);println!("{}",serde_json::json!({"single":single.to_string(),"checksum":checksum.to_string(),"iterations":a[3],"nanoseconds":start.elapsed().as_nanos().to_string()}));}''')
 run(['cargo','build','--offline','--release','--manifest-path',project/'Cargo.toml','--target-dir',out/'native-target'])
 binary=out/('native-'+str(count));binary.write_bytes((out/'native-target/release/compiled-state').read_bytes());binary.chmod(0o755);binaries[str(count)]=dict(path=str(binary),sha256=hashlib.sha256(binary.read_bytes()).hexdigest())
 run(['cargo','build','--offline','--release','--lib','--target','wasm32-unknown-unknown','--manifest-path',project/'Cargo.toml','--target-dir',out/'native-target'])
 (out/('rust-'+str(count)+'.wasm')).write_bytes((out/'native-target/wasm32-unknown-unknown/release/compiled_state.wasm').read_bytes())
(out/'native-builds.json').write_text(json.dumps(dict(commands=commands,binaries=binaries),indent=2)+'\n')
rng=random.Random(7719);names=['helper_pipeline','drawing_layers','mapped_left','checksum','first_label','first_value','any_visible','chained','numeric_left','particle_bounds'];results=[]
def call(count,size,dist,task,it):
 r=subprocess.run([str(out/('native-'+str(count))),str(size),str(dist),str(task),str(it)],capture_output=True,text=True);assert r.returncode==0,r.stderr
 row=json.loads(r.stdout);assert int(row['checksum'])==(int(row['single'])*it)%2**64;return row
for size in [128,4096,65536]:
 for dist,distribution in enumerate(['early','late','absent']):
  for task,name in enumerate(names):
   counts={};samples={str(c):[]for c in lanes};expected=None
   for count in lanes:
    it=1
    while True:
     row=call(count,size,dist,task,it)
     if expected is None:expected=row['single']
     assert row['single']==expected,(name,count,row,expected)
     if int(row['nanoseconds'])>=6_000_000 or it>=32768:break
     it*=2
    counts[count]=it
   for round in range(9):
    order=list(lanes);rng.shuffle(order)
    for count in order:
     row=call(count,size,dist,task,counts[count]);assert row['single']==expected
     samples[str(count)].append(int(row['nanoseconds'])/counts[count])
   results.append(dict(name=name,size=size,distribution=distribution,expected_hash=expected,samples_ns=samples,median_ns={k:statistics.median(v)for k,v in samples.items()}))
(out/'native-execution.json').write_text(json.dumps(dict(schema=1,borrowing=a.borrow,compiler_sha256=hashlib.sha256(a.compiler.read_bytes()).hexdigest(),scope='Complete typed Rust calls with owned Vec/record/string capture and full output consumption charged. Input setup and State construction outside timing. No JSON ABI or cross-backend boundary ranking.',rounds=9,lanes=lanes,results=results),indent=2)+'\n')
run(['node',Path(__file__).with_name('native-wasm.mjs'),out])
print(json.dumps(dict(native=str(out/'native-execution.json'),wasm=str(out/'rust-wasm-execution.json'))))
