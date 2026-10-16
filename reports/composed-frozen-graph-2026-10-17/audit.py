#!/usr/bin/env python3
"""Check retained evidence and optionally replay the entire source-bound plan."""
import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path
import statistics
import subprocess
import tempfile

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--ink', type=Path)
a = p.parse_args()
here = Path(__file__).resolve().parent
manifest = json.loads((here/'manifest.json').read_bytes())
for name, row in manifest['files'].items():
    data = (here/name).read_bytes()
    assert len(data) == row['bytes'] and hashlib.sha256(data).hexdigest() == row['sha256'], name
def read(name):
    data = (here/name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data
def load(name):
    return json.loads(read(name))
def signed(value):
    if isinstance(value, float) and value == 0 and math.copysign(1, value) < 0:
        return {'F32Bits': 2147483648}
    if isinstance(value, list): return [signed(v) for v in value]
    if isinstance(value, dict): return {k:signed(v) for k,v in value.items()}
    return value

core = load('core-package.json')
assert core['commit'] == 'feaec2d2d25e6e72ed369af470b9d6053768ec4b'
compiler = load('compiler-sources.json.gz')
assert compiler['status'] == 'matched' and compiler['compiler_sha256'] == manifest['compiler_sha256']
assert sum(compiler['counts'].values()) == len(compiler['files']) == 411
replay = load('publication-replay.json.gz')
assert replay['status'] == 'passed' and len(replay['images']) == 6
assert all(image['equal'] and image['actual'] == image['expected'] for image in replay['images'].values())
assert replay['authoring']['equal_json']
assert replay['compiler_sha256'] == load('publication-compiler-sources.json.gz')['compiler_sha256']
assert hashlib.sha256(read('publication-replay.log.gz')).hexdigest() == replay['log_sha256']
plan = load('plan.json.gz')
assert len(plan['steps']) == 4
assert len(load('histories.json.gz')) == 175
expected = load('reference-baseline.json.gz')
for variant in ['baseline', 'selected']:
    observed = load('javascript-'+variant+'.json.gz')
    assert observed['initial'] == expected['initial']
    assert len(observed['records']) == len(expected['records']) == 175
    for left, right in zip(observed['records'], expected['records']):
        assert signed(left) == signed({k:v for k,v in right.items() if k != 'logical'})
steps = load('parity/script.json.gz')
assert sum('restore' in step for step in steps) == 5
assert len(load('parity/expected.json.gz')) == 88
log = read('cross-target-final.log.gz')
assert b'2 passed; 0 failed' in log and b'88 values/outcomes and exact snapshots matched' in log
assert b'111 values/outcomes and exact snapshots matched' in log

summaries = {}
for directory in ['paired', 'native-paired']:
    summary = load(directory+'/summary.json.gz'); summaries[directory] = summary
    assert len(summary['pairs']) == 6
    ratios = {name:[[] for _ in range(3)] for name in ['projected','selected']}
    for pair in summary['pairs']:
        baseline = pair['variants']['baseline']['records']
        for variant in ['baseline','projected','selected']:
            assert pair['variants'][variant] == load(directory+'/pair-'+str(pair['pair'])+'-'+variant+'.json.gz')
            for j,(left,right) in enumerate(zip(baseline,pair['variants'][variant]['records'])):
                assert left['checksum'] == right['checksum'] and left['snapshot'] == right['snapshot']
                if variant in ratios: ratios[variant][j].append(left['seconds']/right['seconds'])
    for variant, rows in ratios.items():
        assert [statistics.median(values) for values in rows] == summary['median_paired_throughput'][variant]
for js,rust in zip(summaries['paired']['pairs'],summaries['native-paired']['pairs']):
    for variant in ['baseline','projected','selected']:
        for left,right in zip(js['variants'][variant]['records'],rust['variants'][variant]['records']):
            assert left['checksum'] == right['checksum'] and left['snapshot'] == right['snapshot']
corpus = load('corpus/report.json.gz')
assert corpus['headline']['programs'] == corpus['headline']['compiled'] == 10
assert all(record['status'] == 0 for record in load('corpus/records.json.gz'))
if a.ink:
    with tempfile.TemporaryDirectory(prefix='ink-composed-graph-audit-') as temporary:
        d = Path(temporary)
        source, packet = d/'core.json', d/'plan.json'
        source.write_bytes(read('source.core.json.gz')); packet.write_bytes(read('plan.json.gz'))
        result = subprocess.run([str(a.ink.resolve()),'check-plan',str(source),str(packet),'--core','--target','javascript'],capture_output=True,text=True,timeout=180)
        assert result.returncode == 0, result.stderr[-3000:]
        assert json.loads(result.stdout)['status'] == 'checked'
print('PASS complete four-step evidence, 175 histories, 88 cross-target outcomes/five restores, both six-triple studies and ten corpus programs')
for name, summary in summaries.items(): print(name, json.dumps(summary['median_paired_throughput'],sort_keys=True))
