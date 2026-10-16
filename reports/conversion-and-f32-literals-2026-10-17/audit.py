#!/usr/bin/env python3
"""Check retained bytes, complete comparisons, and all validation logs."""
import gzip
import hashlib
import json
from pathlib import Path
import re
import statistics

here = Path(__file__).resolve().parent
manifest = json.loads((here / 'manifest.json').read_bytes())
for name, row in manifest['files'].items():
    data = (here / name).read_bytes()
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], name

def read(name):
    data = (here / name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data

def check_suite(name, directory, expected_targets, expected_tests=None):
    record = json.loads(read(name))
    assert record['status'] == 'passed'
    assert record.get('completed_targets', record.get('integration_targets')) == expected_targets
    count = 0
    for phase in record['phases']:
        assert phase['status'] == 0
        log = read(directory + '/' + phase['name'] + '.log.gz')
        assert hashlib.sha256(log).hexdigest() == phase['log_sha256']
        count += sum(map(int, re.findall(rb'test result: ok\. (\d+) passed;', log)))
    if expected_tests is not None:
        assert count == expected_tests, count
    return record

core = check_suite('guard/core-validation.json', 'guard/validation', 81, 488)
assert len(core['files']) == 228
js = check_suite('literals/validation-final/receipt.json.gz', 'literals/validation-final', 44)
assert js['core_package'] == manifest['pins']['core']
assert read('literals/after.mjs') == read('literals/published-after.mjs')
summary = json.loads(read('literals/clean/summary.json.gz'))
assert len(summary['pairs']) == 6
ratios = {}
for pair in summary['pairs']:
    before, after = [pair['variants'][name] for name in ['before', 'after']]
    for left, right in zip(before['records'], after['records']):
        assert left['workload'] == right['workload']
        assert left['checksum'] == right['checksum']
        if 'state' in left:
            assert left['state'] == right['state']
        ratios.setdefault(left['workload'], []).append(left['seconds'] / right['seconds'])
    for name in ['before', 'after']:
        raw = json.loads(read('literals/clean/pair-' + str(pair['pair']) + '-' + name + '.json.gz'))
        assert raw == pair['variants'][name]
for name, samples in ratios.items():
    assert statistics.median(samples) == summary['median_paired_ratio'][name]
print('PASS 488 core tests, 44 JavaScript targets, exact published image and all six complete paired results')
print(json.dumps(summary['median_paired_ratio'], sort_keys=True))
