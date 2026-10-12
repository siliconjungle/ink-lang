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
numeric = [Path('build/generated-parity-u64'), Path('build/generated-parity-f32'), Path('build/source-contracts-parity'), Path('build/total-changes-parity'), Path('build/state-contracts-parity'), Path('build/action-contract-refinement'), *[Path(f'build/contract-refinement-{i}') for i in range(4)]]
for fixture in numeric:
    source = json.loads((fixture / 'c/manifest.json').read_text())
    target = json.loads((fixture / 'gpu-module/manifest.json').read_text())
    if source['core_sha256'] != target['core_sha256']:
        raise SystemExit('numeric browser source identity mismatch')
    shutil.copyfile(fixture / 'c/target/wasm32-unknown-unknown/debug/compiled_state.wasm',
                    fixture / 'gpu-module/cpu/compiled_state.wasm')
for c in [*root.glob('gpu-module/gpu/*/cpu.c'), Path('build/lowering-residency/cpu.c'),
          *[c for fixture in numeric for c in fixture.glob('gpu-module/gpu/*/cpu.c')]]:
    subprocess.run([zig, 'cc', '-target', 'wasm32-freestanding', '-O3',
                    '-msimd128', '-std=c11', '-ffreestanding', '-nostdlib',
                    '-Wl,--no-entry', '-Wl,--export-memory',
                    *[f'-Wl,--export={name}' for name in symbols],
                    str(c), '-o', str(c.with_suffix('.wasm'))], check=True)
