from pathlib import Path
import hashlib,json,subprocess,shutil
B=Path(__file__).resolve().parents[3];P=B/'build/generated-parity-memory40';R=B/'reports/web-stack-engine-40-2026-10-11/parity';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();zig=B.parent/'toolchain/zig-aarch64-macos-0.15.2/zig';a=P/'c';b=P/'gpu-module/cpu'
# Executable library inputs, metadata and exact source identity must match.
files=['program.c','build.rs','state-abi.h','src/lib.rs','src/metadata.json','src/state-cli.rs','src/durable.rs','Cargo.toml','manifest.json']
for f in files:assert(a/f).read_bytes()==(b/f).read_bytes(),f
m=json.loads((P/'gpu-module/manifest.json').read_text());cm=json.loads((b/'manifest.json').read_text());assert m['core_sha256']==cm['core_sha256']
source=a/'target/wasm32-unknown-unknown/debug/compiled_state.wasm';target=b/'compiled_state.wasm';assert source.is_file();shutil.copyfile(source,target)
receipt={'status':'prepared_untimed','copy':{'source':str(source.relative_to(B)),'destination':str(target.relative_to(B)),'wasm_sha256':sha(source),'identical_library_input_bindings':{f:sha(a/f)for f in files},'core_sha256':cm['core_sha256'],'scope':'Validated debug complete-C Wasm copied after exact executable library input/metadata/core identity equality; main.rs executable runner differs and is not a library input.'},'toolchain':{'zig':str(zig),'zig_sha256':sha(zig),'zig_version':subprocess.check_output([str(zig),'version'],text=True).strip(),'rustc':subprocess.check_output(['rustc','--version'],text=True).strip(),'runtime_toolchain_sha256':sha(B/'runtime/src/toolchain.rs'),'wasm_lowering_sha256':sha(B/'lowerings/wasm/src/lib.rs')},'parts':[],'timing_samples':0}
exports=['ink_compute_call','ink_compute_into','ink_compute_mark','ink_compute_rewind','ink_compute_scalar32','ink_compute_scalar64','ink_compute_reset','ink_alloc']
for f in m['functions']:
 if not f.get('gpu'):continue
 part=P/'gpu-module'/f['bundle'];c=part/'cpu.c';out=part/'cpu.wasm';pm=json.loads((part/'manifest.json').read_text());part_exports=['lang_fn_'+f['name'] for f in pm['functions']]if pm['runtime_abi']=='ink-scalar-pipeline-v1'else exports;args=[str(zig),'cc','-target','wasm32-freestanding','-O3','-msimd128','-std=c11','-ffreestanding','-nostdlib','-Wl,--no-entry','-Wl,--export=__heap_base','-Wl,--export-memory']+['-Wl,--export='+s for s in part_exports]+[str(c),'-o',str(out)]
 cp=subprocess.run(args,capture_output=True,text=True);assert cp.returncode==0,cp.stderr
 receipt['parts'].append({'function':f['name'],'c':str(c.relative_to(B)),'c_sha256':sha(c),'wasm':str(out.relative_to(B)),'wasm_sha256':sha(out),'command':args,'exit_code':cp.returncode,'stderr':cp.stderr})
with(R/'browser-wasm-preparation.json').open('x')as h:json.dump(receipt,h,indent=2);h.write('\n')
print(json.dumps({'status':receipt['status'],'parts':len(receipt['parts']),'receipt_sha256':sha(R/'browser-wasm-preparation.json')}))
