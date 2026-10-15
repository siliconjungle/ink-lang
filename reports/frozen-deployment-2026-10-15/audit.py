#!/usr/bin/env python3
"""Audit retained integrity; optionally replay semantic artifact verification."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--compiler', type=Path)
args = parser.parse_args()
metadata = json.loads((root / 'metadata.json').read_text())
actual = {}
for path in sorted(root.rglob('*')):
    assert not path.is_symlink(), path
    if path.is_file() and path.name != 'metadata.json':
        data = path.read_bytes()
        actual[str(path.relative_to(root))] = dict(bytes=len(data), sha256=hashlib.sha256(data).hexdigest())
assert actual == metadata['files'], 'report inventory changed'
artifact = json.loads((root / 'neural/artifact.json').read_text())
assert artifact['mode'] == 'frozen'
assert artifact['restriction']['frozen_roots'] == ['Architecture', 'Control', 'Optimizer']
for name, binding in artifact['files'].items():
    data = (root / 'neural' / name).read_bytes()
    assert binding == dict(bytes=len(data), sha256=hashlib.sha256(data).hexdigest()), name
compiled = json.loads((root / 'neural/compiled.core.json').read_text())
assert compiled['semantics'] == 'ink-executable-core-v14'
assert set(compiled['program']['frozen']) == {'Architecture', 'Control', 'Optimizer'}
assert not compiled['program']['contracts'].get('learning', {}).get('trainable', [])
for action in compiled['program']['actions']:
    assert not set(action['writes']).intersection(compiled['program']['frozen'])
seed = (root / 'neural/deployment.snapshot').read_bytes()
cases = json.loads((root / 'cases.json').read_text())
assert len(cases) == 4
assert all(bytes(case['snapshot']) == seed for case in cases)
assert [case['outcome'] for case in cases] == json.loads((root / 'reference.json').read_text())
if args.compiler:
    subprocess.run([str(args.compiler.resolve()), 'verify-model', str(root / 'neural'), '--replay'], check=True)
print(json.dumps(dict(status='checked', files=len(actual), semantic_replay=bool(args.compiler), scope='Retained integrity and optional ordinary reference verification; no authenticity, convergence, speed or whole-compiler proof.')))
