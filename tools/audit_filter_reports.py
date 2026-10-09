#!/usr/bin/env python3
"""Audit archived filtered measurements, checked plans and Wasm evidence."""
import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NATIVE = ROOT / 'reports/filter-proof-phase1'
WASM = ROOT / 'reports/filter-proof-wasm-phase1'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text())


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true', help='also recheck libraries, native oracles and archived Wasm in Node; requires the original local native build')
    args = parser.parse_args()
    sys.path.insert(0, str(ROOT / 'bench'))
    spec = importlib.util.spec_from_file_location('filtered_benchmark', ROOT / 'bench/filter-proof.py')
    bench = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(bench)
    metadata = read(NATIVE / 'metadata.json')
    rows = [json.loads(line) for line in (NATIVE / 'samples.jsonl').read_text().splitlines()]
    parameters = metadata['parameters']
    summary = bench.summarise(rows, parameters['repeats'], parameters['quick'])
    require(summary == read(NATIVE / 'summary.json'), 'summary differs from raw samples')
    for name, expected in metadata['source_hashes'].items():
        require(sha(NATIVE / name) == expected, f'measured source changed: {name}')
    analysis = read(NATIVE / 'analysis.json')
    for name, expected in [('samples.jsonl', analysis['samples_sha256']), ('summary.json', analysis['summary_sha256']), (analysis['script'], analysis['script_sha256'])]:
        require(sha(NATIVE / name) == expected, f'analysis hash mismatch: {name}')
    commands = metadata['commands']
    require(all(command['exit_code'] == 0 for command in commands), 'a recorded command failed')
    timed = [command for command in commands if Path(command['argv'][0]).parent.name == 'filter-proof' and Path(command['argv'][0]).name in bench.VARIANTS]
    require(len(timed) == summary['cells'] * len(bench.VARIANTS) * (parameters['repeats'] + 2), 'timing/calibration command count mismatch')
    growth = read(NATIVE / 'database-growth.json')
    require([p['replacements'] for p in growth] == list(range(5)), 'missing database revision')
    require(len({p['generated_c_sha256'] for p in growth}) == 5, 'database extension did not produce five programs')
    require(all(p['compiler_sha256'] == metadata['compiler_sha256'] for p in growth), 'compiler hash changed across revisions')
    objects = 0
    for phase in growth:
        count = phase['replacements']
        directory = NATIVE / f'database-{count}'
        plan = read(NATIVE / f'artifacts/phase-{count}.plan.json')
        checked = plan['checked_implementation']
        proposal = read(directory / 'proposal.json')
        lock = read(directory / 'lock.json')
        require(len(proposal['proposals']) == count, 'proposal count mismatch')
        require(checked['checked_proposals'] == proposal['proposals'], 'checked proposals differ from package')
        require(checked['package_sha256'] == sha(directory / 'proposal.json'), 'proposal identity mismatch')
        require(checked['library_lock'] == lock, 'selected lock differs from plan')
        require(len(lock['objects']) == phase['selected_roots'], 'selected root count mismatch')
        require(len(checked['library_closure']) == phase['closure'], 'checked closure count mismatch')
        require(set(checked['library_closure']) == set(lock['objects']), 'unexpected closure for this benchmark')
        require(plan['generated_c_sha256'] == phase['generated_c_sha256'] == sha(NATIVE / f'artifacts/phase-{count}.c'), 'generated C identity mismatch')
        require(sha(directory / 'kernels.lang') == sha(NATIVE / 'sources/knowledge/filtered/kernels.lang'), 'archived source bytes differ between revisions')
        require(plan['input_program_sha256'] == read(NATIVE / 'artifacts/ink_staged.o.plan.json')['input_program_sha256'], 'input AST identity differs between revisions')
        for path in (directory / 'objects').glob('*.json'):
            require(path.stem == sha(path), f'content-addressed object mismatch: {path}')
            objects += 1
    require(sha(NATIVE / 'artifacts/phase-0.c') == sha(NATIVE / 'artifacts/ink_staged.o.c'), 'empty database changes baseline')
    require(sha(NATIVE / 'artifacts/phase-4.c') == sha(NATIVE / 'artifacts/ink_checked.o.c'), 'full database differs from timed C')
    for variant in ['staged', 'checked']:
        plan = read(NATIVE / f'artifacts/ink_{variant}.o.plan.json')
        require(plan['generated_c_sha256'] == sha(NATIVE / f'artifacts/ink_{variant}.o.c'), 'timed source/plan mismatch')
    require(read(NATIVE / 'validation.json')['native_comparisons'] == 8320, 'missing native correctness receipt')
    wasm_metadata = read(WASM / 'metadata.json')
    for name, expected in wasm_metadata['wasm_sha256'].items():
        require(sha(WASM / f'{name}.wasm') == expected, f'Wasm hash mismatch: {name}')
        plan = read(WASM / f'{name}.wasm.plan.json')
        require(plan['generated_c_sha256'] == sha(WASM / f'{name}.wasm.c'), f'Wasm source/plan mismatch: {name}')
    for receipt_name in ['validation.json', 'browser-validation.json']:
        receipt = read(WASM / receipt_name)
        require((receipt['status'], receipt['checks'], receipt['fixtures']) == ('passed', 4476, 261), 'incomplete Wasm receipt')
        require([Path(m['file']).name for m in receipt['modules']] == ['staged.wasm', 'checked.wasm', 'semantics.wasm'], 'Wasm receipt module set mismatch')
        for module in receipt['modules']:
            require(module['bytes'] == (WASM / Path(module['file']).name).stat().st_size, 'receipt/binary size mismatch')
    browser = read(WASM / 'browser-validation.json')
    require(browser['browser'] == browser['http_user_agent'] and 'Chrome/155.' in browser['browser'], 'browser identity mismatch')
    require((WASM / 'browser.jpg').is_file(), 'missing browser screenshot')
    result = dict(status='passed',samples=len(rows),cells=summary['cells'],measured_sources=len(metadata['source_hashes']),recorded_commands=len(commands),timing_and_calibration_commands=len(timed),database_revisions=5,content_addressed_object_files=objects,raw_samples_sha256=sha(NATIVE / 'samples.jsonl'),wasm_sha256=wasm_metadata['wasm_sha256'],scope='archive integrity, full matrix/checksums, exact plans/objects and recorded Node/browser evidence; not a formal correctness or performance-significance proof')
    if args.execute:
        compiler = ROOT / 'target/release/ink'
        require(sha(compiler) == metadata['compiler_sha256'], 'local compiler differs from measured compiler')
        scratch = ROOT / 'build/filter-proof-audit'
        scratch.mkdir(exist_ok=True)
        closures = []
        for count in range(5):
            output = subprocess.check_output([compiler, 'verify-library', NATIVE / f'database-{count}/lock.json'], text=True, cwd=ROOT)
            checked = json.loads(output)
            require(checked['status'] == 'verified' and len(checked['closure']) == growth[count]['closure'], 'library recheck differs from recorded closure')
            closures.append(len(checked['closure']))
            directory = NATIVE / f'database-{count}'
            replay_c = scratch / f'phase-{count}.c'
            subprocess.run([compiler, 'emit-c', directory / 'kernels.lang', '--implementation', directory / 'proposal.json', '-o', replay_c], check=True, cwd=ROOT, capture_output=True)
            require(sha(replay_c) == growth[count]['generated_c_sha256'], 'source-correspondence replay changed generated C')
            replay_plan = read(Path(str(replay_c) + '.plan.json'))
            archived_plan = read(NATIVE / f'artifacts/phase-{count}.plan.json')
            require({k:v for k,v in replay_plan.items() if k!='source'} == {k:v for k,v in archived_plan.items() if k!='source'}, 'rechecked plan differs beyond source location')
        bench.REPORT = scratch
        validation = bench.validate()
        require(validation == read(NATIVE / 'validation.json'), 'native oracle replay differs from receipt')
        output = scratch / 'wasm-validation.json'
        subprocess.run(['node', WASM / 'wasm.mjs', *[WASM / f'{name}.wasm' for name in ['staged', 'checked', 'semantics']], output], check=True, cwd=ROOT, capture_output=True)
        node = read(output)
        for field in ['status', 'checks', 'fixtures', 'modules', 'scope']:
            require(node[field] == read(WASM / 'validation.json')[field], f'Node replay differs: {field}')
        result['replay'] = dict(library_closures=closures,native=validation,node=dict(checks=node['checks'],node=node['node'],v8=node['v8']),native_dylib_sha256={v:sha(bench.BUILD / f'{v}.dylib') for v in bench.VARIANTS},compiler_sha256=sha(compiler))
    (NATIVE / 'audit.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
