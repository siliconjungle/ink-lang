#!/usr/bin/env python3
"""Replay exact retained JavaScript or regenerate with the matching compiler."""
import argparse
import gzip
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
    return subprocess.run([str(x) for x in argv], check=True, cwd=ROOT, **kwargs)


def extract(archive, destination):
    destination.mkdir(parents=True, exist_ok=True)
    with tarfile.open(archive) as handle:
        for member in handle:
            target = (destination / member.name).resolve()
            if not target.is_relative_to(destination.resolve()) or not member.isfile():
                raise ValueError("Unexpected archive member")
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(handle.extractfile(member).read())


def retention(out):
    files = [p for p in out.rglob('*') if p.is_file() and 'target' not in p.relative_to(out).parts and p.name != 'storage-retention.json']
    keeps = [{'path': str(p.relative_to(out)), 'reason': 'Exact measurement or required reproduction input'} for p in sorted(files)]
    keeps.append({'path': 'storage-retention.json', 'reason': 'Retention contract'})
    target = out / 'cross/rust/target'
    retired = [{'path': 'cross/rust/target', 'reason': 'Completed untimed validation build; source, results and selected Wasm image retained'}] if target.exists() else []
    (out / 'storage-retention.json').write_text(json.dumps({'schema': 1, 'keep': keeps, 'safe_to_remove': retired}, indent=2) + '\n')
    cargo = out / 'cross/rust'
    (cargo / 'storage-retention.json').write_text(json.dumps({'schema': 1, 'keep': [{'path': str(p.relative_to(cargo)), 'reason': 'Required literal validation input'} for p in sorted(cargo.rglob('*')) if p.is_file() and 'target' not in p.relative_to(cargo).parts] + [{'path': 'storage-retention.json', 'reason': 'Retention contract'}], 'safe_to_remove': [{'path': 'target', 'reason': 'Completed untimed validation build'}] if (cargo/'target').exists() else []}, indent=2) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out', type=Path, default=ROOT / 'build/state-native-f32-replay')
    parser.add_argument('--node', default=shutil.which('node'))
    parser.add_argument('--compiler', type=Path)
    parser.add_argument('--cross-target', action='store_true', help='Rebuild and verify native/Wasm outputs using local Cargo')
    parser.add_argument('--browser', action='store_true', help='Require Chrome, workers and actual hardware WebGPU')
    args = parser.parse_args()
    out = args.out.resolve()
    if out.parent != (ROOT / 'build').resolve():
        parser.error('--out must be a new direct child of the repository build directory')
    out.mkdir(parents=True, exist_ok=False)
    manifest = json.loads((HERE / 'artifacts.json').read_text())
    for name, entry in manifest.items():
        data = gzip.decompress((HERE / entry['artifact']).read_bytes())
        assert hashlib.sha256(data).hexdigest() == entry['sha256'], name
        path = out / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    extract(HERE / 'artifacts/rust-inputs.tar.gz', out / 'cross/rust')
    extract(HERE / 'artifacts/device-inputs.tar.gz', out / 'cross/gpu-module')
    for name in ['browser-check.mjs']:
        shutil.copyfile(HERE / name, out / name)
    if args.compiler:
        emitted = out / 'regenerated.mjs'
        run([args.compiler.resolve(), 'build', out / 'conformance/source.core.json', '--core', '--target', 'javascript', '-o', emitted])
        assert emitted.read_bytes() == (out / 'conformance/program.mjs').read_bytes(), 'Compiler output changed; this is a different conformance artifact'
    run([args.node, out / 'conformance/run.mjs'])
    # Replays the selected exact Wasm image even without a local Rust toolchain.
    run([args.node, out / 'cross/check-wasm.mjs'])
    if args.cross_target:
        env = dict(os.environ, CARGO_PROFILE_DEV_DEBUG='0', CARGO_INCREMENTAL='0')
        project = out / 'cross/rust/Cargo.toml'
        run(['cargo', 'fetch', '--locked', '--manifest-path', project], env=env)
        common = ['--locked', '--offline', '--manifest-path', project, '--target-dir', out / 'cross/rust/target']
        run(['cargo', 'build'] + common, env=env)
        result = subprocess.check_output([out / 'cross/rust/target/debug/compiled-state', out / 'cross/script.json'])
        (out / 'cross/native-results.json').write_bytes(result)
        assert json.loads(result) == json.loads((out / 'cross/expected.json').read_text())
        run(['cargo', 'build', '--lib', '--target', 'wasm32-unknown-unknown'] + common, env=env)
        shutil.copyfile(out / 'cross/rust/target/wasm32-unknown-unknown/debug/compiled_state.wasm', out / 'cross/compiled_state.wasm')
        run([args.node, out / 'cross/check-wasm.mjs'])
    if args.browser:
        run([args.node, out / 'browser-check.mjs'], env=dict(os.environ, INK_STATE_FLOAT_DIR=str(out.relative_to(ROOT))))
    retention(out)
    print('Verified retained values/snapshots. Results:', out)


if __name__ == '__main__':
    main()
