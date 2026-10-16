#!/usr/bin/env python3
"""Audit retained evidence; --ink also replays proofs and source images."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--ink', type=Path)
a = p.parse_args()
r = Path(__file__).resolve().parent
report = json.loads((r/'summary.json').read_bytes())
assert report['status'] == 'validated-explicit-specialization'
for name, expected in report['files'].items():
    path = r/name
    assert path.resolve().is_relative_to(r), name
    data = path.read_bytes()
    assert len(data) == expected['bytes'], name
    assert hashlib.sha256(data).hexdigest() == expected['sha256'], name
core = json.loads((r/'core-validation/receipt.json').read_bytes())
assert core['status'] == 'passed' and core['completed_targets'] == 83
assert len(core['files']) == 232
count = 0
for phase in core['phases']:
    assert phase['status'] == 0
    log = (r/'core-validation'/(phase['name']+'.log')).read_bytes()
    assert hashlib.sha256(log).hexdigest() == phase['log_sha256']
    count += sum(map(int, re.findall(r'test result: ok\. (\d+) passed', log.decode())))
assert count == 501
steps = json.loads((r/'parity/script.json').read_bytes())
expected = json.loads((r/'parity/expected.json').read_bytes())
assert len(steps) == 341 and len(expected) == 335
assert sum('restore' in step for step in steps) == 6
plan = json.loads((r/'proof/plan.json').read_bytes())
assert [step['kind'] for step in plan['steps']] == ['extension', 'functions']
replacement = plan['steps'][-1]['package']
assert replacement['semantics'] == 'ink-source-functions-v1'
assert list(replacement['proofs']) == ['chosen']
assert not replacement['selected']['program'].get('frozen')
source = json.loads((r/'proof/source.core.json').read_bytes())
assert not source['program'].get('frozen')
assert source['program']['actions'] == replacement['selected']['program']['actions']
assert json.loads((r/'compiler-sources.json').read_bytes())['status'] == 'matched'
replay = json.loads((r/'publication-replay.json').read_bytes())
assert replay['status'] == 'passed'
if a.ink:
    ink = str(a.ink.resolve())
    def run(*args):
        return subprocess.check_output([ink, *map(str, args)], stderr=subprocess.PIPE, timeout=180)
    checked = json.loads(run('check-plan', r/'proof/source.core.json', r/'proof/plan.json', '--core'))
    assert checked['input'] == replay['results']['plan']['input']
    assert checked['selected'] == replay['results']['plan']['selected']
    assert checked['plan_sha256'] == replay['results']['plan']['plan_sha256']
    run('knowledge-check', r/'staged/source.core.json', r/'staged-function-bundle.json')
    with tempfile.TemporaryDirectory() as temporary:
        for target, filename in [('javascript', 'selected.mjs'), ('rust', 'selected.rs')]:
            path = Path(temporary)/filename
            run('compile', r/'proof/source.core.json', '--core', '--plan', r/'proof/plan.json',
                '--target', target, '-o', path)
            data = path.read_bytes()
            image = r/'parity/program.mjs' if target == 'javascript' else r/'parity/rust/src/lib.rs'
            assert data == image.read_bytes() if target == 'javascript' else image.read_bytes().startswith(data)
            assert hashlib.sha256(data).hexdigest() == replay['results'][target]['sha256']
print(json.dumps(dict(status='passed', files=len(report['files']), core_tests=count,
                      cpu_outcomes=335, restores=6, proof_replay=bool(a.ink))))
