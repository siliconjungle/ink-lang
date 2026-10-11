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
m=read(R/'metadata.json');rows=[]
for task,t in m['tasks'].items():
 for proof in ['prior','checked']:
  paths={backend:R/t['matrix_bundles'][backend+'_'+proof]['bundle'] for backend in ['old','new']}
  targets={backend:body((p/'program.mjs').read_text()) for backend,p in paths.items()}
  for retired in ['__map(', '__filter(', '__zip(', '__scan(', '__foldr(', '__repeat(', '__sum(', '__at(', '__div(', '(()=>']:
   assert retired not in targets['new'],(task,proof,retired)
  assert '=>' not in targets['new'],(task,proof,'per-element callback')
  same={name:sha(paths['old']/name)==sha(paths['new']/name) for name in ['cpu.c','cpu.wasm']}
  assert all(same.values()),(task,proof,'non-JS backend unexpectedly changed')
  rows.append(dict(task=task,proof=proof,root_function_bytes={k:len(v.encode()) for k,v in targets.items()},root_function_lines={k:len(v.splitlines()) for k,v in targets.items()},loops={k:len(re.findall(r'for\s*\(',v)) for k,v in targets.items()},retired_helper_calls={k:len(re.findall(r'__(?:map|filter|zip|scan|foldr|repeat|sum|at|div)\(',v)) for k,v in targets.items()},callback_arrows={k:v.count('=>') for k,v in targets.items()},unchanged_non_js_outputs=same))
v=dict(status='passed',rows=rows,scope='Source-level machinery counts only, not machine code proofs or allocation measurement. New direct JS roots contain no collection/division callback or Let IIFE; unchanged C/Wasm outputs isolate backend effects. Source size can increase with statement lowering.')
(R/'emission-review.json').write_text(json.dumps(v,indent=2)+'\n');print(json.dumps(dict(status='passed',rows=len(rows))))
