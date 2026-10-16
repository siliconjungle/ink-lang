#!/usr/bin/env python3
"""Retain the merged validation context without rewriting measured history."""
from pathlib import Path
import hashlib
import io
import json
import tarfile

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
BASE = ROOT / 'build/v8-constructed-powers'


def main():
    terminal = json.loads((BASE / 'merged-corpus/terminal.json').read_bytes())
    assert terminal['exit_status'] == 0
    files, blobs = {}, {}

    def add(path):
        assert path.is_file() and not path.is_symlink(), path
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        blobs[digest] = raw
        files[str(path.relative_to(BASE))] = dict(sha256=digest, bytes=len(raw))

    for name in ['merged-source-pins.json', 'merged-private-validation-readback.json',
                 'merged-cli-build.log', 'merged-metadata.json', 'merged-metadata.stderr',
                 'merged-knowledge-tests.log', 'merged-audit.log', 'merged-corpus.log']:
        add(BASE / name)
    for name in ['merged-emission', 'merged-corpus']:
        for path in sorted((BASE / name).rglob('*')):
            if path.is_file() and not path.is_symlink() and not any(
                    part in {'scratch', '__pycache__'} for part in path.relative_to(BASE / name).parts):
                add(path)
    archive = HERE / 'merged-inputs.tar.gz'
    with tarfile.open(archive, 'w:gz', compresslevel=6) as tar:
        for digest, raw in sorted(blobs.items()):
            member = tarfile.TarInfo('blobs/' + digest)
            member.size, member.mtime, member.mode = len(raw), 0, 0o644
            tar.addfile(member, io.BytesIO(raw))
    record = dict(schema=1, archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
                  files=files, blobs=len(blobs),
                  historical_inputs_sha256=hashlib.sha256((HERE / 'selected-inputs.tar.gz').read_bytes()).hexdigest(),
                  scope='Merged compiler/source/package validation and separate frozen corpus. Measured cohort, original corpora and immutable observations retain their original contexts.')
    (HERE / 'merged-inputs-index.json').write_text(json.dumps(record, indent=2) + '\n')
    print('Retained', len(files), 'merged inputs in', archive.stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
