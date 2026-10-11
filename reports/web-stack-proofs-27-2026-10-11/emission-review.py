"""Read-only known-call emission shape and executable equality audit."""
import hashlib,json,re
from pathlib import Path
R=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def body(source,pattern):
 match=re.search(pattern,source);assert match,pattern
 opening=source.index('{',match.start());depth=1;i=opening+1
 while depth:depth+=(source[i]=='{')-(source[i]=='}');i+=1
 return source[match.start():i]
def leb(v,i):
 n=s=0
 while True:
  b=v[i];i+=1;n|=(b&127)<<s;s+=7
  if not b&128:return n,i
def sections(p):
 v=p.read_bytes();assert v[:8]==b'\x00asm\x01\x00\x00\x00';i=8;out=[]
 while i<len(v):
  k=v[i];i+=1;n,i=leb(v,i);b=v[i:i+n];i+=n;name=''
  if k==0:l,j=leb(b,0);name=b[j:j+l].decode()
  out.append((k,name,b))
 return out
m=read(R/'metadata.json');rows=[]
for task,t in m['tasks'].items():
 for proof in ['prior','checked']:
  paths={k:R/t['matrix_bundles'][k+'_'+proof]['bundle'] for k in ['old','new']};js={k:body((p/'program.mjs').read_text(),r'function __fn0\(') for k,p in paths.items()};c={k:body((p/'cpu.c').read_text(),r'(?:ink_l_uint32|uint32_t) lang_fn_'+re.escape(task)+r'\([^;]*?\)\{') for k,p in paths.items()}
  calls={k:dict(js=len(re.findall(r'__fn[1-9][0-9]*\(',js[k])),c=len(re.findall(r'lang_fn_(?!'+re.escape(task)+r'\b)\w+\(',c[k]))) for k in paths}
  fresh=t['fresh_proof_required'];assert calls['new']==dict(js=0,c=0),(task,proof,calls)
  for retired in ['__map(', '__filter(', '__zip(', '__scan(', '__foldr(', '(()=>','=>']:assert retired not in js['new'],(task,proof,retired)
  same={f:sha(paths['old']/f)==sha(paths['new']/f) for f in ['program.mjs','cpu.c','cpu.wasm']}
  a=sections(paths['old']/'cpu.wasm');b=sections(paths['new']/'cpu.wasm');executables_equal=[(k,v) for k,n,v in a if k]!=[(k,v) for k,n,v in b if k];executables_equal=not executables_equal
  if fresh:
   assert same['program.mjs'] and same['cpu.c'] and executables_equal,(task,proof,same)
   assert calls['old']==dict(js=0,c=0)
  else:
   assert calls['old']['js']>0 and calls['old']['c']>0,(task,proof,calls)
   assert not same['program.mjs'] and not same['cpu.c']
   assert '/* inline ' in js['new'] and '/* inline ' in c['new']
  fnold=read(paths['old']/'manifest.json')['functions'];fnnew=read(paths['new']/'manifest.json')['functions'];assert [(f['name'],f['params'],f['result']) for f in fnold]==[(f['name'],f['params'],f['result']) for f in fnnew]
  gpuEqual=all(sha(p)==sha(paths['new']/p.relative_to(paths['old'])) for p in paths['old'].rglob('*') if p.is_file() and (p.suffix=='.wgsl' or p.name in ['ink-gpu.mjs','ink-device.mjs']));assert gpuEqual
  rows.append(dict(task=task,proof=proof,fresh_proof_required=fresh,named_helper_calls=calls,root_bytes={k:dict(js=len(js[k].encode()),c=len(c[k].encode())) for k in paths},root_loops={k:dict(js=len(re.findall(r'for\s*\(',js[k])),c=len(re.findall(r'for\s*\(',c[k]))) for k in paths},inline_sites={k:dict(js=js[k].count('/* inline '),c=c[k].count('/* inline ')) for k in paths},whole_file_equality=same,wasm_executable_sections_equal=executables_equal,fixed_proof_gpu_bytes_equal=gpuEqual,all_exports_preserved=len(fnnew)))
# Filter list helper is explicitly bound in the source and both prior/current C roots.
for backend in ['old','new']:
 for proof in ['prior','checked']:
  task='helper_accepted_projection_u32';r=next(q for q in rows if q['task']==task and q['proof']==proof)
  text=c if False else (R/backend/proof/task/'cpu.c').read_text();root=body(text,r'ink_l_uint32 lang_fn_'+task+r'\([^;]*?\)\{');count=root.count('lang_fn_helper_accept_list(');assert count==(1 if backend=='old' else 0),(backend,proof,count)
result=dict(status='passed',rows=rows,scope='One fixed proof core per compiler comparison. Six references lose named root helper calls; all exports and ABIs remain. Two fresh roots have identical old/new JS/C and Wasm executable sections; backend-factor interval differences there are variation, not inlining gains. GPU host/device/WGSL bytes unchanged per fixed proof. Filter helper explicitly Let-bound once in old roots, excluding accidental repeated-list-call speedups. Source shape is not a proof of machine-code profitability.',bindings={str(p.relative_to(R)):sha(p) for p in [Path(__file__),R/'metadata.json']})
(R/'emission-review.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(status='passed',rows=len(rows))))
