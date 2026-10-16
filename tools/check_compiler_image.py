#!/usr/bin/env python3
"""Rebuild committed distribution sources privately and compare executed images.

This is a finite reproducibility check, not compiler correctness or authenticity.
Both the checkout and Cargo target are fresh; no working source is substituted.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[1]
PACKAGES = ['abi', 'native-support', 'knowledge', 'planner', 'runtime',
            'lowerings/rust', 'lowerings/js', 'lowerings/wasm', 'lowerings/gpu']
# This fixture authors its own mathematical closure. Historical catalogues and
# archived experiments are not compiler/tool source dependencies of that build.
TOOL_SOURCES = {'knowledge': ['ink_knowledge', 'producers', 'libraries'],
                'planner': ['ink_planner', 'browser', 'plan.py', 'compile_plan.py']}
IMAGES = ['source.core.json', 'compiled.core.json',
          'model.snapshot', 'deployment.snapshot', 'trace.json', 'program.mjs',
          'program.mjs.source.mjs', 'program.mjs.initial-state.mjs', 'program.mjs.initial.snapshot',
          'program.mjs.plan.json']


def digest(data):
    return hashlib.sha256(data).hexdigest()


def git(folder, *args):
    return subprocess.check_output(['git', *args], cwd=folder)


def extract(folder, revision, target, paths=()):
    data = git(folder, 'archive', '--format=tar', revision, *paths)
    with tarfile.open(fileobj=io.BytesIO(data)) as archive:
        archive.extractall(target, filter='data')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True)
    parser.add_argument('--baseline', type=Path, required=True)
    parser.add_argument('--selected', type=Path, required=True)
    parser.add_argument('--webgpu-selected', type=Path,
                        help='also reproduce the selected initialized WebGPU shader, host-source and descriptor images (not CPU binary identity)')
    parser.add_argument('--log', type=Path, required=True)
    parser.add_argument('--receipt', type=Path, required=True)
    parser.add_argument('--program', default='examples/frozen-program.ink')
    parser.add_argument('--trace', default='examples/frozen-program-training.json')
    parser.add_argument('--freeze-roots', default='Structure')
    parser.add_argument('--composition', action='store_true',
                        help='rebuild a composed helper plan and plain JavaScript, rather than a selected model package')
    args = parser.parse_args()
    if args.composition and args.webgpu_selected:
        parser.error('--webgpu-selected requires initialized model artifact mode')
    for path in [args.program, args.trace]:
        if Path(path).is_absolute() or '..' in Path(path).parts or Path(path).parts[:1] != ('examples',):
            parser.error('fixture paths must name committed examples inside the distribution')
    source = git(ROOT, 'rev-parse', args.source+'^{commit}').decode().strip()
    links = {}
    for path in PACKAGES:
        row = git(ROOT, 'ls-tree', source, path).decode().split()
        if len(row) != 4 or row[0] != '160000' or row[3] != path:
            raise ValueError('expected an independently pinned package: '+path)
        links[path] = row[2]
    args.log.parent.mkdir(parents=True, exist_ok=True)
    args.receipt.parent.mkdir(parents=True, exist_ok=True)
    record = dict(schema=1, source=source, packages=links, private_checkout=True,
                  private_target=True, tool_source_subsets=TOOL_SOURCES,
                  fixture=dict(program=args.program,trace=args.trace,freeze_roots=args.freeze_roots),
                  scope='Fresh committed compiler/package source rebuild and matching executed images for the recorded fixture. Historical tool catalogues/experiments are excluded; not a whole-compiler or toolchain correctness proof.')
    if args.composition:
        record['fixture']['composition'] = True
    with tempfile.TemporaryDirectory(prefix='ink-compiler-image-') as directory, args.log.open('wb') as log:
        base = Path(directory)
        checkout = base/'source'
        checkout.mkdir()
        paths = ['Cargo.toml', 'src', 'core', 'stdlib', 'examples']
        # An ignored resolution lock is data, not replacement source or an
        # assertion that Cargo has built anything. Cargo validates it normally.
        lock = git(ROOT, 'ls-tree', '--name-only', source, 'Cargo.lock').decode().strip()
        if lock:
            paths.append('Cargo.lock')
        extract(ROOT, source, checkout, paths)
        if not lock:
            (checkout/'Cargo.lock').write_bytes((ROOT/'Cargo.lock').read_bytes())
        record['resolution_lock_sha256'] = digest((checkout/'Cargo.lock').read_bytes())
        for path, revision in links.items():
            destination = checkout/path
            destination.mkdir(parents=True, exist_ok=True)
            extract(ROOT/path, revision, destination, TOOL_SOURCES.get(path, ()))
        environment = dict(os.environ)
        environment['CARGO_TARGET_DIR'] = str(base/'target')
        environment['INK_DISTRIBUTION'] = str(checkout)
        environment['PYTHONPATH'] = os.pathsep.join(str(checkout/path) for path in ['knowledge', 'planner'])
        environment['PYTHONNOUSERSITE'] = '1'
        def run(command):
            completed = subprocess.run(command, cwd=checkout, env=environment, stdout=log, stderr=subprocess.STDOUT)
            completed.check_returncode()
        run(['cargo', 'build', '--locked', '--bin', 'ink'])
        binary = base/'target/debug'/('ink.exe' if os.name == 'nt' else 'ink')
        compared = {}
        for name, expected in [('baseline', args.baseline.resolve()), ('selected', args.selected.resolve())]:
            output = base/name
            if name == 'selected' and args.composition:
                output.mkdir()
                input_core = base/'baseline/compiled.core.json'
                if input_core.read_bytes() != (expected/'input.core.json').read_bytes():
                    raise ValueError('composed restricted source image differs')
                packet = output/'plan.json'
                run(['python3', str(checkout/'knowledge/producers/frozen_composition.py'),
                     str(input_core), '--ink', str(binary), '-o', str(packet)])
                state = output/'state.json'
                run([str(binary), 'check-plan', str(input_core), str(packet), '--core', '--state-out', str(state)])
                checked = json.loads(state.read_bytes())
                if checked['core'] != json.loads((expected/'selected.core.json').read_bytes()):
                    raise ValueError('composed selected source differs')
                javascript = output/'program.mjs'
                run([str(binary), 'compile', str(input_core), '--core', '--plan', str(packet),
                     '--target', 'javascript', '-o', str(javascript)])
                for filename in ['plan.json', 'program.mjs']:
                    if (output/filename).read_bytes() != (expected/filename).read_bytes():
                        raise ValueError('composed committed rebuild image differs: '+filename)
                record['composition'] = dict(plan_sha256=digest(packet.read_bytes()),
                    javascript_sha256=digest(javascript.read_bytes()),
                    input_core_sha256=json.loads((output/'program.plan-receipt.json').read_bytes())['input'],
                    selected_core_sha256=checked['source'])
                continue
            command = [str(binary), 'build-model', args.program,
                       args.trace, '--freeze-roots', args.freeze_roots,
                       '--target', 'javascript', '-o', str(output)]
            if name == 'selected':
                command.insert(command.index('--target'), '--specialize-frozen')
            run(command)
            run([str(binary), 'verify-model', str(output), '--replay'])
            files = IMAGES + (['selected.core.json', 'selection.json'] if name == 'selected' else [])
            hashes = {}
            for filename in files:
                actual = (output/filename).read_bytes()
                if actual != (expected/filename).read_bytes():
                    raise ValueError(f'{name} committed rebuild image differs: {filename}')
                hashes[filename] = digest(actual)
            compared[name] = hashes
        record['images'] = compared
        if args.webgpu_selected:
            output = base/'webgpu-selected'
            run([str(binary), 'build-model', args.program, args.trace,
                 '--freeze-roots', args.freeze_roots, '--specialize-frozen',
                 '--target', 'webgpu', '-o', str(output)])
            run([str(binary), 'verify-model', str(output), '--replay'])
            expected = args.webgpu_selected.resolve()
            def image_paths(folder):
                return {str(p.relative_to(folder)) for p in folder.rglob('*')
                        if p.is_file() and (p.suffix in {'.wgsl', '.mjs'} or p.name == 'manifest.json')}
            paths = image_paths(output)
            if paths != image_paths(expected):
                raise ValueError('selected WebGPU source/descriptor inventory differs')
            hashes = {}
            for filename in sorted(paths):
                actual = (output/filename).read_bytes()
                if actual != (expected/filename).read_bytes():
                    raise ValueError('selected WebGPU image differs: '+filename)
                hashes[filename] = digest(actual)
            record['webgpu_images'] = hashes
            record['webgpu_scope'] = 'Fresh pinned compiler emission reproduces every WGSL shader, JavaScript host source and manifest descriptor. Both inventories and deterministic training/proofs check; CPU fallback binary identity and backend correctness are not established by this comparison.'
        record['cargo_version'] = subprocess.check_output(['cargo', '--version'], env=environment, text=True).strip()
        record['status'] = 'passed'
    record['log_sha256'] = digest(args.log.read_bytes())
    args.receipt.write_text(json.dumps(record, indent=2)+'\n')
    print(json.dumps(record))


if __name__ == '__main__':
    main()
