#!/usr/bin/env python3
"""Audit the complete arithmetic report; optionally replay compiler and native code.

Replay requires the measured compiler binary and the macOS toolchain. It does
not repeat timings or trust the original report's pass labels as validation.
"""
import argparse, hashlib, importlib.util, json, os, platform, re, shutil, subprocess, sys, tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports/bitvector-proof-phase1'
def sha(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def read(path): return json.loads(Path(path).read_text())
def require(condition,message):
    if not condition: raise ValueError(message)
def run(args,**kw):
    result=subprocess.run(list(map(str,args)),text=True,capture_output=True,**kw)
    require(result.returncode==0,f'command failed: {args}: {result.stderr}')
    return result.stdout.strip()

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--execute',action='store_true');args=parser.parse_args()
    metadata=read(REPORT/'metadata.json')
    for filename,targets in metadata.get('emitted_target_cpus',{}).items():
        actual=sorted(set(re.findall(r'"target-cpu"="([^"]+)"',(REPORT/'artifacts'/filename).read_text())))
        require(actual==targets,f'CPU target differs from archived LLVM: {filename}')
    for relative,digest in {**metadata['source_hashes'],**metadata.get('supplementary_source_hashes',{})}.items():
        require(sha(REPORT/relative)==digest,f'source hash mismatch: {relative}')
    sys.path.insert(0,str(REPORT/'sources/bench'))
    spec=importlib.util.spec_from_file_location('measured_arithmetic',REPORT/'sources/bench/bitvector-proof.py')
    measured=importlib.util.module_from_spec(spec);spec.loader.exec_module(measured)
    rows=[json.loads(row) for row in (REPORT/'samples.jsonl').read_text().splitlines()]
    require(measured.summarise(rows,metadata['parameters']['repeats'])==read(REPORT/'summary.json'),'summary differs from raw samples')
    for row in rows:
        expected=sum(measured.reference(row['case'],x,y) for x,y in measured.driver_inputs(row['distribution']))&measured.MASK
        require(int(row['cycle'])==expected,'timed cycle differs from independent oracle')
    revisions=read(REPORT/'database-extension.json')['revisions']
    require([r['proposals'] for r in revisions]==list(range(9)),'missing database revisions')
    require([r['closure'] for r in revisions]==[0,2,3,4,5,6,7,8,9],'unexpected checked closure sizes')
    require(len({r['generated_c_sha256'] for r in revisions})==9,'database revisions do not change code')
    full=read(REPORT/'knowledge/proposal.json')
    for revision in revisions:
        count=revision['proposals'];directory=REPORT/f'database-{count}';lock=read(directory/'lock.json');package=read(directory/'proposal.json')
        require(revision['compiler_sha256']==metadata['compiler_sha256'],'compiler changed between revisions')
        require(package['proposals']==full['proposals'][:count],'selected database differs from proposal prefix')
        require(len(lock['objects'])==revision['closure'],'closure count does not match roots')
        for identity in lock['objects']:
            require(sha(directory/'objects'/f'{identity}.json')==identity,'database content identity mismatch')
        artifact=REPORT/'artifacts'/f'phase-{count}.c';plan=read(Path(str(artifact)+'.plan.json'))
        require(sha(artifact)==revision['generated_c_sha256']==plan['generated_c_sha256'],'generated code identity mismatch')
        require(plan['checked_implementation']['checked_proposals']==package['proposals'],'plan proposals differ from database')
        require(plan['checked_implementation']['library_lock']==lock,'plan lock differs from database')
        require(sorted(plan['checked_implementation']['library_closure'])==sorted(lock['objects']),'plan closure differs from checked object roots')
    require(sha(REPORT/'artifacts/phase-0.c')==sha(REPORT/'artifacts/ink_baseline.o.c'),'empty database changes baseline')
    require(sha(REPORT/'artifacts/phase-8.c')==sha(REPORT/'artifacts/ink_checked.o.c'),'full candidate differs from measured code')
    library=read(REPORT/'knowledge/lock.json')
    require(len(library['objects'])==10,'full library omits conditional theorem')
    for identity in library['objects']: require(sha(REPORT/'knowledge/objects'/f'{identity}.json')==identity,'full library object identity mismatch')
    cost=read(REPORT/'checking-cost.json')
    require({(r['mode'],r['repeat']) for r in cost['samples']}=={(m,r) for m in cost['median_seconds'] for r in range(7)},'checking cost sample matrix incomplete')
    semantic=read(REPORT/'semantic-validation.json')
    require(semantic['compiler_sha256']==metadata['compiler_sha256'],'semantic validation uses a different compiler')
    require(sha(REPORT/'supplementary-tools/check_bitvector_semantics.py')==semantic['checker_source_sha256'],'independent oracle source identity mismatch')
    require(sum(m['checks'] for m in semantic['measurements'])==semantic['checks']==2534,'incomplete semantic matrix')
    for case in semantic['measurements']:
        cnf=REPORT/'semantic-obligations'/f'{case["name"]}.cnf.json'
        require(sha(cnf)==case['cnf_file_sha256'],'semantic CNF file identity mismatch')
        require(read(cnf)['sha256']==case['problem_sha256'],'semantic obligation identity mismatch')
    result=dict(status='passed',samples=len(rows),cells=read(REPORT/'summary.json')['cells'],database_revisions=len(revisions),scope='static hashes, sample matrix/checksums, independently recomputed summary, object/plan/code correspondence; execution only if requested')
    if args.execute:
        compiler=ROOT/'target/release/ink';require(sha(compiler)==metadata['compiler_sha256'],'measured compiler binary unavailable or different')
        env=os.environ.copy();local=ROOT.parents[1]/'work/toolchain'
        if not shutil.which('cargo') and (local/'cargo/bin/cargo').exists():
            env['CARGO_HOME']=str(local/'cargo');env['RUSTUP_HOME']=str(local/'rustup')
            env['PATH']=str(local/'cargo/bin')+os.pathsep+env['PATH']
        require(run(['clang','--version'])==metadata['clang'],'Clang differs from measured version')
        require(run(['rustc','-vV'],env=env)==metadata['rustc'],'Rust differs from measured version')
        with tempfile.TemporaryDirectory(prefix='ink-bitvector-replay-') as temporary:
            scratch=Path(temporary); source=REPORT/'knowledge/kernels.ink'
            run([compiler,'verify-library',REPORT/'knowledge/lock.json'])
            for revision in revisions:
                count=revision['proposals'];out=scratch/f'phase-{count}.c'
                run([compiler,'emit-c',source,'--implementation',REPORT/f'database-{count}/proposal.json','-o',out])
                require(sha(out)==revision['generated_c_sha256'],f'replayed compiler output differs: {count}')
                actual=read(Path(str(out)+'.plan.json'));expected=read(REPORT/'artifacts'/f'phase-{count}.c.plan.json')
                actual.pop('source');expected.pop('source');require(actual==expected,f'replayed checking plan differs: {count}')
            for case in semantic['measurements']:
                name=case['name'];out=scratch/'semantic.cnf.json'
                run([compiler,'bitvector-obligation',REPORT/'semantic-obligations'/f'{name}.goal.json','-o',out])
                require(read(out)==read(REPORT/'semantic-obligations'/f'{name}.cnf.json'),f'replayed semantic circuit differs: {name}')
            cpu='-mcpu=native' if platform.machine()=='arm64' else '-march=native'
            for variant in measured.VARIANTS:
                if variant=='rust':
                    run(['rustc','--edition=2021','--crate-type=lib','--emit=obj','-C','opt-level=3','-C','target-cpu=native','-C','panic=abort',REPORT/'sources/bench/arithmetic/baseline.rs','-o',scratch/f'{variant}.o'],env=env)
                else:
                    cc='clang++' if variant=='cpp' else 'clang';std='c++20' if variant=='cpp' else 'c11'
                    path=REPORT/'sources/bench/arithmetic'/('baseline.cpp' if variant=='cpp' else 'baseline.c') if variant in ('c','cpp') else REPORT/'artifacts'/f'{variant}.o.c'
                    run([cc,'-O3',cpu,f'-std={std}','-c',path,'-o',scratch/f'{variant}.o'])
                run(['clang','-O3',cpu,'-std=c11','-c',REPORT/'sources/bench/arithmetic/adapter.c','-o',scratch/'adapter.o'])
                run(['clang','-dynamiclib',scratch/'adapter.o',scratch/f'{variant}.o','-o',scratch/f'{variant}.dylib'])
            measured.BUILD=scratch;measured.REPORT=scratch
            validation=measured.validate();require(validation==read(REPORT/'validation.json'),'replayed native validation differs')
            assembly=read(REPORT/'assembly.json')
            require(measured.assembly(scratch/'ink_baseline.o')==assembly['baseline'],'baseline disassembly differs')
            require(measured.assembly(scratch/'ink_checked.o')==assembly['checked'],'checked disassembly differs')
            result.update(native_comparisons=validation['native_comparisons'],replayed_library=True,replayed_source_plans=9,replayed_semantic_obligations=len(semantic['measurements']),replayed_assembly=True)
    (REPORT/'audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

if __name__=='__main__':main()
