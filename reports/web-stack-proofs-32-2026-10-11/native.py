"""Native parity companion: same cores, shared caller destination, full checks.
No timings are run by preparation. Native kernel/snapshot are separate cohorts.
"""
from pathlib import Path
import ast,ctypes,hashlib,json,math,platform,random,re,struct,subprocess,time
ROOT=Path(__file__).resolve().parents[2]
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def run(argv,log):
 r=subprocess.run(list(map(str,argv)),cwd=ROOT,capture_output=True,text=True);log.append(dict(argv=list(map(str,argv)),exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
 if r.returncode:raise RuntimeError(r.stderr)
 return r.stdout
class Result(ctypes.Structure):_fields_=[('data',ctypes.POINTER(ctypes.c_uint32)),('len',ctypes.c_size_t),('scalar',ctypes.c_uint64)]
def observe(v):
 if not isinstance(v,list):return str(v),int(v)
 s=sum(v)&0xffffffff;w=sum((i+1)*x for i,x in enumerate(v))&0xffffffff;return f'array:{len(v)}:{s}:{w}',(s+(w<<32)+len(v))&((1<<64)-1)
def prepare(report):
 report=Path(report);n=report/'native';n.mkdir(exist_ok=True)
 if (n/'metadata.json').exists():raise ValueError('preserve native preparation')
 m=read(report/'metadata.json');tasks=read(report/'spec.json')['tasks'];fixtures=read(report/'fixtures.json');log=[]
 # Reuse precisely the authenticated continuous integer timer and full-vector
 # consumption protocol. Driver source archived verbatim in this preparation.
 driver_source=ROOT/'bench/web-stack-native-27.py';tree=ast.parse(driver_source.read_text());driver=next(ast.literal_eval(x.value) for x in tree.body if isinstance(x,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='DRIVER' for t in x.targets));(n/'driver.c').write_text(driver)
 run(['clang','-O3','-std=c11',n/'driver.c','-o',n/'driver'],log)
 suffix='dylib' if platform.system()=='Darwin' else 'so';shared='-dynamiclib' if suffix=='dylib' else '-shared';cpu='-mcpu=native' if platform.machine()=='arm64' else '-march=native';libraries={}
 header='#include <stdint.h>\n#include <stddef.h>\ntypedef struct{const uint32_t*data;size_t len;uint64_t scalar;}BenchResult;\n'
 for version in ['literal','prior','checked']:
  chunks=[header];calls=[];resets=[]
  for i,t in enumerate(tasks):
   codepath=report/'targets'/t['name']/version/'cpu.c';code=codepath.read_text();prefix=f'b32_{i}_';tokens=sorted(set(re.findall(r'\b(?:ink_|lang_)[A-Za-z0-9_]+\b',code)));chunks.extend(f'#define {x} {prefix}{x}\n' for x in tokens);chunks.append('#include "'+str(codepath.resolve())+'"\n');chunks.extend(f'#undef {x}\n' for x in tokens)
   base='lang_fn_'+t['name'];signature=re.search(r'\b'+re.escape(base)+r'\(([^)]*)\)',code);need_struct='ink_l_uint32' in signature[1];args=['('+prefix+'ink_l_uint32){x,nx}'] if need_struct else ['x','nx']
   if t['list_inputs']==2:args+=['('+prefix+'ink_l_uint32){y,ny}'] if need_struct else ['y','ny']
   args+=['seed','k']
   if t['output_kind']=='list_u32':calls.append(f'case {i}:{{size_t count={prefix}{base}_into('+','.join(args+['out'])+');return(BenchResult){out,count,0};}')
   else:calls.append(f'case {i}:return(BenchResult){{0,0,(uint64_t){prefix}{base}('+','.join(args)+')};')
   if 'ink_compute_reset' in tokens:resets.append(f'case {i}:{prefix}ink_compute_reset();break;')
  chunks.append('static uint32_t active;\nBenchResult bench_call(uint32_t task,const uint32_t*x,size_t nx,const uint32_t*y,size_t ny,uint32_t seed,uint32_t k,uint32_t*out){active=task;switch(task){'+''.join(calls)+'default:__builtin_unreachable();}}\nvoid bench_reset(void){switch(active){'+''.join(resets)+'default:break;}}\n')
  src=n/(version+'.c');src.write_text(''.join(chunks));library=n/(version+'.'+suffix);run(['clang','-O3',cpu,'-ffp-contract=off','-std=c11',shared,src,'-o',library],log);libraries[version]=str(library.resolve())
 expert=report/'expert.rs';src=n/'expert.rs';src.write_text(expert.read_text()+'''\n#[repr(C)]pub struct BenchResult{data:*const u32,len:usize,scalar:u64}
#[no_mangle]pub unsafe extern "C" fn bench_call(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->BenchResult{let count=bench_eval(task,x,nx,y,ny,seed,k,out);if VECTOR[task as usize]{BenchResult{data:out,len:count,scalar:0}}else{BenchResult{data:std::ptr::null(),len:0,scalar:(*out as u64)|((*out.add(1) as u64)<<32)}}}
#[no_mangle]pub extern "C" fn bench_reset(){}
''')
 library=n/('expert.'+suffix);run(['rustc','--edition=2021','--crate-type=cdylib','-C','opt-level=3','-C','target-cpu=native','-C','panic=abort',src,'-o',library],log);libraries['expert']=str(library.resolve())
 validated=[];binaries={}
 for f in fixtures['frames']:
  t=next(t for t in tasks if t['name']==f['task']);i=tasks.index(t);xs=(ctypes.c_uint32*max(1,len(f['xs'])))(*f['xs']);ys=(ctypes.c_uint32*max(1,len(f['ys'])))(*f['ys']);out=(ctypes.c_uint32*max(2,len(f['xs'])+len(f['ys'])))();expected=f['expected']
  binary=n/(hashlib.sha256(f['id'].encode()).hexdigest()+'.bin');binary.write_bytes(struct.pack('<QQII',len(f['xs']),len(f['ys']),f['seed'],f['k'])+struct.pack('<'+'I'*(len(f['xs'])+len(f['ys'])),*f['xs'],*f['ys']));binaries[f['id']]=str(binary.resolve())
  for name,path in libraries.items():
   lib=ctypes.CDLL(path);lib.bench_call.argtypes=[ctypes.c_uint32,ctypes.POINTER(ctypes.c_uint32),ctypes.c_size_t,ctypes.POINTER(ctypes.c_uint32),ctypes.c_size_t,ctypes.c_uint32,ctypes.c_uint32,ctypes.POINTER(ctypes.c_uint32)];lib.bench_call.restype=Result
   result=lib.bench_call(i,xs,len(f['xs']),ys,len(f['ys']),f['seed'],f['k'],out);actual=list(result.data[:result.len]) if t['output_kind']=='list_u32' else str(result.scalar)
   if (actual!=expected if isinstance(expected,list) else str(actual)!=str(expected)) or list(xs)[:len(f['xs'])]!=f['xs'] or list(ys)[:len(f['ys'])]!=f['ys']:raise ValueError('native complete/nonmutation '+f['id']+'/'+name)
   lib.bench_reset();validated.append(dict(frame=f['id'],variant=name,passed=True))
 (n/'commands.json').write_text(json.dumps(log,indent=2)+'\n');metadata=dict(status='prepared',main_metadata_sha256=sha(report/'metadata.json'),libraries=libraries,binaries=binaries,validation=validated,driver_ancestor_sha256=sha(driver_source),protocol=dict(rounds=9,seed=2026113201,target_ms=8,maximum_iterations=65536,warmups='three driver prewarm calls outside timer on every calibration/sample subprocess; distinct from web two journaled warmups'),boundary='resident caller destination or copied inputs then same destination; complete output consumption and scratch reset inside timer, setup outside; no cross-host boundary ranking',bindings={str(p.relative_to(n)):sha(p) for p in n.rglob('*') if p.is_file() and p.suffix!='.log'})
 (n/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n');return metadata

def measure(report):
 report=Path(report);n=report/'native';m=read(n/'metadata.json');tasks=read(report/'spec.json')['tasks'];f=read(report/'fixtures.json');result=dict(status='running',metadata_sha256=sha(n/'metadata.json'),samples=[],calibration=[],journal=[]);rng=random.Random(2026113201)
 if (n/'results.json').exists():raise ValueError('preserve native timing')
 for path,h in m['bindings'].items():
  if sha(n/path)!=h:raise ValueError('native drift '+path)
 for x in [x for x in f['frames'] if x['timed']]:
  t=next(t for t in tasks if t['name']==x['task']);idx=tasks.index(t);single,code=observe(x['expected'])
  for boundary,snapshot in [('resident-native-destination',0),('captured-native-destination',1)]:
   def invoke(v,count):
    args=[n/'driver',m['libraries'][v],m['binaries'][x['id']],idx,int(t['output_kind']=='list_u32'),count,snapshot,t['list_inputs']];start=time.time_ns();proc=subprocess.run(list(map(str,args)),capture_output=True,text=True);row=dict(argv=list(map(str,args)),started_ns=start,exit_code=proc.returncode,stdout=proc.stdout,stderr=proc.stderr);result['journal'].append(row)
    (n/'journal.json').write_text(json.dumps(result['journal'],indent=2)+'\n')
    if proc.returncode:raise RuntimeError(proc.stderr)
    value=json.loads(proc.stdout)
    if value['single']!=single or int(value['code'])!=code or value['iterations']!=count or int(value['checksum'])!=code*count%2**64 or not math.isfinite(value['seconds'])or value['seconds']<0:raise ValueError('native checksum/count/time')
    return dict(name=t['name'],frame=x['id'],size=len(x['xs']),mode=x['mode'],variant=v,boundary=boundary,iterations=count,elapsed_ms=value['seconds']*1000,ns_per_call=value['seconds']*1e9/count,checksum=value['checksum'])
   counts={}
   for v in m['libraries']:
    count=1
    while True:
     row=invoke(v,count);result['calibration'].append(row)
     if row['elapsed_ms']>=8 or count==65536:break
     count*=2
    counts[v]=count
   for round in range(9):
    order=list(m['libraries']);rng.shuffle(order)
    for v in order:
     row=invoke(v,counts[v]);row['round']=round
     if row['elapsed_ms']<=0:raise ValueError('native zero sample')
     result['samples'].append(row)
 result['status']='passed';(n/'results.json').write_text(json.dumps(result,indent=2)+'\n');return result
