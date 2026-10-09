#!/usr/bin/env python3
"""Native state comparison; common driver, independent oracle, no cross-ABI LTO."""
import argparse,ctypes,hashlib,json,os,platform,random,shutil,statistics,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BUILD=ROOT/'build/state-bench'
OUT=ROOT/'reports/native-state-phase3-native-abi'
VARIANTS=['language','language_bounded','c_flat','cpp_tree','rust_tree','rust_bigint']
MASK=(1<<64)-1
COMMANDS=[]

def run(argv,env=None):
    argv=list(map(str,argv));start=time.perf_counter()
    p=subprocess.run(argv,cwd=ROOT,env=env,text=True,capture_output=True)
    COMMANDS.append({'argv':argv,'seconds':time.perf_counter()-start,'returncode':p.returncode})
    if p.returncode:raise RuntimeError(' '.join(argv)+'\n'+p.stderr)
    return p.stdout.strip()

def environment():
    env=os.environ.copy();local=ROOT.parents[1]/'work/toolchain'
    if not shutil.which('cargo') and (local/'cargo/bin/cargo').exists():
        env.update(CARGO_HOME=str(local/'cargo'),RUSTUP_HOME=str(local/'rustup'),PATH=str(local/'cargo/bin')+os.pathsep+env['PATH'])
    return env

def build(env,maintenance=None):
    BUILD.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    run(['cargo','build','--release','--bin','lang'],env)
    lang=ROOT/'target/release/lang'
    if maintenance is None:
        run([lang,'prove-maintenance','knowledge/sum-maintenance.lang','-o',BUILD/'maintenance.json'])
    else:
        run([lang,'verify-maintenance',maintenance])
        shutil.copyfile(maintenance,BUILD/'maintenance.json')
    project=BUILD/'generated'
    run([lang,'emit-state','examples/state-benchmark.lang','-o',project,'--maintenance',BUILD/'maintenance.json'])
    with (project/'src/lib.rs').open('a') as f:f.write((ROOT/'bench/state/generated_abi.rs').read_text())
    source=(project/'Cargo.toml').read_text().replace('crate-type = ["rlib", "cdylib"]','crate-type = ["staticlib", "cdylib"]').replace('lto = "thin"','lto = false')
    source+='\n[features]\nbounded-abi=[]\n'
    (project/'Cargo.toml').write_text(source)
    native_env=env.copy();native_env['RUSTFLAGS']='-C target-cpu=native -C panic=abort'
    native_env['CARGO_TARGET_DIR']=str(BUILD/'rust-target')
    run(['cargo','build','--release','--offline','--lib','--manifest-path',project/'Cargo.toml'],native_env)
    for suffix in ['a','dylib']:shutil.copyfile(BUILD/f'rust-target/release/libcompiled_state.{suffix}',BUILD/f'language.{suffix}')
    bounded=BUILD/'generated-bounded'
    run([lang,'emit-state','examples/state-benchmark.lang','-o',bounded,'--maintenance',BUILD/'maintenance.json','--bounded-totals'])
    with (bounded/'src/lib.rs').open('a') as f:f.write((ROOT/'bench/state/generated_abi.rs').read_text())
    (bounded/'Cargo.toml').write_text((project/'Cargo.toml').read_text())
    run(['cargo','build','--release','--offline','--lib','--features','bounded-abi','--manifest-path',bounded/'Cargo.toml'],native_env)
    for suffix in ['a','dylib']:shutil.copyfile(BUILD/f'rust-target/release/libcompiled_state.{suffix}',BUILD/f'language_bounded.{suffix}')
    baseline=BUILD/'rust-baseline';(baseline/'src').mkdir(parents=True,exist_ok=True)
    shutil.copyfile(ROOT/'bench/state/baseline.rs',baseline/'src/lib.rs')
    (baseline/'Cargo.toml').write_text('[package]\nname="baseline-state"\nversion="0.1.0"\nedition="2021"\n[lib]\ncrate-type=["staticlib","cdylib"]\n[features]\nbigint=[]\n[dependencies]\nnum-bigint="=0.4.8"\n[profile.release]\nlto=false\ncodegen-units=1\n')
    for variant,features in [('rust_tree',[]),('rust_bigint',['--features','bigint'])]:
        run(['cargo','build','--release','--offline','--manifest-path',baseline/'Cargo.toml']+features,native_env)
        for suffix in ['a','dylib']:shutil.copyfile(BUILD/f'rust-target/release/libbaseline_state.{suffix}',BUILD/f'{variant}.{suffix}')
    cpu='-mcpu=native' if platform.machine()=='arm64' else '-march=native'
    for variant,compiler,source,std in [('c_flat','clang','baseline.c','c11'),('cpp_tree','clang++','baseline.cpp','c++20')]:
        run([compiler,'-O3',cpu,'-Wall','-Wextra','-Werror','-std='+std,'-c',ROOT/'bench/state'/source,'-o',BUILD/f'{variant}.o'])
        run([compiler,'-dynamiclib',BUILD/f'{variant}.o','-o',BUILD/f'{variant}.dylib'])
    run(['clang','-O3','-std=c11','-Wall','-Wextra','-Werror','-c','bench/state/driver.c','-o',BUILD/'driver.o'])
    for variant in VARIANTS:
        compiler='clang++' if variant=='cpp_tree' else 'clang'
        obj=BUILD/(variant+('.o' if variant in ['c_flat','cpp_tree'] else '.a'))
        run([compiler,BUILD/'driver.o',obj,'-liconv','-o',BUILD/variant])
    return lang

class Model:
    def __init__(self,n=0):
        self.rows={i:i%10 for i in range(n)};self.version=n;self.events=[]
    def apply(self,op,key,value):
        if op==3:return 3 if key in self.rows else 1
        if op==0:
            if key in self.rows:return 2
            self.rows[key]=value
        elif op==1:
            if key not in self.rows:return 1
            old=self.rows[key]
            if old+value>(1<<32)-1:return 3
            self.rows[key]+=value
            self.events.append((self.version+1,0,key,old,old+value))
        elif op==2:self.rows.pop(key,None)
        else:raise ValueError(op)
        self.version+=1;return 0
    def event_hash(self):
        h=0
        for e in self.events:
            for x in e:h=((h*1099511628211)&MASK)^x
        return h

def load(variant):
    lib=ctypes.CDLL(str(BUILD/f'{variant}.dylib'))
    ptr=ctypes.c_void_p;u64=ctypes.c_uint64;u32=ctypes.c_uint32
    signatures={'st_new':([u64],ptr),'st_free':([ptr],None),'st_apply':([ptr,u32,u64,u32],u32),'st_stock':([ptr,u64,ctypes.POINTER(u32)],u32),'st_total':([ptr,ctypes.POINTER(u64),ctypes.POINTER(u64)],None),'st_version':([ptr],u64),'st_event_count':([ptr],u64),'st_event_hash':([ptr],u64)}
    for name,(args,result) in signatures.items():getattr(lib,name).argtypes=args;getattr(lib,name).restype=result
    return lib

def validate(lang):
    rnd=random.Random(817263)
    operations=[(0,MASK,(1<<32)-1),(1,MASK,1),(3,MASK,0),(2,MASK,0),(3,MASK,0)]
    operations += [(rnd.randrange(4),rnd.randrange(64),((1<<32)-1 if i%13==0 else rnd.randrange(400))) for i in range(2000)]
    expected=[];model=Model()
    for op,key,value in operations:
        status=model.apply(op,key,value)
        expected.append((status,sum(model.rows.values()),model.version,len(model.events),model.event_hash(),model.rows.get(key)))
    checks=0
    for variant in VARIANTS:
        lib=load(variant);state=lib.st_new(0)
        try:
            for i,((op,key,value),want) in enumerate(zip(operations,expected)):
                status=lib.st_apply(state,op,key,value);lo=ctypes.c_uint64();hi=ctypes.c_uint64();found=ctypes.c_uint32()
                lib.st_total(state,ctypes.byref(lo),ctypes.byref(hi));stock=lib.st_stock(state,key,ctypes.byref(found))
                got=(status,lo.value+(hi.value<<64),lib.st_version(state),lib.st_event_count(state),lib.st_event_hash(state),stock if found.value else None)
                assert got==want,(variant,i,got,want);checks+=1
        finally:lib.st_free(state)
    # The independent oracle also checks the language reference runtime's
    # status, versions, ordered events and totals on exactly this source.
    script=[]
    for op,key,value in operations:
        name=['create','restock','remove','fail'][op]
        script += [{'call':name,'args':[key,value] if op<2 else [key]},{'call':'total','args':[]}]
    path=BUILD/'validation-script.json';path.write_text(json.dumps(script))
    result=json.loads(run([lang,'execute','examples/state-benchmark.lang',path]))
    model=Model();errors=['','Error.Missing','Error.Exists','Error.Overflow']
    for i,(op,key,value) in enumerate(operations):
        before=len(model.events);status=model.apply(op,key,value)
        want={'result':{'Ok':None} if status==0 else {'Err':errors[status]},'committed':status==0,'version':model.version,'events':[{'commit':v,'position':p,'channel':'updated','value':{'key':k,'before':b,'after':a}} for v,p,k,b,a in model.events[before:]]}
        assert result[2*i]==want,(i,result[2*i],want)
        assert result[2*i+1]=={'result':{'Int':str(sum(model.rows.values()))},'committed':False,'version':model.version,'events':[]}
    data={'seed':817263,'operations':len(operations),'native_observation_comparisons':checks,'reference_outcome_comparisons':len(result),'status':'passed','checks':['return status','exact total','version','ordered event digest','event count','touched row presence and value']}
    (OUT/'correctness.json').write_text(json.dumps(data,indent=2));return data

def main():
    global BUILD,OUT
    parser=argparse.ArgumentParser();parser.add_argument('--repeats',type=int,default=7);parser.add_argument('--steps',type=int,default=30000);parser.add_argument('--quick',action='store_true')
    parser.add_argument('--maintenance',type=Path);parser.add_argument('--output',type=Path);parser.add_argument('--build-directory',type=Path)
    args=parser.parse_args()
    if args.repeats<3 or not 1<=args.steps<=10000000:parser.error('at least 3 repeats and 1..10000000 steps required')
    if args.output:OUT=args.output.resolve()
    if args.build_directory:BUILD=args.build_directory.resolve()
    env=environment();started=time.time()
    sources={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for folder in ['src','bench/state','examples','knowledge'] for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in str(p)}
    lang=build(env,args.maintenance);correctness=validate(lang);print('Correctness:',correctness,flush=True)
    rows=[];rnd=random.Random(418294);sizes=[64,4096] if args.quick else [64,4096,65536]
    for n in sizes:
        for workload in ['steady','mixed']:
            for qpu in [0,1,10]:
                for repeat in range(args.repeats):
                    order=VARIANTS.copy();rnd.shuffle(order)
                    for variant in order:
                        sample=json.loads(run([BUILD/variant,n,args.steps,qpu,workload]))
                        rows.append(dict(variant=variant,rows=n,workload=workload,queries_per_update=qpu,repeat=repeat,ns_per_step=sample['seconds']*1e9/args.steps,**sample))
                group=[r for r in rows if r['rows']==n and r['workload']==workload and r['queries_per_update']==qpu]
                signatures={json.dumps({k:r[k] for k in ['checksum','total_lo','total_hi','version','events','event_hash','state_hash','statuses']},sort_keys=True) for r in group}
                assert len(signatures)==1,(n,workload,qpu,'cross-variant observations differ')
                print(f'{n=} {workload} {qpu=}: '+', '.join(f'{v} {statistics.median(r["ns_per_step"] for r in group if r["variant"]==v):.1f} ns' for v in VARIANTS),flush=True)
                (OUT/'samples.json').write_text(json.dumps(rows,indent=2))
    maintenance=json.loads((BUILD/'maintenance.json').read_text())
    compiler_hash=hashlib.sha256(lang.read_bytes()).hexdigest()
    metadata={'started_unix':started,'elapsed_seconds':time.time()-started,'platform':platform.platform(),'cpu':run(['sysctl','-n','machdep.cpu.brand_string']),'clang':run(['clang','--version']),'rustc':run(['rustc','-vV'],env),'parameters':{k:str(v) if isinstance(v,Path) else v for k,v in vars(args).items()},'compiler_sha256':compiler_hash,'maintenance_id':maintenance['id'],'maintenance_semantics':maintenance['semantics'],'correctness':correctness,'source_sha256':sources,'commands':COMMANDS,'notes':['Common C driver object, no cross-ABI LTO; native CPU optimisation requested for all implementations. Actual LLVM target CPUs are retained in backend-targets.json.','Warm in-memory transactions; no persistence or concurrency. Setup, final state validation and event hashing are outside timing.','Same observations and incremental algorithm, but data structure and arithmetic representations differ; see report.','Interactive shared machine, no CPU pinning.','No warmup; each sample starts from a fresh state. Fixed operation count and deterministic streams.']}
    (OUT/'metadata.json').write_text(json.dumps(metadata,indent=2))
    for project in ['generated','generated-bounded']:
        for source in ['src/lib.rs','Cargo.lock','plan.json']:shutil.copyfile(BUILD/project/source,OUT/(project+'-'+Path(source).name))
        shutil.copyfile(BUILD/project/'Cargo.toml',OUT/(project+'-Cargo.toml'))
    shutil.copyfile(BUILD/'maintenance.json',OUT/'maintenance.json')
    # Archive measured source bytes, rather than relying on a mutable checkout.
    for path,digest in sources.items():
        source=ROOT/path;assert hashlib.sha256(source.read_bytes()).hexdigest()==digest,path
        destination=OUT/'sources'/path;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source,destination)
    targets={}
    clang=subprocess.run(['clang','-O3','-mcpu=native' if platform.machine()=='arm64' else '-march=native','-###','-c','bench/state/baseline.c'],cwd=ROOT,text=True,capture_output=True,check=True)
    import re
    found=re.search(r'"-target-cpu" "([^"]+)"',clang.stderr);targets['clang_cpu']=found.group(1) if found else None
    targets['clang_driver']=clang.stderr
    probe=BUILD/'cpu-probe.rs';probe.write_text('pub fn probe(x:u64)->u64{x+1}\n')
    run(['rustc','--crate-type=lib','-O','-C','target-cpu=native','--emit=llvm-ir',probe,'-o',BUILD/'cpu-probe.ll'],env)
    ir=(BUILD/'cpu-probe.ll').read_text();found=re.search(r'"target-cpu"="([^"]+)"',ir);targets['rust_cpu']=found.group(1) if found else None
    targets['rust_llvm_ir']=ir
    (OUT/'backend-targets.json').write_text(json.dumps(targets,indent=2))
    metadata['commands']=COMMANDS
    (OUT/'metadata.json').write_text(json.dumps(metadata,indent=2))
    write_report(rows,args)

def write_report(rows,args):
    lines=['# Native stateful comparison','','The stateful language is compiled to typed Rust and machine code. No AST evaluator runs in timed code. Every variant maintains the total incrementally. These results are about the implemented compiler/runtime and application, not a universal ranking of languages.','','## Compared implementations','','| Variant | Table | Total | Transaction implementation |','| --- | --- | --- | --- |','| language | Rust BTreeMap | BigInt | Generated undo journal, staged events, checked maintenance expressions |','| language_bounded | Rust BTreeMap | checked u128 cache and exact word-pair query ABI | Generated undo journal and staged events |','| c_flat | Sorted contiguous array | unsigned 128-bit | Handwritten, validates before mutation |','| cpp_tree | std::map | unsigned 128-bit | Handwritten, validates before mutation |','| rust_tree | Rust BTreeMap | u128 | Handwritten, validates before mutation |','| rust_bigint | Rust BTreeMap | BigInt | Handwritten, validates before mutation |','','The exact sum of a finite table keyed by u64 with u32 values is at most `2^64 × (2^32 − 1)`, below `2^96`. A 128-bit unsigned total therefore preserves this application\'s exact arithmetic for every possible table. The bounded compiler variant now derives this range from declared types; the ordinary variant retains BigInt caches. The bounded variant uses a compiler-generated allocation-free exact word-pair view for direct bounded aggregate queries. Ordinary language/JSON queries still return Int; both host paths expose the same exact unsigned total. BigInt Rust isolates part of the arithmetic/storage cost. C uses a flat ordered table, so insertion/removal costs differ from the tree variants.','','The handwritten aborting transaction is reduced to a presence check: every present-key execution returns Overflow and leaves no writes or events, while an absent key returns Missing. Generated code still performs and rolls back speculative writes. This valid baseline optimisation exposes another compiler opportunity.','','## Method','','Each sample begins with a fresh table of the stated size. Setup is excluded. The steady stream adds one to existing random keys. The mixed stream includes insert, delete, successful/failed restock, overflow and an always-aborting two-write transaction. Queries run after each attempted update. All successful commits advance the version; events remain in an in-memory outbox. End-of-run checks compare every candidate row, exact totals, statuses, versions and ordered event digests across variants.','','All variants use the same separately compiled C driver, without cross-boundary LTO. ABI query conversion and return-value handling are included. Generated writes also reuse the previous value returned by map insertion/removal, avoiding a redundant lookup. Seven repeats by default, randomised variant order. No CPU pinning or isolated-machine claim. The table reports median nanoseconds per attempted update **including its queries**.','','| Rows | Stream | Queries/update | Language ns | Bounded ns | C flat ns | C++ tree ns | Rust tree ns | Rust BigInt ns | Bounded / fastest baseline |','| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
    ratios=[]
    for n in sorted({r['rows'] for r in rows}):
        for workload in ['steady','mixed']:
            for qpu in [0,1,10]:
                group=[r for r in rows if (r['rows'],r['workload'],r['queries_per_update'])==(n,workload,qpu)]
                med={v:statistics.median(r['ns_per_step'] for r in group if r['variant']==v) for v in VARIANTS};ratio=med['language_bounded']/min(med[v] for v in VARIANTS[2:]);ratios.append(ratio)
                lines.append(f'| {n} | {workload} | {qpu} | '+' | '.join(f'{med[v]:.1f}' for v in VARIANTS)+f' | {ratio:.2f}× |')
    lines += ['','A ratio greater than one means the generated language implementation takes longer. Differences include representation, transaction strategy, cloning, allocations and ABI conversion; they cannot all be attributed to the surface language.','','Correctness: 2,005 deterministic operations are checked against an independent Python integer/state model for each native implementation. The reference interpreter is also checked on the same source and stream. Separate native range tests exercise equivalent legacy certificates with negative and greater-than-128-bit intermediate values. See [correctness.json](correctness.json), [raw samples](samples.json), [toolchain and source metadata](metadata.json), and [generated code](generated-lib.rs).','','The broader language, full stateful refinement, durable recovery and adaptive selection remain unfinished. These measurements do not close the full project goal.']
    cert=json.loads((BUILD/'maintenance.json').read_text())
    if cert['version']==2:
        lines[2:2]=['This run uses the database-backed exact maintenance bridge. The compiler independently checks the actual source expressions against canonical integer/list definitions and universal induction proofs, with no v1 polynomial authority on this path. The installed certificate and raw proof objects are archived in [maintenance.json](maintenance.json). Table projection, the transactional cache protocol, range analysis and native lowering remain trusted; this is not complete state-transition verification.','',
                    'The new proof path does not itself change the update algorithm or generated native code. This report tests its actual runtime against the same maintained C/C++/Rust baselines. Database growth is not a performance claim. Actual backend CPU targets are archived in [backend-targets.json](backend-targets.json); Clang and Rust can resolve `native` differently.','']
    medians={}
    for cell in {(r['rows'],r['workload'],r['queries_per_update']) for r in rows}:
        medians[cell]={v:statistics.median(r['ns_per_step'] for r in rows if (r['rows'],r['workload'],r['queries_per_update'])==cell and r['variant']==v) for v in VARIANTS}
    geomean=lambda xs:__import__('math').exp(statistics.mean(__import__('math').log(x) for x in xs))
    summary={'samples':len(rows),'cells':len(medians),'bounded_time_divided_by_rust_tree':geomean([m['language_bounded']/m['rust_tree'] for m in medians.values()]),'bounded_time_divided_by_fastest_baseline':geomean([m['language_bounded']/min(m[v] for v in VARIANTS[2:]) for m in medians.values()]),'bigint_time_divided_by_bounded':geomean([m['language']/m['language_bounded'] for m in medians.values()])}
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2))
    lines+=['',f"Across {summary['cells']} cells, bounded Ink takes {summary['bounded_time_divided_by_rust_tree']:.2f}× Rust tree time and {summary['bounded_time_divided_by_fastest_baseline']:.2f}× the fastest baseline's time by geometric mean. BigInt Ink takes {summary['bigint_time_divided_by_bounded']:.2f}× bounded Ink time. See [summary.json](summary.json)."]
    (OUT/'REPORT.md').write_text('\n'.join(lines)+'\n')

if __name__=='__main__':main()
