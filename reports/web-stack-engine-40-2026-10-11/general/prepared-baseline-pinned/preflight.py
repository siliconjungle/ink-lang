"""Untimed source/backend-interface preflight; no final candidate preparation."""
from pathlib import Path
import ctypes, hashlib, importlib.util, json, platform, subprocess

B=Path(__file__).resolve().parents[2]
A=B/'bench/web-stack-general40';R=B/'reports/web-stack-engine-40-2026-10-11/general'
rd=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def load(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
def main():
 p=R/'source-preflight'
 if p.exists():raise ValueError('preserve previous preflight')
 p.mkdir();log=[];declaration=rd(R/'declaration/receipt.json');spec=rd(R/'declaration/spec.json');fixtures=rd(R/'declaration/fixtures.json')
 assert sha(R/'declaration/spec.json')==declaration['suite_spec_sha256']
 assert sha(R/'declaration/fixtures.json')==declaration['suite_fixtures_sha256']
 compiler=R.parent/'ink-baseline-frozen'
 def run(argv):
  argv=list(map(str,argv));r=subprocess.run(argv,text=True,capture_output=True);log.append(dict(argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
  if r.returncode:raise ValueError(r.stderr)
  return r.stdout
 try:
  source_checks=[]
  for t in spec['tasks']:
   d=p/'targets'/t['name'];d.mkdir(parents=True);src=d/'source.ink';src.write_text('module General40;\n'+t['source']+'\n')
   core=d/'baseline.core.json';run([compiler,'emit-core',src,'-o',core])
   edge=next(f for f in fixtures['frames']if f['task']==t['name']and f['id'].endswith('-boundaries'))
   args=d/'args.json';args.write_text(json.dumps([edge['xs'],edge['ys'],edge['seed'],edge['k']]))
   actual=json.loads(run([compiler,'run',core,t['name'],args,'--core']));assert actual==edge['expected'],t['name']
   source_checks.append(dict(task=t['name'],source_sha256=sha(src),core_sha256=sha(core),full_boundary_output=True))
  capability=load('general40_rust_adapter',A/'rust-target.py').adapter(p,'baseline',spec['tasks'],compiler,log)
  run(['rustc','--edition=2021','--crate-type=cdylib','--target','wasm32-unknown-unknown','-C','opt-level=3','-C','panic=abort','-C','target-feature=+simd128',A/'expert.rs','-o',p/'rust-expert.wasm'])
  wrapper='''\n#[repr(C)]pub struct BenchResult{data:*const u32,len:usize,scalar:u64}
#[no_mangle]pub unsafe extern "C" fn bench_call(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32)->BenchResult{if VECTOR[task as usize]{let n=bench_eval_owned(task,x,nx,y,ny,seed,k);BenchResult{data:bench_owned_ptr(),len:n,scalar:0}}else{BenchResult{data:std::ptr::null(),len:0,scalar:bench_eval_scalar32(task,x,nx,y,ny,seed,k)as u64}}}
#[no_mangle]pub unsafe extern "C" fn bench_reset(){bench_owned_clear();}
'''
  suffix='dylib'if platform.system()=='Darwin'else'so';native_checks=[]
  vector='\nconst VECTOR:[bool;12]=['+','.join('true'if t['output_kind']=='list_u32'else'false'for t in spec['tasks'])+'];\n'
  class Result(ctypes.Structure):_fields_=[('data',ctypes.POINTER(ctypes.c_uint32)),('len',ctypes.c_size_t),('scalar',ctypes.c_uint64)]
  for name,source in [('ink-rust',p/capability['adapter_path']),('expert',A/'expert.rs')]:
   src=p/(name+'.rs');src.write_text(source.read_text()+(vector if name=='ink-rust'else'')+wrapper)
   libpath=p/(name+'.'+suffix);run(['rustc','--edition=2021','--crate-type=cdylib','-C','opt-level=3','-C','target-cpu=native','-C','panic=abort',src,'-o',libpath])
   lib=ctypes.CDLL(str(libpath.resolve()));lib.bench_call.argtypes=[ctypes.c_uint32,ctypes.POINTER(ctypes.c_uint32),ctypes.c_size_t,ctypes.POINTER(ctypes.c_uint32),ctypes.c_size_t,ctypes.c_uint32,ctypes.c_uint32];lib.bench_call.restype=Result
   for f in fixtures['frames']:
    xs=(ctypes.c_uint32*max(1,len(f['xs'])))(*f['xs']);ys=(ctypes.c_uint32*max(1,len(f['ys'])))(*f['ys']);i=next(i for i,t in enumerate(spec['tasks'])if t['name']==f['task'])
    actual=lib.bench_call(i,xs,len(f['xs']),ys,len(f['ys']),f['seed'],f['k']);value=list(actual.data[:actual.len])if isinstance(f['expected'],list)else actual.scalar
    assert value==f['expected'] and list(xs)[:len(f['xs'])]==f['xs'] and list(ys)[:len(f['ys'])]==f['ys'],f['id']+'/'+name
    lib.bench_reset();native_checks.append(dict(frame=f['id'],variant=name,full_output=True,nonmutation=True))
  (p/'capability.json').write_text(json.dumps(capability,indent=2)+'\n')
  run(['node',A/'preflight.mjs',p])
  receipt=dict(status='passed',timed_or_profiled=False,scope='Literal baseline source and emitted Rust/expert interfaces only; no final candidate, planner selection, GPU or C/JS target parity claim',source_checks=source_checks,native_checks=native_checks,
               baseline_compiler_sha256=sha(compiler),declaration_sha256=sha(R/'declaration/receipt.json'),bindings={str(f.relative_to(p)):sha(f)for f in p.rglob('*')if f.is_file()})
  (p/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(dict(status='passed',source_checks=len(source_checks),native_checks=len(native_checks),node=rd(p/'node.json')['checks'])))
 finally:(p/'commands.json').write_text(json.dumps(log,indent=2)+'\n')
if __name__=='__main__':main()
