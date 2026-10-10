#!/usr/bin/env python3
"""Real compiled signed-Int table/cache updates with an independent integer oracle."""
import argparse, ctypes, hashlib, importlib.util, json, math, random, shutil, statistics, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('state_bench',ROOT/'bench/state/run.py')
state=importlib.util.module_from_spec(spec);spec.loader.exec_module(state)
BUILD=ROOT/'build/wide-cache-bench';OUT=ROOT/'reports/wide-cache-phase1'
VARIANTS=['cloned','borrowed','delta','rust_bigint'];MASK=(1<<64)-1
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def values(bits,profile):
    anchor=1<<bits;return [((-1)**(i%2))*((anchor if profile else 0)+i*37+11) for i in range(32)]
def observation(bits,value,steps):return dict(version=2+steps,rows=[str(1<<bits),str(value)],total=str((1<<bits)+value))
def digest(value):
    h=int(value<0);value=abs(value)
    while value:h=((h*1099511628211)&MASK)^(value&MASK);value>>=64
    return h
def oracle(bits,profile,steps,qpu):
    random=76231749;check=0;inputs=values(bits,profile);value=0
    for _ in range(steps):
        random^=(random<<13)&MASK;random^=random>>7;random^=(random<<17)&MASK
        value=inputs[random%32];check=(check*1099511628211)&MASK
        for _ in range(qpu):check=((check*1099511628211)+digest((1<<bits)+value))&MASK
    return dict(checksum=str(check),observation=observation(bits,value,steps))
def build(env):
    BUILD.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    original=ROOT/'build/cache-lowering-original/lang';extension=json.loads((original.parent/'proof-extension.json').read_text())
    assert sha(original)==extension['compiler_sha256'],'original compiler required for cloned source replay'
    current=ROOT/'target/release/lang'
    # Caller builds current compiler once; this harness never replaces the
    # recorded original compiler to simulate an unchanged-core extension.
    state.run(['clang','-O3','-std=c11','-Wall','-Wextra','-Werror','-c',ROOT/'bench/wide-cache/driver.c','-o',BUILD/'driver.o'])
    native=env.copy();native['RUSTFLAGS']='-C target-cpu=native -C panic=abort';native['CARGO_TARGET_DIR']=str(BUILD/'rust-target')
    artifacts={}
    for variant in VARIANTS:
        project=BUILD/(variant+'-project');(project/'src').mkdir(parents=True,exist_ok=True)
        if variant=='rust_bigint':
            (project/'src/lib.rs').write_text('use std::collections::BTreeMap;\nuse num_bigint::BigInt;\nuse serde_json::json;\n')
            (project/'Cargo.toml').write_text('[package]\nname="compiled-state"\nversion="0.1.0"\nedition="2021"\n[lib]\ncrate-type=["staticlib","cdylib"]\n[features]\nbaseline=[]\n[dependencies]\nnum-bigint="=0.4.8"\nserde_json="=1.0.151"\n[profile.release]\nlto=false\ncodegen-units=1\n')
        else:
            compiler=original if variant=='cloned' else current
            cert=ROOT/('knowledge/research/delta-maintenance/delta.json' if variant=='delta' else 'knowledge/research/exact-maintenance/canonical.json')
            state.run([compiler,'emit-state','bench/wide-cache/program.ink','-o',project,'--maintenance',cert])
            manifest=(project/'Cargo.toml').read_text().replace('crate-type = ["rlib", "cdylib"]','crate-type = ["staticlib", "cdylib"]').replace('lto = "thin"','lto = false')
            (project/'Cargo.toml').write_text(manifest+'\n[features]\nbaseline=[]\n')
        with (project/'src/lib.rs').open('a') as f:f.write((ROOT/'bench/wide-cache/wrapper.rs').read_text())
        state.run(['cargo','build','--release','--offline','--lib','--manifest-path',project/'Cargo.toml']+(['--features','baseline'] if variant=='rust_bigint' else []),native)
        for suffix in ['a','dylib']:shutil.copyfile(BUILD/f'rust-target/release/libcompiled_state.{suffix}',BUILD/f'{variant}.{suffix}')
        state.run(['clang',BUILD/'driver.o',BUILD/f'{variant}.a','-liconv','-o',BUILD/variant])
        for file in ['src/lib.rs','Cargo.toml','Cargo.lock','plan.json']:
            path=project/file
            if path.exists():
                dest=OUT/variant/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,dest);artifacts[str(dest.relative_to(OUT))]=sha(dest)
    return artifacts,dict(original=sha(original),current=sha(current))
def validate():
    ptr=ctypes.c_void_p;u32=ctypes.c_uint32;checks=0;fixtures=[]
    for variant in VARIANTS:
        lib=ctypes.CDLL(str(BUILD/f'{variant}.dylib'))
        for name,args,result in [('wide_new',[u32,u32],ptr),('wide_set',[ptr,u32],u32),('wide_observe',[ptr],ptr),('wide_string_free',[ptr],None),('wide_free',[ptr],None),('wide_query',[ptr],ctypes.c_uint64)]:
            getattr(lib,name).argtypes=args;getattr(lib,name).restype=result
        for bits in [64,512,4096,8192]:
            for profile in [0,1]:
                context=lib.wide_new(bits,profile);inputs=values(bits,profile)
                try:
                    for step in range(128):
                        index=(step*19)%32;assert lib.wide_set(context,index)==0
                        raw=lib.wide_observe(context)
                        try:got=json.loads(ctypes.string_at(raw))
                        finally:lib.wide_string_free(raw)
                        want=observation(bits,inputs[index],step+1);assert got==want,(variant,bits,profile,step)
                        assert lib.wide_query(context)==digest((1<<bits)+inputs[index]);checks+=1
                    if variant=='delta':fixtures.append(dict(bits=bits,profile=profile,observation=want))
                finally:lib.wide_free(context)
    data=dict(status='passed',native_observation_comparisons=checks,variants=VARIANTS,
              bits=[64,512,4096,8192],profiles=['small changing row','wide signed changing row'],
              checks=['signed exact total','both table rows','version','full signed digest','return status'],fixtures=fixtures)
    (OUT/'correctness.json').write_text(json.dumps(data,indent=2)+'\n');return data
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--repeats',type=int,default=7);parser.add_argument('--steps',type=int,default=30000);args=parser.parse_args()
    if args.repeats<3 or not 1<=args.steps<=10000000:parser.error('at least 3 repeats and 1..10000000 steps required')
    started=time.time();env=state.environment();state.BUILD=BUILD;state.OUT=OUT
    paths=[p for folder in ['src','core/src','runtime/src','runtime/hosts','lowerings/c/src','lowerings/rust/src','lowerings/wasm/src','lowerings/gpu/src','lowerings/gpu/devices','lowerings/gpu/shaders','bench/wide-cache','knowledge/research/delta-maintenance','knowledge/research/exact-maintenance'] for p in (ROOT/folder).rglob('*') if p.is_file()]
    paths+=[ROOT/p for p in ['Cargo.toml','Cargo.lock','bench/wide-cache.py','knowledge/producers/delta_maintenance_proofs.py']]
    sources={str(p.relative_to(ROOT)):sha(p) for p in paths}
    artifacts,compilers=build(env);correctness=validate();print('Correctness:',correctness['native_observation_comparisons'],flush=True)
    rows=[];rnd=random.Random(1973264)
    for bits in [64,512,4096,8192]:
        for profile in [0,1]:
            for qpu in [0,1]:
                want=oracle(bits,profile,args.steps,qpu)
                for repeat in range(args.repeats):
                    order=VARIANTS.copy();rnd.shuffle(order)
                    for variant in order:
                        sample=json.loads(state.run([BUILD/variant,bits,profile,args.steps,qpu]))
                        assert {k:sample[k] for k in want}==want,(variant,bits,profile,qpu)
                        rows.append(dict(variant=variant,bits=bits,profile=profile,queries_per_update=qpu,repeat=repeat,ns_per_step=sample['seconds']*1e9/args.steps,**sample))
                group=[r for r in rows if (r['bits'],r['profile'],r['queries_per_update'])==(bits,profile,qpu)]
                print(f'{bits=} {profile=} {qpu=}: '+', '.join(f'{v} {statistics.median(r["ns_per_step"] for r in group if r["variant"]==v):.1f} ns' for v in VARIANTS),flush=True)
                (OUT/'samples.json').write_text(json.dumps(rows,indent=2)+'\n')
    for path,want in sources.items():
        assert sha(ROOT/path)==want,path;dest=OUT/'sources'/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/path,dest)
    metadata=dict(status='passed',parameters=vars(args),seconds=time.time()-started,compiler_sha256=compilers,source_sha256=sources,artifact_sha256=artifacts,
                  binary_sha256={str(p.relative_to(BUILD)):sha(p) for v in VARIANTS for p in [BUILD/v,BUILD/f'{v}.dylib']},
                  correctness=correctness,toolchains=dict(rustc=state.run(['rustc','-vV'],env),clang=state.run(['clang','--version']),cpu=state.run(['sysctl','-n','machdep.cpu.brand_string'])),commands=state.COMMANDS)
    (OUT/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n');write_report(rows)
def write_report(rows):
    cells=sorted({(r['bits'],r['profile'],r['queries_per_update']) for r in rows});medians={c:{v:statistics.median(r['ns_per_step'] for r in rows if (r['bits'],r['profile'],r['queries_per_update'])==c and r['variant']==v) for v in VARIANTS} for c in cells}
    geo=lambda ratios:math.exp(statistics.mean(map(math.log,ratios)))
    summary=dict(samples=len(rows),cells=len(cells),cloned_time_divided_by_borrowed=geo([m['cloned']/m['borrowed'] for m in medians.values()]),
                 borrowed_time_divided_by_delta=geo([m['borrowed']/m['delta'] for m in medians.values()]),delta_time_divided_by_rust=geo([m['delta']/m['rust_bigint'] for m in medians.values()]),
                 delta_ratios_by_profile={str(profile):geo([m['borrowed']/m['delta'] for c,m in medians.items() if c[1]==profile]) for profile in [0,1]})
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    lines=['# Wide signed-Int cache updates','',
           'A real Ink program maintains an exact sum over a two-row table. One row is a fixed `2^bits` anchor; the other changes among 32 preconstructed signed inputs. The small profile changes by small values, while the wide profile changes by ±(`2^bits` + small value), crossing zero and sign boundaries. Prepared inputs and initial state are outside timing. The typed update argument is cloned in each wrapper, including Rust.','',
           'Cloned is generated by the pinned original compiler; borrowed and delta use the new base lowering. Canonical replacement is `total - old + new`; delta is `total + (new - old)`, selected only with its checked database proofs. No interpreter, JSON or decimal conversion runs in timed Ink code. All variants maintain the sum. The handwritten Rust BigInt baseline uses BTreeMap, delta-first in-place maintenance and validation before mutation. It omits the generated undo journal and reads the total directly for the digest; those differences are real remaining compiler costs.','',
           'The common separately compiled C driver measures 30,000 attempted updates per sample by default, with seven samples per cell and random variant order. Optional queries include exact signed digest conversion. Complete state, versions and consumed checksums are validated against independent Python integers for every timed sample. Native ABI validation also checks every update in 128-step sequences over both profiles and four widths: 4,096 comparisons. This benchmark has no events or failing changes; separate integration tests cover abort, events and future checkpoints.','',
           'This is a two-row, warm, single-threaded microbenchmark of a compiled stateful application, not a universal language comparison. The C/C++ comparison remains in the companion inventory report; this arbitrary-precision workload compares with Rust BigInt. No cross-ABI LTO, no CPU pinning or isolated-machine claim.','',
           '| Anchor exponent | Changing row | Queries/update | Cloned ns | Borrowed ns | Delta ns | Rust BigInt ns | Borrowed/delta time |',
           '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |']
    for (bits,profile,qpu),m in medians.items():lines.append(f'| {bits} | {"wide signed" if profile else "small signed"} | {qpu} | '+' | '.join(f'{m[v]:.1f}' for v in VARIANTS)+f' | {m["borrowed"]/m["delta"]:.3f}× |')
    lines+=['',f"Geometric means across {len(cells)} cells: cloned/borrowed = {summary['cloned_time_divided_by_borrowed']:.3f}×; borrowed/delta = {summary['borrowed_time_divided_by_delta']:.3f}×; delta/Rust = {summary['delta_time_divided_by_rust']:.3f}×. Profile-specific borrowed/delta ratios: small = {summary['delta_ratios_by_profile']['0']:.3f}×, wide = {summary['delta_ratios_by_profile']['1']:.3f}×.",'',
           'Equality proves safety, not speed. Ratios close to one can be noise; an optimiser must measure each data profile and retain safe alternatives instead of permanently preferring a syntactically simpler expression. Full state-transition/representation verification, adaptive selection and the broader language requirements remain unfinished.','',
           '[Raw samples](samples.json), [correctness](correctness.json), [metadata](metadata.json), [summary](summary.json).']
    (OUT/'REPORT.md').write_text('\n'.join(lines)+'\n')
if __name__=='__main__':main()
