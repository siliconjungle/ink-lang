#!/usr/bin/env python3
"""Build the literal CPU fallback of the checked composed browser fixture."""
import hashlib,json,subprocess,sys
from pathlib import Path
zig=sys.argv[1]
fixture=Path(sys.argv[2] if len(sys.argv)>2 else 'build/database-plan-conformance')
route=fixture/'composed/route'
manifest=json.loads((route/'manifest.json').read_bytes())
assert hashlib.sha256((route/'cpu.c').read_bytes()).hexdigest()==manifest['cpu_c_sha256']
symbols=['__heap_base',*[f"lang_fn_{f['name']}" for f in manifest['functions']]]
subprocess.run([zig,'cc','-target','wasm32-freestanding','-O3','-msimd128','-std=c11','-ffreestanding','-nostdlib','-Wl,--no-entry','-Wl,--export-memory',*[f'-Wl,--export={name}'for name in symbols],str(route/'cpu.c'),'-o',str(route/'cpu.wasm')],check=True)
