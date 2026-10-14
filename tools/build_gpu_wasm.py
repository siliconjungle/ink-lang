#!/usr/bin/env python3
"""Build emitted Rust CPU fallbacks for browser WebGPU bundles."""
from pathlib import Path
import argparse,subprocess,shutil

def build(bundle):
 bundle=Path(bundle)
 project=bundle/'cpu'
 if (project/'Cargo.toml').is_file():
  subprocess.run(['cargo','build','--offline','--release','--lib','--target','wasm32-unknown-unknown','--manifest-path',str(project/'Cargo.toml'),'--target-dir',str(project/'target')],check=True)
  name='compiled_state' if 'name="compiled-state"'in (project/'Cargo.toml').read_text() else 'ink_packed_cpu'
  output=project/'compiled_state.wasm' if name=='compiled_state'else bundle/'cpu.wasm'
  shutil.copyfile(project/'target/wasm32-unknown-unknown/release'/f'{name}.wasm',output)
 for child in sorted((bundle/'gpu').glob('*')):build(child)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('bundles',nargs='+',type=Path)
 for bundle in p.parse_args().bundles:build(bundle)
