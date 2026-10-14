#!/usr/bin/env python3
"""Re-emit frozen selected programs after integration; this does not time them."""
from pathlib import Path
import json,subprocess,hashlib,shutil
B=Path(__file__).resolve().parents[1];R=B/'reports/web-stack-engine-39-2026-10-11';O=R/'merged-integration/verified';O.mkdir();C=O.parent/'ink-merged-frozen';G=R/'general-final'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def leb(data,i):
 v=0;s=0
 while True:
  b=data[i];i+=1;v|=(b&127)<<s
  if b<128:return v,i
  s+=7
def executable(data):
 assert data[:8]==b'\0asm\1\0\0\0';i=8;out=[]
 while i<len(data):
  kind=data[i];i+=1;n,i=leb(data,i);body=data[i:i+n];i+=n
  if kind:out.append((kind,hashlib.sha256(body).hexdigest()))
 return out
rows=[];commands=[]
for td in sorted((G/'targets').iterdir()):
 out=O/'targets'/td.name
 argv=[str(C),'build',str(td/'candidate.core.json'),'--core','--target','webgpu','--zig',str(B.parent/'toolchain/zig-aarch64-macos-0.15.2/zig'),'-o',str(out)]
 p=subprocess.run(argv,cwd=B,capture_output=True,text=True);commands.append(dict(argv=argv,exit_code=p.returncode,stdout=p.stdout,stderr=p.stderr))
 if p.returncode:raise RuntimeError(p.stderr)
 previous=td/'candidate';files={}
 for f in sorted(previous.iterdir()):
  if not f.is_file():continue
  new=out/f.name;files[f.name]=dict(measured=sha(f),merged=sha(new),byte_identical=f.read_bytes()==new.read_bytes())
 for name in ['cpu.c','program.mjs']:assert files[name]['byte_identical'],(td.name,name,'generated computation changed')
 prefix=''.join('struct InkBuffer_'+t+'{data:array<'+t+',64>,length:u32,}\n' for t in ['u32','i32','f32','bool'])
 for shader in previous.glob('*.wgsl'):
  body=(out/shader.name).read_text();assert body.startswith(prefix);body=body[len(prefix):];assert 'InkBuffer_' not in body;assert shader.read_text()==body,(td.name,shader.name,'shader computation changed')
 assert executable((previous/'cpu.wasm').read_bytes())==executable((out/'cpu.wasm').read_bytes()),(td.name,'Wasm executable sections changed')
 before=json.loads((previous/'manifest.json').read_text());after=json.loads((out/'manifest.json').read_text());
 for manifest,folder in [(before,previous),(after,out)]:
  assert all(manifest['shaders'][p.name]==sha(p)for p in folder.glob('*.wgsl'));manifest.pop('shaders')
  for fn in manifest['functions']:
   graph=fn.get('graph')
   if graph:
    limitations=graph['limitations'];assert limitations[-1] in ['feedback unsupported','feedback requires matching bounded capacities and all stages to have graph descriptors'];limitations.pop()
 assert before==after,(td.name,'manifest computation/interface changed')
 rows.append(dict(task=td.name,files=files,wasm_noncustom_sections_identical=True,manifest_identical_except_shader_hashes_and_feedback_limitation=True,shader_identical_except_four_unreferenced_buffer_type_declarations=True,scope='CPU computations byte-identical; shader statements identical after removing four unreferenced buffer type declarations; distinct host/device source integration; no new timer samples.'))
 print(td.name,flush=True)
(O/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
(O/'byte-parity.json').write_text(json.dumps(dict(status='passed',compiler_sha256=sha(C),measured_compiler_sha256=json.loads((R/'candidate-final-freeze.json').read_text())['sha256'],tasks=rows,source_heads={p:subprocess.check_output(['git','rev-parse','HEAD'],cwd=B/p,text=True).strip()for p in ['.','lowerings/js','lowerings/gpu','lowerings/rust','lowerings/wasm','runtime','planner']}),indent=2)+'\n')
