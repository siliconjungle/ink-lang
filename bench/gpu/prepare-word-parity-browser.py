"""Compile every Rust/Wasm CPU fallback used by browser word parity."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from build_gpu_wasm import build
for name in ['generated-parity-word-boundaries','generated-parity-semantic-word-baseline','semantic-word-selected']:
 bundle=Path('build')/name/'gpu-module'
 build(bundle)
 binary=bundle/'cpu.wasm'
 if not binary.is_file() or binary.stat().st_size<=8 or binary.read_bytes()[:8]!=b'\x00asm\x01\x00\x00\x00':
  raise ValueError(f'{name}: compiled browser CPU fallback is missing or invalid')
