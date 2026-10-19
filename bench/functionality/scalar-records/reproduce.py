#!/usr/bin/env python3
"""Replay the public scalar-record conformance evidence in a minimal workspace."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def run(argv, **kwargs):
    subprocess.run([str(x) for x in argv], cwd=ROOT, check=True, **kwargs)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=ROOT / 'build/scalar-records-replay')
    parser.add_argument('--compiler', type=Path)
    parser.add_argument('--node', default=shutil.which('node'))
    parser.add_argument('--browser', action='store_true')
    args = parser.parse_args()
    for name, digest in json.loads((HERE / 'hashes.json').read_text()).items():
        assert hashlib.sha256((HERE / name).read_bytes()).hexdigest() == digest, name
    out = args.out.resolve()
    if out.parent != (ROOT / 'build').resolve():
        parser.error('--out must be a new direct child of the repository build directory')
    out.mkdir(parents=True, exist_ok=False)
    for name, entry in json.loads((HERE / 'artifacts.json').read_text()).items():
        target = out / name
        assert target.resolve().is_relative_to(out)
        data = gzip.decompress((HERE / entry['artifact']).read_bytes())
        assert hashlib.sha256(data).hexdigest() == entry['sha256'], name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    gpu = out / 'cross/gpu-module'
    gpu.mkdir(parents=True)
    with tarfile.open(HERE / 'artifacts/device-inputs.tar.gz') as archive:
        for member in archive:
            target = gpu / member.name
            assert member.isfile() and target.resolve().is_relative_to(gpu.resolve())
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.extractfile(member).read())
    if args.compiler:
        for mode in ['borrowed', 'captured', 'bits', 'wide', 'state']:
            folder = out / ('conformance' if mode == 'state' else 'generic/' + mode)
            emitted = folder / 'regenerated.mjs'
            run([args.compiler.resolve(), 'build', folder / 'source.core.json', '--core', '--target', 'javascript', '-o', emitted])
            assert emitted.read_bytes() == (folder / 'program.mjs').read_bytes(), mode + ': different compiler epoch'
    for mode in ['borrowed', 'captured', 'bits', 'wide']:
        run([args.node, out / 'generic' / mode / 'run.mjs', mode])
    run([args.node, out / 'conformance/run.mjs'])
    run([args.node, out / 'cross/check-wasm.mjs'])
    if args.browser:
        import os
        shutil.copyfile(HERE / 'browser-check.mjs', out / 'browser-check.mjs')
        run([args.node, out / 'browser-check.mjs'], env=dict(os.environ, INK_STATE_FLOAT_DIR=str(out.relative_to(ROOT))))
    retired = [str(p.relative_to(out)) for p in sorted(out.rglob('*.plan.json'))]
    keeps = [{'path': str(p.relative_to(out)), 'reason': 'Exact selected conformance input or replay result'} for p in sorted(out.rglob('*')) if p.is_file() and str(p.relative_to(out)) not in retired]
    keeps.append({'path': 'storage-retention.json', 'reason': 'Retention contract'})
    (out / 'storage-retention.json').write_text(json.dumps({'schema': 1, 'keep': keeps, 'safe_to_remove': [{'path': p, 'reason': 'Completed ordinary build sidecar; selected checked source and exact generated module retained'} for p in retired]}, indent=2) + '\n')
    print('Verified scalar records, exact state histories and selected Wasm controls:', out)


if __name__ == '__main__':
    main()
