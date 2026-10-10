#!/usr/bin/env python3
"""Discover pinned JSON proof libraries; the Ink checker decides validity."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMMANDS = {
    'total-scalar-equality-v1': 'verify-database',
    'first-order-inductive-equality-v1': 'verify-library',
}

def catalogue(root):
    packages = []
    for path in sorted(root.rglob('lock.json')):
        raw = path.read_bytes()
        lock = json.loads(raw)
        semantics = lock['semantics']
        if lock['schema'] != 1 or semantics not in COMMANDS:
            raise ValueError(f'Unsupported library lock: {path}')
        packages.append(dict(name=path.parent.relative_to(root).as_posix(),
            lock=str(path.relative_to(root)),
            lock_sha256=hashlib.sha256(raw).hexdigest(),
            semantics=semantics, checker_command=COMMANDS[semantics],
            roots=len(lock['objects'])))
    return dict(schema=1, kind='ink-knowledge-discovery', packages=packages)

def encoded(value):
    return json.dumps(value, indent=2) + '\n'

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['list', 'rebuild', 'check', 'verify'])
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--compiler', type=Path)
    args = parser.parse_args()
    root = args.root.resolve()
    current = catalogue(root)
    index = root / 'catalogue.json'
    if args.command == 'rebuild':
        index.write_text(encoded(current))
    elif args.command == 'list':
        for package in current['packages']:
            print(f"{package['name']}\t{package['semantics']}\t{package['lock']}")
    else:
        if index.read_text() != encoded(current):
            raise ValueError('Discovery index differs from the current locks; rebuild it')
        if args.command == 'verify':
            if args.compiler is None:
                parser.error('verify requires --compiler PATH')
            compiler = args.compiler.resolve()
            original = hashlib.sha256(compiler.read_bytes()).hexdigest()
            results = []
            for package in current['packages']:
                result = subprocess.run([str(compiler), package['checker_command'],
                    str(root / package['lock'])], check=True, capture_output=True, text=True)
                checked = json.loads(result.stdout) if package['checker_command'] == 'verify-library' else result.stdout.strip()
                results.append(dict(name=package['name'], result=checked))
            if hashlib.sha256(compiler.read_bytes()).hexdigest() != original:
                raise ValueError('Compiler identity changed during checking')
            print(encoded(dict(status='verified', compiler_sha256=original,
                packages=results, scope='Checked mathematical libraries; native replacement admission is separate.')), end='')
            return
    if args.command != 'list':
        print(f"{args.command}: {len(current['packages'])} packages")

if __name__ == '__main__':
    main()
