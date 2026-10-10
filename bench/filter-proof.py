#!/usr/bin/env python3
"""Compare checked filtered implementations with staged/combined C, C++, Rust."""
import argparse, ctypes, hashlib, json, math, os, platform, random, shutil, statistics, subprocess, time
from pathlib import Path
from run import toolchain
ROOT=Path(__file__).resolve().parents[1]
BUILD=ROOT/'build/filter-proof'
REPORT=ROOT/'reports/filter-proof-phase1'
CASES=['mapped_filter_sum','filter_map_sum','mapped_filter_count','constant_filter_sum']
VARIANTS=['ink_staged','ink_checked','c_staged','c_combined','cpp_staged','cpp_combined','rust_staged','rust_combined']
MASK=(1<<64)-1
COMMANDS=[]
def invoke(args,**kw):
    args=list(map(str,args));t=time.perf_counter();p=subprocess.run(args,cwd=ROOT,text=True,capture_output=True,**kw)
    COMMANDS.append(dict(argv=args,seconds=time.perf_counter()-t,exit_code=p.returncode,stdout=p.stdout,stderr=p.stderr))
    if p.returncode:raise RuntimeError(f'{args}: {p.stderr}')
    return p.stdout.strip()
def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def reference(case,xs,a,b,limit):
    ys=[(x*a+b)&MASK for x in xs]
    if case=='mapped_filter_sum':return sum(y for y in ys if y<limit)&MASK
    if case=='filter_map_sum':return sum(y for x,y in zip(xs,ys) if x<limit)&MASK
    if case=='mapped_filter_count':return sum(y<limit for y in ys)
    return (b*len(xs)&MASK) if b<limit else 0
def build(env):
    BUILD.mkdir(parents=True,exist_ok=True);REPORT.mkdir(parents=True,exist_ok=True)
    invoke(['cargo','build','--release','--bin','ink'],env=env);lang=ROOT/'target/release/ink'
    invoke(['python3','knowledge/producers/filter_proofs.py','knowledge/research/filtered'])
    source=ROOT/'knowledge/research/filtered/kernels.lang';package=ROOT/'knowledge/research/filtered/proposal.json'
    invoke([lang,'build',source,'--native-cpu','-o',BUILD/'ink_staged.o'])
    invoke([lang,'build',source,'--implementation',package,'--native-cpu','-o',BUILD/'ink_checked.o'])
    # Show independently growing selected proof libraries under a fixed compiler.
    compiler_hash=sha(lang);proposal=json.loads(package.read_text());phases=[]
    for count in range(5):
        directory=BUILD/f'database-{count}';shutil.copytree(ROOT/'knowledge/research/filtered',directory,dirs_exist_ok=True)
        selected=proposal['proposals'][:count];roots=[]
        for p in selected:roots.extend([p['datatype'],*p['from_definitions'],*p['to_definitions'],p['proof']['Use']['theorem']])
        lock=json.loads((directory/'lock.json').read_text());lock['objects']=list(dict.fromkeys(roots));(directory/'lock.json').write_text(json.dumps(lock,indent=2)+'\n')
        revision=dict(proposal,proposals=selected);(directory/'proposal.json').write_text(json.dumps(revision,indent=2)+'\n')
        output=BUILD/f'phase-{count}.o';invoke([lang,'build',source,'--implementation',directory/'proposal.json','--native-cpu','-o',output])
        plan=json.loads(Path(str(output)+'.plan.json').read_text());assert len(plan['checked_implementation']['checked_proposals'])==count
        assert sha(lang)==compiler_hash
        phases.append(dict(replacements=count,selected_roots=len(lock['objects']),closure=len(plan['checked_implementation']['library_closure']),compiler_sha256=compiler_hash,generated_c_sha256=sha(str(output)+'.c')))
    assert phases[0]['generated_c_sha256']==sha(BUILD/'ink_staged.o.c')
    assert len({p['generated_c_sha256'] for p in phases})==5
    (REPORT/'database-growth.json').write_text(json.dumps(phases,indent=2)+'\n')
    cpu='-mcpu=native' if platform.machine()=='arm64' else '-march=native'
    invoke(['clang','-O3',cpu,'-std=c11','-c','bench/filtered/driver.c','-o',BUILD/'driver.o'])
    for language in ('c','cpp'):
        cc='clang' if language=='c' else 'clang++';std='-std=c11' if language=='c' else '-std=c++20';ext='c' if language=='c' else 'cpp'
        for mode in ('staged','combined'):
            variant=f'{language}_{mode}';flags=['-DCOMBINED'] if mode=='combined' else []
            invoke([cc,'-O3',cpu,std,*flags,'-c',f'bench/filtered/baseline.{ext}','-o',BUILD/f'{variant}.o'])
    for mode in ('staged','combined'):
        variant=f'rust_{mode}';flags=['--cfg','combined'] if mode=='combined' else []
        common=['rustc','--edition=2021','-C','opt-level=3','-C','target-cpu=native','-C','panic=abort',*flags,'bench/filtered/baseline.rs']
        invoke([*common,'--crate-type=staticlib','-o',BUILD/f'{variant}.a'],env=env)
        invoke([*common,'--crate-type=cdylib','-o',BUILD/f'{variant}.dylib'],env=env)
    for variant in VARIANTS:
        cc='clang++' if variant.startswith('cpp') else 'clang';obj=BUILD/f'{variant}.a' if variant.startswith('rust') else BUILD/f'{variant}.o'
        invoke([cc,BUILD/'driver.o',obj,'-o',BUILD/variant])
        if not variant.startswith('rust'):invoke([cc,'-dynamiclib',obj,'-o',BUILD/f'{variant}.dylib'])
    return lang,source

def validate():
    rng=random.Random(918244);vectors=[[],[0],[MASK],[0,1,MASK,1<<63,(1<<63)-1]]
    vectors += [[rng.getrandbits(64) for _ in range(rng.randrange(150))] for _ in range(128)]
    vectors += [[rng.randrange(1024) for _ in range(rng.randrange(150))] for _ in range(128)]
    libs={v:ctypes.CDLL(str(BUILD/f'{v}.dylib')) for v in VARIANTS};count=0
    for i,xs in enumerate(vectors):
        a,b=(3,11) if i%3==0 else (rng.getrandbits(64),rng.getrandbits(64))
        buf=(ctypes.c_uint64*max(1,len(xs)))(*xs)
        for case in CASES:
            limit=([0,MASK,512,1<<63][i%4] if i%5 else rng.getrandbits(64));expected=reference(case,xs,a,b,limit)
            for variant,lib in libs.items():
                fn=getattr(lib,'lang_fn_'+case);fn.argtypes=[ctypes.POINTER(ctypes.c_uint64),ctypes.c_size_t,ctypes.c_uint64,ctypes.c_uint64,ctypes.c_uint64];fn.restype=ctypes.c_uint64
                got=fn(buf,len(xs),a,b,limit);assert got==expected,(variant,case,i,got,expected);count+=1
    result=dict(status='passed',seed=918244,fixtures=len(vectors),native_comparisons=count,scope='all eight native variants, empty/full-width/random inputs and scalar captures')
    (REPORT/'validation.json').write_text(json.dumps(result,indent=2)+'\n');return result

def sample(variant,k,n,it,distribution,limit):
    r=json.loads(invoke([BUILD/variant,k,n,it,distribution,limit]));assert r['checksum']==str(int(r['single'])*(it+3)&MASK);return r

def summarise(rows, repeats, quick):
    """Reject incomplete/invalid measurements before computing geometric ratios."""
    sizes=[32,4096,262144] if quick else [32,4096,262144,4194304]
    distributions=['small'] if quick else ['small','full']
    expected={(d,n,c,p) for d in distributions for n in sizes for c in CASES for p in ['none','half','all']}
    medians={};outputs={};seen=set()
    for row in rows:
        key=(row['distribution'],row['size'],row['case'],row['profile'])
        identity=(*key,row['variant'],row['repeat'])
        if key not in expected or row['variant'] not in VARIANTS or not 0<=row['repeat']<repeats or identity in seen:
            raise ValueError(f'unexpected or duplicate measurement: {identity}')
        limit=0 if row['profile']=='none' else MASK if row['profile']=='all' else (1<<63) if row['distribution']=='full' else 512 if row['case']=='filter_map_sum' else 1547
        if row['limit']!=str(limit):
            raise ValueError(f'threshold profile mismatch: {identity}')
        if row['iterations']<=0 or not math.isfinite(row['seconds']) or row['seconds']<=0:
            raise ValueError(f'invalid timing: {identity}')
        ns=row['seconds']*1e9/row['iterations']
        if not math.isclose(ns,row['ns_per_call'],rel_tol=1e-12):
            raise ValueError(f'inconsistent per-call timing: {identity}')
        if row['checksum']!=str(int(row['single'])*(row['iterations']+3)&MASK):
            raise ValueError(f'output checksum mismatch: {identity}')
        if key in outputs and outputs[key]!=row['single']:
            raise ValueError(f'variants disagree: {key}')
        outputs[key]=row['single'];seen.add(identity)
        medians.setdefault(key,{}).setdefault(row['variant'],[]).append(ns)
    if len(rows)!=len(expected)*len(VARIANTS)*repeats:
        raise ValueError('incomplete benchmark matrix')
    cells=[dict(distribution=k[0],size=k[1],case=k[2],profile=k[3],median_ns={v:statistics.median(samples) for v,samples in vs.items()}) for k,vs in medians.items()]
    def ratios(selected):
        def ratio(a,b):return statistics.geometric_mean(c['median_ns'][a]/c['median_ns'][b] for c in selected)
        return dict(cells=len(selected),checked_speedup_vs_staged=ratio('ink_staged','ink_checked'),checked_time_vs_c_combined=ratio('ink_checked','c_combined'),checked_time_vs_cpp_combined=ratio('ink_checked','cpp_combined'),checked_time_vs_rust_combined=ratio('ink_checked','rust_combined'))
    groups={case:ratios([c for c in cells if c['case']==case]) for case in CASES}
    groups['traversals']=ratios([c for c in cells if c['case']!='constant_filter_sum'])
    return dict(samples=len(rows),**ratios(cells),groups=groups,measurements=cells)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--quick',action='store_true');parser.add_argument('--repeats',type=int,default=7);parser.add_argument('--seconds',type=float,default=.02);parser.add_argument('--summarise-only',action='store_true',help='validate and analyse existing raw samples without rebuilding or timing');args=parser.parse_args()
    if args.repeats<3 or args.seconds<=0:parser.error('at least three repeats and a positive batch duration are required')
    if args.summarise_only:
        parameters=json.loads((REPORT/'metadata.json').read_text())['parameters']
        rows=[json.loads(line) for line in (REPORT/'samples.jsonl').read_text().splitlines()]
        summary=summarise(rows,parameters['repeats'],parameters['quick'])
        (REPORT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
        analysis=REPORT/'analysis_sources/bench/filter-proof.py';analysis.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(__file__,analysis)
        (REPORT/'analysis.json').write_text(json.dumps(dict(command=['python3','bench/filter-proof.py','--summarise-only'],samples_sha256=sha(REPORT/'samples.jsonl'),summary_sha256=sha(REPORT/'summary.json'),script=str(analysis.relative_to(REPORT)),script_sha256=sha(analysis),scope='reporting-only reanalysis; measured sources and raw timings retained unchanged'),indent=2)+'\n')
        print(json.dumps({k:v for k,v in summary.items() if k!='measurements'},indent=2));return
    env=toolchain();lang,source=build(env);validation=validate();print('Native validation:',validation,flush=True)
    sizes=[32,4096,262144] if args.quick else [32,4096,262144,4194304]
    distributions=['small'] if args.quick else ['small','full'];rows=[];rng=random.Random(20261009)
    with (REPORT/'samples.jsonl').open('w') as raw:
        for distribution in distributions:
            for n in sizes:
                for k,case in enumerate(CASES):
                    for profile in ['none','half','all']:
                        limit=0 if profile=='none' else MASK if profile=='all' else (1<<63) if distribution=='full' else 512 if k==1 else 1547
                        iterations={};single=None
                        for variant in VARIANTS:
                            calibration=sample(variant,k,n,100 if n<=4096 else 3,distribution,limit)
                            if single is None:single=calibration['single']
                            assert single==calibration['single']
                            # A second batch makes very short/constant-time kernels observable.
                            preliminary=max(1,min(10_000_000,math.ceil(.005/max(1e-12,calibration['seconds']/calibration['iterations']))))
                            calibration=sample(variant,k,n,preliminary,distribution,limit)
                            iterations[variant]=max(1,min(100_000_000,math.ceil(args.seconds/max(1e-12,calibration['seconds']/calibration['iterations']))))
                        for repeat in range(args.repeats):
                            order=VARIANTS[:];rng.shuffle(order)
                            for variant in order:
                                result=sample(variant,k,n,iterations[variant],distribution,limit);assert result['single']==single
                                row=dict(variant=variant,case=case,size=n,distribution=distribution,profile=profile,limit=str(limit),repeat=repeat,**result,ns_per_call=result['seconds']*1e9/result['iterations']);rows.append(row);raw.write(json.dumps(row)+'\n');raw.flush()
                        print(f'Finished {distribution}, n={n}, {case}, {profile}',flush=True)
    summary=summarise(rows,args.repeats,args.quick)
    (REPORT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    archived=REPORT/'artifacts';archived.mkdir(exist_ok=True)
    for name in ['ink_staged.o.c','ink_checked.o.c','ink_staged.o.ll','ink_checked.o.ll','ink_staged.o.plan.json','ink_checked.o.plan.json']:
        shutil.copy2(BUILD/name,archived/name)
    for count in range(5):
        shutil.copytree(BUILD/f'database-{count}',REPORT/f'database-{count}',dirs_exist_ok=True)
        shutil.copy2(BUILD/f'phase-{count}.o.c',archived/f'phase-{count}.c')
        shutil.copy2(BUILD/f'phase-{count}.o.plan.json',archived/f'phase-{count}.plan.json')
    for name in ['core/src/implementation.rs','core/src/logic.rs','core/src/library.rs','lowerings/c/src/native.rs','lowerings/c/src/pure_alloc.c','core/src/check.rs','core/src/eval.rs','src/main.rs','knowledge/producers/filter_proofs.py','tests/implementation.rs','src/bin/ink.rs','Cargo.toml','Cargo.lock','knowledge/producers/collection_proofs.py','knowledge/producers/inductive_proofs.py','bench/filter-proof.py','bench/filtered/baseline.c','bench/filtered/baseline.cpp','bench/filtered/baseline.rs','bench/filtered/driver.c','knowledge/research/filtered/kernels.lang']:
        dest=REPORT/'sources'/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/name,dest)
    metadata=dict(platform=platform.platform(),machine=platform.machine(),processor=platform.processor(),cpu=invoke(['sysctl','-n','machdep.cpu.brand_string']),memory_bytes=invoke(['sysctl','-n','hw.memsize']),clang=invoke(['clang','--version']),rustc=invoke(['rustc','-vV'],env=env),compiler_sha256=sha(lang),parameters=vars(args),seed=20261009,commands=COMMANDS,source_hashes={str(p.relative_to(REPORT)):sha(p) for p in (REPORT/'sources').rglob('*') if p.is_file()},scope='warm single-threaded macOS ARM64 native calls; modular u64; fresh intermediate allocation included; no LTO; no durability/stateful claim')
    (REPORT/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k!='measurements'},indent=2),flush=True)
if __name__=='__main__':main()
