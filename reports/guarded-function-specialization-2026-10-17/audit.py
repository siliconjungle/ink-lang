#!/usr/bin/env python3
"""Replay the retained guarded plan and finite implementation controls."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--ink', type=Path)
parser.add_argument('--run', action='store_true', help='rerun retained JS, Wasm and initialized JS histories')
args = parser.parse_args()
root = Path(__file__).resolve().parent
report = json.loads((root/'summary.json').read_bytes())
for name, expected in report['files'].items():
    path = root/name
    assert path.resolve().is_relative_to(root)
    data = path.read_bytes()
    assert len(data) == expected['bytes'], name
    assert hashlib.sha256(data).hexdigest() == expected['sha256'], name

source = json.loads((root/'proof/source.core.json').read_bytes())
plan = json.loads((root/'proof/plan.json').read_bytes())
assert [s['kind'] for s in plan['steps']] == ['extension', 'rewrite', 'extension', 'functions']
selected = plan['steps'][-1]['package']['selected']
assert set(plan['steps'][-1]['package']['proofs']) == {'evaluate'}
assert not source['program'].get('frozen') and not selected['program'].get('frozen')
assert source['program']['actions'] == selected['program']['actions']
assert source['program']['contracts'] == selected['program']['contracts']
assert set(source['program']['contracts']['learning']['trainable']) == {'Code', 'Weights'}
assert 'recode' in source['program']['contracts']['learning']['learn']
steps = json.loads((root/'parity/script.json').read_bytes())
outcomes = json.loads((root/'parity/expected.json').read_bytes())
assert len(steps) == 341 and len(outcomes) == 335
assert sum('restore' in step for step in steps) == 6
assert 'test result: ok. 2 passed' in (root/'runtime.log').read_text()
assert 'Ran 24 tests' in (root/'knowledge-tests.log').read_text()
for name, expected_tests, targets in [('shared-core-validation', 503, 83),
                                      ('js-capture-validation', 59, 46)]:
    folder = root/name
    receipt = json.loads((folder/'receipt.json').read_bytes())
    assert receipt['status'] == 'passed' and receipt['completed_targets'] == targets
    count = 0
    for phase in receipt['phases']:
        assert phase['status'] == 0
        data = (folder/(phase['name']+'.log')).read_bytes()
        assert hashlib.sha256(data).hexdigest() == phase['log_sha256']
        count += sum(map(int, re.findall(r'test result: ok\. (\d+) passed', data.decode())))
    assert count == expected_tests

if args.ink:
    def run(*command):
        return subprocess.check_output([str(args.ink.resolve()), *map(str, command)], stderr=subprocess.PIPE, timeout=180)
    checked = json.loads(run('check-plan', root/'proof/source.core.json', root/'proof/plan.json', '--core'))
    saved = json.loads((root/'replay.json').read_bytes())
    for key in ['input', 'selected', 'plan_sha256']:
        assert checked[key] == saved[key]
    with tempfile.TemporaryDirectory() as temporary:
        for target, filename in [('javascript', 'selected.mjs'), ('rust', 'selected.rs')]:
            output = Path(temporary)/filename
            run('compile', root/'proof/source.core.json', '--core', '--plan', root/'proof/plan.json',
                '--target', target, '-o', output)
            generated = output.read_bytes()
            retained = (root/'parity/program.mjs' if target == 'javascript'
                        else root/'parity/rust/src/lib.rs').read_bytes()
            assert generated == retained if target == 'javascript' else retained.startswith(generated)

if args.run:
    with tempfile.TemporaryDirectory() as temporary:
        folder = Path(temporary)
        shutil.copytree(root/'parity', folder/'parity')
        wasm = folder/'parity/rust/target/wasm32-unknown-unknown/debug/compiled_state.wasm'
        wasm.parent.mkdir(parents=True)
        shutil.copy2(root/'parity/compiled_state.wasm', wasm)
        shutil.copytree(root/'initialized', folder/'initialized')
        for script in ['parity/check.mjs', 'parity/check-wasm.mjs', 'initialized/check-initialized.mjs']:
            result = subprocess.run(['node', str(folder/script)], capture_output=True, text=True, timeout=180)
            assert result.returncode == 0, result.stderr
print(json.dumps(dict(status='passed', files=len(report['files']), cpu_outcomes=335,
                      restores=6, core_tests=503, javascript_tests=59,
                      proof_replay=bool(args.ink), retained_runtime_replay=args.run)))
