"""Build the Rust CPU fallback of the checked composed browser fixture."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from build_gpu_wasm import build
folder=Path('build/database-plan-conformance/composed')
if not (folder/'manifest.json').is_file():
 raise ValueError('checked composed fixture missing; run database_planning with INK_TEST_WGPU=1 first')
build(folder/'route')
