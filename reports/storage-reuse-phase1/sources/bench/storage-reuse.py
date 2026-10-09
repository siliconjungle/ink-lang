#!/usr/bin/env python3
"""Measure ownership lowering with unchanged checked maintenance expressions."""
import argparse, ctypes, hashlib, importlib.util, json, math, random, shutil, statistics, time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('wide',ROOT/'bench/wide-cache.py')
wide=importlib.util.module_from_spec(spec);spec.loader.exec_module(wide)
state=wide.state
BUILD=ROOT/'build/storage-reuse-bench';OUT=ROOT/'reports/storage-reuse-phase1'
VARIANTS=['old_snapshot','old_journal','snapshot','journal','rust_bigint']
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def build(env):
    BUILD.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    state.BUILD=BUILD;state.OUT=OUT;wide.BUILD=BUILD;wide.OUT=OUT;wide.VARIANTS=VARIANTS
    state.run(['clang','-O3','-std=c11','-Wall','-Wextra','-Werror','-c',ROOT/'bench/wide-cache/driver.c','-o',BUILD/'driver.o'])
    native=env.copy();native['RUSTFLAGS']='-C target-cpu=native -C panic=abort';native['CARGO_TARGET_DIR']=str(BUILD/'target')
    artifacts={}
    for variant in VARIANTS:
        project=BUILD/(variant+'-project');(project/'src').mkdir(parents=True,exist_ok=True)
        if variant=='rust_bigint':
            shutil.copyfile(ROOT/'reports/wide-cache-phase1/rust_bigint/src/lib.rs',project/'src/lib.rs')
            shutil.copyfile(ROOT/'reports/wide-cache-phase1/rust_bigint/Cargo.toml',project/'Cargo.toml')
            shutil.copyfile(ROOT/'reports/wide-cache-phase1/rust_bigint/Cargo.lock',project/'Cargo.lock')
        else:
            cert=ROOT/('knowledge/reversible-maintenance/reversible.json' if variant.endswith('journal') else 'knowledge/reversible-maintenance/snapshot.json')
            compiler=ROOT/('build/storage-original/lang' if variant.startswith('old_') else 'target/release/lang')
            state.run([compiler,'emit-state','bench/wide-cache/program.ink','-o',project,'--maintenance',cert])
            manifest=(project/'Cargo.toml').read_text().replace('crate-type = ["rlib", "cdylib"]','crate-type = ["staticlib", "cdylib"]').replace('lto = "thin"','lto = false')
            (project/'Cargo.toml').write_text(manifest+'\n[features]\nbaseline=[]\n')
            with (project/'src/lib.rs').open('a') as f:f.write((ROOT/'bench/wide-cache/wrapper.rs').read_text())
        state.run(['cargo','build','--release','--offline','--lib','--manifest-path',project/'Cargo.toml']+(['--features','baseline'] if variant=='rust_bigint' else []),native)
        for suffix in ['a','dylib']:shutil.copyfile(BUILD/f'target/release/libcompiled_state.{suffix}',BUILD/f'{variant}.{suffix}')
        state.run(['clang',BUILD/'driver.o',BUILD/f'{variant}.a','-liconv','-o',BUILD/variant])
        for file in ['src/lib.rs','Cargo.toml','Cargo.lock','plan.json']:
            path=project/file
            if path.exists():
                dest=OUT/variant/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,dest);artifacts[str(dest.relative_to(OUT))]=sha(dest)
    return artifacts
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--repeats',type=int,default=7);parser.add_argument('--steps',type=int,default=30000);args=parser.parse_args()
    if args.repeats<3 or not 1<=args.steps<=10000000:parser.error('at least 3 repeats and 1..10000000 steps required')
    paths=[p for folder in ['src','bench/wide-cache','bench/state','knowledge/delta-maintenance','knowledge/reversible-maintenance'] for p in (ROOT/folder).rglob('*') if p.is_file()]
    paths += [ROOT/p for p in ['Cargo.toml','Cargo.lock','bench/storage-reuse.py','bench/wide-cache.py','tools/reversible_maintenance_proofs.py','tests/database_maintenance.rs','reports/wide-cache-phase1/rust_bigint/src/lib.rs','reports/wide-cache-phase1/rust_bigint/Cargo.toml','reports/wide-cache-phase1/rust_bigint/Cargo.lock']]
    sources={str(p.relative_to(ROOT)):sha(p) for p in paths};started=time.time();env=state.environment()
    artifacts=build(env);correctness=wide.validate();print('Correctness:',correctness['native_observation_comparisons'],flush=True)
    rows=[];rnd=random.Random(817234)
    for bits in [64,512,4096,8192]:
        for profile in [0,1]:
            for qpu in [0,1]:
                want=wide.oracle(bits,profile,args.steps,qpu)
                for repeat in range(args.repeats):
                    order=VARIANTS.copy();rnd.shuffle(order)
                    for variant in order:
                        sample=json.loads(state.run([BUILD/variant,bits,profile,args.steps,qpu]))
                        assert {k:sample[k] for k in want}==want
                        rows.append(dict(variant=variant,bits=bits,profile=profile,queries_per_update=qpu,repeat=repeat,ns_per_step=sample['seconds']*1e9/args.steps,**sample))
                cell=[r for r in rows if (r['bits'],r['profile'],r['queries_per_update'])==(bits,profile,qpu)]
                print(f'{bits=} {profile=} {qpu=}: '+', '.join(f'{v} {statistics.median(r["ns_per_step"] for r in cell if r["variant"]==v):.1f} ns' for v in VARIANTS),flush=True)
                (OUT/'samples.json').write_text(json.dumps(rows,indent=2)+'\n')
    for path,want in sources.items():
        assert sha(ROOT/path)==want,path;dest=OUT/'sources'/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/path,dest)
    metadata=dict(status='passed',parameters=vars(args),seconds=time.time()-started,compiler_sha256=dict(original=sha(ROOT/'build/storage-original/lang'),current=sha(ROOT/'target/release/lang')),source_sha256=sources,artifact_sha256=artifacts,
        binary_sha256={str(p.relative_to(BUILD)):sha(p) for v in VARIANTS for p in [BUILD/v,BUILD/f'{v}.dylib']},correctness=correctness,
        toolchains=dict(rustc=state.run(['rustc','-vV'],env),clang=state.run(['clang','--version']),cpu=state.run(['sysctl','-n','machdep.cpu.brand_string'])),commands=state.COMMANDS)
    (OUT/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n');write_report(rows)
def write_report(rows):
    cells=sorted({(r['bits'],r['profile'],r['queries_per_update']) for r in rows})
    medians={c:{v:statistics.median(r['ns_per_step'] for r in rows if (r['bits'],r['profile'],r['queries_per_update'])==c and r['variant']==v) for v in VARIANTS} for c in cells}
    geo=lambda xs:math.exp(statistics.mean(map(math.log,xs)))
    summary=dict(samples=len(rows),cells=len(cells),old_journal_divided_by_journal=geo([m['old_journal']/m['journal'] for m in medians.values()]),
        old_snapshot_divided_by_snapshot=geo([m['old_snapshot']/m['snapshot'] for m in medians.values()]),journal_divided_by_rust=geo([m['journal']/m['rust_bigint'] for m in medians.values()]),
        ratios_by_profile={str(p):geo([m['old_journal']/m['journal'] for c,m in medians.items() if c[1]==p]) for p in [0,1]})
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    lines=['# Integer storage reuse measurements','',
        'The same two-row signed-Int application and same checked version-3 certificates are emitted by the preserved previous compiler and the new compiler. Old/new snapshot variants select the database full-total snapshot; old/new journal variants select the database reversible difference. The base lowering now moves the cached integer into its final use, allowing num-bigint to reuse capacity. Earlier uses copy it. The source expression tree and arithmetic order are unchanged; no new algebraic rewrite law or proof checker is introduced.','',
        'All timed Ink variants still use source-generated actions, transactions and cache journals. The handwritten Rust baseline is the same archived BTreeMap/BigInt program with validation before mutation and in-place delta maintenance, without an undo journal. Its query digests read the total directly, while Ink returns an owned Int. Those differences remain part of the comparison.','',
        'Prepared signed inputs and initial state are outside timing. A common separately compiled C driver performs 30,000 updates per sample by default, seven repetitions and randomized variant order. Each cell has zero or one digest query per update. Every timed outcome is checked against independent Python integers; native ABI validation additionally checks 128 updates for every width/profile/variant. No cross-ABI LTO, CPU pinning or isolated-machine claim. Allocation counts come from separate instrumented builds.','',
        '| Anchor exponent | Profile | Queries/update | Old snapshot ns | Old journal ns | Snapshot ns | Journal ns | Rust ns | Old/new journal |',
        '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
    for (bits,p,qpu),m in medians.items():lines.append(f'| {bits} | {"wide signed" if p else "small signed"} | {qpu} | '+ ' | '.join(f'{m[v]:.1f}' for v in VARIANTS)+f' | {m["old_journal"]/m["journal"]:.3f}× |')
    lines += ['',f"Geometric means: old/new journal = {summary['old_journal_divided_by_journal']:.3f}×; old/new snapshot = {summary['old_snapshot_divided_by_snapshot']:.3f}×; journal/Rust = {summary['journal_divided_by_rust']:.3f}×. Small-changing-row old/new journal ratio = {summary['ratios_by_profile']['0']:.3f}×; wide-changing-row = {summary['ratios_by_profile']['1']:.3f}×.",'',
        'Timing here excludes failing actions and events. Integration tests preserve multi-table repeated-write aborts, tentative reads, event order, checkpoints and exhausted commit counters. The source checker proves cache algebra; primitive ownership/BigInt lowering, table projection and journal scheduling remain trusted. Full state refinement, durability, adaptive selection and the broader language acceptance criteria remain unfinished.','',
        '[Samples](samples.json), [metadata](metadata.json), [correctness](correctness.json), [summary](summary.json).']
    (OUT/'REPORT.md').write_text('\n'.join(lines)+'\n')
if __name__=='__main__':main()
