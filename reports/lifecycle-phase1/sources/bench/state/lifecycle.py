#!/usr/bin/env python3
"""Lifecycle timings and separate allocation probes; no changes to the compiler."""
import argparse, hashlib, json, math, random, shutil, statistics, subprocess, time
from pathlib import Path
import run as state

ROOT = state.ROOT
VARIANTS = ['tree', 'rows_small', 'columns_small', 'rows_flat', 'columns_flat',
            'c_flat', 'cpp_tree', 'rust_tree', 'rust_rows_flat', 'rust_columns_flat', 'rust_columns_small']
PHASES = ['initialization', 'growth', 'steady', 'mixed', 'clear', 'final_observation', 'destruction']
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def oracle(n, steps, mode):
    model = state.Model(n if mode == 'bulk' else 64)
    check = 0; counts = [0]*4; rng = 123456789; results = []
    def observe():
        total = sum(model.rows.values()); h = 0
        for key in range(2*n): h = (h*1099511628211 + model.rows.get(key, 0) + int(key in model.rows)) & state.MASK
        return dict(checksum=str(check), total_lo=str(total & state.MASK), total_hi=str(total >> 64),
                    version=model.version, events=len(model.events), event_hash=str(model.event_hash()), state_hash=str(h), statuses=counts.copy())
    def random_word():
        nonlocal rng
        rng ^= (rng << 13) & state.MASK; rng ^= rng >> 7; rng ^= (rng << 17) & state.MASK
        return rng
    def apply(op, key, value):
        nonlocal check
        status = model.apply(op, key, value); counts[status] += 1
        check = (check*1099511628211 + status) & state.MASK
    results.append(observe())
    if mode != 'bulk':
        for key in range(64, n): assert model.apply(0, key, key % 10) == 0
    results.append(observe())
    for _ in range(steps): apply(1, random_word() % n, 1)
    results.append(observe())
    for _ in range(steps):
        r = random_word(); kind = (r >> 32) % 10; op = 1; value = 1
        if kind < 2: op = 0; value = r % 1024
        elif kind == 2: op = 2
        elif kind in [3, 4]: op = 3
        elif kind == 5: value = (1 << 32)-1
        apply(op, r % (2*n), value)
    results.append(observe())
    for key in range(2*n): apply(2, key, 0)
    results += [observe(), observe()]
    return results

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, default=ROOT/'reports/borrowed-outcomes-phase1')
    parser.add_argument('--output', type=Path, default=ROOT/'reports/lifecycle-phase1')
    parser.add_argument('--build-directory', type=Path, default=ROOT/'build/lifecycle-native')
    parser.add_argument('--steps', type=int, default=10000)
    parser.add_argument('--repeats', type=int, default=7)
    args = parser.parse_args(); assert args.repeats >= 3 and 1 <= args.steps <= 10000000
    archive, out, build = args.archive.resolve(), args.output.resolve(), args.build_directory.resolve()
    assert not out.exists(), 'Use a new output directory; never overwrite measured reports.'
    out.mkdir(parents=True); build.mkdir(parents=True, exist_ok=True)
    meta = json.loads((archive/'metadata.json').read_text())
    # Only pinned archived implementation bytes feed the new build.
    for name, h in meta['artifact_sha256'].items(): assert digest(archive/name) == h, name
    compiler = ROOT/'target/release/lang'; assert digest(compiler) == meta['compiler_sha256']['current']
    env = state.environment(); native_env = env.copy()
    native_env['RUSTFLAGS'] = '-C target-cpu=native -C panic=abort'
    sources = ['bench/state/lifecycle.py', 'bench/state/lifecycle_driver.c', 'bench/state/allocation_probe.rs',
               'bench/state/allocation_probe.h', 'bench/state/run.py']
    identities = {name: digest(ROOT/name) for name in sources}
    for name in sources:
        dst=out/'sources'/name;dst.parent.mkdir(parents=True,exist_ok=True);dst.write_bytes((ROOT/name).read_bytes())
    implementation_sources = {}; started = time.time()
    for probe in [False, True]:
        directory = build/('probe' if probe else 'timed'); directory.mkdir(exist_ok=True)
        native_env['CARGO_TARGET_DIR'] = str(directory/'target')
        flags = ['-DPROFILE_ALLOCATIONS'] if probe else []
        state.run(['clang','-O3','-std=c11','-Wall','-Wextra','-Werror',*flags,'-I',ROOT/'bench/state',
                   '-c',ROOT/'bench/state/lifecycle_driver.c','-o',directory/'driver.o'])
        for variant in VARIANTS:
            project = directory/'projects'/variant; (project/'src').mkdir(parents=True,exist_ok=True)
            if variant in ['c_flat', 'cpp_tree']:
                cpp = variant == 'cpp_tree'; name = 'baseline.cpp' if cpp else 'baseline.c'
                text = (archive/'sources/bench/state'/name).read_text()
                if probe:
                    # After standard headers, before the implementation declarations.
                    marker = 'struct Event' if cpp else 'typedef struct'
                    index=text.index(marker); text=text[:index]+'#include "allocation_probe.h"\n'+text[index:]
                src=project/name;src.write_text(text);shutil.copyfile(ROOT/'bench/state/allocation_probe.h',project/'allocation_probe.h')
                shutil.copyfile(archive/'sources/bench/state/api.h',project/'api.h')
                cc='clang++' if cpp else 'clang'
                state.run([cc,'-O3','-mcpu=native','-std='+('c++20' if cpp else 'c11'),'-Wall','-Wextra','-Werror','-c',src,'-o',directory/(variant+'.o')])
                state.run([cc,'-dynamiclib',directory/(variant+'.o'),'-o',directory/(variant+'.dylib')])
                obj=directory/(variant+'.o')
            else:
                text = (archive/(variant+'-lib.rs')).read_text() if variant != 'rust_tree' else (archive/'sources/bench/state/baseline.rs').read_text()
                cargo = (archive/(variant+'-Cargo.toml')).read_text() if variant != 'rust_tree' else '''[package]
name="baseline-state"
version="0.1.0"
edition="2021"
[lib]
crate-type=["staticlib","cdylib"]
[features]
bigint=[]
[dependencies]
num-bigint="=0.4.8"
[profile.release]
lto=false
codegen-units=1
'''
                if probe: text += '\n'+(ROOT/'bench/state/allocation_probe.rs').read_text()
                (project/'src/lib.rs').write_text(text);(project/'Cargo.toml').write_text(cargo)
                if variant.startswith('rust_') and variant != 'rust_tree':
                    shutil.copyfile(archive/(variant+'-ordered_storage.rs'),project/'src/ordered_storage.rs')
                if (archive/(variant+'-Cargo.lock')).exists():shutil.copyfile(archive/(variant+'-Cargo.lock'),project/'Cargo.lock')
                features=['--features','bounded-abi'] if not variant.startswith('rust_') else []
                state.run(['cargo','build','--release','--offline','--lib','--manifest-path',project/'Cargo.toml',*features],native_env)
                library='baseline_state' if variant.startswith('rust_') else 'compiled_state'
                for suffix in ['a','dylib']:shutil.copyfile(directory/f'target/release/lib{library}.{suffix}',directory/f'{variant}.{suffix}')
                cc='clang';obj=directory/(variant+'.a')
            state.run([cc,directory/'driver.o',obj,'-liconv','-o',directory/variant])
            for p in project.rglob('*'):
                if p.is_file():
                    dst=out/'implementations'/directory.name/variant/p.relative_to(project)
                    dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dst)
                    implementation_sources[str(dst.relative_to(out))]=digest(dst)
    # Functional validation and allocation probes complete before any timing sample.
    state.BUILD=build/'timed';state.OUT=out;state.VARIANTS=VARIANTS
    correctness=state.validate(compiler)
    expected={(n,mode):oracle(n,args.steps,mode) for n in [64,4096,65536] for mode in ['bulk','incremental']}
    profiles=[]
    for (n,mode),want in expected.items():
        for variant in VARIANTS:
            result=json.loads(state.run([build/'probe'/variant,n,args.steps,mode,1]))
            assert [p['observation'] for p in result['phases'][:-1]]==want,(variant,n,mode)
            assert result['phases'][-1]['live_bytes']==0
            profiles.append(dict(variant=variant,**result))
    (out/'allocation-profiles.json').write_text(json.dumps(profiles,indent=2)+'\n')
    (out/'oracle.json').write_text(json.dumps([dict(rows=n,initialization=mode,observations=want) for (n,mode),want in expected.items()],indent=2)+'\n')
    artifacts={str(p.relative_to(ROOT)):digest(p) for probe in ['timed','probe'] for v in VARIANTS for p in [build/probe/v,build/probe/(v+'.dylib')]}
    print('Build and validation complete:',correctness,flush=True)
    samples=[];rnd=random.Random(732190)
    for (n,mode),want in expected.items():
        cycles={64:16,4096:4,65536:1}[n]
        for repeat in range(args.repeats):
            order=VARIANTS.copy();rnd.shuffle(order)
            for variant in order:
                result=json.loads(state.run([build/'timed'/variant,n,args.steps,mode,cycles]))
                assert [p['observation'] for p in result['phases'][:-1]]==want,(variant,n,mode)
                assert result['seconds']>0 and math.isclose(sum(p['seconds'] for p in result['phases']),result['seconds'],abs_tol=1e-10)
                assert all(p['allocation_calls']==p['live_bytes']==0 for p in result['phases'])
                samples.append(dict(variant=variant,repeat=repeat,seconds_per_lifecycle=result['seconds']/cycles,**result))
        print(n,mode, {v:round(statistics.median(s['seconds_per_lifecycle'] for s in samples if (s['rows'],s['initialization'],s['variant'])==(n,mode,v))*1e6,1) for v in VARIANTS},flush=True)
        (out/'samples.json').write_text(json.dumps(samples,indent=2)+'\n')
    summary=summarize(samples)
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    for name,h in artifacts.items():assert digest(ROOT/name)==h,name
    for name,h in identities.items():assert digest(ROOT/name)==h,name
    assert digest(compiler)==meta['compiler_sha256']['current']
    metadata=dict(status='passed',started_unix=started,parameters={k:str(v) if isinstance(v,Path) else v for k,v in vars(args).items()},
                  variants=VARIANTS,source_sha256=identities,implementation_sha256=implementation_sources,binary_sha256=artifacts,
                  archived_implementation_metadata_sha256=digest(archive/'metadata.json'),compiler_sha256=digest(compiler),correctness=correctness,
                  lifecycle_phase_observations=len(samples)*6,profile_phase_observations=len(profiles)*6,commands=state.COMMANDS,
                  cpu=state.run(['sysctl','-n','machdep.cpu.brand_string']),clang=state.run(['clang','--version']),rustc=state.run(['rustc','-vV'],env),
                  backend_targets=meta['backend_targets'],scope='Lifecycle phase timings with independent phase observations; separate requested-allocation bytes. No RSS, durability, adaptation or universal language speed claim.')
    (out/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    report(out,summary,profiles)
    print(json.dumps(summary,indent=2),flush=True)

def summarize(samples):
    cells=[]
    for n,mode in sorted({(s['rows'],s['initialization']) for s in samples}):
        medians={v:statistics.median(s['seconds_per_lifecycle'] for s in samples if (s['rows'],s['initialization'],s['variant'])==(n,mode,v)) for v in VARIANTS}
        phases={v:{p:statistics.median(s['phases'][i]['seconds']/s['cycles'] for s in samples if (s['rows'],s['initialization'],s['variant'])==(n,mode,v)) for i,p in enumerate(PHASES)} for v in VARIANTS}
        cells.append(dict(rows=n,initialization=mode,median_seconds=medians,phase_median_seconds=phases))
    gm=lambda xs:math.exp(statistics.mean(map(math.log,xs)))
    return dict(samples=len(samples),cells=cells,time_divided_by_rust_tree={v:gm([c['median_seconds'][v]/c['median_seconds']['rust_tree'] for c in cells]) for v in VARIANTS},
                time_divided_by_same_layout_rust={v:gm([c['median_seconds'][v]/c['median_seconds']['rust_'+v] for c in cells]) for v in ['rows_flat','columns_flat','columns_small']})

def report(out,summary,profiles):
    lines=['# State lifecycle comparison','','Eleven implementations of the same inventory source maintain exact totals, versions and ordered events. Fresh builds use the pinned sources from the preceding borrowed-outcome report. Ink uses generated undo/staged-event execution; handwritten baselines validate before writes. C is flat, C++ is a tree, Rust includes trees and matching contiguous primitives. Compiler/proof-core behavior is unchanged.','','Each lifecycle builds state, grows to the target, performs 10,000 steady and 10,000 mixed operations, clears every candidate key, observes the final state/event log, and destroys State. Mixed operations include insertion, removal, missing/exists errors, overflow and speculative abort. Bulk mode calls each implementation\'s existing constructor at the full target: handwritten constructors directly construct rows, whereas Ink executes source create transactions. Incremental mode starts from empty, creates 64 rows, then grows through ordinary source operations; the 256-row policy promotion happens inside the measured growth phase. Ascending creation favors flat buffers; ascending clearing shifts them repeatedly.','','The same separately compiled C driver records seven phase times. Their sum includes initialization, growth, execution, clear, final observable hashing/queries, and destruction. Additional intermediate correctness observations are outside this sum. It is not uninterrupted process wall time. Small/medium cells batch 16/4 fresh lifecycles, large cells use one; seven repeats, randomized variant order, Apple M4 Pro interactive host, no CPU pinning or cross-ABI LTO. Every phase observation agrees with an independent integer/state model. Separate existing native/reference validation anchors that model against the actual language source.','','## Whole measured lifecycle','','Median microseconds per lifecycle. Ratios describe these workloads and implementations, not surface languages.','','| Rows | Construction | '+' | '.join(VARIANTS)+' |','| ---: | --- | '+' | '.join(['---:']*len(VARIANTS))+' |']
    for c in summary['cells']:lines.append(f"| {c['rows']} | {c['initialization']} | "+' | '.join(f"{c['median_seconds'][v]*1e6:.1f}" for v in VARIANTS)+' |')
    lines+=['','## Separately measured allocations','','Instrumented binaries have their own build directory and hashes. Their timing fields are discarded. Counts cover implementation-owned requested heap bytes and successful allocation/reallocation calls, excluding allocator metadata, probe headers, host-driver memory and temporary physical realloc overlap. Rust wraps GlobalAlloc/System; C wraps this implementation\'s malloc/calloc/realloc/free; C++ intercepts ordinary new/delete. No over-aligned objects occur in these fixtures. All instrumented states return live requested bytes to zero after destruction. Bytes still allocated after clear include retained event logs, vector capacities and journal buffers; they are not just live rows and are not RSS.','','| Rows | Construction | Variant | After growth bytes | After mixed bytes | After clear bytes | Peak requested live bytes | Allocation/reallocation calls |']
    lines.append('| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: |')
    for s in profiles:
        p=s['phases'];lines.append(f"| {s['rows']} | {s['initialization']} | {s['variant']} | {p[1]['live_bytes']} | {p[3]['live_bytes']} | {p[4]['live_bytes']} | {p[-1]['peak_bytes']} | {p[-1]['allocation_calls']} |")
    lines+=['','[Raw timings](samples.json), [phase medians and ratios](summary.json), [allocation profiles](allocation-profiles.json), [independent phase oracle](oracle.json), and [pinned sources/binaries/toolchains](metadata.json) are archived. Instrumentation is functional evidence, not formal storage refinement.','','Rebuild into a fresh output directory with `python3 bench/state/lifecycle.py --output reports/NEW`. The preceding timed binaries are untouched. General lifetime arenas, compact graph links, inline variable-size values, checked physical admission/adaptation, memory limits and durability remain unfinished.']
    (out/'REPORT.md').write_text('\n'.join(lines)+'\n')

if __name__=='__main__':main()
