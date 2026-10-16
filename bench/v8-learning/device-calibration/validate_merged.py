"""Re-emit checked plans and check exact GPU results on merged main; no timing."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
from ink_knowledge import identity
from ink_planner.offline_measurements import reference_receipt
from ink_planner.value_transfer import transfer

ROOT=Path(__file__).resolve().parents[3]
HERE=Path(__file__).resolve().parent

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ['compiler','browser','scratch']:parser.add_argument('--'+name,type=Path,required=True)
    args=parser.parse_args();compiler=args.compiler.resolve();scratch=args.scratch.resolve();scratch.mkdir(parents=True,exist_ok=False)
    def write(name,obj):(scratch/name).write_text(json.dumps(obj,indent=2)+'\n')
    write('storage-retention.json',dict(schema=1,keep=[dict(path='.',reason='Active required merged-main device proof/conformance; retain live inputs and outputs.')],safe_to_remove=[]))
    def run(command,label,env=None):
        result=subprocess.run(list(map(str,command)),capture_output=True,text=True,env=env,timeout=180)
        (scratch/(label+'.stdout')).write_text(result.stdout);(scratch/(label+'.stderr')).write_text(result.stderr)
        if result.returncode:raise ValueError(label+': '+result.stderr[-4000:])
        return result.stdout
    with tarfile.open(HERE/'selected-inputs.tar.gz')as archive:
        for name in ['source.core.json','plan-0.json','plan-1.json','training.workload.json','holdout.workload.json']:
            (scratch/name).write_bytes(archive.extractfile('current-main/'+name).read())
        phases={}
        original=json.loads(archive.extractfile('current-main/receipt.json').read())
        for split in ['training','holdout']:
            phases[split]=[];spec=json.loads((scratch/(split+'.workload.json')).read_bytes())
            for phase,calls in spec['phases'].items():
                assert phase=='work'
                for index,call in enumerate(calls):
                    argv=scratch/'oracle-args.json';argv.write_text(json.dumps(call['args']))
                    receipt=json.loads(run([compiler,'run',scratch/'source.core.json',call['function'],argv,'--core','--input-receipt'],f'oracle-{split}-{index}'))
                    result,fingerprint=reference_receipt(receipt,original['input_core_sha256'],call['function'])
                    old=json.loads(archive.extractfile(f'current-main/oracle-{split}-{phase}-{index}.stdout').read())
                    assert reference_receipt(old,original['input_core_sha256'],call['function'])==(result,fingerprint)
                    phases[split].append(dict(call,expected=result,input_sha256=fingerprint))
    artifacts=[]
    for index in range(2):
        plan=scratch/f'plan-{index}.json';artifact=scratch/f'artifact-{index}'
        checked=json.loads(run([compiler,'emit-plan',scratch/'source.core.json',plan,'--core','--target','webgpu','-o',artifact],f'emit-{index}'))
        assert checked['status']=='checked'
        env=dict(os.environ,CARGO_BUILD_JOBS='2',CARGO_PROFILE_DEV_DEBUG='0',CARGO_PROFILE_TEST_DEBUG='0',CARGO_INCREMENTAL='0')
        cargo=shutil.which('cargo');assert cargo,'local Cargo required'
        run([cargo,'build','--release','--offline','--lib','--target','wasm32-unknown-unknown','--manifest-path',artifact/'cpu/Cargo.toml','--target-dir',scratch/'cpu-target'],f'build-{index}',env)
        shutil.copyfile(scratch/'cpu-target/wasm32-unknown-unknown/release/ink_packed_cpu.wasm',artifact/'cpu.wasm')
        artifacts.append(dict(measurement=identity(json.loads(plan.read_bytes())),path=str(artifact),selected_core_sha256=checked['selected']))
    write('request.json',dict(schema=1,artifacts=artifacts,phases=transfer(phases)))
    request=scratch/'request.json';report=json.loads(run(['node',HERE/'validate_emitted.mjs',args.browser.resolve(),request,sha(request)],'device'))
    assert len(report['results'])==8 and {row['measurement']for row in report['results']}==set(original['validated_measurements'])
    def git(path,*parts):return subprocess.check_output(['git','-C',str(path),*parts],text=True).strip()
    pins={name:git(ROOT/name,'rev-parse','HEAD')for name in ['knowledge','planner','runtime','lowerings/rust','lowerings/js','lowerings/wasm','lowerings/gpu','abi','native-support']}
    write('terminal.json',dict(schema=1,exit_status=0,compiler_sha256=sha(compiler),distribution_source=git(ROOT,'rev-parse','HEAD'),core_tree=git(ROOT,'rev-parse','HEAD:core'),pins=pins,exact_original_oracles=True,actual_device_calls=8,scope='Conformance only; no timings/cost observations or policy changes.'))
    write('storage-retention.json',dict(schema=1,keep=[dict(path='.',reason='Selected complete merged-emitter source/plan/oracle and actual-device proof/receipt inputs.')],safe_to_remove=[dict(path='cpu-target',reason='Completed generated dependency/build output; exact selected CPU Wasm/source/locks retained.')]))
    files=[p for p in scratch.rglob('*')if p.is_file()and'cpu-target'not in p.relative_to(scratch).parts]
    with tarfile.open(HERE/'merged-emission-inputs.tar.gz','w:gz',compresslevel=9)as archive:
        for p in sorted(files):archive.add(p,arcname=str(p.relative_to(scratch)),recursive=False)
    (HERE/'merged-emission.json').write_text(json.dumps(dict(schema=1,terminal=json.loads((scratch/'terminal.json').read_bytes()),report=report,archive_sha256=sha(HERE/'merged-emission-inputs.tar.gz'),files={str(p.relative_to(scratch)):sha(p)for p in sorted(files)}),indent=2)+'\n')
    print('PASS checked source/oracle replay and eight actual provided-device calls on merged main')

if __name__=='__main__':main()
