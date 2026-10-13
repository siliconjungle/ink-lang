from pathlib import Path
import subprocess,json
r=Path(__file__).resolve().parents[2];b=r/'build/numeric-text-primitives';work=b/'wasm-bench';(work/'src').mkdir(parents=True,exist_ok=True)
(work/'src/lib.rs').write_text((r/'bench/numeric-text-primitives/wasm-bench.rs').read_text())
(work/'Cargo.toml').write_text('[package]\nname="ink-numeric-wasm-bench"\nversion="0.1.0"\nedition="2021"\n[lib]\ncrate-type=["cdylib"]\n[dependencies]\ncompiled-state={path='+json.dumps(str(b/'rust'))+'}\nserde_json={version="=1.0.151",features=["float_roundtrip"]}\n[workspace]\n')
subprocess.run(['cargo','build','--release','--offline','--target','wasm32-unknown-unknown','--manifest-path',str(work/'Cargo.toml')],check=True)
out=r/'reports/numeric-text-primitives-2026-10-13';import shutil;shutil.copyfile(work/'target/wasm32-unknown-unknown/release/ink_numeric_wasm_bench.wasm',out/'rust-bench.wasm')
for part,name,width in [(0,'float_ops',8),(6,'word_stats',3),(2,'from_wide',1)]:
 source=(b/f'gpu/gpu/f{part}/native/cpu.c').read_text()
 source+=f'''\nstatic uint32_t bench_input[131072];\nuint32_t bench_input_ptr(void){{return (uint32_t)(uintptr_t)bench_input;}}\nuint32_t bench_call(uint32_t n){{ink_part{part}_ink_compute_reset();const void *args[]={{bench_input}};size_t lengths[]={{n}};void *out=0;size_t count=0;ink_part{part}_ink_compute_call(0,args,lengths,&out,&count);if(count!=n*{width})__builtin_trap();return (uint32_t)(uintptr_t)out;}}\n'''
 p=b/(name+'.c');p.write_text(source)
 subprocess.run([str(r/'build/toolchains/ziglang/zig'),'cc','-target','wasm32-freestanding','-O3','-ffp-contract=off','-fno-math-errno','-nostdlib','-Wl,--no-entry','-Wl,--export=bench_input_ptr','-Wl,--export=bench_call','-Wl,--initial-memory=33554432',str(p),'-o',str(out/(name+'.wasm'))],check=True)
