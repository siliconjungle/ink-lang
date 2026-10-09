#!/usr/bin/env python3
"""Separate base-lowering copy costs from a checked database arithmetic change."""
import argparse, hashlib, importlib.util, json, math, random, shutil, statistics, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('state_bench',ROOT/'bench/state/run.py')
state=importlib.util.module_from_spec(spec);spec.loader.exec_module(state)
BUILD=ROOT/'build/cache-lowering-bench';OUT=ROOT/'reports/cache-lowering-phase1'
VARIANTS=['language_cloned','language','language_delta','language_bounded','c_flat','cpp_tree','rust_tree','rust_bigint']
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--repeats',type=int,default=7)
    parser.add_argument('--steps',type=int,default=30000);args=parser.parse_args()
    if args.repeats<3 or not 1<=args.steps<=10000000:parser.error('at least 3 repeats and 1..10000000 steps required')
    BUILD.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
    # Snapshot every input needed to reconstruct the compiler, producers/tests,
    # and compared runtime sources. Check no source changes during measurement.
    sources={str(p.relative_to(ROOT)):sha(p) for folder in ['src','bench/state','knowledge/exact-integers','knowledge/exact-maintenance','knowledge/delta-maintenance']
             for p in (ROOT/folder).rglob('*') if p.is_file()}
    for path in ['Cargo.toml','Cargo.lock','examples/state-benchmark.lang','bench/cache-lowering.py',
                 'tools/delta_maintenance_proofs.py','tests/database_maintenance.rs']:
        sources[path]=sha(ROOT/path)
    previous=ROOT/'reports/database-maintenance-phase1'
    for path in ['generated-lib.rs','generated-Cargo.toml','generated-Cargo.lock','generated-bounded-lib.rs','metadata.json']:
        sources[str((previous/path).relative_to(ROOT))]=sha(previous/path)
    env=state.environment();state.BUILD=BUILD;state.OUT=OUT;started=time.time()
    compiler=state.build(env,ROOT/'knowledge/exact-maintenance/canonical.json')
    native=env.copy();native['RUSTFLAGS']='-C target-cpu=native -C panic=abort';native['CARGO_TARGET_DIR']=str(BUILD/'rust-target')
    for variant in ['language_cloned','language_delta']:
        project=BUILD/(variant+'-project');(project/'src').mkdir(parents=True,exist_ok=True)
        if variant=='language_cloned':
            shutil.copyfile(previous/'generated-lib.rs',project/'src/lib.rs')
            shutil.copyfile(previous/'generated-Cargo.toml',project/'Cargo.toml')
            shutil.copyfile(previous/'generated-Cargo.lock',project/'Cargo.lock')
        else:
            state.run([compiler,'emit-state','examples/state-benchmark.lang','-o',project,'--maintenance',ROOT/'knowledge/delta-maintenance/delta.json'])
            with (project/'src/lib.rs').open('a') as f:f.write((ROOT/'bench/state/generated_abi.rs').read_text())
            shutil.copyfile(BUILD/'generated/Cargo.toml',project/'Cargo.toml')
        state.run(['cargo','build','--release','--offline','--lib','--manifest-path',project/'Cargo.toml'],native)
        for suffix in ['a','dylib']:shutil.copyfile(BUILD/f'rust-target/release/libcompiled_state.{suffix}',BUILD/f'{variant}.{suffix}')
        state.run(['clang',BUILD/'driver.o',BUILD/f'{variant}.a','-liconv','-o',BUILD/variant])
    # Bounded emission must not be affected by the unbounded borrowing change.
    assert (BUILD/'generated-bounded/src/lib.rs').read_bytes()==(previous/'generated-bounded-lib.rs').read_bytes()
    state.VARIANTS=VARIANTS
    correctness=state.validate(compiler);print('Correctness:',correctness,flush=True)
    rows=[];rnd=random.Random(619327)
    for n in [64,4096,65536]:
        for workload in ['steady','mixed']:
            for qpu in [0,1,10]:
                for repeat in range(args.repeats):
                    order=VARIANTS.copy();rnd.shuffle(order)
                    for variant in order:
                        sample=json.loads(state.run([BUILD/variant,n,args.steps,qpu,workload]))
                        rows.append(dict(variant=variant,rows=n,workload=workload,queries_per_update=qpu,repeat=repeat,
                                         ns_per_step=sample['seconds']*1e9/args.steps,**sample))
                group=[r for r in rows if (r['rows'],r['workload'],r['queries_per_update'])==(n,workload,qpu)]
                observations=['checksum','total_lo','total_hi','version','events','event_hash','state_hash','statuses']
                assert len({json.dumps({k:r[k] for k in observations},sort_keys=True) for r in group})==1
                print(f'{n} {workload} {qpu}: '+', '.join(f'{v} {statistics.median(r["ns_per_step"] for r in group if r["variant"]==v):.1f} ns' for v in VARIANTS),flush=True)
                (OUT/'samples.json').write_text(json.dumps(rows,indent=2)+'\n')
    artifacts={}
    for project in ['generated','generated-bounded','language_cloned','language_delta']:
        for file in ['src/lib.rs','Cargo.toml','Cargo.lock','plan.json']:
            directory=project+'-project' if project.startswith('language_') else project
            path=BUILD/directory/file
            if path.exists():
                dest=OUT/project/file;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(path,dest);artifacts[str(dest.relative_to(OUT))]=sha(dest)
    for path,want in sources.items():
        assert sha(ROOT/path)==want,path;dest=OUT/'sources'/path;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/path,dest)
    extension=ROOT/'build/cache-lowering-original/proof-extension.json'
    shutil.copyfile(extension,OUT/'proof-extension.json')
    versions={'rustc':state.run(['rustc','-vV'],env),'clang':state.run(['clang','--version']),
              'cpu':state.run(['sysctl','-n','machdep.cpu.brand_string'])}
    # The previous report already inspected these versions' native CPU choices;
    # preserve the actual probe output and verify version equality explicitly.
    prior=json.loads((previous/'metadata.json').read_text())
    assert versions['rustc']==prior['rustc'] and versions['clang']==prior['clang']
    shutil.copyfile(previous/'backend-targets.json',OUT/'backend-targets.json')
    metadata=dict(status='passed',started_unix=started,seconds=time.time()-started,parameters=vars(args),
                  compiler_sha256=sha(compiler),toolchains=versions,correctness=correctness,source_sha256=sources,
                  artifact_sha256=artifacts,binary_sha256={str(p.relative_to(BUILD)):sha(p) for v in VARIANTS for p in [BUILD/v,BUILD/f'{v}.dylib']},
                  commands=state.COMMANDS,notes=['Common separately compiled C driver, no cross-ABI LTO, requested native CPU for all variants.',
                  'Cloned Ink is recompiled from the previous archived emitted source; it is not generated by the new compiler.',
                  'Borrowed vs cloned uses the same canonical database expression. Delta vs borrowed uses the new database expression.',
                  'Warm, single-threaded, no durability/concurrency; setup and final complete state validation outside timing.',
                  'Fresh state per sample, fixed steps, random variant order, shared interactive host, no CPU pinning.',
                  'Clang resolves native to apple-m3, Rust to apple-m4; see archived backend-targets.json.'])
    (OUT/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    write_report(rows)

def write_report(rows):
    cells=sorted({(r['rows'],r['workload'],r['queries_per_update']) for r in rows});medians={}
    for cell in cells:medians[cell]={v:statistics.median(r['ns_per_step'] for r in rows if (r['rows'],r['workload'],r['queries_per_update'])==cell and r['variant']==v) for v in VARIANTS}
    geo=lambda ratios:math.exp(statistics.mean(map(math.log,ratios)))
    summary=dict(samples=len(rows),cells=len(cells),cloned_time_divided_by_borrowed=geo([m['language_cloned']/m['language'] for m in medians.values()]),
                 borrowed_time_divided_by_delta=geo([m['language']/m['language_delta'] for m in medians.values()]),
                 delta_time_divided_by_rust_bigint=geo([m['language_delta']/m['rust_bigint'] for m in medians.values()]),
                 bounded_time_divided_by_rust_tree=geo([m['language_bounded']/m['rust_tree'] for m in medians.values()]))
    (OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    lines=['# Cache lowering and database update comparison','',
           'This experiment separates two changes: borrowing exact integer operands during base lowering, and selecting a database-proved delta-first replacement expression. The source meanings and observable state machine are unchanged. All handwritten baselines maintain totals too.','',
           '`language_cloned` recompiles the prior archived BigInt runtime source. `language` compiles the canonical certificate with borrowed operands and owned arithmetic temporaries. `language_delta` selects `total + (new - old)` through two new universal database theorems. `language_bounded` retains the checked u128 cache and direct query ABI; its emitted source is byte-identical to the prior bounded implementation. C uses a flat sorted array, C++ std::map, and Rust BTreeMap. Rust BigInt uses exact totals; the remaining baselines use a sufficient u128 bound.','',
           'The delta candidate was first checked with the original unchanged compiler (`proof-extension.json`). The small-core requirement allows efficient primitive lowering; no arithmetic rewrite law was added to the compiler. The existing table pipeline recogniser, cache/transaction protocol and bounded range analysis still need migration to database refinement evidence.','',
           'All variants use the same C timing driver and matched operation streams. Seven repetitions by default, random order, 30,000 attempted updates per sample. Setup and final complete state checks are outside timing. Queries per update are included. No cross-ABI LTO, no CPU pinning, warm in-memory single-threaded execution. Actual backend CPU settings and pinned toolchain versions are archived.','',
           '| Rows | Stream | Queries/update | Cloned ns | Borrowed ns | Delta ns | Bounded ns | C ns | C++ ns | Rust u128 ns | Rust BigInt ns |',
           '| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
    for (n,workload,qpu),m in medians.items():lines.append(f'| {n} | {workload} | {qpu} | '+' | '.join(f'{m[v]:.1f}' for v in VARIANTS)+' |')
    lines+=['',f"Across {len(cells)} cells: cloned/borrowed time = {summary['cloned_time_divided_by_borrowed']:.3f}×; borrowed/delta time = {summary['borrowed_time_divided_by_delta']:.3f}×; delta/Rust BigInt time = {summary['delta_time_divided_by_rust_bigint']:.3f}×; bounded/Rust u128 time = {summary['bounded_time_divided_by_rust_tree']:.3f}×. These are geometric means of per-cell median ratios, not universal language rankings.",'',
           'Ratios near one, particularly for nanosecond workloads on this shared host, do not establish a meaningful change. The fixed nonnegative-u32 workload mostly has small totals; a separate wide-Int experiment is needed to test delta ordering across large totals and signs. This report does not infer benefits outside the measured application.','',
           'Correctness checks 2,005 deterministic operations per native variant against an independent Python state/integer model: statuses, exact total, version, event order/digest/count and touched rows. Timed streams also compare complete final state and statuses. Separate Rust tests exercise signed 512-bit data, tentative reads, aborts, batches and future portable checkpoints.','',
           '[Raw samples](samples.json), [metadata and source/artifact hashes](metadata.json), [correctness](correctness.json), [summary](summary.json). The full PLAN.md language, proof architecture, durability, adaptation and performance requirements remain unfinished.']
    (OUT/'REPORT.md').write_text('\n'.join(lines)+'\n')

if __name__=='__main__':main()
