"""Build browser transport artifacts from the exact conformance programs."""
import json
from pathlib import Path
import shutil
import subprocess
import sys

zig = sys.argv[1]
root = Path('build/generated-parity-bend')
source = json.loads((root / 'c/manifest.json').read_text())
target = json.loads((root / 'gpu-module/manifest.json').read_text())
if source['core_sha256'] != target['core_sha256']:
    raise SystemExit('browser CPU artifact source identity mismatch')
shutil.copyfile(root / 'c/target/wasm32-unknown-unknown/debug/compiled_state.wasm',
                root / 'gpu-module/cpu/compiled_state.wasm')
symbols = ['ink_compute_call', 'ink_compute_into', 'ink_compute_mark',
           'ink_compute_rewind', 'ink_compute_scalar32', 'ink_compute_scalar64',
           'ink_compute_reset', 'ink_alloc', '__heap_base']
for c in [*root.glob('gpu-module/gpu/*/cpu.c'), Path('build/lowering-residency/cpu.c')]:
    subprocess.run([zig, 'cc', '-target', 'wasm32-freestanding', '-O3',
                    '-msimd128', '-std=c11', '-ffreestanding', '-nostdlib',
                    '-Wl,--no-entry', '-Wl,--export-memory',
                    *[f'-Wl,--export={name}' for name in symbols],
                    str(c), '-o', str(c.with_suffix('.wasm'))], check=True)
