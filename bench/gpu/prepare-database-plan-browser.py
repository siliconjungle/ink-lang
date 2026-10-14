"""Build the Rust CPU fallback of the checked composed browser fixture."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from build_gpu_wasm import build
build(Path('build/database-plan-conformance/composed/route'))
