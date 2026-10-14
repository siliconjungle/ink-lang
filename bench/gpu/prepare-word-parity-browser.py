"""Build literal C-compute Wasm for exact word/browser conformance artifacts."""
import pathlib,subprocess,sys
symbols=['ink_compute_call','ink_compute_into','ink_compute_mark','ink_compute_rewind','ink_compute_scalar32','ink_compute_scalar64','ink_compute_reset','ink_alloc','__heap_base']
for name in ['generated-parity-word-boundaries','generated-parity-semantic-word-baseline','semantic-word-selected']:
 root=pathlib.Path('build')/name/'gpu-module'
 subprocess.run([sys.argv[1],'cc','-target','wasm32-freestanding','-O3','-msimd128','-std=c11','-ffreestanding','-nostdlib','-Wl,--no-entry','-Wl,--export-memory',*[f'-Wl,--export={s}'for s in symbols],str(root/'cpu.c'),'-o',str(root/'cpu.wasm')],check=True)
