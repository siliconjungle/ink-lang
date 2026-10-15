"""Check retained bindings and scope gates; this is not a correctness proof."""
import hashlib,json
from pathlib import Path
r=Path(__file__).resolve().parent
m=json.loads((r/'metadata.json').read_bytes())
for name,digest in m['files'].items():
 if Path(name).name!=name or hashlib.sha256((r/name).read_bytes()).hexdigest()!=digest:raise ValueError('Changed artifact: '+name)
if (r/'offline.snapshot').read_bytes()!=(r/'queued.snapshot').read_bytes():raise ValueError('Offline bootstrap differs')
receipt=json.loads((r/'offline-receipt.json').read_bytes())
plan=json.loads((r/'program.mjs.plan.json').read_bytes())
trace=json.loads((r/'offline-trace.json').read_bytes())
if receipt['source_core_sha256']!=plan['selected_core_sha256']:raise ValueError('Source binding')
if receipt['snapshot_sha256']!=m['files']['offline.snapshot'] or receipt['initial_snapshot_sha256'] is not None:raise ValueError('Checkpoint binding')
if receipt['updates']!=6 or receipt['epochs']!=1 or len(trace['observations'])!=6:raise ValueError('Offline trace coverage')
for name,markers in {
 'conformance.log':['9 passed; 0 failed','wgpu: 39 results matched; 1 GPU calls','rust Wasm: 39 values/outcomes and exact snapshots matched','4 histories, including offline CLI bootstrap','wgpu: 2 results matched; 1 GPU calls'],
 'host-tests.log':['# tests 13','# pass 13','# fail 0'],
}.items():
 log=(r/name).read_text()
 if 'FAILED' in log or any(marker not in log for marker in markers):raise ValueError('Coverage log: '+name)
for name,count in [('session-gpu-receipts.json',39),('domain-gpu-receipts.json',2)]:
 rows=json.loads((r/name).read_bytes())
 if len(rows)!=count or sum(row.get('backend')=='gpu' for row in rows)!=1:raise ValueError('GPU coverage')
corpus=json.loads((r/'corpus-report.json').read_bytes())
if corpus['context']['snapshot']!=m['knowledge_snapshot']:raise ValueError('Corpus snapshot')
print(json.dumps({'status':'checked','distinct_integration_tests':9,'host_tests':13,'durable_histories':4,'corpus':corpus['headline'],'scope':'Cooperative CPU training and durable progress; no performance, convergence, parallel-worker, device-training or compiler-correctness claim'},indent=2))
