#!/usr/bin/env python3
"""Audit retained controls, complete artifacts and paired timing arithmetic."""
import hashlib
import json
import math
from pathlib import Path
import statistics

root = Path(__file__).resolve().parent
read = lambda name: json.loads((root/name).read_bytes())
sha = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
s = read('summary.json')
assert sha(root/'source.ink') == s['source_sha256']
assert sha(root/'trace.json') == s['trace_sha256']
for name, digest in s['scripts'].items():
    assert sha(root/'controls'/Path(name).name) == digest
artifacts = {}
for name in ('baseline', 'selected'):
    folder = root/name
    manifest = json.loads((folder/'artifact.json').read_bytes())
    assert sha(folder/'artifact.json') == s['builds'][name]['receipt']['manifest_sha256']
    for path, binding in manifest['files'].items():
        file = folder/path
        assert file.is_file() and not file.is_symlink()
        assert file.stat().st_size == binding['bytes'] and sha(file) == binding['sha256']
    assert s['sizes'][name]['inventoried_artifact_bytes'] == sum(v['bytes'] for v in manifest['files'].values())
    assert s['sizes'][name]['generated_source_bytes'] == (folder/'program.mjs.source.mjs').stat().st_size
    artifacts[name] = manifest
assert (root/'baseline/deployment.snapshot').read_bytes() == (root/'selected/deployment.snapshot').read_bytes()
assert (root/'baseline/compiled.core.json').read_bytes() == (root/'selected/compiled.core.json').read_bytes()
assert artifacts['selected']['specialization']['input_core_sha256'] == artifacts['baseline']['compiled_core_sha256']
raw = read('raw.json')
assert len(raw) == 5 and [p['process'] for p in raw] == list(range(5))
for process in raw:
    assert len(process['samples']) == 42
    for rows in (0, 32, 1024):
        for index in range(7):
            pair = [t for t in process['samples'] if t['rows'] == rows and t['sample'] == index]
            assert len(pair) == 2 and {t['plan'] for t in pair} == {'baseline', 'selected'}
            assert pair[0]['checksum'] == pair[1]['checksum']
            assert all(t['iterations'] == 10000 and math.isfinite(t['elapsed_ms']) and t['elapsed_ms'] > 0 for t in pair)
for row in s['serving']:
    for name in ('baseline', 'selected'):
        medians = [statistics.median(t['elapsed_ms']*1000/t['iterations'] for t in p['samples']
                                    if t['rows'] == row['rows'] and t['plan'] == name) for p in raw]
        assert medians == row[name]['process_medians_us']
        assert statistics.median(medians) == row[name]['median_us']
    assert row['ratio'] == row['baseline']['median_us']/row['selected']['median_us']
core = read('private-core-validation.json')
assert core['status'] == 'passed' and sha(root/'private-core.log') == core['log_sha256']
browser = read('browser.json')
assert browser['status'] == 'passed' and browser['comparisons'] == 93 and browser['gpuCalls'] == 1
print('passed: archived controls, artifact inventory, paired timing arithmetic, private core and browser receipts')
