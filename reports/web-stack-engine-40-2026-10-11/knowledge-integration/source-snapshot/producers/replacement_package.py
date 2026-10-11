#!/usr/bin/env python3
"""Produce an untrusted admission envelope pinned to executable core and proofs."""
import argparse
import hashlib
import json
import shutil
import subprocess
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('proposal', type=Path)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    compiler = args.compiler.resolve()
    package_path = args.proposal.resolve()
    package = json.loads(package_path.read_text())
    relative = Path(package['library'])
    if relative.is_absolute() or not relative.parts or any(p in ('.', '..') for p in relative.parts):
        parser.error('proposal library must be relative without traversal')
    lock_path = package_path.parent / relative
    out = args.output_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    if any(out.iterdir()):
        parser.error('output directory must be empty')
    before = hashlib.sha256(compiler.read_bytes()).hexdigest()
    result = subprocess.run([str(compiler), 'emit-core', str(args.source.resolve()),
        '-o', str(out/'core.json')], check=True, capture_output=True, text=True)
    subject = json.loads(result.stdout)
    # Copy immutable proof bytes into a portable package. The checker will
    # validate their pinned closure; this producer is never proof authority.
    shutil.copytree(lock_path.parent/'objects', out/'objects')
    lock_bytes = lock_path.read_bytes()
    (out/'lock.json').write_bytes(lock_bytes)
    package['library'] = 'lock.json'
    envelope = dict(schema=1, semantics='ink-checked-replacement-v1',
        core_semantics=subject['semantics'], input_core_sha256=subject['core_sha256'],
        observations='pure-total-values-v1',
        library_lock_sha256=hashlib.sha256(lock_bytes).hexdigest(), package=package)
    (out/'replacement.json').write_text(json.dumps(envelope, indent=2)+'\n')
    subprocess.run([str(compiler),'emit-c',str(out/'core.json'),'--core',
        '--replacement',str(out/'replacement.json'),'-o',str(out/'checked.c')],
        check=True, capture_output=True, text=True)
    if hashlib.sha256(compiler.read_bytes()).hexdigest() != before:
        raise ValueError('Compiler changed during production')
    print(json.dumps(dict(status='checked', compiler_sha256=before,
        input_core_sha256=subject['core_sha256'], replacement=str(out/'replacement.json'))))

if __name__ == '__main__':
    main()
