#!/usr/bin/env python3
"""Rebuild/validate literal and database-selected collection Wasm, including allocation ownership."""
from pathlib import Path
import subprocess,os,json,hashlib,shutil
root=Path(__file__).resolve().parents[1];out=root/'reports/collection-proof-wasm-phase1';out.mkdir(exist_ok=True)
zig=shutil.which('zig');configured=root.parents[1]/'work/toolchain/zig-path.txt'
if not zig and configured.exists():zig=configured.read_text().strip()
if not zig:raise SystemExit('Configure Zig to build pure Wasm')
env=os.environ.copy();env['ZIG_GLOBAL_CACHE_DIR']=str(root/'build/zig-cache');commands=[]
def run(command):
    command=list(map(str,command));commands.append(command);subprocess.run(command,cwd=root,env=env,check=True)
run(['python3','dev.py','build','--bin','lang'])
run(['python3','tools/collection_proofs.py','knowledge/collections'])
for name in ['staged','checked','semantics']:
    source='bench/collections/semantics.lang' if name=='semantics' else 'knowledge/collections/kernels.lang'
    command=['target/debug/lang','build',source,'--target','wasm32','--zig',zig,'-o',out/f'{name}.wasm']
    if name=='checked':command+=['--implementation','knowledge/collections/proposal.json']
    run(command)
run(['node','bench/collections/wasm.mjs',*[out/f'{name}.wasm' for name in ['staged','checked','semantics']],out/'validation.json'])
(out/'metadata.json').write_text(json.dumps(dict(commands=commands,zig=subprocess.check_output([zig,'version'],text=True).strip(),wasm_sha256={name:hashlib.sha256((out/f'{name}.wasm').read_bytes()).hexdigest() for name in ['staged','checked','semantics']}),indent=2)+'\n')
for source in ['bench/collections/wasm.mjs','bench/collections/semantics.lang','bench/collection-wasm.py']:shutil.copy2(root/source,out/Path(source).name)
