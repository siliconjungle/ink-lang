#!/usr/bin/env python3
"""Audit retained bytes and replay both source-bound plans with the current CLI."""
import argparse
import gzip
import hashlib
import json
import re
from pathlib import Path
import subprocess
import tempfile


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--ink', type=Path, required=True)
    a = p.parse_args()
    here = Path(__file__).resolve().parent
    manifest = json.loads((here/'manifest.json').read_bytes())
    for name, expected in manifest['files'].items():
        if hashlib.sha256((here/name).read_bytes()).hexdigest() != expected:
            raise ValueError('retained file changed: '+name)
    core = json.loads((here/'private-core-validation.json').read_bytes())
    assert core['status'] == 'passed' and core['tests'] == 486 and core['completed_targets'] == 81
    assert len(core['files']) == 227 and all(row['status'] == 0 for row in core['phases'])
    tests = 0
    for phase in core['phases']:
        log = gzip.decompress((here/(phase['name']+'.log.gz')).read_bytes())
        assert hashlib.sha256(log).hexdigest() == phase['log_sha256']
        tests += sum(map(int, re.findall(rb'test result: ok\. (\d+) passed;', log)))
    assert tests == 486
    rebuild = json.loads((here/'publication-rebuild.json').read_bytes())
    assert rebuild['status'] == 'passed' and rebuild['authoring']['equal']
    assert all(image['equal'] and image['actual'] == image['expected'] for image in rebuild['images'].values())
    assert hashlib.sha256((here/'publication-Cargo.lock').read_bytes()).hexdigest() == rebuild['resolution_lock_sha256']
    assert hashlib.sha256(gzip.decompress((here/'publication-rebuild.log.gz').read_bytes())).hexdigest() == rebuild['log_sha256']
    corpus = json.loads(gzip.decompress((here/'corpus/report.json.gz').read_bytes()))
    assert corpus['headline']['programs'] == corpus['headline']['compiled'] == 10
    assert corpus['headline']['programs_selecting_alternative'] == 0
    observations = json.loads((here/'corpus/corpus-explicit-projection.json').read_bytes())
    assert len(observations['programs']) == 10
    assert all(row['proposed'] == row['admitted'] == 0 for row in observations['programs'])
    samples = json.loads(gzip.decompress((here/'benchmark-projection-summary.json.gz').read_bytes()))
    assert samples['pairs'] == 6 and len(samples['measurements']) == 6
    for pair in samples['measurements']:
        for baseline, projected in zip(pair['records']['baseline']['records'], pair['records']['projected']['records']):
            assert baseline['checksum'] == projected['checksum']
            assert baseline['snapshot'] == projected['snapshot']
    with tempfile.TemporaryDirectory(prefix='ink-owned-graph-audit-') as temporary:
        d = Path(temporary)
        def retained(name):
            source = here/name
            data = source.read_bytes() if source.exists() else gzip.decompress((here/(name+'.gz')).read_bytes())
            target = d/name
            target.write_bytes(data)
            return target
        source = retained('source.core.json')
        for name in ['projection-plan.json', 'final-plan.json']:
            result = subprocess.run([str(a.ink.resolve()), 'check-plan', str(source), str(retained(name)),
                                     '--core', '--target', 'javascript'], capture_output=True, text=True, timeout=180)
            if result.returncode:
                raise ValueError(name+': '+result.stderr[-3000:])
            assert json.loads(result.stdout)['status'] == 'checked'
    print('PASS retained core receipts, every paired result, and both complete source-bound plans')


if __name__ == '__main__':
    main()
