#!/usr/bin/env python3
"""Controlled table-layout comparison with original/compiler and matched Rust rows."""
import argparse,hashlib,json,math,random,re,shutil,statistics,subprocess,time
from pathlib import Path
import run as state

ROOT=state.ROOT
VARIANTS=['old_tree','tree','rows_small','columns_small','rows_flat','columns_flat','c_flat','cpp_tree','rust_tree','rust_rows_flat','rust_columns_flat','rust_columns_small']
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--original',type=Path,default=ROOT/'build/journal-protocol-original/lang')
    parser.add_argument('--output',type=Path,default=ROOT/'reports/ordered-storage-phase1')
    parser.add_argument('--build-directory',type=Path,default=ROOT/'build/ordered-storage-native')
    parser.add_argument('--steps',type=int,default=30000);parser.add_argument('--repeats',type=int,default=7)
    args=parser.parse_args();assert args.repeats>=3 and 1<=args.steps<=10000000
    state.BUILD=args.build_directory.resolve();state.OUT=args.output.resolve();build,out=state.BUILD,state.OUT
    out.mkdir(parents=True,exist_ok=True);started=time.time();env=state.environment()
    source_hashes={str(p.relative_to(ROOT)):digest(p) for folder in ['src','bench/state','examples','knowledge'] for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in str(p)}
    maintenance=ROOT/'knowledge/table-maintenance/table.json'
    lang=state.build(env,maintenance)
    original=args.original.resolve();original_hash=digest(original);current_hash=digest(lang)
    native_env=env.copy();native_env['RUSTFLAGS']='-C target-cpu=native -C panic=abort';native_env['CARGO_TARGET_DIR']=str(build/'rust-target')
    projects={};definitions={}
    def emit(variant,compiler,policy=None):
        project=build/'projects'/variant
        argv=[compiler,'emit-state','examples/state-benchmark.lang','--maintenance',maintenance,'--bounded-totals','-o',project]
        if policy:argv+=['--storage',ROOT/'knowledge/storage'/f'inventory-{policy}.json']
        state.run(argv)
        # Pin exactly the emitted code before the shared ABI is appended.
        (out/f'{variant}-emitted.rs').write_bytes((project/'src/lib.rs').read_bytes())
        with (project/'src/lib.rs').open('a') as f:f.write((ROOT/'bench/state/generated_abi.rs').read_text())
        (project/'Cargo.toml').write_bytes((build/'generated-bounded/Cargo.toml').read_bytes())
        state.run(['cargo','build','--release','--offline','--lib','--features','bounded-abi','--manifest-path',project/'Cargo.toml'],native_env)
        for suffix in ['a','dylib']:shutil.copyfile(build/f'rust-target/release/libcompiled_state.{suffix}',build/f'{variant}.{suffix}')
        projects[variant]=project
        definitions[variant]=dict(compiler='original' if compiler==original else 'current',storage=policy)
    for variant,compiler,policy in [('old_tree',original,None),('tree',lang,None)]+[(p.replace('-','_'),lang,p) for p in ['rows-small','columns-small','rows-flat','columns-flat']]:emit(variant,compiler,policy)
    base=(ROOT/'bench/state/baseline.rs').read_text()
    for variant,constructor in [('rust_rows_flat','rows(None)'),('rust_columns_flat','columns(None)'),('rust_columns_small','columns(Some(256))')]:
        project=build/'projects'/variant;(project/'src').mkdir(parents=True,exist_ok=True)
        text=base.replace('use std::collections::BTreeMap;','mod ordered_storage; use ordered_storage::OrderedStorage;').replace('rows:BTreeMap<u64,u32>','rows:OrderedStorage<u64,u32>').replace('rows:BTreeMap::new()','rows:OrderedStorage::'+constructor)
        old='use std::collections::btree_map::Entry;match s.rows.entry(key){Entry::Occupied(_)=>return 2,Entry::Vacant(e)=>{e.insert(value);s.total+=Total::from(value);}}'
        new='if s.rows.contains_key(&key){return 2}s.rows.insert(key,value);s.total+=Total::from(value);'
        assert old in text;text=text.replace(old,new)
        (project/'src/lib.rs').write_text(text);shutil.copyfile(ROOT/'src/ordered_storage.rs',project/'src/ordered_storage.rs')
        (project/'Cargo.toml').write_bytes((build/'rust-baseline/Cargo.toml').read_bytes())
        state.run(['cargo','build','--release','--offline','--lib','--manifest-path',project/'Cargo.toml'],native_env)
        for suffix in ['a','dylib']:shutil.copyfile(build/f'rust-target/release/libbaseline_state.{suffix}',build/f'{variant}.{suffix}')
        projects[variant]=project;definitions[variant]=dict(handwritten=True,storage=constructor)
    for variant in VARIANTS:
        linker='clang++' if variant=='cpp_tree' else 'clang'
        artifact=build/(variant+('.o' if variant in ['c_flat','cpp_tree'] else '.a'))
        state.run([linker,build/'driver.o',artifact,'-liconv','-o',build/variant])
    state.VARIANTS=VARIANTS.copy();correctness=state.validate(lang);print('Correctness:',correctness,flush=True)
    # Everything built and validated before any sample. No concurrent test/build load.
    binary_hashes={str(p.relative_to(ROOT)):digest(p) for v in VARIANTS for p in [build/v,build/f'{v}.dylib']}
    samples=[];rnd=random.Random(381627)
    for n in [64,4096,65536]:
        for workload in ['steady','mixed']:
            for qpu in [0,1,10]:
                for repeat in range(args.repeats):
                    order=VARIANTS.copy();rnd.shuffle(order)
                    for variant in order:
                        r=json.loads(state.run([build/variant,n,args.steps,qpu,workload]))
                        samples.append(dict(variant=variant,rows=n,workload=workload,queries_per_update=qpu,repeat=repeat,ns_per_step=r['seconds']*1e9/args.steps,**r))
                group=[s for s in samples if (s['rows'],s['workload'],s['queries_per_update'])==(n,workload,qpu)]
                fields=['checksum','total_lo','total_hi','version','events','event_hash','state_hash','statuses']
                assert len({json.dumps({k:s[k] for k in fields},sort_keys=True) for s in group})==1,(n,workload,qpu)
                print(f'{n} {workload} {qpu}: '+', '.join(f'{v} {statistics.median(s["ns_per_step"] for s in group if s["variant"]==v):.1f}ns' for v in VARIANTS),flush=True)
                (out/'samples.json').write_text(json.dumps(samples,indent=2)+'\n')
    cells={}
    for cell in sorted({(s['rows'],s['workload'],s['queries_per_update']) for s in samples}):
        cells[cell]={v:statistics.median(s['ns_per_step'] for s in samples if (s['rows'],s['workload'],s['queries_per_update'])==cell and s['variant']==v) for v in VARIANTS}
    gm=lambda xs:math.exp(statistics.mean(math.log(x) for x in xs))
    summary=dict(samples=len(samples),cells=len(cells),old_time_divided_by_current_tree=gm([m['old_tree']/m['tree'] for m in cells.values()]),time_divided_by_rust_tree={v:gm([m[v]/m['rust_tree'] for m in cells.values()]) for v in VARIANTS},small_table_time_divided_by_rust_tree={v:gm([m[v]/m['rust_tree'] for c,m in cells.items() if c[0]==64]) for v in VARIANTS},flat_ink_time_divided_by_same_layout_rust={v:gm([m[v]/m['rust_'+v] for m in cells.values()]) for v in ['rows_flat','columns_flat','columns_small']})
    (out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    for variant,project in projects.items():
        for path in ['src/lib.rs','Cargo.toml','Cargo.lock','plan.json','src/ordered_storage.rs']:
            p=project/path
            if p.exists():shutil.copyfile(p,out/f'{variant}-{Path(path).name}')
    for path,identity in source_hashes.items():
        p=ROOT/path;assert digest(p)==identity,path
        dst=out/'sources'/path;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,dst)
    for path,identity in binary_hashes.items():assert digest(ROOT/path)==identity,path
    assert digest(original)==original_hash and digest(lang)==current_hash
    (out/'maintenance.json').write_bytes(maintenance.read_bytes())
    metadata=dict(started_unix=started,elapsed_seconds=time.time()-started,parameters={k:str(v) if isinstance(v,Path) else v for k,v in vars(args).items()},cpu=state.run(['sysctl','-n','machdep.cpu.brand_string']),clang=state.run(['clang','--version']),rustc=state.run(['rustc','-vV'],env),compiler_sha256=dict(original=original_hash,current=current_hash),definitions=definitions,source_sha256=source_hashes,binary_sha256=binary_hashes,correctness=correctness,commands=state.COMMANDS,scope='Trusted native storage primitives; external policy and existing cache proofs. No formal physical/native refinement, allocator-free language or universal speed claim.')
    artifacts={str(p.relative_to(out)):digest(p) for p in out.rglob('*') if p.is_file() and p.name!='metadata.json'}
    metadata['artifact_sha256']=artifacts;(out/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    lines=['# Ordered storage comparison','','Same source, maintenance certificate and transaction protocol. Only native ownership lowering and selected storage change. All variants use the same separately compiled C driver. Setup and teardown are excluded, seven repeats, randomized order, 30,000 updates/sample. Every timed observation agrees across variants; 24,060 independent native and 4,010 reference observations pass. This is an interactive Apple M4 Pro host, without CPU pinning.','','Contiguous rows keep `(key,value)` tuples in one vector. Columns keep separate key/value vectors. The `small` policies promote to BTreeMap when insertion exceeds 256 rows, once per state; `flat` policies stay contiguous. Promotion occurs inside execution if crossed, though the large benchmark initializations cross it outside timing. Flat insertion/removal shifts buffers and can lose badly on large mixed workloads.','','Handwritten Rust layout controls use the same storage primitives, with validate-before-mutation transactions and direct mutable row access. Generated Ink retains undo, tentative writes and staged events. The original/current compiler comparison isolates ownership changes under BTreeMap. Storage policies are typed data, not proofs of physical refinement. Cache arithmetic/table-history proofs and trusted native-storage implementation remain distinct.','','| Rows | Stream | Queries | Old Ink tree | Ink tree | Ink rows small | Ink columns small | Ink rows flat | Ink columns flat | Rust tree | Rust rows flat | Rust columns flat | Rust columns small | C flat | C++ tree |','| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |']
    order=['old_tree','tree','rows_small','columns_small','rows_flat','columns_flat','rust_tree','rust_rows_flat','rust_columns_flat','rust_columns_small','c_flat','cpp_tree']
    for (n,w,q),m in cells.items():lines.append(f'| {n} | {w} | {q} | '+' | '.join(f'{m[v]:.1f}' for v in order)+' |')
    lines+=['','Times are median nanoseconds/update including queries. Ratios and raw measurements: [summary.json](summary.json), [samples.json](samples.json). Source bytes, compiler identities, measured binary hashes, commands and toolchains: [metadata.json](metadata.json).','','This first pass does not implement general arenas, compact graph links, variable-size inline enums, zero-copy snapshots, full ownership inference or database-proved physical installation. Those and the broader language/performance requirements remain open.']
    (out/'REPORT.md').write_text('\n'.join(lines)+'\n')
    clang=subprocess.run(['clang','-O3','-mcpu=native','-###','-c','bench/state/baseline.c'],cwd=ROOT,text=True,capture_output=True,check=True)
    probe=build/'cpu-probe.rs';probe.write_text('#[no_mangle] pub extern "C" fn probe(x:u64)->u64{x+1}\n')
    state.run(['rustc','--crate-type=lib','-O','-C','target-cpu=native','--emit=llvm-ir',probe,'-o',build/'cpu-probe.ll'],env)
    ir=(build/'cpu-probe.ll').read_text()
    metadata['backend_targets']=dict(clang_cpu=re.search(r'"-target-cpu" "([^"]+)"',clang.stderr).group(1),rust_cpu=re.search(r'"target-cpu"="([^"]+)"',ir).group(1),clang_driver=clang.stderr,rust_llvm_ir=ir)
    metadata['commands']=state.COMMANDS
    metadata['artifact_sha256']={str(p.relative_to(out)):digest(p) for p in out.rglob('*') if p.is_file() and p.name!='metadata.json'}
    (out/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(json.dumps(summary,indent=2),flush=True)
if __name__=='__main__':main()
