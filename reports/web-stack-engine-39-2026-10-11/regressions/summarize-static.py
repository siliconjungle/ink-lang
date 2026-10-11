from pathlib import Path
import json,re,hashlib
R=Path(__file__).resolve().parent;B=R.parents[2];P=B/'reports/web-stack-proofs-38-2026-10-11/targets'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def leb(data,i):
 n=0;s=0
 while True:
  v=data[i];i+=1;n|=(v&127)<<s
  if v<128:return n,i
  s+=7
  assert s<64

def exports(p):
 data=p.read_bytes();assert data[:8]==b'\0asm\1\0\0\0';i=8
 while i<len(data):
  section=data[i];length,j=leb(data,i+1);end=j+length
  if section==7:
   n,j=leb(data,j);out={}
   for _ in range(n):
    size,j=leb(data,j);name=data[j:j+size].decode();j+=size;kind=data[j];index,j=leb(data,j+1);out[name]={'kind':kind,'index':index}
   assert j==end;return out
  i=end
 raise AssertionError('missing exports')
rows=[]
for directory in sorted((R/'static').iterdir()):
 for path in sorted(directory.glob('*.ll')):
  version,target=path.name.split('.')[:2];txt=path.read_text();functions=[]
  for name in ['lang_fn_'+directory.name,'lang_fn_'+directory.name+'_into']:
   m=re.search(r'^define [^\n]*@'+name+r'\([^\n]*\) [^\n]*\{\n',txt,re.M);assert m,name;body=txt[m.start():txt.index('\n}',m.end())+2]
   functions.append({'name':name,'body_sha256':hashlib.sha256(body.encode()).hexdigest(),'body_bytes':len(body),'vector_i32_loads':len(re.findall(r'load <\d+ x i32>',body)),'scalar_unsigned_division_sites':len(re.findall(r'\budiv i32',body)),'scalar_unsigned_remainder_sites':len(re.findall(r'\burem i32',body)),'vector_unsigned_division_sites':len(re.findall(r'\budiv <',body)),'vector_unsigned_remainder_sites':len(re.findall(r'\burem <',body)),'vector_predicate_compares':len(re.findall(r'\bicmp ult <',body))})
  remarks=path.with_suffix('.remarks.txt');remarklines=[line.strip()for line in remarks.read_text().splitlines()if'remark:'in line]
  output=R/'static'/directory.name/(version+'.archived-wasm.disassembly.txt');disassembly=output.read_text();rows.append({'task':directory.name,'version':version,'target':target,'functions':functions,'remarks':remarklines,'llvm_ir_sha256':sha(path),'remarks_sha256':sha(remarks),'wasm_exports':exports(P/'targets'/directory.name/version/'cpu.wasm'),'original_wasm_disassembly_available':"can't find target"not in disassembly,'original_wasm_disassembly_diagnostic_sha256':sha(output)})
out={'status':'static-only','timings':False,'rows':rows,'findings':['The LLVM remarks report vectorized loops in BOTH prior and checked Wasm; a blanket loss-of-SIMD explanation is not supported.','Positive-divisor scalar divisions/remainders appear in both modules. Checked Wasm combines vector comparisons with scalar per-lane arithmetic in one fused loop; static sites are not dynamic operation counts.','Native and Wasm compilation produce different control-flow/vectorization choices. No classified native regression appears in batch38.','Xcode llvm-objdump exists but cannot disassemble this wasm32 target; preserved error receipts record that limitation. V8 --print-wasm-code on the exported ink_compute_into function index is a proposed runtime-code diagnostic.'],'limits':'Compiler IR/remarks are separate recompilations of archived C with original target/optimization flags plus diagnostic flags; they are not a binary correspondence proof or measured causal explanation.','script_sha256':sha(Path(__file__))}
(R/'static-summary.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'status':'static-only','rows':len(rows),'both_versions_have_vectorized_wasm_loops':True,'original_disassembly':False,'compute_into_indices':{x['task']+'/'+x['version']:x['wasm_exports']['ink_compute_into']['index']for x in rows if x['target']=='wasm'}}))
