#!/usr/bin/env python3
"""Materialize only pinned optimizer inputs, verifying the retained inventory.

Uses curl's system TLS configuration. Streams the upstream archive; never saves
an archive or unpacks unrelated V8 source. Inventory is not completed review.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import tarfile

REVISION = 'c4e049d3cbda775e2c3af9410f6e18b18388d68b'
PREFIXES = ('src/compiler/', 'src/maglev/', 'src/execution/tiering-manager',
            'src/objects/feedback-vector', 'docs/compiler/')
EXTRA_PATHS = ('src/base/division-by-constant.cc', 'src/base/division-by-constant.h')


def acquire(directory, inventory):
    directory = Path(directory)
    if directory.exists():
        raise ValueError('Choose a fresh source directory; existing inputs are preserved')
    expected = json.loads(Path(inventory).read_bytes())
    if expected['revision'] != REVISION:
        raise ValueError('Pinned V8 revision mismatch')
    directory.mkdir(parents=True)
    found = []
    process = subprocess.Popen(['curl', '--fail', '--location', '--silent', '--show-error',
        'https://codeload.github.com/v8/v8/tar.gz/'+REVISION], stdout=subprocess.PIPE)
    try:
        with tarfile.open(fileobj=process.stdout, mode='r|gz') as archive:
            for member in archive:
                parts = member.name.split('/', 1)
                if len(parts) != 2:
                    continue
                path = parts[1]
                if (not member.isfile() or not (path.startswith(PREFIXES) or path in EXTRA_PATHS) or
                        not path.endswith(('.h', '.cc', '.md'))):
                    continue
                if Path(path).is_absolute() or '..' in Path(path).parts:
                    raise ValueError('Invalid archive path')
                data = archive.extractfile(member).read()
                target = directory/path; target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                found.append(dict(path=path, bytes=len(data), sha256=hashlib.sha256(data).hexdigest()))
        if process.wait() or sorted(found,key=lambda r:r['path']) != sorted(expected['files'],key=lambda r:r['path']):
            raise ValueError('V8 download or source inventory mismatch')
    finally:
        process.stdout.close()
        process.wait()
    return dict(revision=REVISION, files=len(found), bytes=sum(row['bytes'] for row in found))


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory',type=Path)
    parser.add_argument('--inventory',type=Path,default=Path(__file__).resolve().parents[1]/'bench/v8-learning/upstream-inventory.json')
    args=parser.parse_args()
    print(json.dumps(acquire(args.directory,args.inventory)))
