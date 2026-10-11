"""Freeze/serve untimed browser parity from the parent's exact conformance rows."""
from pathlib import Path
import argparse,json,hashlib,http.server,urllib.parse,mimetypes
B=Path(__file__).resolve().parents[1];R=B/'reports/web-stack-engine-40-2026-10-11/parity';P=B/'build/generated-parity-memory40';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def carrier(v,t):
 k=t['kind']
 if k in ['u64','int']:return str(v.get('Int',v) if isinstance(v,dict) else v)
 if k in ['list','vector']:return [carrier(x,t['element'])for x in v]
 if k=='record':return {f['name']:carrier(v[f['name']],f['type'])for f in t['fields']}
 return v

def prepare():
 R.mkdir(parents=True,exist_ok=True);manifest=json.loads((P/'gpu-module/manifest.json').read_text());script=json.loads((P/'gpu-script.json').read_text());expected=json.loads((P/'expected.json').read_text());assert len(script)==len(expected)
 metadata=manifest.get('javascript',manifest);specs={f['name']:f for f in metadata['functions']};actions={f['name']:f for f in metadata.get('state',{}).get('actions',[])};rows=[]
 for i,(s,e)in enumerate(zip(script,expected)):
  name=s.get('pure',s.get('call'));pure='pure'in s;f=(specs if pure else actions)[name];rows.append(dict(index=i,name=name,pure=pure,params=f['params'],result=f.get('result'),args=[carrier(v,p['type'])for v,p in zip(s['args'],f['params'])],expected=carrier(e['reply']['value'],f['result'])if pure else e['reply']['outcome'],snapshot=e['snapshot'],expect_gpu=bool(s.get('expect_gpu')),cpu_only=bool(s.get('cpu_only'))))
 files=[p for p in(P/'gpu-module').rglob('*')if p.is_file()and'native'not in p.relative_to(P/'gpu-module').parts and p.suffix in ['.json','.mjs','.wasm','.wgsl','.c']]
 required=[P/'gpu-module'/(manifest.get('cpu')if manifest['schema']==3 else'cpu.wasm')]+[P/'gpu-module'/f['bundle']/'cpu.wasm' for f in manifest['functions']if manifest['schema']==3 and f.get('gpu')]
 for path in required:assert path.is_file(),str(path)+' must be compiled before freezing browser prep'
 frozen={'status':'frozen_untimed','rows':rows,'script_sha256':sha(P/'gpu-script.json'),'expected_sha256':sha(P/'expected.json'),'source_sha256':sha(P/'source.ink'),'bundle_schema':manifest['schema'],'bindings':{str(p.relative_to(B)):sha(p)for p in sorted(files)},'limits':'Reference interpreter expected values; source-bound supplied fixtures. F32 cpu_only flags respected; unsupported U64/String/Int/nested routes retain CPU. Only direct packed calls snapshot synchronously; complete module inputs stay stable until settlement.'}
 frozen['bindings']['bench/composed-parity40-browser.mjs']=sha(B/'bench/composed-parity40-browser.mjs');frozen['bindings']['bench/composed-parity40-browser.html']=sha(B/'bench/composed-parity40-browser.html')
 with(R/'browser-preparation.json').open('x')as h:json.dump(frozen,h,indent=2);h.write('\n')
 print(json.dumps({'status':'frozen_untimed','rows':len(rows),'bindings':len(frozen['bindings']),'metadata_sha256':sha(R/'browser-preparation.json')}))

def serve(port):
 class H(http.server.SimpleHTTPRequestHandler):
  def __init__(self,*a,**k):super().__init__(*a,directory=str(B),**k)
  def do_POST(self):
   if self.path!='/save/parity40':self.send_error(404);return
   value=json.loads(self.rfile.read(int(self.headers['Content-Length'])));path=R/'browser-parity.json'
   if value.get('status')!='passed':self.send_error(400);return
   if path.exists():self.send_error(409,'preserve previous evidence');return
   with path.open('x')as h:json.dump(value,h,indent=2);h.write('\n')
   self.send_response(200);self.end_headers();self.wfile.write(b'saved')
  def guess_type(self,path):return 'text/javascript'if path.endswith('.mjs')else super().guess_type(path)
 http.server.ThreadingHTTPServer(('127.0.0.1',port),H).serve_forever()
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('mode',choices=['prepare','serve']);p.add_argument('--port',type=int,default=8904);a=p.parse_args();prepare()if a.mode=='prepare'else serve(a.port)
