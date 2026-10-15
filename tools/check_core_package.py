#!/usr/bin/env python3
"""Check package/source tree identity, then test a private standalone core build.

A private checkout AND target directory prevent tests from linking a stale root
crate from another checkout through a shared Cargo build directory. Cargo's normal
download cache can be shared. This validates implemented checks, not the compiler.
"""
import argparse
import hashlib
import io
import json
import os
import re
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]

def checked_tree(record):
    for key in ('commit', 'source', 'core_tree'):
        if not re.fullmatch('[0-9a-f]{40}', str(record.get(key, ''))):
            raise ValueError('core package receipt requires canonical Git identities')
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()
    package = git('rev-parse', record['commit'] + '^{commit}')
    source = git('rev-parse', record['source'] + '^{commit}')
    tree = git('rev-parse', package + ':core')
    if tree != record['core_tree'] or tree != git('rev-parse', source + ':core'):
        raise ValueError('core package tree differs from recorded committed source')
    entries = git('ls-tree', '--name-only', package).splitlines()
    if entries != ['core']:
        raise ValueError('standalone package must contain only core')
    return package, source, tree

def check(record, cargo, log, receipt):
    package, source, tree = checked_tree(record)
    archive = subprocess.check_output(['git', 'archive', '--format=tar', package, 'core'], cwd=ROOT)
    if len(archive) > 64 * 1024 * 1024:
        raise ValueError('core archive byte limit')
    log.parent.mkdir(parents=True, exist_ok=True)
    receipt.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='ink-core-checked-') as directory:
        checkout = Path(directory)
        with tarfile.open(fileobj=io.BytesIO(archive)) as bundle:
            members = bundle.getmembers()
            if len(members) > 10000 or sum(m.size for m in members) > 64 * 1024 * 1024:
                raise ValueError('core archive structural limit')
            bundle.extractall(checkout, filter='data')
        manifest = checkout / 'core/Cargo.toml'
        environment = dict(os.environ)
        environment['CARGO_TARGET_DIR'] = str(checkout / 'target')
        command = [cargo, 'test', '--locked', '--manifest-path', str(manifest)]
        with log.open('wb') as output:
            completed = subprocess.run(command, cwd=checkout, env=environment, stdout=output, stderr=subprocess.STDOUT)
        result = dict(schema=1, status='passed' if completed.returncode == 0 else 'failed',
                      package=package, source=source, core_tree=tree,
                      archive_sha256=hashlib.sha256(archive).hexdigest(),
                      log_sha256=hashlib.sha256(log.read_bytes()).hexdigest(),
                      cargo_version=subprocess.check_output([cargo, '--version'], text=True).strip(),
                      private_checkout=True, private_target=True,
                      scope='Exact committed standalone core tree with complete tests and isolated compilation. No whole-checker, compiler, ABI or toolchain correctness proof.')
        receipt.write_text(json.dumps(result, indent=2) + '\n')
        if completed.returncode:
            raise RuntimeError(f'private core validation failed; see {log}')
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('package_receipt', type=Path)
    parser.add_argument('--cargo', default='cargo')
    parser.add_argument('--log', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    args = parser.parse_args()
    result = check(json.loads(args.package_receipt.read_text()), args.cargo, args.log.resolve(), args.receipt.resolve())
    print(json.dumps(result))

if __name__ == '__main__':
    main()
