#!/usr/bin/env python3
"""Independent same-input GPU confirmation. Preparation/audit are untimed jobs.
Never run while any parent benchmark is timing. No compilation/publication/import.
"""
import argparse,collections,hashlib,http.server,json,math,random,shutil,statistics
from pathlib import Path
ROOT=next((p for p in Path(__file__).resolve().parents if (p/'bench/web-stack-proofs-15.py').exists()),Path(__file__).resolve().parents[3])
PARENT=ROOT/'reports/web-stack-proofs-15-2026-10-10'
REPORT=ROOT/'reports/web-stack-proofs-15-gpu-confirmation-2026-10-10'
CASES=['accepted_total','calibrated_accepted_total','accepted_calibrated_total','accepted_total_heldout','calibrated_accepted_total_heldout','accepted_calibrated_total_heldout']
CPU={f'ink_{k}_{b}' for k in ['baseline','prior','checked'] for b in ['js','wasm']}|{'ink_checked_borrowed_js','js_literal','js_expert','js_expert_borrowed','rust_literal_wasm','rust_expert_wasm'}
GPU={f'ink_{k}_gpu' for k in ['baseline','prior','checked']}
BEFORE="if(entry.backend!=='gpu'||r.backend==='gpu')eligible.push(v);"
AFTER="if(entry.backend==='gpu'&&r.backend==='gpu')eligible.push(v);"
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def prepare(parent,report):
 if (report/'confirmation-metadata.json').exists():raise ValueError('immutable confirmation already prepared')
 parent_metadata=json.loads((parent/'metadata.json').read_text());fixtures=json.loads((parent/'fixtures.json').read_text());spec=json.loads((parent/'spec.json').read_text())
 assert fixtures['parameters']['repeats']==9 and fixtures['parameters']['warmup']==1 and fixtures['parameters']['seconds']==.015
 for relative,digest in parent_metadata['artifact_hashes'].items():assert sha(parent/relative)==digest,relative
 report.mkdir(parents=True,exist_ok=True);copied={}
 names={'literal.mjs','expert.mjs','rust-literal.wasm','rust-expert.wasm','spec.json'}
 for relative,digest in parent_metadata['artifact_hashes'].items():
  if Path(relative).parts[0] in ['baseline','prior','checked'] or relative in names:
   dest=report/relative;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(parent/relative,dest);assert sha(dest)==digest;copied[relative]=digest
 main_runner=(parent/'runner.mjs').read_text();assert main_runner.count(BEFORE)==1
 assert "if(entry.backend==='gpu')continue;" in main_runner
 (report/'runner-main.mjs').write_text(main_runner);assert sha(report/'runner-main.mjs')==sha(parent/'runner.mjs');(report/'runner.mjs').write_text(main_runner.replace(BEFORE,AFTER));assert (report/'runner.mjs').read_text().replace(AFTER,BEFORE)==main_runner
 narrowed=dict(fixtures);narrowed['cells']=[c for c in fixtures['cells'] if c['case'] in CASES and fixtures['inputs'][c['input']]['id'].split('/')[-1] in ['small-65536','full-65536']]
 assert len(narrowed['cells'])==12
 assert {x['case'] for x in narrowed['cells']}==set(CASES)
 assert {k:v for k,v in narrowed.items() if k!='cells'}=={k:v for k,v in fixtures.items() if k!='cells'}
 (report/'fixtures.json').write_text(json.dumps(narrowed,separators=(',',':'))+'\n')
 (report/'main-metadata.json').write_bytes((parent/'metadata.json').read_bytes())
 for case in CASES:
  for kind in ['baseline','prior','checked']:assert parent_metadata['gpu_manifest'][kind][case]['timing_eligible']
 shutil.copy2(Path(__file__),report/'confirmation.py')
 shutil.copy2(Path(__file__).with_name('gpu-edge-validation.html'),report/'gpu-edge-validation.html')
 html='''<!doctype html><meta charset="utf-8"><title>Ink GPU confirmation15</title>
<style>body{font:16px system-ui;margin:32px;background:#111;color:#eee}button{padding:12px}pre{white-space:pre-wrap}</style>
<h1>Ink GPU confirmation15</h1><p>Separate independent repeat of six predicated reductions at65536 words, small/full distributions. Exact main inputs/scalars/oracles and compiled bundles. Full original correctness prevalidation retained; only GPU variants timed. Same9rounds/calibration/warmup. No pooling or additional canonical imports.</p>
<button id="run">Run GPU confirmation</button><pre id="progress">Ready</pre><pre id="result"></pre>
<script type="module">import {runBenchmark} from './runner.mjs';
document.querySelector('#run').onclick=async()=>{document.querySelector('#run').disabled=true;let result;
try{result=await runBenchmark(new URL('./',location.href),{browser:true,progress:text=>document.querySelector('#progress').textContent=text});}
catch(error){result={status:'failed',error:String(error),stack:error.stack,browser:true,host:navigator.userAgent};}
document.querySelector('#result').textContent=JSON.stringify(result,null,2);document.querySelector('#progress').textContent=`${result.status}: ${result.samples?.length??0} GPU samples`;
try{const response=await fetch('./browser-results.json',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});if(!response.ok)throw Error('save failed '+response.status);}catch(error){document.querySelector('#progress').textContent+=' '+error;}};</script>'''
 (report/'browser.html').write_text(html)
 artifact_hashes={str(p.relative_to(report)):sha(p) for p in report.rglob('*') if p.is_file()}
 inputs=fixtures['inputs'];expect_comparisons=len(inputs)*len(CPU)+len(narrowed['cells'])*(len(CPU)+len(GPU))
 metadata=dict(schema=1,parent_report=str(parent.resolve()),parent_metadata_sha256=sha(parent/'metadata.json'),parent_fixtures_sha256=sha(parent/'fixtures.json'),parent_runner_sha256=sha(parent/'runner.mjs'),unchanged_parent_artifacts=copied,artifact_hashes=artifact_hashes,cases=CASES,timed_cells=narrowed['cells'],unchanged_fixture_fields=[k for k in fixtures if k!='cells'],expected=dict(gpu_samples=12*3*9,actual_gpu_variant_cells=36,calibration=36,warmups=36,availability=12*15,exact_comparisons=expect_comparisons,cpu_fixture_prevalidation=len(inputs)*len(CPU),per_cell_availability=len(narrowed['cells'])*(len(CPU)+len(GPU))),scope='Separate GPU-only timed repeat; all main input arrays/scalars/expected outputs and full CPU prevalidation unchanged. Only fixture.cells and one timed-eligibility runner line differ. Every compiled artifact copied is byte-identical. No recompilation, evidence pooling or canonical observation imports.')
 (report/'confirmation-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n');print(json.dumps(dict(status='prepared',frozen_artifacts=len(artifact_hashes),copied_parent_artifacts=len(copied),**metadata['expected'])),flush=True)
def interval(a,b):
 assert len(a)==len(b);rng=random.Random(0);draws=[];n=len(a)
 for _ in range(4000):
  ix=[rng.randrange(n) for _ in range(n)];draws.append(statistics.median([a[i] for i in ix])/statistics.median([b[i] for i in ix]))
 draws.sort();return [statistics.median(a)/statistics.median(b),draws[100],draws[3899]]
def counters(main,variant,case,x):
 f=main['gpu_manifest'][variant.split('_')[1]][case];n=len(x['xs']);assert f['timing_eligible']
 if f['schema']==2:return dict(dispatches=1,upload_bytes=4*n+24,readback_bytes=4)
 dispatches=sum(1 if s['kind']=='map' else 3 for s in f['stages']);cap=max(1,n)
 if f['aggregate']=='count':dispatches+=1
 else:
  while True:
   dispatches+=1;cap=(cap+255)//256
   if cap<=1:break
 return dict(dispatches=dispatches,upload_bytes=4*n+4+4*f['parameter_count'],readback_bytes=4)
def audit(report):
 m=json.loads((report/'confirmation-metadata.json').read_text());parent=Path(m['parent_report']);main=json.loads((report/'main-metadata.json').read_text());fixtures=json.loads((report/'fixtures.json').read_text());original=json.loads((parent/'fixtures.json').read_text());raw=json.loads((report/'browser-results.json').read_text())
 assert sha(parent/'metadata.json')==m['parent_metadata_sha256'];assert sha(parent/'fixtures.json')==m['parent_fixtures_sha256'];assert sha(parent/'runner.mjs')==m['parent_runner_sha256']
 for relative,digest in m['artifact_hashes'].items():assert sha(report/relative)==digest,relative
 for relative,digest in m['unchanged_parent_artifacts'].items():assert sha(parent/relative)==digest and sha(report/relative)==digest,relative
 assert {k:v for k,v in fixtures.items() if k!='cells'}=={k:v for k,v in original.items() if k!='cells'}
 assert (report/'runner.mjs').read_text().replace(AFTER,BEFORE)==(parent/'runner.mjs').read_text()
 assert raw['status']=='passed' and raw['browser'] and raw['webgpu'];assert raw['parameters']==fixtures['parameters'];assert raw['validation']['comparisons']==len(fixtures['inputs'])*len(CPU)+len(raw['availability']);assert raw['validation']['comparisons']==m['expected']['exact_comparisons'];assert raw['validation']['fixtures']==len(fixtures['inputs'])
 inputs={x['id']:x for x in fixtures['inputs']};cells={(c['case'],fixtures['inputs'][c['input']]['id']) for c in fixtures['cells']};groups=collections.defaultdict(lambda:collections.defaultdict(list));seen={phase:set() for phase in ['samples','calibration','warmups']};totals={phase:dict(dispatches=0,upload_bytes=0,readback_bytes=0) for phase in seen}
 for phase in seen:
  for r in raw[phase]:
   key=(r['case'],r['input']);v=r['variant'];n=r['iterations'];assert key in cells and v in GPU and isinstance(n,int) and n>0;assert math.isfinite(r['seconds']) and r['seconds']>0;assert math.isclose(r['ns_per_call'],r['seconds']*1e9/n,rel_tol=1e-9)
   x=inputs[r['input']];expected=x['expected'][r['case']];assert r['single']==str(expected) and r['checksum']==str(expected*n%(2**64));assert r['linear_memory_bytes'] is None
   expected_counters={k:value*n for k,value in counters(main,v,r['case'],x).items()};assert r['gpu_counters']==expected_counters
   for k,value in expected_counters.items():totals[phase][k]+=value
   ident=(*key,v,r['round']) if phase=='samples' else (*key,v,r['warmup']) if phase=='warmups' else (*key,v);assert ident not in seen[phase];seen[phase].add(ident)
   if phase=='samples':assert 0<=r['round']<9;groups[key][v].append(r)
   if phase=='warmups':assert r['warmup']==0
 assert seen['samples']=={(*key,v,r) for key in cells for v in GPU for r in range(9)}
 assert seen['calibration']=={(*key,v) for key in cells for v in GPU};assert seen['warmups']=={(*key,v,0) for key in cells for v in GPU}
 available={}
 for a in raw['availability']:
  key=(a['case'],a['input'],a['variant']);assert key not in available;available[key]=a
 assert set(available)=={(*key,v) for key in cells for v in CPU|GPU}
 assert len(raw['availability'])==m['expected']['per_cell_availability']
 for key in cells:
  for v in GPU:
   a=available[(*key,v)];assert a['actual_backend']=='gpu';assert a['counters']==counters(main,v,key[0],inputs[key[1]])
 rows=[]
 for (case,input_id),variants in sorted(groups.items()):
  values={v:[r['ns_per_call'] for r in sorted(samples,key=lambda r:r['round'])] for v,samples in variants.items()};pairs={}
  for kind in ['baseline','prior']:
   ci=interval(values[f'ink_{kind}_gpu'],values['ink_checked_gpu']);pairs[kind+'_over_checked_gpu']=dict(ratio_95pct=ci,classification='faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive')
  rows.append(dict(case=case,input=input_id,median_ns={v:statistics.median(x) for v,x in values.items()},paired=pairs))
 receipt=dict(status='passed',samples=len(raw['samples']),exact_comparisons=raw['validation']['comparisons'],gpu_variant_cells=36,calibration=len(raw['calibration']),warmups=len(raw['warmups']),availability=len(raw['availability']),paired_intervals_recomputed=24,artifact_hashes_verified=len(m['artifact_hashes']),unchanged_parent_artifacts_verified=len(m['unchanged_parent_artifacts']),all_phase_gpu_counters=totals,confirmation_metadata_sha256=sha(report/'confirmation-metadata.json'),raw_sha256=sha(report/'browser-results.json'),measurements=rows,scope=m['scope'])
 (report/'confirmation-verification.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({k:v for k,v in receipt.items() if k not in ['measurements','all_phase_gpu_counters']}),flush=True)
def audit_edge(report):
 m=json.loads((report/'confirmation-metadata.json').read_text());main=json.loads((report/'main-metadata.json').read_text());fixtures=json.loads((report/'fixtures.json').read_text());raw=json.loads((report/'GPU-edge-validation.json').read_text())
 for relative,digest in m['artifact_hashes'].items():assert sha(report/relative)==digest,relative
 assert raw['status']=='passed' and raw['browser'] and raw['positive_first'];assert raw['fixtures']==len(fixtures['inputs']) and raw['parameters']==fixtures['parameters']
 inputs={x['id']:x for x in fixtures['inputs']};seen=set();totals=dict(dispatches=0,upload_bytes=0,readback_bytes=0);actual=fallback=positive_gpu=zero_gpu=0;zero_seen=False
 for r in raw['records']:
  key=(r['case'],r['input'],r['kind']);assert key not in seen;seen.add(key);x=inputs[r['input']];assert r['case']==x['case'] and r['length']==len(x['xs']);assert r['expected']==r['actual']==str(x['expected'][r['case']])
  eligible=main['gpu_manifest'][r['kind']][r['case']]['timing_eligible'];assert eligible==r['manifest_eligible']
  if not x['xs']:zero_seen=True
  else:assert not zero_seen
  if r['actual_backend']=='gpu':
   assert eligible;expected=counters(main,'ink_'+r['kind']+'_gpu',r['case'],x);assert r['counters']==expected;actual+=1;positive_gpu+=int(bool(x['xs']));zero_gpu+=int(not x['xs'])
   for name,value in expected.items():totals[name]+=value
  else:
   assert not eligible or not x['xs'];assert r['counters'] is None;fallback+=1
 assert seen=={(x['case'],x['id'],kind) for x in fixtures['inputs'] for kind in ['baseline','prior','checked']}
 assert raw['comparisons']==len(seen) and raw['actual_gpu']==actual and raw['fallback']==fallback
 receipt=dict(status='passed',fixtures=len(inputs),exact_comparisons=len(seen),actual_gpu=actual,positive_actual_gpu=positive_gpu,zero_actual_gpu=zero_gpu,fallback=fallback,actual_gpu_counters=totals,artifact_hashes_verified=len(m['artifact_hashes']),raw_sha256=sha(report/'GPU-edge-validation.json'),scope=raw['scope'])
 (report/'GPU-edge-verification.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt),flush=True)

def serve(report,port):
 class Handler(http.server.SimpleHTTPRequestHandler):
  def __init__(self,*a,**kw):super().__init__(*a,directory=str(report),**kw)
  def do_POST(self):
   if self.path not in ['/browser-results.json','/GPU-edge-validation.json']:self.send_error(404);return
   destination=report/self.path.removeprefix('/')
   if destination.exists():self.send_error(409,'immutable results already exist');return
   n=int(self.headers.get('Content-Length','0'))
   if not 0<n<25_000_000:self.send_error(413);return
   body=self.rfile.read(n)
   try:json.loads(body)
   except Exception:self.send_error(400);return
   destination.write_bytes(body+b'\n');self.send_response(200);self.end_headers();self.wfile.write(b'saved')
 print(f'Browser: http://127.0.0.1:{port}/browser.html',flush=True);http.server.ThreadingHTTPServer(('127.0.0.1',port),Handler).serve_forever()
def main():
 p=argparse.ArgumentParser();p.add_argument('--parent',type=Path,default=PARENT);p.add_argument('--report',type=Path,default=REPORT);p.add_argument('--prepare',action='store_true');p.add_argument('--audit',action='store_true');p.add_argument('--audit-edge',action='store_true');p.add_argument('--serve',action='store_true');p.add_argument('--port',type=int,default=8794);a=p.parse_args()
 if a.prepare:prepare(a.parent.resolve(),a.report.resolve())
 if a.audit:audit(a.report.resolve())
 if a.audit_edge:audit_edge(a.report.resolve())
 if a.serve:serve(a.report.resolve(),a.port)
 if not any([a.prepare,a.audit,a.audit_edge,a.serve]):p.error('choose prepare/audit/serve')
if __name__=='__main__':main()
