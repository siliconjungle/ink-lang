#!/usr/bin/env python3
from pathlib import Path
import os,subprocess,hashlib,json,shutil
root=Path(__file__).resolve().parents[1]
out=root/'reports/wasm-phase3-literal';out.mkdir(parents=True,exist_ok=True)
build=root/'build/wasm';build.mkdir(parents=True,exist_ok=True)
env=os.environ.copy();env['ZIG_GLOBAL_CACHE_DIR']=str(root/'build/zig-cache')
zig=shutil.which('zig')
local=root.parents[1]/'work/toolchain/zig-path.txt'
if not zig and local.exists():zig=local.read_text().strip()
if not zig:raise SystemExit('Install Zig, or configure this workspace toolchain, to build wasm32')
commands=[]
def run(args):
    args=list(map(str,args));commands.append(args)
    subprocess.run(args,cwd=root,env=env,check=True)
run(['python3','dev.py','build','--bin','lang'])
lang=root/'target/debug/lang'
run([lang,'prove','knowledge/ring.lang','-o',build/'ring.json'])
for mode in ['plain','knowledge']:
    args=[lang,'build','examples/kernels.lang','--target','wasm32','--zig',zig,'-o',build/f'{mode}.wasm']
    if mode=='knowledge':args+=['--knowledge',build/'ring.json']
    run(args)
run(['node','bench/wasm.mjs',build/'plain.wasm',build/'knowledge.wasm',out/'validation.json'])
for mode in ['plain','knowledge']:
    shutil.copy2(build/f'{mode}.wasm',out/f'{mode}.wasm')
    shutil.copy2(build/f'{mode}.wasm.plan.json',out/f'{mode}.wasm.plan.json')
metadata={'zig':subprocess.check_output([zig,'version'],text=True).strip(),'commands':commands,'wasm_sha256':{m:hashlib.sha256((out/f'{m}.wasm').read_bytes()).hexdigest() for m in ['plain','knowledge']}}
(out/'metadata.json').write_text(json.dumps(metadata,indent=2))
