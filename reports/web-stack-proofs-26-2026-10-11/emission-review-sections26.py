"""Read-only source-level JS machinery and matched non-JS backend audit."""
import hashlib,json,re
from pathlib import Path
R=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def body(source):
 start=source.index('function __fn0(');opening=source.index('{',start);depth=1;i=opening+1
 while depth:
  depth+=(source[i]=='{')-(source[i]=='}');i+=1
 return source[start:i]
def leb(v,i):
 n=s=0
 while True:
  b=v[i];i+=1;n|=(b&127)<<s;s+=7
  if not b&128:return n,i
def wasm_sections(p):
 v=p.read_bytes();assert v[:8]==b'\x00asm\x01\x00\x00\x00';i=8;out=[]
 while i<len(v):
  k=v[i];i+=1;n,i=leb(v,i);b=v[i:i+n];i+=n;name=''
  if k==0:l,j=leb(b,0);name=b[j:j+l].decode()
  out.append((k,name,b))
 return out
m=read(R/'metadata.json');rows=[]
for task,t in m['tasks'].items():
 for proof in ['prior','checked']:
  paths={backend:R/t['matrix_bundles'][backend+'_'+proof]['bundle'] for backend in ['old','new']}
  targets={backend:body((p/'program.mjs').read_text()) for backend,p in paths.items()}
  for retired in ['__map(', '__filter(', '__zip(', '__scan(', '__foldr(', '__repeat(', '__sum(', '__at(', '__div(', '(()=>']:
   assert retired not in targets['new'],(task,proof,retired)
  assert '=>' not in targets['new'],(task,proof,'per-element callback')
  same={name:sha(paths['old']/name)==sha(paths['new']/name) for name in ['cpu.c','cpu.wasm']}
  assert same['cpu.c'],(task,proof,'C source changed')
  oldsections=wasm_sections(paths['old']/'cpu.wasm');newsections=wasm_sections(paths['new']/'cpu.wasm');assert [(k,n) for k,n,b in oldsections]==[(k,n) for k,n,b in newsections]
  differing=[]
  for (k,n,a),(_,_,b) in zip(oldsections,newsections):
   if a!=b:
    assert k==0 and n in ['.debug_str','.debug_line'],(task,proof,k,n)
    assert a.replace(b'/old/',b'/new/')==b,(task,proof,n,'unexpected DWARF difference')
    differing.append(n)
  same['wasm_executable_and_other_custom_sections']=True
  same['debug_path_only_differences']=differing
  rows.append(dict(task=task,proof=proof,root_function_bytes={k:len(v.encode()) for k,v in targets.items()},root_function_lines={k:len(v.splitlines()) for k,v in targets.items()},loops={k:len(re.findall(r'for\s*\(',v)) for k,v in targets.items()},retired_helper_calls={k:len(re.findall(r'__(?:map|filter|zip|scan|foldr|repeat|sum|at|div)\(',v)) for k,v in targets.items()},callback_arrows={k:v.count('=>') for k,v in targets.items()},unchanged_non_js_outputs=same))
v=dict(status='passed',rows=rows,scope='Source-level machinery counts only, not machine code proofs or allocation measurement. New direct JS roots contain no collection/division callback or Let IIFE; identical C and Wasm executable sections isolate backend effects; archived complete Wasm bytes differ only by old/new paths in DWARF debug metadata. Source size can increase with statement lowering.')
(R/'emission-review.json').write_text(json.dumps(v,indent=2)+'\n');print(json.dumps(dict(status='passed',rows=len(rows))))
