#!/usr/bin/env python3
"""Rebuild real native/Wasm implementations and compare complete future behaviour."""
from pathlib import Path
import hashlib,json,os,shutil,subprocess
root=Path(__file__).resolve().parents[1]
out=root/'reports/state-wasm-phase1';out.mkdir(parents=True,exist_ok=True)
build=root/'build/state-wasm-phase1';build.mkdir(parents=True,exist_ok=True)
for name in ['validation.json','metadata.json','browser-validation.json','browser.png']:(out/name).unlink(missing_ok=True)
commands=[]
def run(args,capture=False):
    args=list(map(str,args));commands.append(args)
    return subprocess.run(args,cwd=root,check=True,stdout=subprocess.PIPE if capture else None,text=capture).stdout
def same_bytes(a,b):
    if a.read_bytes()!=b.read_bytes():raise RuntimeError(f'Snapshot mismatch: {a} vs {b}')
def same_json(a,b):
    if json.loads(a)!=json.loads(b.read_text()):raise RuntimeError(f'Outcome mismatch against {b}')
run(['python3','dev.py','build','--bin','lang','--bin','state_wasm_fixture'])
run([root/'target/debug/state_wasm_fixture',out/'fixtures'])
lang=root/'target/debug/lang'
run([lang,'prove-maintenance','knowledge/sum-maintenance.lang','-o',out/'maintenance.json'])
fixture_files=sorted(p.name for p in (out/'fixtures/inventory').iterdir() if p.name!='source.lang')
modes=[];native_checks=0
for fixture,variant in [('inventory','scan'),('inventory','maintained'),('bounded','scan'),('bounded','maintained'),('bounded','bounded')]:
    name=f'{fixture}-{variant}';dest=out/name;dest.mkdir(exist_ok=True)
    project=build/name;fdir=out/'fixtures'/fixture
    args=[lang,'emit-state',fdir/'source.lang','--wasm-abi','-o',project]
    if variant!='scan':args+=['--maintenance',out/'maintenance.json']
    if variant=='bounded':args+=['--bounded-totals']
    run(args)
    run(['python3','dev.py','build','--release','--bin','compiled-state','--offline','--manifest-path',project/'Cargo.toml','--target-dir',build/'native-target'])
    binary=dest/'native-runner';shutil.copy2(build/'native-target/release/compiled-state',binary)
    run(['python3','dev.py','build','--release','--lib','--target','wasm32-unknown-unknown','--offline','--manifest-path',project/'Cargo.toml','--target-dir',build/'wasm-target'])
    shutil.copy2(build/'wasm-target/wasm32-unknown-unknown/release/compiled_state.wasm',dest/'program.wasm')
    for src,filename in [('src/lib.rs','generated.rs'),('Cargo.toml','Cargo.toml'),('Cargo.lock','Cargo.lock'),('plan.json','plan.json')]:shutil.copy2(project/src,dest/filename)
    stdout=run([binary,fdir/'middle-script.json','--restore',fdir/'before.bin','--snapshot-out',dest/'native-middle.bin'],True)
    (dest/'native-middle-outcomes.json').write_text(stdout)
    same_json(stdout,fdir/'middle-expected.json');same_bytes(dest/'native-middle.bin',fdir/'middle.bin');native_checks+=len(json.loads(stdout))
    wrong='bounded' if fixture=='inventory' else 'inventory'
    modes.append({'name':name,'wasm':name+'/program.wasm','fixture':'fixtures/'+fixture,'native_middle':name+'/native-middle.bin','return_snapshot':name+'/wasm-return.bin','wrong_snapshot':'fixtures/'+wrong+'/tail.bin'})
# Explicitly migrate between different physical implementations of each program.
for mode in modes:
    siblings=[m for m in modes if m['fixture']==mode['fixture']]
    index=siblings.index(mode)
    source=siblings[(index-1)%len(siblings)]['name']
    receiver=siblings[(index+1)%len(siblings)]['name']
    mode.update(native_middle=source+'/native-middle.bin',native_source=source,native_receiver=receiver)
manifest={'fixture_files':fixture_files,'modes':modes}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
run(['node','bench/state-wasm.mjs',out/'manifest.json',out/'validation.json'])
for mode in modes:
    name=mode['name'];dest=out/name;fdir=out/mode['fixture']
    stdout=run([out/mode['native_receiver']/'native-runner',fdir/'future-script.json','--restore',out/mode['return_snapshot'],'--snapshot-out',dest/'native-future.bin'],True)
    (dest/'native-future-outcomes.json').write_text(stdout)
    same_json(stdout,fdir/'future-expected.json');same_bytes(dest/'native-future.bin',fdir/'future.bin');native_checks+=len(json.loads(stdout))
env=os.environ.copy()
local=root.parents[1]/'work/toolchain'
if not shutil.which('rustc') and (local/'cargo/bin/rustc').exists():
    env.update(CARGO_HOME=str(local/'cargo'),RUSTUP_HOME=str(local/'rustup'),PATH=str(local/'cargo/bin')+os.pathsep+env['PATH'])
versions={name:subprocess.check_output(argv,env=env,text=True).strip() for name,argv in [('rustc',['rustc','-Vv']),('cargo',['cargo','--version']),('node',['node','--version'])]}
metadata={'status':'passed','commands':commands,'native_outcome_checks':native_checks,'toolchains':versions,'sha256':{str(p.relative_to(out)):hashlib.sha256(p.read_bytes()).hexdigest() for p in out.rglob('*') if p.is_file() and (p.suffix in ['.bin','.lang'] or p.name in ['program.wasm','native-runner','generated.rs','Cargo.lock','maintenance.json','manifest.json'])},'scope':'Five real compiled implementations, bidirectional native/Wasm checkpoints and future calls against independent reference; timings not measured.'}
(out/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps({'status':'passed','native_outcome_checks':native_checks,'report':str(out)},indent=2))
