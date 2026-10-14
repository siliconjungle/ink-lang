"""Build browser Rust CPU fallbacks from the exact conformance programs."""
from pathlib import Path
import json,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from build_gpu_wasm import build
def prepare():
 candidates=json.loads(Path('build/contract-candidates/candidates.json').read_text())['candidates']
 if not isinstance(candidates,list) or not candidates:raise ValueError('missing checked contract candidates')
 words=json.loads(Path(__file__).with_name('word-fixtures.json').read_text())
 if not isinstance(words,list) or not words or any(not isinstance(n,str) or n in ('','.','..') or Path(n).name!=n for n in words):
  raise ValueError('invalid browser word fixtures')
 if len(set(words))!=len(words):raise ValueError('duplicate browser word fixture')
 names=['generated-parity-bend','generated-parity-u64','generated-parity-f32','source-contracts-parity','total-changes-parity','state-contracts-parity','action-contract-refinement','lowering-residency',*words,*[f'contract-refinement-{i}'for i in range(len(candidates))]]
 bundles=[]
 for name in names:
  root=Path('build')/name
  bundle=root/'gpu-module'if (root/'gpu-module').is_dir()else root
  # build() supports recursive bundles, and is a no-op for absent projects.
  # Every replayed browser fixture here requires an actual CPU fallback.
  if not (bundle/'cpu/Cargo.toml').is_file():
   raise ValueError(f'browser fixture missing CPU project: {bundle}')
  bundles.append(bundle)
 for bundle in bundles:build(bundle)

if __name__=='__main__':prepare()
