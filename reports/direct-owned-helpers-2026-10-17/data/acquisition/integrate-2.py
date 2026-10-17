import hashlib,json,os,shutil,subprocess,time
from pathlib import Path

root=Path(__file__).resolve().parents[3]
out=root/'build/owned-carriers/helper-probe/integration-2'
source=out/'source'
out.mkdir(exist_ok=False)
source.mkdir()
def git(repo,*args):
    return subprocess.check_output(['git','-C',str(repo),*args])
revision=git(root,'rev-parse','HEAD').decode().strip()
files={};pins={}
def export(repo,rev,destination,paths):
    for entry in git(repo,'ls-tree','-r','-z',rev,*paths).split(b'\0'):
        if not entry:continue
        meta,name=entry.split(b'\t');mode,kind,oid=meta.decode().split()
        if kind!='blob':continue
        name=name.decode();data=git(repo,'cat-file','blob',oid)
        assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==oid
        path=destination/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
        if mode=='100755':path.chmod(0o755)
        files[str(path.relative_to(source))]=hashlib.sha256(data).hexdigest()
export(root,revision,source,['Cargo.toml','Cargo.lock','src','core','stdlib','tests','examples','reports/typed-execution-phase1/frames/source.ink'])
for name in ['abi','native-support','lowerings/rust','lowerings/js','lowerings/wasm','lowerings/gpu','runtime','knowledge','planner']:
    pin=git(root,'ls-tree',revision,name).decode().split()[2];pins[name]=pin
    paths=[]
    if name=='knowledge':paths=['libraries','producers','ink_knowledge','tests/fixtures','pyproject.toml','schemas','notices']
    if name=='planner':paths=['browser','ink_planner','schemas','pyproject.toml']
    export(root/name,pin,source/name,paths)
record=dict(schema=1,status='exported',distribution=revision,packages=pins,files=files,
    scope='Private committed Git export. Every exported owned file matches its recorded Git blob; dirty user query excluded. No Cargo artifact or fingerprint is restored. Toolchains and third-party dependencies remain trusted.')
(out/'sources.json').write_text(json.dumps(record,indent=2)+'\n')
env=dict(os.environ,CARGO_TARGET_DIR=str(out/'target'),INK_TEST_WASM='1',INK_PARITY_REQUIRE_ALL='1',INK_DISTRIBUTION=str(source))
receipt=dict(schema=1,status='running',distribution=revision,phases=[],sources_sha256=hashlib.sha256((out/'sources.json').read_bytes()).hexdigest())
def save():(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
def check_sources():
    assert all(hashlib.sha256((source/p).read_bytes()).hexdigest()==sha for p,sha in files.items()),'exported source changed'
def run(name,command):
    check_sources();started=time.monotonic()
    with (out/(name+'.log')).open('wb')as log:result=subprocess.run(command,cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT)
    phase=dict(name=name,command=command,exit_code=result.returncode,seconds=time.monotonic()-started,log_sha256=hashlib.sha256((out/(name+'.log')).read_bytes()).hexdigest())
    receipt['phases'].append(phase);print(json.dumps(phase),flush=True);save()
    if result.returncode:receipt['status']='failed';save();raise SystemExit(result.returncode)
save()
run('compile',['cargo','test','--locked','--no-run','--test','owned_parameter_helpers','--test','owned_record_carriers','--test','numerical_state','--test','function_specialization','--message-format','json'])
compiler=out/'target/debug/ink';assert compiler.is_file()
shutil.copy2(compiler,out/'ink')
receipt['compiler_sha256']=hashlib.sha256((out/'ink').read_bytes()).hexdigest();env['INK_COMPILER']=str(out/'ink');save()
run('owned-parameters',['cargo','test','--locked','--test','owned_parameter_helpers','--','--nocapture','--test-threads=1'])
run('owned-records',['cargo','test','--locked','--test','owned_record_carriers','--','--nocapture','--test-threads=1'])
run('numerical-state',['cargo','test','--locked','--test','numerical_state','--','--nocapture','--test-threads=1'])
run('function-specialization',['cargo','test','--locked','--test','function_specialization','--','--nocapture','--test-threads=1'])
check_sources();receipt['status']='passed';save()
