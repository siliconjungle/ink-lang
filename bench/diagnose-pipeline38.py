"""Static regression inventory and optional diagnostic compilation; never times execution."""
from pathlib import Path
import argparse,hashlib,json,re,subprocess,shutil,collections
B=Path(__file__).resolve().parents[1];A=B/'reports/web-stack-proofs-38-2026-10-11';P=A/'targets';R=B/'reports/web-stack-engine-39-2026-10-11/regressions'
rd=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
parser=argparse.ArgumentParser();parser.add_argument('--compile-static',action='store_true');parser.add_argument('--serve-browser',action='store_true');parser.add_argument('--port',type=int,default=8881);args=parser.parse_args()
R.mkdir(parents=True,exist_ok=True)
# Authenticate every archived batch38 report/fixture/target byte before touching new output.
archive=rd(A/'artifact-bindings.json');bound={p:h for p,h in archive['files'].items()if p.startswith('reports/web-stack-proofs-38-2026-10-11/') or p.startswith('bench/web-stack-proofs-38')}
assert all(sha(B/p)==h for p,h in bound.items())
meta=rd(P/'metadata.json');frames={f['id']:f for f in rd(P/'fixtures.json')['frames']};reg=rd(A/'regressions.json')['rows'];analysis=rd(A/'analysis.json')
assert len(reg)==20 and all('heldout'in c['frame']for c in reg)and not any(c['host']=='native'for c in reg)
tasks=sorted({frames[c['frame']]['task']for c in reg});inventory=[];sourcebindings={};commands=[]
# Names plus balanced braces delimit emitted functions without guessing loop semantics.
def function(text,name):
 m=re.search(r'\b'+re.escape(name)+r'\([^;\n]*\)\s*\{',text);assert m,name
 depth=1;i=m.end()
 while depth:
  depth+=(text[i]=='{')-(text[i]=='}');i+=1
 return text[m.start():i]
for task in tasks:
 record={'task':task,'variants':{}}
 for version in ['prior','checked']:
  D=P/'targets'/task/version;js=(D/'program.mjs').read_text().split('function __fn1',1)[0];c=(D/'cpu.c').read_text();primary=function(c,'lang_fn_'+task);into=function(c,'lang_fn_'+task+'_into')
  for f in ['program.mjs','cpu.c','cpu.wasm','manifest.json','prepared-wasm.mjs']:sourcebindings[str((D/f).relative_to(B))]=sha(D/f)
  record['variants'][version]={'js_primary_new_arrays':js.count('new Array('),'js_primary_loops':js.count('for(let '),'js_primary_divisions':len(re.findall(r'Math\.trunc\([^\n]+/',js)),'js_primary_remainders':js.count('%'),'c_primary_allocations':primary.count('ink_alloc('),'c_destination_allocations':into.count('ink_alloc('),'c_primary_loops':primary.count('for(size_t '),'c_destination_loops':into.count('for(size_t '),'body_sha256':{'js':hashlib.sha256(js.encode()).hexdigest(),'c_primary':hashlib.sha256(primary.encode()).hexdigest(),'c_into':hashlib.sha256(into.encode()).hexdigest()}}
 inventory.append(record)
for task in tasks:
 prior=next(x for x in inventory if x['task']==task)['variants']['prior'];checked=next(x for x in inventory if x['task']==task)['variants']['checked']
 assert (prior['js_primary_new_arrays'],checked['js_primary_new_arrays'])==(4,1)
 assert (prior['c_destination_allocations'],checked['c_destination_allocations'])==(3,0)
allraw={h:rd(P/p)for h,p in [('node','node-results.json'),('browser','browser-results.json'),('native','native/results.json')]}
cases=[]
for case in reg:
 f=frames[case['frame']];samples=[s for s in allraw[case['host']]['samples']if s['frame']==case['frame']and s['boundary']==case['boundary']and s['variant']in [case['reference'],case['current']]]
 assert len(samples)==18
 cases.append({'comparison':case,'task':f['task'],'xs':len(f['xs']),'ys':len(f['ys']),'seed':f['seed'],'k':f['k'],'mode':f['mode'],'archived_samples':samples,'status':'archived_regression_not_yet_reproduced'})
zigarg=next(c['argv']for c in rd(P/'commands.json')if '--zig'in c['argv']);zig=Path(zigarg[zigarg.index('--zig')+1]);clang=shutil.which('clang');objdump=Path('/Applications/Xcode.app/Contents/Developer/Toolchains/XcodeDefault.xctoolchain/usr/bin/llvm-objdump')
tools={'node':shutil.which('node'),'clang':clang,'zig':str(zig),'zig_sha256':sha(zig),'xcode_llvm_objdump':str(objdump)if objdump.exists()else None,'wasm_objdump':shutil.which('wasm-objdump'),'wasm2wat':shutil.which('wasm2wat')}
existing=rd(R/'preparation.json')if(R/'preparation.json').exists()else{}
static=[]if args.compile_static else existing.get('static_compiler_evidence',[])
if not args.compile_static:
 commands=existing.get('commands',[])
 sourcebindings.update({p:h for p,h in existing.get('source_bindings',{}).items()if p.startswith('reports/web-stack-engine-39-2026-10-11/')})
if args.compile_static:
 for task in tasks:
  D=R/'static'/task;D.mkdir(parents=True,exist_ok=True)
  for version in ['prior','checked']:
   source=P/'targets'/task/version/'cpu.c'
   common=['-O3','-std=c11','-ffp-contract=off','-Rpass=loop-vectorize','-Rpass-missed=loop-vectorize','-Rpass-analysis=loop-vectorize']
   for target in ['native','wasm']:
    prefix=[clang,'-mcpu=native']if target=='native'else[str(zig),'cc','-target','wasm32-freestanding','-msimd128','-ffreestanding','-nostdlib']
    output=D/(version+'.'+target+'.ll');assert not output.exists(),'preserve previous static output'
    argv=prefix+common+['-S','-emit-llvm',str(source),'-o',str(output)];result=subprocess.run(argv,text=True,capture_output=True);log=D/(version+'.'+target+'.remarks.txt');log.write_text(result.stderr)
    commands.append({'argv':argv,'exit_code':result.returncode,'stdout':result.stdout,'stderr_path':str(log.relative_to(B))});assert result.returncode==0,result.stderr
    ll=output.read_text()
    static.append({'task':task,'version':version,'target':target,'ir_sha256':sha(output),'remarks_sha256':sha(log),'whole_module_vector_type_occurrences':len(re.findall(r'<[0-9]+ x i32>',ll)),'scope':'IR/remarks are compiler evidence, not dynamic causality or original binary disassembly.'})
   # Ordinary flags copied from runtime/src/toolchain.rs; only vectorizer disabling varies.
   output=D/(version+'.no-vectorize.wasm');assert not output.exists()
   exports=['ink_compute_call','ink_compute_into','ink_compute_mark','ink_compute_rewind','ink_compute_scalar32','ink_compute_scalar64','ink_compute_reset','ink_alloc']
   argv=[str(zig),'cc','-target','wasm32-freestanding','-O3','-msimd128','-std=c11','-ffreestanding','-nostdlib','-Wl,--no-entry','-Wl,--export=__heap_base','-Wl,--export-memory','-fno-vectorize','-fno-slp-vectorize']+['-Wl,--export='+s for s in exports]+[str(source),'-o',str(output)]
   result=subprocess.run(argv,text=True,capture_output=True);commands.append({'argv':argv,'exit_code':result.returncode,'stdout':result.stdout,'stderr':result.stderr});assert result.returncode==0,result.stderr
   sourcebindings[str(output.relative_to(B))]=sha(output)
   if objdump.exists():
    argv=[str(objdump),'-d',str(P/'targets'/task/version/'cpu.wasm')];result=subprocess.run(argv,text=True,capture_output=True);log=D/(version+'.archived-wasm.disassembly.txt');log.write_text(result.stdout+result.stderr);commands.append({'argv':argv,'exit_code':result.returncode,'output_path':str(log.relative_to(B))})
# Original report/benchmark bytes remain intact even after compiler diagnostics.
assert all(sha(B/p)==h for p,h in bound.items())
report={'status':'prepared','timed_or_profiled':False,'archived_regressions':len(cases),'cases':cases,'source_inventory':inventory,'static_compiler_evidence':static,'tools':tools,'source_bindings':sourcebindings,'original_archive_verified_files':len(bound),'original_archive_manifest_sha256':sha(A/'artifact-bindings.json'),'commands':commands,'hypotheses':[{'id':'fusion-vectorization','claim':'Combining expensive division/remainder/branches with the simple right-map may change compiler vectorization and scheduling. Inspect exact function/loop remarks and disable vectorization on BOTH prior and checked as a control.','status':'untested dynamic hypothesis'},{'id':'jit-source-shape','claim':'Generated fused JS may receive different representation/tiering/deoptimization decisions from staged loops. Exact V8 traces and isolated no-padding/+0 controls are needed; generated scalar helpers are already inlined in source.','status':'untested dynamic hypothesis'},{'id':'transport-noise','claim':'Small full-Wasm differences may be transport or sample noise rather than kernel changes. Reproduce original full versus resident boundaries separately; retain unreproduced cases.','status':'untested dynamic hypothesis'}],'limits':['No profiling, timed reproduction, cost-model changes or new production machinery performed.','Node traces cannot establish the cause of browser-specific results.','Static loop/vectorizer evidence cannot by itself establish dynamic causality.','Source controls are diagnosis experiments, not admitted compiler rewrites.','No classified native regression exists in the archived batch38 matrix.'],'bindings':{'script':sha(Path(__file__)),'javascript_harness':sha(B/'bench/diagnose-pipeline38.mjs'),'regressions':sha(A/'regressions.json'),'analysis':sha(A/'analysis.json'),'production_baseline':sha(A/'production-baseline.json')}}
(R/'preparation.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'status':'prepared','cases':len(cases),'archive_files':len(bound),'static_records':len(static),'profiled_or_timed':False}))

if args.serve_browser:
 import http.server
 class Handler(http.server.SimpleHTTPRequestHandler):
  def __init__(self,*a,**kw):super().__init__(*a,directory=str(B),**kw)
  def do_POST(self):
   try:
    prefix='/__diagnosis-results/';assert self.path.startswith(prefix)
    name=self.path[len(prefix):];assert re.fullmatch(r'browser-(?:validate|reproduce)-[a-z0-9_-]+\.json',name)
    size=int(self.headers['Content-Length']);assert 0<size<32*1024*1024
    body=self.rfile.read(size);value=json.loads(body);assert value['actual_browser']and value['status']=='passed'and value['mode']in ['validate','reproduce']
    with(R/name).open('xb')as file:file.write(body)
    self.send_response(201);self.end_headers();self.wfile.write(b'saved')
   except Exception as error:
    self.send_response(409);self.end_headers();self.wfile.write(str(error).encode())
 print(f'Browser UI: http://127.0.0.1:{args.port}/bench/diagnose-pipeline38.html',flush=True)
 http.server.ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
