"""Untimed U32 emitted-native-C direct ABI fixture acquisition.
Native inputs are resident pointers; optional output destinations are caller
owned/disjoint. Module reset is included after complete output consumption;
Python transport, caller allocation/ingress and consumer work are excluded.
"""
import argparse,ctypes,hashlib,json,platform,subprocess
from pathlib import Path


def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
class ListU32(ctypes.Structure):_fields_=[('data',ctypes.POINTER(ctypes.c_uint32)),('len',ctypes.c_size_t)]


def replay(original,instrumented,receipt_path,fixtures_path,output,work,clang='clang'):
    receipt=json.loads(Path(receipt_path).read_text());frames=json.loads(Path(fixtures_path).read_text())
    if receipt['artifact_sha256']!=sha(original)or receipt['instrumented_sha256']!=sha(instrumented):raise ValueError('C artifact binding changed')
    if not isinstance(frames,list)or len(frames)>4096:raise ValueError('fixture budget')
    work=Path(work);work.mkdir(parents=True,exist_ok=False);libs=[];commands=[]
    suffix='.dylib'if platform.system()=='Darwin'else'.so';shared='-dynamiclib'if platform.system()=='Darwin'else'-shared'
    for i,source in enumerate((original,instrumented)):
        library=work/(str(i)+suffix);args=[clang,'-O0','-fPIC',shared,'-std=c11',str(source),'-o',str(library)]
        result=subprocess.run(args,capture_output=True,text=True,timeout=30);commands.append(dict(command=args,returncode=result.returncode,stderr=result.stderr))
        if result.returncode:raise ValueError(result.stderr)
        libs.append(ctypes.CDLL(str(library.resolve())))
    prefix=receipt['prefix'];reset=getattr(libs[1],prefix+'_reset');reset.argtypes=[];reset.restype=None
    count=getattr(libs[1],prefix+'_count');count.argtypes=[ctypes.c_uint];count.restype=ctypes.c_uint64
    copy=getattr(libs[1],prefix+'_bytes');copy.argtypes=[];copy.restype=ctypes.c_uint64
    rows=[]
    for frame in frames:
        id,entry,args,expected,boundary=(frame[k]for k in('id','entry','args','expected','boundary'))
        if len(args)!=4 or not all(isinstance(x,list)for x in args[:2])or not all(type(x)is int and 0<=x<=0xffffffff for xs in args[:2]for x in xs)or not all(type(x)is int and 0<=x<=0xffffffff for x in args[2:]):raise ValueError('only declared two-list/U32 scalar ABI supported')
        if boundary not in('owned','into'):raise ValueError('C boundary unsupported')
        reset();outputs=[]
        for lib in libs:
            xs=(ctypes.c_uint32*max(1,len(args[0])))(*args[0]);ys=(ctypes.c_uint32*max(1,len(args[1])))(*args[1]);values=[ListU32(xs,len(args[0])),ListU32(ys,len(args[1])),args[2],args[3]]
            destination=None;fn=getattr(lib,'lang_fn_'+entry+('_into'if boundary=='into'else''));fn.argtypes=[ListU32,ListU32,ctypes.c_uint32,ctypes.c_uint32]
            if boundary=='into':
                if not isinstance(expected,list):raise ValueError('into scalar oracle')
                sentinel=0x5a5a5a5a;capacity=len(expected)+7;destination=(ctypes.c_uint32*capacity)(*([sentinel]*capacity));fn.argtypes=fn.argtypes+[ctypes.POINTER(ctypes.c_uint32)];fn.restype=ctypes.c_size_t;n=fn(*values,destination)
                if n>capacity:raise ValueError('logical count exceeds capacity')
                result=list(destination[:n])
                if any(v!=sentinel for v in destination[n:]):raise ValueError('destination tail changed')
            elif isinstance(expected,list):
                fn.restype=ListU32;result=fn(*values);result=list(result.data[:result.len])
            else:fn.restype=ctypes.c_uint32;result=fn(*values)
            if result!=expected or list(xs[:len(args[0])])!=args[0]or list(ys[:len(args[1])])!=args[1]:raise ValueError('complete output/oracle/input mismatch '+id)
            outputs.append(result)
            # Complete value observed before invoking the documented arena end
            # boundary. Reset loops in the module remain literal counted work.
            cleanup=getattr(lib,'ink_compute_reset',None)
            if cleanup:cleanup()
        sites=[dict(id=s['id'],count=int(count(s['id'])))for s in receipt['sites']]
        components=dict(invocations=1,loop_iterations=sum(x['count']for x,s in zip(sites,receipt['sites'])if s['kind']=='loop_iterations'),allocation_events=sum(x['count']for x,s in zip(sites,receipt['sites'])if s['kind']=='allocation_events'),copy_bytes=int(copy()),gpu_dispatches=0,upload_bytes=0,readback_bytes=0)
        unavailable={k for u in receipt['unknown']for k in u['components']}
        rows.append(dict(id=id,entry=entry,boundary=boundary,components=components,known={k:k not in unavailable for k in components},unknown=receipt['unknown'],site_counts=sites))
    data=dict(schema=1,target='native-c',status='untimed-complete-output-replayed',artifact_sha256=sha(original),instrumented_sha256=sha(instrumented),instrumentation_sha256=sha(receipt_path),fixture_sha256=sha(fixtures_path),runner_sha256=sha(__file__),rows=rows,commands=commands,libraries=[sha(work/(str(i)+suffix))for i in range(2)],scope='Offline exact-fixture native-C diagnostic observations; no timer. Original/instrumented complete outputs checked against supplied oracle; borrowed inputs and destination logical extent/tail preserved. Direct resident-pointer ABI and arena reset included. Python transport, caller ingress/allocations and consumer work excluded. Explicit ink_alloc/ink_copy requests and literal loop entries only, not libc physical internals; not Rust/Wasm features.')
    Path(output).write_text(json.dumps(data,indent=2)+'\n');return data


def main():
    p=argparse.ArgumentParser(description=__doc__)
    for k in('original','instrumented','receipt','fixtures','output','work'):p.add_argument('--'+k,type=Path,required=True)
    p.add_argument('--clang',default='clang');a=p.parse_args()
    if a.output.exists():raise ValueError('preserve existing replay')
    data=replay(a.original,a.instrumented,a.receipt,a.fixtures,a.output,a.work,a.clang);print(json.dumps(dict(status=data['status'],frames=len(data['rows']))))
if __name__=='__main__':main()
