#!/usr/bin/env python3
"""Replay exact generic owned-call boundaries without private application inputs."""
import argparse
import hashlib
import json
import os
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
    parser.add_argument('--out', type=Path, default=ROOT / 'build/owned-call-capture-replay')
    parser.add_argument('--node', default=shutil.which('node'))
    parser.add_argument('--measure', action='store_true')
    parser.add_argument('--browser', action='store_true')
    parser.add_argument('--compiler', type=Path)
    args = parser.parse_args()
    for name, expected in json.loads((HERE / 'hashes.json').read_text()).items():
        assert hashlib.sha256((HERE / name).read_bytes()).hexdigest() == expected, name
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    (out / 'storage-retention.json').write_text(json.dumps({'schema':1,'keep':[{'path':x,'reason':'Active required replay input or generated validation'} for x in ['generic','measure.mjs','browser.mjs']],'safe_to_remove':[]},indent=2)+'\n')
    with tarfile.open(HERE / 'bundles.tar.gz') as archive:
        for member in archive.getmembers():
            assert member.isfile() and not Path(member.name).is_absolute() and '..' not in Path(member.name).parts
        archive.extractall(out)
    for name in ['measure.mjs', 'browser.mjs']:
        shutil.copyfile(HERE / name, out / name)
    for source in (HERE / 'generic').iterdir():
        if source.is_file():
            shutil.copyfile(source, out / 'generic' / source.name)
    run([args.node, out / 'generic/verify.mjs'])
    if args.compiler:
        emitted = out / 'generic/regenerated'
        env = dict(os.environ, CARGO_PROFILE_DEV_DEBUG='0', CARGO_PROFILE_TEST_DEBUG='0', CARGO_INCREMENTAL='0')
        run([args.compiler.resolve(), 'build', out / 'generic/source.ink', '--target', 'webgpu', '-o', emitted], env=env)
        for name in ['program.mjs', 'ink-gpu.mjs', 'ink-abi.mjs', 'cpu.wasm']:
            assert (emitted / name).read_bytes() == (out / 'generic/candidate' / name).read_bytes(), 'Different compiler/toolchain epoch: '+name
    if args.measure:
        run([args.node, out / 'generic/node.mjs', 'replay-node.json'])
    if args.browser:
        run([args.node, out / 'browser.mjs', 'replay-browser.json'], env=dict(os.environ, INK_CAPTURE_DIR=str(out.relative_to(ROOT))))
    keep = [{'path': str(p.relative_to(out)), 'reason': 'Selected generic reproduction input or proof result'} for p in sorted(out.rglob('*')) if p.is_file() and 'regenerated' not in p.parts and p.name != 'storage-retention.json']
    (out / 'storage-retention.json').write_text(json.dumps({'schema':1,'keep':keep,'safe_to_remove':([{'path':'generic/regenerated','reason':'Completed optional source replay; selected bundle and source retained'}] if args.compiler else [])}, indent=2)+'\n')
    print('Replayed generic native capture, reference/JS/Wasm, owned results and selected transports:', out)

if __name__ == '__main__':
    main()
