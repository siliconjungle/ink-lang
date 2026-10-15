"""Audit retained evidence bindings; this is not a compiler correctness proof."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent
metadata = json.loads((root / 'metadata.json').read_bytes())
actual = {
    str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
    for path in root.rglob('*') if path.is_file() and path.name != 'metadata.json'
}
if actual != metadata['files']:
    raise ValueError('Retained file inventory or digest mismatch')
for name, markers in {
    'conformance.log': ['5 passed; 0 failed', 'javascript: Build-stage unfinished candidate',
                        'wasm32: Build-stage unfinished candidate', 'native: seeded startup',
                        'rust: seeded startup', 'wasm32: compiled startup'],
    'gpu-binding.log': ['1 passed; 0 failed', 'one required GPU dispatch matched'],
    'regression.log': ['9 passed; 0 failed', '8 passed; 0 failed',
                       'wgpu: 39 results matched; 1 GPU calls'],
    'native-host.log': ['5 passed; 0 failed'],
    'node-host.log': ['# tests 14', '# pass 14', '# fail 0'],
}.items():
    log = (root / name).read_text()
    if 'FAILED' in log or any(marker not in log for marker in markers):
        raise ValueError('Coverage log: ' + name)
rows = json.loads((root / 'gpu-receipts.json').read_bytes())
if len(rows) != 2 or rows[1]['backend'] != 'gpu' or rows[1]['counters']['dispatches'] != 1:
    raise ValueError('Actual GPU coverage')
browser = json.loads((root / 'browser-result.json').read_bytes())
if browser['status'] != 'passed' or browser['gpu'] != 'passed':
    raise ValueError('Browser observation')
manifest = json.loads((root / 'javascript/artifact.json').read_bytes())
if manifest['source_core_sha256'] != metadata['source_core_sha256']:
    raise ValueError('Retained package source binding')
for name, binding in manifest['files'].items():
    path = root / 'javascript' / name
    if path.stat().st_size != binding['bytes'] or actual['javascript/' + name] != binding['sha256']:
        raise ValueError('Package file binding: ' + name)
print(json.dumps({'status': 'checked', 'retained_files': len(actual),
                  'distinct_integration_tests': 5, 'regression_tests': 25,
                  'native_host_tests': 5, 'node_host_tests': 14,
                  'scope': 'Evidence integrity and observed coverage; no speed, convergence or compiler-correctness proof'}, indent=2))
