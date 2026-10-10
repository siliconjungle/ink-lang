#!/usr/bin/env python3
"""Install a relocatable Ink CLI and optional pinned tools into a fresh prefix."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile


def git(repo, *args):
    return subprocess.check_output(['git', '-C', str(repo), *args])


def committed(repo, paths, destination):
    # Package committed bytes, including submodule assets, not caches or local edits.
    archive = git(repo, 'archive', '--format=tar', 'HEAD', *paths)
    with tarfile.open(fileobj=io.BytesIO(archive)) as source:
        for member in source:
            if not member.isfile():
                continue
            name = Path(member.name)
            if name.is_absolute() or '..' in name.parts:
                raise ValueError('invalid committed resource path')
            path = destination / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(source.extractfile(member).read())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prefix', type=Path, required=True, help='new, dedicated installation directory')
    parser.add_argument('--binary', type=Path, help='package an already-built CLI instead of running cargo install')
    parser.add_argument('--cargo', default=os.environ.get('INK_CARGO', 'cargo'))
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    packages = {name: git(root / name, 'rev-parse', 'HEAD').decode().strip() for name in ['planner', 'knowledge']}
    for name, revision in packages.items():
        pinned = git(root, 'ls-tree', 'HEAD', name).decode().split()
        if len(pinned) < 3 or pinned[2] != revision:
            parser.error(f'{name} checkout differs from the distribution pin; run git submodule update --init {name}')
    prefix = args.prefix.expanduser().absolute()
    if prefix.exists():
        parser.error('prefix already exists; choose a fresh dedicated prefix, then switch PATH after validation')
    prefix.parent.mkdir(parents=True, exist_ok=True)
    stage = Path(tempfile.mkdtemp(prefix='.ink-install-', dir=prefix.parent))
    try:
        binary = stage / 'bin' / ('ink.exe' if os.name == 'nt' else 'ink')
        if args.binary:
            binary.parent.mkdir(parents=True)
            shutil.copy2(args.binary, binary)
        else:
            build_env = dict(os.environ, PATH=str(stage / 'bin') + os.pathsep + os.environ.get('PATH', ''))
            subprocess.run([args.cargo, 'install', '--path', str(root), '--locked', '--bin', 'ink', '--root', str(stage)], check=True, env=build_env)
        if not binary.is_file():
            raise ValueError('installation did not produce the Ink executable')
        resources = stage / 'share' / 'ink'
        committed(root / 'planner', ['plan.py', 'ink_planner'], resources / 'planner')
        committed(root / 'knowledge', ['ink_knowledge', 'store', 'research/general-laws', 'producers/view_decomposition.py'], resources / 'knowledge')
        manifest = dict(schema=1, source_revision=git(root, 'rev-parse', 'HEAD').decode().strip(), packages=packages,
                        source_checkout_dirty=bool(git(root, 'status', '--porcelain')),
                        binary_source='explicit --binary input' if args.binary else 'cargo install of the current checkout',
                        binary_sha256=hashlib.sha256(binary.read_bytes()).hexdigest(),
                        resources={str(p.relative_to(resources)): hashlib.sha256(p.read_bytes()).hexdigest()
                                   for p in sorted(resources.rglob('*')) if p.is_file()},
                        scope='Packaging provenance only. Proof authority comes from locally checked evidence, not this manifest.')
        (resources / 'distribution.json').write_text(json.dumps(manifest, indent=2) + '\n')
        # Every path is relative; moving the complete prefix preserves discovery.
        # Never replace an existing installation or expose an incomplete prefix.
        if prefix.exists():
            raise ValueError('prefix appeared during installation')
        stage.rename(prefix)
        print(json.dumps(dict(prefix=str(prefix), executable=str(prefix / 'bin' / binary.name),
                              resources=str(prefix / 'share' / 'ink'), packages=packages)))
    finally:
        if stage.exists():
            shutil.rmtree(stage)


if __name__ == '__main__':
    main()
