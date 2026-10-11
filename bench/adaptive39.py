"""Prepare a fixed adaptive web experiment; all measurements require serial gates."""
from pathlib import Path
import json,hashlib,subprocess,argparse,http.server,shutil
B=Path(__file__).resolve().parents[1];R=B/'reports/web-stack-engine-39-2026-10-11/adaptive';A=B/'reports/web-stack-proofs-38-2026-10-11/targets/targets/pipeline38_left_padded_zip_heldout_u32';COMP=B/'reports/web-stack-engine-39-2026-10-11/ink-candidate-final-frozen';PIN='dc9e252370443c7f535a9ecb7c8bb7e4905115824a26dbd4fd2e6d7d9f66e3cd';MASK=2**32-1
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def words(n,small,seed):
 out=[];s=seed
 for _ in range(n):
  s^=(s<<13)&MASK;s^=s>>17;s^=(s<<5)&MASK;s&=MASK;out.append(s&1023 if small else s)
 return out
def oracle(xs,seed,k):
 out=[]
 for i,x in enumerate(xs):
  q,_=divmod(x,k)if k else(0,0);_,r=divmod(i,k)if k else(0,0);a=(q+r+seed)&MASK;b=(x+k if i<seed else x*3)&MASK
  q,_=divmod(a,k)if k else(0,0);_,r=divmod(b,k)if k else(0,0);out.append((q+b if a<b else r+a)&MASK)
 return out
def fixture(n,mode,shape,split,edge=None):
 small=mode=='low';ny=0 if shape=='empty-suffix' else 2*n+7;xs=words(n,small,2026113917);ys=words(ny,small,2026113917^0x6d2b79f5);seed=512 if small else 0x9e3779b9;k=7
 if edge:xs,ys,seed,k=edge
 expected=oracle(xs,seed,k)
 a=[((x//k if k else 0)+(i%k if k else 0)+seed)&MASK for i,x in enumerate(xs)];b=[(x+k if i<seed else x*3)&MASK for i,x in enumerate(xs)]
 staged=[(((aa//k if k else 0)+bb)if aa<bb else((bb%k if k else 0)+aa))&MASK for aa,bb in zip(a+ys,b)];assert staged==expected
 return dict(id=f'{split}-{mode}-{shape}-{n}',split=split,mode=mode,shape=shape,xs=xs,ys=ys,seed=seed,k=k,expected=expected,checksum=(len(expected)+sum((i+1)*x for i,x in enumerate(expected)))&MASK)
def prepare():
 assert sha(COMP)==PIN
 if R.exists()and any(R.iterdir()):raise ValueError('preserve adaptive preparation')
 R.mkdir(parents=True);commands=[]
 for name in ['source.ink','literal.core.json','checked.selection.json']:shutil.copy2(A/name,R/name)
 for argv in [[COMP,'emit-core',R/'literal.core.json','--core','--selection',R/'checked.selection.json','-o',R/'checked.core.json'],[COMP,'build',R/'checked.core.json','--core','--target','webgpu','--zig',B.parent/'toolchain/zig-aarch64-macos-0.15.2/zig','-o',R/'bundle']]:
  p=subprocess.run(list(map(str,argv)),cwd=B,capture_output=True,text=True);commands.append(dict(argv=list(map(str,argv)),exit_code=p.returncode,stdout=p.stdout,stderr=p.stderr));assert p.returncode==0,p.stderr
 assert json.loads((R/'checked.core.json').read_text())==json.loads((A/'checked.core.json').read_text()),'checked source meaning changed'
 fixtures=[fixture(n,mode,shape,split)for split,sizes in [('training',[32,65536]),('heldout',[2048,4096])]for n in sizes for mode in ['low','high']for shape in ['empty-suffix','long-suffix']]
 fixtures += [fixture(0,'low',f'edge{i}','edge',v)for i,v in enumerate([([],[],7,3),([],[1,MASK],7,3),([0,1,MASK],[],7,0),([0,1,MASK,2**31],[MASK,0,7],7,3)])]
 domains={'input_elements':[0,4*65536],'input_bytes':[8,16*65536+8],'output_capacity_elements':[0,65536],'dispatches':[0,1],'iterations':[1,1]}
 protocol=dict(schema=1,task='pipeline38_left_padded_zip_heldout_u32',training_sizes=[32,65536],heldout_sizes=[2048,4096],shapes=['empty-suffix','long-suffix'],values=['low','high'],boundaries=['captured-owned','resident-input-owned-readback'],backend_order=['cpu','javascript','gpu'],training_rounds=3,evaluation_rounds=3,warmups=2,target_ms=2,max_iterations=1024,seed=2026113917,domains=domains,training_features=['input_elements','output_capacity_elements'],fit='For each boundary/backend fit nonnegative intercept+input_elements+output_capacity_elements by exact active-set least squares over ALL8training frames, with target y=median training rounds including common full checksum. Value mode has no selector feature; no heldout/semantic/hash-specific coefficient. Immutable saved profile before heldout evaluation.',static_backend='cpu',captured_pricing='Force eligible backend through saved extreme costs, call backend:auto. This includes automatic transport packing/unpacking/context/promise path even for JS. Explicit JS shortcut is a separate direct control, never a training surrogate.',resident_pricing='External createSelector using compiled eligible candidates: preparedCpuCall.run copied to Array; captured snapshot JS returned fresh; real preparedGPU full owned readback. Setup/upload outside resident run.',selection_accounting='Record first cache miss and cached run separately; reset selector for repeated miss measurements. Overall chosen execution+context+Promise+checksum measured. No timing probes in adaptive selector; policy adaptive only.',result='Owned Array for every backend/boundary, full-word weighted moduloU32 checksum included. Borrowed Wasm view copied within resident timer.',limits='One checked recipe/single machine3within-process rounds. Exploratory adaptation experiment, not language ranking or universal proof. FullGPUreadback costs retained; inputshape and values varied. Existing broad-suite results separate.')
 for name,d in [('fixtures.json',dict(frames=fixtures)),('protocol.json',protocol),('preparation-commands.json',commands)]: (R/name).write_text(json.dumps(d,separators=(',',':'))+'\n')
 for name in ['adaptive39.mjs','adaptive39.html']:shutil.copy2(B/'bench'/name,R/name)
 metadata=dict(status='prepared_untimed',compiler_sha256=PIN,origin_source_sha256=sha(A/'source.ink'),origin_selection_sha256=sha(A/'checked.selection.json'),origin_checked_core_sha256=sha(A/'checked.core.json'),training_frames=8,heldout_frames=8,edge_frames=4,cells=32,protocol=protocol,bindings={str(p.relative_to(R)):sha(p)for p in sorted(R.rglob('*'))if p.is_file()})
 (R/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n');print(json.dumps(dict(status='prepared_untimed',bindings=len(metadata['bindings']),cells=32)))
def serve(port):
 class Handler(http.server.SimpleHTTPRequestHandler):
  def __init__(self,*args,**kw):super().__init__(*args,directory=str(R),**kw)
  def do_POST(self):
   name=self.path.removeprefix('/save/');value=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
   if name not in ['browser-validation.json','training-results.json','evaluation-results.json','overhead-validation.json','overhead-results.json']or value.get('status')!='passed':self.send_error(400);return
   if (R/name).exists():self.send_error(409,'preserve evidence');return
   (R/name).write_text(json.dumps(value,indent=2)+'\n');self.send_response(200);self.end_headers();self.wfile.write(b'ok')
 http.server.ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('mode',choices=['prepare','serve']);p.add_argument('--port',type=int,default=8898);a=p.parse_args()
 if a.mode=='prepare':prepare()
 else:serve(a.port)
