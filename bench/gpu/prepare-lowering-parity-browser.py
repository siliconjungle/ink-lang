"""Build browser Rust CPU fallbacks from the exact conformance programs."""
from pathlib import Path
import json,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from build_gpu_wasm import build
candidates=json.loads(Path('build/contract-candidates/candidates.json').read_text())['candidates']
if not isinstance(candidates,list) or not candidates:raise ValueError('missing checked contract candidates')
for name in ['generated-parity-bend','generated-parity-u64','generated-parity-f32','source-contracts-parity','total-changes-parity','state-contracts-parity','action-contract-refinement','lowering-residency',*[f'contract-refinement-{i}'for i in range(len(candidates))]]:
 root=Path('build')/name
 build(root/'gpu-module'if (root/'gpu-module').is_dir()else root)
