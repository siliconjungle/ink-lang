#!/usr/bin/env python3
"""Build emitted Rust CPU fallbacks for browser WebGPU bundles."""
from pathlib import Path
import argparse,subprocess,shutil

def build(bundle,target_dir=None):
 bundle=Path(bundle)
 project=bundle/'cpu'
 if (project/'Cargo.toml').is_file():
  cache=Path(target_dir) if target_dir is not None else project/'target'
  subprocess.run(['cargo','build','--offline','--release','--lib','--target','wasm32-unknown-unknown','--manifest-path',str(project/'Cargo.toml'),'--target-dir',str(cache)],check=True)
  name='compiled_state' if 'name="compiled-state"'in (project/'Cargo.toml').read_text() else 'ink_packed_cpu'
  output=project/'compiled_state.wasm' if name=='compiled_state'else bundle/'cpu.wasm'
  shutil.copyfile(cache/'wasm32-unknown-unknown/release'/f'{name}.wasm',output)
 for child in sorted((bundle/'gpu').glob('*')):build(child,target_dir)

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('bundles',nargs='+',type=Path)
 p.add_argument('--target-dir',type=Path,help='share Cargo-validated dependency builds across generated packages; each package still builds and copies its own output in order')
 args=p.parse_args()
 for bundle in args.bundles:build(bundle,args.target_dir)
