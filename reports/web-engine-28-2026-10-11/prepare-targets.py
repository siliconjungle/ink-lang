from pathlib import Path
import subprocess,json,hashlib,shutil,re,platform
R=Path(__file__).resolve().parent;B=R.parents[1];P=B.parent;R27=B/'reports/web-stack-proofs-27-2026-10-11'
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
compiler=P/'toolchain/ink-web-engine-28';zig=P/'toolchain/zig-aarch64-macos-0.15.2/zig'
commands=[]
def run(argv):
 p=subprocess.run(list(map(str,argv)),cwd=B,capture_output=True,text=True);commands.append({'argv':list(map(str,argv)),'returncode':p.returncode,'stdout':p.stdout,'stderr':p.stderr});assert p.returncode==0,p.stderr
spec=json.loads((R27/'spec.json').read_text());tasks=spec['tasks'];out=R/'native';out.mkdir(exist_ok=True)
for filename in ['spec.json','fixtures.json','expert.mjs','literal.mjs','rust-expert.wasm']:
 shutil.copy2(R27/filename,R/filename)
for t in tasks:
 name=t['name'];core=R27/'tasks'/name/'checked-selected.core.json';target=R/'current'/name
 run([compiler,'build',core,'--core','--target','webgpu','--zig',zig,'-o',target])
 baseline=R/'baseline'/name;baseline.mkdir(parents=True,exist_ok=True)
 for filename in ['manifest.json','cpu.wasm','program.mjs','ink-gpu.mjs','ink-device.mjs','backend-selection.mjs']:
  shutil.copy2(R27/'new/checked'/name/filename,baseline/filename)
for mode in ['owned','into']:
 chunks=['#include <stdint.h>\n#include <stddef.h>\n#include <stdlib.h>\ntypedef struct {const uint32_t *data;size_t len;uint64_t scalar;} BenchResult;\n'];calls=[];resets=[]
 for t in tasks:
  name=t['name'];c=R/'current'/name/'cpu.c';prefix='n28_'+name+'_';symbols=sorted(set(re.findall(r'\b(?:ink_|lang_fn_)[a-zA-Z0-9_]+\b',c.read_text())))
  chunks.extend(f'#define {s} {prefix}{s}\n' for s in symbols);chunks.append(f'#include "{c}"\n');chunks.extend(f'#undef {s}\n' for s in symbols)
  args=[f'({prefix}ink_l_uint32){{x,nx}}'];
  if len(t['list_inputs'])==2:args.append(f'({prefix}ink_l_uint32){{y,ny}}')
  args+=['seed','k'];fn=prefix+'lang_fn_'+name
  if t['scalar']:calls.append(f'case {t["index"]}:return (BenchResult){{0,0,(uint64_t){fn}({",".join(args)})}};')
  elif mode=='into':calls.append(f'case {t["index"]}:{{size_t n={fn}_into({",".join(args)},out);return (BenchResult){{out,n,0}};}}')
  else:calls.append(f'case {t["index"]}:{{{prefix}ink_l_uint32 r={fn}({",".join(args)});return (BenchResult){{r.data,r.len,0}};}}')
  resets.append(f'case {t["index"]}:{prefix}ink_compute_reset();break;')
 chunks.append('static uint32_t active_task;\nBenchResult bench_call(uint32_t task,const uint32_t*x,size_t nx,const uint32_t*y,size_t ny,uint32_t seed,uint32_t k,uint32_t*out){(void)out;active_task=task;switch(task){'+''.join(calls)+'default:__builtin_unreachable();}}\nvoid bench_reset(void){switch(active_task){'+''.join(resets)+'default:break;}}\n')
 source=out/f'current-{mode}.c';source.write_text(''.join(chunks));run(['clang','-O3','-mcpu=native' if platform.machine()=='arm64' else '-march=native','-ffp-contract=off','-std=c11','-shared',source,'-o',out/f'current-{mode}.dylib'])
for source,dest in [('ink-new_checked.dylib','baseline.dylib'),('rust-expert.dylib','rust-expert.dylib'),('driver','driver'),('driver.c','driver.c')]:shutil.copy2(R27/'native'/source,out/dest)
(R/'preparation.json').write_text(json.dumps({'status':'prepared','compiler':str(compiler),'compiler_sha256':sha(compiler),'fixed_core_scope':'exact batch27 checked selected cores, no reselection; architectural changes isolated','tasks':tasks,'commands':commands,'bindings':{str(p.relative_to(R)):sha(p) for folder in ['current','baseline','native'] for p in sorted((R/folder).rglob('*')) if p.is_file()},'controls':{f:sha(R/f) for f in ['spec.json','fixtures.json','expert.mjs','literal.mjs','rust-expert.wasm']}},indent=2)+'\n')
print('prepared',len(tasks),'fixed-core bundles and destination native controls')
