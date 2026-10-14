"""Build browser Rust CPU fallbacks from the exact conformance programs."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from build_gpu_wasm import build
for name in ['generated-parity-bend','generated-parity-u64','generated-parity-f32','source-contracts-parity','total-changes-parity','state-contracts-parity','action-contract-refinement','lowering-residency',*[f'contract-refinement-{i}'for i in range(4)]]:
 root=Path('build')/name
 build(root/'gpu-module'if (root/'gpu-module').is_dir()else root)
