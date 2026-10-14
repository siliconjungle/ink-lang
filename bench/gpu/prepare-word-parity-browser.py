from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[2]/'tools'))
from build_gpu_wasm import build
for root in Path('build').glob('generated-parity-word-*'):build(root)
