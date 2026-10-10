"""Bounded browser contexts for unchanged frozen round21 programs."""
import argparse,hashlib,http.server,json,functools
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports/web-stack-proofs-21-2026-10-11'
def prepare():
 metadata=json.loads((REPORT/'metadata.json').read_text());fixture=json.loads((REPORT/'fixtures.json').read_text());spec=json.loads((REPORT/'spec.json').read_text())
 target=REPORT/'browser-batches';target.mkdir(exist_ok=True)
 if (target/'manifest.json').exists():raise ValueError('bounded contexts already frozen')
 sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
 for name in ['fixtures.json','spec.json','runner.mjs','browser.html']:
  if sha(REPORT/name)!=metadata['artifact_hashes'][name]:raise ValueError('main frozen source drift '+name)
 batches=[]
 names=fixture['cases'];assert 1<=len(names)<=12
 for i in range((len(names)+3)//4):
  cases=names[i*4:(i+1)*4];p=target/f'b{i}';p.mkdir()
  indices=[j for j,x in enumerate(fixture['inputs']) if x['case'] in cases];remap={old:new for new,old in enumerate(indices)}
  sub=dict(fixture,cases=cases,inputs=[fixture['inputs'][j] for j in indices],cells=[dict(c,input=remap[c['input']]) for c in fixture['cells'] if c['case'] in cases],profiles=[q for q in fixture['profiles'] if q['case'] in cases])
  subspec=dict(spec,tasks=[q for q in spec['tasks'] if q['name'] in cases])
  for name,value in [('fixtures',sub),('spec',subspec)]: (p/f'{name}.json').write_text(json.dumps(value,separators=(',',':'))+'\n')
  for name in ['runner.mjs','literal.mjs','expert.mjs','browser.html','rust-literal.wasm','rust-expert.wasm','baseline','prior','checked','gpu-prior','gpu-checked']:(p/name).symlink_to(REPORT/name,target_is_directory=(REPORT/name).is_dir())
  batches.append(dict(batch=i,cases=cases,inputs=len(sub['inputs']),cells=len(sub['cells']),fixtures_sha256=sha(p/'fixtures.json'),spec_sha256=sha(p/'spec.json')))
 manifest=dict(status='frozen-before-timing',reason=f'Bounded contexts of at most four tasks from outset; exact{len(fixture["inputs"])}frames/{len(fixture["cells"])}cells and global Rust indices retained. Seed resets per context; startup sums contexts; all required.',main_fixture_sha256=sha(REPORT/'fixtures.json'),main_spec_sha256=sha(REPORT/'spec.json'),main_metadata_sha256=sha(REPORT/'metadata.json'),batches=batches)
 (target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(manifest))
def serve(port):
 class Handler(http.server.SimpleHTTPRequestHandler):
  def do_POST(self):
   allowed={f'/browser-batches/b{i}/browser-results.json' for i in range(len(json.loads((REPORT/'browser-batches/manifest.json').read_text())['batches']))}
   if self.path not in allowed:self.send_error(404);return
   p=REPORT/self.path.lstrip('/')
   if p.exists():self.send_error(409);return
   data=self.rfile.read(int(self.headers['Content-Length']));json.loads(data);p.write_bytes(data)
   self.send_response(200);self.end_headers();self.wfile.write(b'saved')
 http.server.ThreadingHTTPServer(('127.0.0.1',port),functools.partial(Handler,directory=str(REPORT))).serve_forever()
def adapter_identity(adapter):
 if adapter is None:return None
 result=dict(adapter)
 if "features" in result:result["features"]=sorted(result["features"])
 return result
def merge():
 manifest=json.loads((REPORT/'browser-batches/manifest.json').read_text());parts=[]
 for b in manifest['batches']:
  p=REPORT/'browser-batches'/f'b{b["batch"]}';r=json.loads((p/'browser-results.json').read_text())
  if r['status']!='passed':raise ValueError('failed batch')
  for name in ['fixtures','spec']:
   if hashlib.sha256((p/f'{name}.json').read_bytes()).hexdigest()!=b[name+'_sha256']:raise ValueError('batch fixture drift')
  if r['validation']['fixtures']!=b['inputs']:raise ValueError('fixture completeness')
  parts.append(r)
 if (REPORT/'browser-results.json').exists():raise ValueError('immutable combined results exist')
 first=parts[0];result=dict(first)
 for p in parts:
  for k in ['host','parameters']:
   if p.get(k)!=first.get(k):raise ValueError('host/parameter/adapter changed '+k)
  if adapter_identity(p.get('gpu_adapter'))!=adapter_identity(first.get('gpu_adapter')):raise ValueError('GPU adapter identity/features changed')
 for k in ['samples','warmups','calibration','availability']:result[k]=[r for p in parts for r in p[k]]
 result['validation']=dict(first['validation'],comparisons=sum(p['validation']['comparisons'] for p in parts),fixtures=sum(p['validation']['fixtures'] for p in parts))
 result['gpu_validation']=dict(comparisons=sum(p['gpu_validation']['comparisons'] for p in parts),actual_gpu=sum(p['gpu_validation']['actual_gpu'] for p in parts),fallbacks=sum(p['gpu_validation']['fallbacks'] for p in parts),records=[r for p in parts for r in p['gpu_validation']['records']])
 result['elapsed_seconds']=sum(p['elapsed_seconds'] for p in parts)
 result['startup_ms']={k:sum(p['startup_ms'].get(k,0) for p in parts) for k in first['startup_ms']}
 result['scope']=first['scope']+f'; aggregate of{len(parts)} sequential bounded browser batches; startup sums contexts, kernel rounds/capture contracts unchanged. All frozen frames/cells required; no successful batch omitted.'
 result['batching']=dict(manifest_sha256=hashlib.sha256((REPORT/'browser-batches/manifest.json').read_bytes()).hexdigest(),parts=[dict(batch=i,sha256=hashlib.sha256((REPORT/f'browser-batches/b{i}/browser-results.json').read_bytes()).hexdigest(),samples=len(p['samples'])) for i,p in enumerate(parts)])
 result['peak_linear_memory_bytes']={k:max(p['peak_linear_memory_bytes'].get(k,0) for p in parts) for k in first['peak_linear_memory_bytes']}
 (REPORT/'browser-results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(status='passed',samples=len(result['samples']),validation=result['validation'])))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--prepare',action='store_true');p.add_argument('--serve',action='store_true');p.add_argument('--merge',action='store_true');p.add_argument('--port',type=int,default=8807);a=p.parse_args()
 if a.prepare:prepare()
 if a.serve:serve(a.port)
 if a.merge:merge()
