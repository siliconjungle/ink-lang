#!/usr/bin/env python3
"""Rebuild and validate filtered proofs and conditional execution in pure Wasm."""
from pathlib import Path
import subprocess,os,json,hashlib,shutil
root=Path(__file__).resolve().parents[1];out=root/'reports/filter-proof-wasm-phase1';out.mkdir(exist_ok=True)
zig=shutil.which('zig');configured=root.parents[1]/'work/toolchain/zig-path.txt'
if not zig and configured.exists():zig=configured.read_text().strip()
if not zig:raise SystemExit('Configure Zig to build pure Wasm')
env=os.environ.copy();env['ZIG_GLOBAL_CACHE_DIR']=str(root/'build/zig-cache');commands=[]
def run(command):
    command=list(map(str,command));commands.append(command);subprocess.run(command,cwd=root,env=env,check=True)
run(['python3','dev.py','build','--bin','ink'])
run(['python3','tools/filter_proofs.py','knowledge/filtered'])
for name in ['staged','checked','semantics']:
    source='bench/filtered/semantics.ink' if name=='semantics' else 'knowledge/filtered/kernels.lang'
    command=['target/debug/ink','build',source,'--target','wasm32','--zig',zig,'-o',out/f'{name}.wasm']
    if name=='checked':command+=['--implementation','knowledge/filtered/proposal.json']
    run(command)
run(['node','bench/filtered/wasm.mjs',*[out/f'{name}.wasm' for name in ['staged','checked','semantics']],out/'validation.json'])
(out/'metadata.json').write_text(json.dumps(dict(commands=commands,zig=subprocess.check_output([zig,'version'],text=True).strip(),wasm_sha256={name:hashlib.sha256((out/f'{name}.wasm').read_bytes()).hexdigest() for name in ['staged','checked','semantics']}),indent=2)+'\n')
for source in ['bench/filtered/wasm.mjs','bench/filtered/wasm-checks.mjs','bench/filtered/semantics.ink','bench/filter-wasm.py']:shutil.copy2(root/source,out/Path(source).name)
