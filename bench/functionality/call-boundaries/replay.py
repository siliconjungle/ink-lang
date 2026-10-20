#!/usr/bin/env python3
"""Regenerate unchanged checked fixtures; replay exact values and CPU histories."""
import argparse
import gzip
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[3]
PREVIOUS = ROOT / 'bench/functionality/scalar-records'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--node', action='append')
    args = parser.parse_args()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=False)
    for name, digest in json.loads((PREVIOUS / 'hashes.json').read_text()).items():
        assert hashlib.sha256((PREVIOUS / name).read_bytes()).hexdigest() == digest, name
    manifest = json.loads((PREVIOUS / 'artifacts.json').read_text())
    def unpack(name):
        data = gzip.decompress((PREVIOUS / manifest[name]['artifact']).read_bytes())
        assert hashlib.sha256(data).hexdigest() == manifest[name]['sha256'], name
        path = out / name
        assert path.resolve().is_relative_to(out)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return path
    inputs = []
    for mode in ['borrowed', 'captured', 'bits', 'wide']:
        inputs += [f'generic/{mode}/{n}' for n in ['source.core.json', 'cases.json', 'run.mjs']]
    inputs += ['conformance/' + n for n in ['source.core.json', 'history.json', 'run.mjs']]
    inputs += ['cross/' + n for n in ['check-wasm.mjs', 'compiled_state.wasm', 'expected.json', 'native-results.json', 'script.json', 'state-wasm.mjs']]
    for name in inputs:
        unpack(name)
    core_ids = {}
    for folder in ['generic/' + m for m in ['borrowed', 'captured', 'bits', 'wide']] + ['conformance']:
        directory = out / folder
        subprocess.run([str(args.compiler.resolve()), 'build', str(directory / 'source.core.json'), '--core', '--target', 'javascript', '-o', str(directory / 'program.mjs')], cwd=ROOT, check=True, capture_output=True)
        text = (directory / 'program.mjs').read_text()
        metadata = json.JSONDecoder().raw_decode(text.split('export const metadata = ', 1)[1])[0]
        old = gzip.decompress((PREVIOUS / manifest[folder + '/program.mjs']['artifact']).read_bytes()).decode()
        original = json.JSONDecoder().raw_decode(old.split('export const metadata = ', 1)[1])[0]
        assert metadata['core_sha256'] == original['core_sha256']
        core_ids[folder] = metadata['core_sha256']
    shutil.copyfile(out / 'conformance/program.mjs', out / 'cross/program.mjs')
    old_cross = gzip.decompress((PREVIOUS / manifest['cross/program.mjs']['artifact']).read_bytes()).decode()
    assert json.JSONDecoder().raw_decode(old_cross.split('export const metadata = ', 1)[1])[0]['core_sha256'] == core_ids['conformance']
    assert json.loads((out / 'cross/native-results.json').read_text()) == json.loads((out / 'cross/expected.json').read_text())
    runs = []
    for node in args.node or [shutil.which('node')]:
        observations = []
        for mode in ['borrowed', 'captured', 'bits', 'wide']:
            observations.append(subprocess.check_output([node, str(out / 'generic' / mode / 'run.mjs'), mode], cwd=ROOT, text=True))
        for entry in ['conformance/run.mjs', 'cross/check-wasm.mjs']:
            observations.append(subprocess.check_output([node, str(out / entry)], cwd=ROOT, text=True))
        runs.append({'node': str(Path(node).resolve()), 'version': subprocess.check_output([node, '--version'], text=True).strip(), 'observations': observations})
    receipt = {'coreIdentities': core_ids, 'compilerSha256': hashlib.sha256(args.compiler.read_bytes()).hexdigest(), 'retainedNativeAndWasmControl': True, 'runs': runs, 'hashes': {str(p.relative_to(out)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.rglob('*')) if p.is_file()}}
    (out / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    (out / 'storage-retention.json').write_text(json.dumps({'schema': 1, 'keep': [{'path': str(p.relative_to(out)), 'reason': 'Required current-emitter conformance reproduction input or selected observation'} for p in sorted(out.rglob('*')) if p.is_file() and not p.name.endswith('.plan.json')] + [{'path': 'storage-retention.json', 'reason': 'Retention contract'}], 'safe_to_remove': [{'path': str(p.relative_to(out)), 'reason': 'Completed ordinary build sidecar'} for p in sorted(out.rglob('*.plan.json'))]}, indent=2) + '\n')
    print(json.dumps({'out': str(out), 'runs': runs}, indent=2))


if __name__ == '__main__':
    main()
