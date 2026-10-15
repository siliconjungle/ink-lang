"""Audit retained bindings and observed coverage, not training correctness."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
m = json.loads((root / 'metadata.json').read_bytes())
actual = {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest()
          for p in root.rglob('*') if p.is_file() and p != root / 'metadata.json'}
if actual != m['files']:
    raise ValueError('Retained inventory or digest mismatch')
log = (root / 'conformance.log').read_text()
for marker in ['4 passed; 0 failed', 'wgpu: 22 results matched; 1 GPU calls',
               'rust Wasm: 22 values/outcomes and exact snapshots matched']:
    if marker not in log or 'FAILED' in log:
        raise ValueError('Conformance coverage')
if '1 passed; 0 failed' not in (root / 'trained-gpu-dependency.log').read_text():
    raise ValueError('Trained GPU dependency regression')
receipt = json.loads((root / 'training.receipt.json').read_bytes())
artifact = json.loads((root / 'trained/artifact.json').read_bytes())
if receipt != artifact['training'] or receipt['updates'] != 160:
    raise ValueError('Training receipt binding')
if (root / 'complete.snapshot').read_bytes() != (root / 'trained/model.snapshot').read_bytes():
    raise ValueError('Compiled model checkpoint binding')
rows = json.loads((root / 'gpu-receipts.json').read_bytes())
if len(rows) != 22 or sum(row.get('backend') == 'gpu' for row in rows) != 1:
    raise ValueError('Actual GPU coverage')
corpus = json.loads((root / 'corpus-report.json').read_bytes())
if corpus['context']['snapshot'] != m['knowledge_snapshot']:
    raise ValueError('Corpus snapshot binding')
print(json.dumps({'status': 'checked', 'integration_tests': 4,
                  'cross_target_cases': 22, 'training_updates': 160,
                  'corpus': corpus['headline'],
                  'scope': 'Evidence integrity and observed coverage; no performance, convergence or compiler-correctness proof'}, indent=2))
