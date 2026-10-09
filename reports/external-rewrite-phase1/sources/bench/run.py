#!/usr/bin/env python3
"""Build, validate and benchmark same-value kernels through one shared C driver; current language stages are materialised."""
import argparse, ctypes, hashlib, json, os, platform, random, shutil, statistics, subprocess, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BUILD=ROOT/'build'/'bench'
RESULTS=ROOT/'bench'/'results'
CASES=['sum_values','affine','squares','filter_sum','pipeline','expanded','count_under']
VARIANTS=['lang','lang_knowledge','c','cpp','rust','rust_loop']
MASK=(1<<64)-1
COMMANDS=[]

def invoke(cmd, **kwargs):
    cmd=list(map(str,cmd)); start=time.perf_counter()
    r=subprocess.run(cmd,cwd=ROOT,check=True,text=True,capture_output=True,**kwargs)
    COMMANDS.append({'argv':cmd,'seconds':time.perf_counter()-start})
    return r.stdout.strip()

def toolchain():
    env=os.environ.copy()
    local=ROOT.parents[1]/'work'/'toolchain'
    if not shutil.which('cargo') and (local/'cargo/bin/cargo').exists():
        env['CARGO_HOME']=str(local/'cargo');env['RUSTUP_HOME']=str(local/'rustup')
        env['PATH']=str(local/'cargo/bin')+os.pathsep+env['PATH']
    return env

def build(env):
    BUILD.mkdir(parents=True,exist_ok=True);RESULTS.mkdir(parents=True,exist_ok=True)
    invoke(['cargo','build','--release'],env=env)
    lang=ROOT/'target/release/lang'
    replacement=BUILD/'replacement'
    shutil.rmtree(replacement,ignore_errors=True)
    invoke(['python3','knowledge/tools/rewrite_search.py','examples/kernels.lang',
            '--rules','knowledge/bitvector/rewrite-index.json','--compiler',lang,
            '--output-dir',replacement,'--fuse-mapped-sum'])
    invoke([lang,'build','examples/kernels.lang','-o',BUILD/'lang.o','--native-cpu'])
    invoke([lang,'build','examples/kernels.lang','-o',BUILD/'lang_knowledge.o','--replacement',replacement/'replacement.json','--native-cpu'])
    cpu='-mcpu=native' if platform.machine()=='arm64' else '-march=native'
    invoke(['clang','-O3',cpu,'-std=c11','-c','bench/baseline.c','-o',BUILD/'c.o'])
    invoke(['clang++','-O3',cpu,'-std=c++20','-c','bench/baseline.cpp','-o',BUILD/'cpp.o'])
    invoke(['rustc','--edition=2021','--crate-type=lib','--emit=obj','-C','opt-level=3','-C','target-cpu=native','-C','panic=abort','bench/baseline.rs','-o',BUILD/'rust.o'],env=env)
    invoke(['rustc','--edition=2021','--crate-type=lib','--emit=obj','-C','opt-level=3','-C','target-cpu=native','-C','panic=abort','bench/baseline_loop.rs','-o',BUILD/'rust_loop.o'],env=env)
    invoke(['clang','-O3','-std=c11','-c','bench/driver.c','-o',BUILD/'driver.o'])
    for v in VARIANTS:
        invoke(['clang',BUILD/'driver.o',BUILD/f'{v}.o','-o',BUILD/v])
        invoke(['clang','-dynamiclib',BUILD/f'{v}.o','-o',BUILD/f'{v}.dylib'])
    return lang

def reference(case,xs,a=3,b=11,t=1536):
    if case=='sum_values':return sum(xs)&MASK
    if case=='affine':return sum((x*a+b)&MASK for x in xs)&MASK
    if case=='squares':return sum(x*x for x in xs)&MASK
    if case=='filter_sum':return sum(x for x in xs if x<t)&MASK
    if case=='pipeline':return sum((y*y+7)&MASK for x in xs if (y:=(x*a+b)&MASK)<t)&MASK
    if case=='expanded':return sum((x+3)*(x+3) for x in xs)&MASK
    if case=='count_under':return sum(x<t for x in xs)&MASK
    raise ValueError(case)

def parameters(case,a,b,t):
    return [a,b] if case=='affine' else [t] if case in ('filter_sum','count_under') else [a,b,t] if case=='pipeline' else []

def validate(lang):
    rnd=random.Random(1729);libs={v:ctypes.CDLL(str(BUILD/f'{v}.dylib')) for v in VARIANTS}
    total=0;interpreted=0
    vectors=[[],[0],[MASK],[0,1,MASK,1<<63,(1<<63)-1]]
    vectors += [[rnd.getrandbits(64) for _ in range(rnd.randrange(1,150))] for _ in range(100)]
    vectors += [[rnd.randrange(1024) for _ in range(rnd.randrange(1,150))] for _ in range(100)]
    for i,xs in enumerate(vectors):
        a,b,t=([3,11,1536] if i%3==0 else [rnd.getrandbits(64),rnd.getrandbits(64),rnd.getrandbits(64)])
        buf=(ctypes.c_uint64*max(1,len(xs)))(*xs)
        for case in CASES:
            args=parameters(case,a,b,t);expected=reference(case,xs,a,b,t)
            for v,lib in libs.items():
                fn=getattr(lib,'lang_fn_'+case);fn.argtypes=[ctypes.POINTER(ctypes.c_uint64),ctypes.c_size_t]+[ctypes.c_uint64]*len(args);fn.restype=ctypes.c_uint64
                got=fn(buf,len(xs),*args)
                assert got==expected,(v,case,i,got,expected)
                total+=1
            if i<12:
                path=BUILD/'args.json';path.write_text(json.dumps([xs]+args))
                got=int(invoke([lang,'run','examples/kernels.lang',case,path]))
                assert got==expected,('interpreter',case,i,got,expected)
                interpreted+=1
    result={'native_checks':total,'interpreter_checks':interpreted,'fixtures':len(vectors),'status':'passed','seed':1729}
    (RESULTS/'correctness.json').write_text(json.dumps(result,indent=2))
    return result

def sample(v,k,n,it,distribution,threshold):
    out=invoke([BUILD/v,k,n,it,123456789,distribution,threshold])
    r=json.loads(out)
    assert r['checksum']==str((int(r['single'])*(it+3))&MASK)
    return r

def benchmark(args):
    env=toolchain();start=time.time();lang=build(env);correctness=validate(lang)
    print('Correctness:',correctness,flush=True)
    sizes=[32,4096,262144] if args.quick else [32,4096,262144,4194304]
    distributions=['small'] if args.quick else ['small','full']
    rows=[];rnd=random.Random(20261009)
    for distribution in distributions:
        for n in sizes:
            for k,case in enumerate(CASES):
                threshold=512 if case in ('filter_sum','count_under') else 1536
                if distribution=='full':threshold=1<<63
                its={}
                for v in VARIANTS:
                    r=sample(v,k,n,1,distribution,threshold)
                    estimate=max(r['seconds'],1e-7)
                    it=max(1,min(20_000_000,int(args.seconds/estimate)))
                    # A calibration batch avoids deciding the final loop count from a single timer sample.
                    r=sample(v,k,n,it,distribution,threshold)
                    its[v]=max(1,min(50_000_000,int(it*args.seconds/max(r['seconds'],1e-7))))
                group=[]
                for repeat in range(args.repeats):
                    order=VARIANTS.copy();rnd.shuffle(order)
                    for v in order:
                        r=sample(v,k,n,its[v],distribution,threshold)
                        row={'variant':v,'case':case,'n':n,'distribution':distribution,'repeat':repeat,**r,'ns_per_call':r['seconds']*1e9/its[v]}
                        rows.append(row);group.append(row)
                assert len({r['single'] for r in group})==1,(case,n,'cross-language checksum mismatch')
                print(f'{distribution:5} n={n:8} {case:12}: '+', '.join(f'{v} {statistics.median(r["ns_per_call"] for r in group if r["variant"]==v):.1f} ns' for v in VARIANTS),flush=True)
                (RESULTS/'samples.json').write_text(json.dumps(rows,indent=2))
    sources={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for folder in ['src','bench','examples','knowledge'] for p in (ROOT/folder).glob('*') if p.is_file()}
    metadata={'started_unix':start,'elapsed_seconds':time.time()-start,'platform':platform.platform(),'machine':platform.machine(),'cpu':invoke(['sysctl','-n','machdep.cpu.brand_string']),'memory_bytes':invoke(['sysctl','-n','hw.memsize']),'clang':invoke(['clang','--version']),'rustc':invoke(['rustc','-vV'],env=env),'parameters':vars(args),'correctness':correctness,'source_sha256':sources,'commands':COMMANDS,'notes':['All timed variants share one C driver object; no LTO.','Current language baseline materialises collection stages; handwritten baselines combine passes. This harness now compares differing algorithms. Use bench/collection-proof.py for staged and combined variants in every language.','Native LLVM versions differ between Clang and Rust.','No CPU pinning; shared interactive machine.','Warm in-memory u64 kernels only; not the complete language or a persistence benchmark.','C and C++ factored polynomial baseline; the language must compete with an already simplified expert implementation.']}
    (RESULTS/'metadata.json').write_text(json.dumps(metadata,indent=2))
    summaries=[]
    for distribution in distributions:
        for n in sizes:
            for case in CASES:
                group=[r for r in rows if r['distribution']==distribution and r['n']==n and r['case']==case]
                med={v:statistics.median(r['ns_per_call'] for r in group if r['variant']==v) for v in VARIANTS}
                summaries.append({'distribution':distribution,'n':n,'case':case,'median_ns':med,'lang_over_c':med['lang']/med['c'],'knowledge_over_rust':med['lang_knowledge']/med['rust']})
    (RESULTS/'summary.json').write_text(json.dumps(summaries,indent=2))
    print(f'Saved {len(rows)} timed samples to {RESULTS}',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--quick',action='store_true');parser.add_argument('--seconds',type=float,default=.04);parser.add_argument('--repeats',type=int,default=7)
    args=parser.parse_args()
    if args.seconds<=0 or args.repeats<3:parser.error('positive duration and at least 3 repeats are required')
    benchmark(args)
