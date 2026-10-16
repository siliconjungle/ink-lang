#!/usr/bin/env python3
"""Retain selected proofs/measurements, referring to unchanged historical bytes."""
from pathlib import Path
import hashlib
import io
import json
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
BASE = ROOT / 'build/v8-select-circuits'


def main():
    assert json.loads((BASE / 'corpus/terminal.json').read_bytes())['exit_status'] == 0
    historical = HERE.parent / 'counts'
    prior = json.loads((historical / 'selected-inputs-index.json').read_bytes())
    known = {}
    for name, row in sorted(prior['files'].items()):
        known.setdefault(row['sha256'], name)
    files, blobs = {}, {}

    def add(path, label=None):
        assert path.is_file() and not path.is_symlink(), path
        raw = path.read_bytes()
        digest = hashlib.sha256(raw).hexdigest()
        label = label or str(path.relative_to(BASE))
        assert label not in files, label
        row = dict(sha256=digest, bytes=len(raw))
        if digest in known:
            row['historical_reference'] = known[digest]
        else:
            blobs[digest] = raw
        files[label] = row

    names = ['core-package.json', 'core-package-validated.json', 'private-package-validation.json',
             'private-package.log', 'private-driver.log', 'source-inputs.json',
             'source-commit-readback.json', 'final-source-pins.json', 'final-metadata.json',
             'final-metadata.stderr', 'final-fetch.log', 'final-cli-build.log',
             'source.core.json', 'bank-selection.json', 'knowledge-tests.log',
             'final-old-proof-replay.log', 'program.log', 'corpus.log',
             'legacy-source-prepare.log', 'legacy-full.log', 'legacy-terminal.json',
             'dense-comparison.json', 'dense-inputs.json', 'knowledge-publication.json',
             'component-knowledge-publication.json', 'probe_dense.py',
             'dense-proposal.py', 'bench_dense.py']
    for name in names:
        add(BASE / name)
    for process in range(3):
        for suffix in ['json', 'log']:
            add(BASE / f'dense-process-{process}.{suffix}')
    for name in ['count-program', 'emission', 'reproduced-final', 'pin-publication', 'corpus']:
        for path in sorted((BASE / name).rglob('*')):
            if not path.is_file() or path.is_symlink():
                continue
            relative = path.relative_to(BASE / name)
            if any(part in {'candidate', 'scratch', 'target', '__pycache__',
                            'empty-store', 'transport', 'library'} for part in relative.parts):
                continue
            if name == 'pin-publication' and path.name not in {
                    'receipt.json', 'Cargo.toml', 'Cargo.lock', 'metadata.stdout',
                    'metadata.stderr', 'fetch-locked.stdout', 'fetch-locked.stderr'}:
                continue
            add(path)
    for path in sorted((ROOT / 'knowledge/producers/data/v8-count-laws').glob('*')):
        if path.name == 'index.json' or path.name.endswith('.json.gz'):
            add(path, 'count-bank/' + path.name)
    for name in ['prepare_program.py', 'validate_private_core.py', 'publish_pin.py']:
        add(BASE / name, 'runners/' + name)
    archive = HERE / 'selected-inputs.tar.gz'
    with tarfile.open(archive, 'w:gz', compresslevel=6) as tar:
        for digest, raw in sorted(blobs.items()):
            member = tarfile.TarInfo('blobs/' + digest)
            member.size, member.mode, member.mtime = len(raw), 0o644, 0
            tar.addfile(member, io.BytesIO(raw))
    record = dict(schema=1, archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
                  historical_archive_sha256=hashlib.sha256((historical / 'selected-inputs.tar.gz').read_bytes()).hexdigest(),
                  historical_index_sha256=hashlib.sha256((historical / 'selected-inputs-index.json').read_bytes()).hexdigest(),
                  files=files, blobs=len(blobs), logical_files=len(files),
                  scope='Selected proof/measurement/reproduction inputs. Exact unchanged bytes reference the historical count capsule. No private stores, whole dependency/source copies or targets; selected compiler images stay local with committed source pins.')
    (HERE / 'selected-inputs-index.json').write_text(json.dumps(record, indent=2) + '\n')
    print('Retained', len(files), 'logical inputs;', len(blobs), 'new blobs;', archive.stat().st_size, 'archive bytes')


if __name__ == '__main__':
    main()
