#!/usr/bin/env python3
"""Check arithmetic database growth, native results and scalar ABI timings.

This is deliberately a call-overhead benchmark, not a claim about applications.
Proof production is separate; installed certificates are independently checked.
"""
import argparse, ctypes, hashlib, json, math, platform, random, re, shutil, statistics, subprocess, time
from pathlib import Path
from run import toolchain

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / 'build/bitvector-proof'
REPORT = ROOT / 'reports/bitvector-proof-phase1'
CASES = ['add_zero','subtract_self','add_commute','cancel_add','multiply_zero','unsigned_reflexive','unsigned_maximum','choose_equal']
VARIANTS = ['ink_baseline','ink_checked','c','cpp','rust']
MASK = (1 << 64) - 1
COMMANDS = []

def invoke(args, **kw):
    args = list(map(str,args)); start = time.perf_counter()
    r = subprocess.run(args,cwd=ROOT,text=True,capture_output=True,**kw)
    COMMANDS.append(dict(argv=args,seconds=time.perf_counter()-start,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
    if r.returncode: raise RuntimeError(f'{args}: {r.stderr}')
    return r.stdout.strip()

def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def reference(case,x,y):
    if case in ('subtract_self','multiply_zero'): return 0
    if case in ('unsigned_reflexive','unsigned_maximum'): return 1
    return ((x+y)&MASK) if case == 'add_commute' else x

def driver_inputs(distribution):
    seed = 123456789; pairs=[]
    def next_value():
        nonlocal seed
        seed ^= (seed << 13)&MASK; seed ^= seed >> 7; seed ^= (seed << 17)&MASK
        return seed if distribution == 'full' else seed & 1023
    for _ in range(256): pairs.append((next_value(),next_value()))
    return pairs

def expected_checksum(case,distribution,iterations):
    values = [reference(case,x,y) for x,y in driver_inputs(distribution)]
    cycles,remainder=divmod(iterations,256)
    return (sum(values[:3])+cycles*sum(values)+sum(values[:remainder]))&MASK

def assembly(path):
    functions={}; current=None
    for line in invoke(['otool','-tvV',path]).splitlines():
        match=re.fullmatch(r'_lang_fn_(\w+):',line)
        if match:
            current=match[1] if match[1] in CASES else None
            if current: functions[current]=[]
        elif line.endswith(':'): current=None
        elif current and re.match(r'^[0-9a-f]{16}\s',line):
            functions[current].append(re.sub(r'^[0-9a-f]{16}\s+','',line))
    # Mach-O aliases may share a function body. Record exact tool output as well
    # as this limited comparison, and fail rather than invent missing functions.
    if set(functions)!=set(CASES): raise ValueError(f'incomplete disassembly: {path}: {functions.keys()}')
    return functions

def build(env):
    BUILD.mkdir(parents=True,exist_ok=True); REPORT.mkdir(parents=True,exist_ok=True)
    invoke(['cargo','build','--release','--bin','ink'],env=env); compiler=ROOT/'target/release/ink'
    compiler_hash=sha(compiler); source=ROOT/'knowledge/bitvector/kernels.ink'; package=ROOT/'knowledge/bitvector/proposal.json'
    invoke([compiler,'verify-library',ROOT/'knowledge/bitvector/lock.json'])
    for variant in VARIANTS[:2]:
        args=['--implementation',package] if variant=='ink_checked' else []
        invoke([compiler,'build',source,'--native-cpu',*args,'-o',BUILD/f'{variant}.o'])
    cpu='-mcpu=native' if platform.machine()=='arm64' else '-march=native'
    for variant,cc,ext,std in [('c','clang','c','c11'),('cpp','clang++','cpp','c++20')]:
        # Baseline identities intentionally trigger tautological-compare warnings.
        invoke([cc,'-O3',cpu,f'-std={std}','-c',f'bench/arithmetic/baseline.{ext}','-o',BUILD/f'{variant}.o'])
        invoke([cc,'-O3',cpu,f'-std={std}','-S','-emit-llvm',f'bench/arithmetic/baseline.{ext}','-o',BUILD/f'{variant}.ll'])
    invoke(['rustc','--edition=2021','--crate-type=lib','--emit=obj','-C','opt-level=3','-C','target-cpu=native','-C','panic=abort','bench/arithmetic/baseline.rs','-o',BUILD/'rust.o'],env=env)
    invoke(['rustc','--edition=2021','--crate-type=lib','--emit=llvm-ir','-C','opt-level=3','-C','target-cpu=native','-C','panic=abort','bench/arithmetic/baseline.rs','-o',BUILD/'rust.ll'],env=env)
    for part in ['adapter','driver']:
        invoke(['clang','-O3',cpu,'-std=c11','-Wall','-Wextra','-Werror','-c',f'bench/arithmetic/{part}.c','-o',BUILD/f'{part}.o'])
    for variant in VARIANTS:
        invoke(['clang',BUILD/'driver.o',BUILD/'adapter.o',BUILD/f'{variant}.o','-o',BUILD/variant])
        invoke(['clang','-dynamiclib',BUILD/'adapter.o',BUILD/f'{variant}.o','-o',BUILD/f'{variant}.dylib'])
    before=assembly(BUILD/'ink_baseline.o'); after=assembly(BUILD/'ink_checked.o')
    (REPORT/'assembly.json').write_text(json.dumps(dict(baseline=before,checked=after,identical_cases=[c for c in CASES if before[c]==after[c]],instruction_counts={c:dict(baseline=len(before[c]),checked=len(after[c])) for c in CASES}),indent=2)+'\n')
    # Grow an independently pinned database without rebuilding or regenerating
    # a compiler. Select only the roots needed by each proposal prefix.
    full=json.loads(package.read_text()); revisions=[]
    for count in range(len(full['proposals'])+1):
        directory=BUILD/f'database-{count}'; (directory/'objects').mkdir(parents=True,exist_ok=True)
        selected=full['proposals'][:count]; ids=sorted({p['datatype'] for p in selected}|{p['proof']['Use']['theorem'] for p in selected})
        for identity in ids: shutil.copy2(ROOT/'knowledge/bitvector/objects'/f'{identity}.json',directory/'objects'/f'{identity}.json')
        (directory/'lock.json').write_text(json.dumps(dict(schema=1,semantics='first-order-inductive-equality-v1',objects=ids),indent=2)+'\n')
        (directory/'proposal.json').write_text(json.dumps(dict(**{k:v for k,v in full.items() if k!='proposals'},proposals=selected),indent=2)+'\n')
        out=BUILD/f'phase-{count}.c'; invoke([compiler,'emit-c',source,'--implementation',directory/'proposal.json','-o',out])
        plan=json.loads(Path(str(out)+'.plan.json').read_text()); assert len(plan['checked_implementation']['checked_proposals'])==count
        assert sha(compiler)==compiler_hash
        revisions.append(dict(proposals=count,closure=len(plan['checked_implementation']['library_closure']),compiler_sha256=compiler_hash,generated_c_sha256=sha(out)))
    assert len({r['generated_c_sha256'] for r in revisions})==9
    assert sha(BUILD/'phase-0.c')==sha(BUILD/'ink_baseline.o.c')
    assert sha(BUILD/'phase-8.c')==sha(BUILD/'ink_checked.o.c')
    (REPORT/'database-extension.json').write_text(json.dumps(dict(revisions=revisions,empty_matches_baseline=True,all_match_one_compiler=True),indent=2)+'\n')
    # Fresh child processes, warm filesystem: include parsing/checking/I/O and
    # process startup. This is not the solver's one-time production cost.
    checking=[]
    for repeat in range(7):
        for mode in ['verify_library','emit_baseline','emit_checked']:
            args=[compiler,'verify-library',ROOT/'knowledge/bitvector/lock.json'] if mode=='verify_library' else [compiler,'emit-c',source,*(['--implementation',package] if mode=='emit_checked' else []),'-o',BUILD/'cost.c']
            invoke(args); checking.append(dict(repeat=repeat,mode=mode,seconds=COMMANDS[-1]['seconds']))
    (REPORT/'checking-cost.json').write_text(json.dumps(dict(samples=checking,median_seconds={m:statistics.median(r['seconds'] for r in checking if r['mode']==m) for m in ['verify_library','emit_baseline','emit_checked']},scope='fresh child process and warm filesystem; includes startup, parsing, certificate checking and I/O; no SAT proof production or Clang'),indent=2)+'\n')
    return compiler

def validate():
    rng=random.Random(601731); boundary=[0,1,2,MASK,MASK-1,1<<63,(1<<63)-1]
    pairs=[(x,y) for x in boundary for y in boundary]+[(rng.getrandbits(64),rng.getrandbits(64)) for _ in range(1024)]
    libs={v:ctypes.CDLL(str(BUILD/f'{v}.dylib')) for v in VARIANTS}; checks=0
    for variant,lib in libs.items():
        for case in CASES:
            fn=getattr(lib,'bench_fn_'+case);fn.argtypes=[ctypes.c_uint64,ctypes.c_uint64];fn.restype=ctypes.c_uint64
            for x,y in pairs:
                result=fn(x,y); assert result==reference(case,x,y),(variant,case,x,y,result); checks+=1
    result=dict(status='passed',seed=601731,fixtures=len(pairs),native_comparisons=checks,scope='five variants, all eight scalar functions, 49 boundary pairs and 1024 full-width random pairs')
    (REPORT/'validation.json').write_text(json.dumps(result,indent=2)+'\n');return result

def sample(variant,case,distribution,iterations):
    result=json.loads(invoke([BUILD/variant,CASES.index(case),iterations,distribution]))
    assert result['iterations']==iterations
    assert int(result['checksum'])==expected_checksum(case,distribution,iterations)
    assert int(result['cycle'])==(sum(reference(case,x,y) for x,y in driver_inputs(distribution))&MASK)
    return result

def summarise(rows,repeats):
    expected={(c,d,v,r) for c in CASES for d in ['small','full'] for v in VARIANTS for r in range(repeats)};seen=set();cells={}
    for row in rows:
        key=(row['case'],row['distribution'],row['variant'],row['repeat'])
        if key not in expected or key in seen: raise ValueError(f'unexpected/duplicate sample {key}')
        seen.add(key)
        if not math.isfinite(row['seconds']) or row['seconds']<=0 or row['iterations']<=0: raise ValueError('invalid timing')
        assert math.isclose(row['ns_per_call'],row['seconds']*1e9/row['iterations'],rel_tol=1e-12)
        assert int(row['checksum'])==expected_checksum(row['case'],row['distribution'],row['iterations'])
        cells.setdefault((row['case'],row['distribution']),{}).setdefault(row['variant'],[]).append(row['ns_per_call'])
    if seen!=expected: raise ValueError('incomplete sample matrix')
    measurements=[dict(case=k[0],distribution=k[1],median_ns={v:statistics.median(vs[v]) for v in VARIANTS},min_max_ns={v:[min(vs[v]),max(vs[v])] for v in VARIANTS}) for k,vs in cells.items()]
    ratio=lambda a,b: statistics.geometric_mean(c['median_ns'][a]/c['median_ns'][b] for c in measurements)
    return dict(samples=len(rows),cells=len(measurements),checked_speedup_vs_baseline=ratio('ink_baseline','ink_checked'),checked_time_vs_c=ratio('ink_checked','c'),checked_time_vs_cpp=ratio('ink_checked','cpp'),checked_time_vs_rust=ratio('ink_checked','rust'),measurements=measurements)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--repeats',type=int,default=7);parser.add_argument('--seconds',type=float,default=.025);args=parser.parse_args()
    if args.repeats<3 or not 0<args.seconds<=1: parser.error('at least three repetitions and 0 < seconds <= 1 required')
    env=toolchain(); compiler=build(env);validation=validate();print('Native validation:',validation,flush=True)
    rows=[];rng=random.Random(20261009)
    with (REPORT/'samples.jsonl').open('w') as raw:
        for case in CASES:
            for distribution in ['small','full']:
                iterations={}
                for variant in VARIANTS:
                    initial=sample(variant,case,distribution,100_000)
                    count=max(1,min(100_000_000,math.ceil(args.seconds/(initial['seconds']/initial['iterations']))))
                    iterations[variant]=count
                for repeat in range(args.repeats):
                    order=VARIANTS[:];rng.shuffle(order)
                    for variant in order:
                        result=sample(variant,case,distribution,iterations[variant]);row=dict(case=case,distribution=distribution,variant=variant,repeat=repeat,**result,ns_per_call=result['seconds']*1e9/result['iterations'])
                        rows.append(row);raw.write(json.dumps(row)+'\n');raw.flush()
                print('Finished',case,distribution,flush=True)
    summary=summarise(rows,args.repeats);(REPORT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    for count in range(9): shutil.copytree(BUILD/f'database-{count}',REPORT/f'database-{count}',dirs_exist_ok=True)
    artifacts=REPORT/'artifacts';artifacts.mkdir(exist_ok=True)
    for path in BUILD.iterdir():
        if path.is_file() and (path.name.endswith(('.o.c','.o.ll','.o.plan.json','.c.plan.json','.ll')) or path.name.startswith('phase-') and path.suffix=='.c'): shutil.copy2(path,artifacts/path.name)
    paths=['Cargo.toml','Cargo.lock','dev.py','src/lib.rs','src/logic.rs','src/bitproof.rs','src/main.rs','src/bin/ink.rs','src/library.rs','src/knowledge.rs','src/implementation.rs','src/native.rs','src/pure_alloc.c','src/syntax.rs','src/check.rs','src/eval.rs','src/proof.rs','src/equality.rs','tests/bitproof.rs','bench/bitvector-proof.py','bench/run.py','tools/bitvector_proofs.py']
    paths += [str(p.relative_to(ROOT)) for p in (ROOT/'bench/arithmetic').glob('*') if p.is_file()]
    # Keep subsequent runs self-contained for compiler inspection/reconstruction,
    # including modules not executed by these pure arithmetic kernels.
    paths = sorted(set(paths) | {str(p.relative_to(ROOT)) for p in (ROOT/'src').rglob('*') if p.is_file()})
    for relative in paths:
        dest=REPORT/'sources'/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(ROOT/relative,dest)
    shutil.copytree(ROOT/'knowledge/bitvector',REPORT/'knowledge',dirs_exist_ok=True)
    metadata=dict(platform=platform.platform(),machine=platform.machine(),cpu=invoke(['sysctl','-n','machdep.cpu.brand_string']),memory_bytes=invoke(['sysctl','-n','hw.memsize']),clang=invoke(['clang','--version']),rustc=invoke(['rustc','-vV'],env=env),compiler_sha256=sha(compiler),parameters=vars(args),seed=20261009,commands=COMMANDS,source_hashes={str(p.relative_to(REPORT)):sha(p) for p in (REPORT/'sources').rglob('*') if p.is_file()},scope='warm single-threaded scalar ABI call benchmark over 256 resident input pairs; common separately compiled driver and adapters; no LTO; call/loop overhead dominates; no general-purpose language ranking')
    (REPORT/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k!='measurements'},indent=2),flush=True)

if __name__=='__main__':main()
