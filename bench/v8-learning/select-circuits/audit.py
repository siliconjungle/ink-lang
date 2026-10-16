#!/usr/bin/env python3
"""Authenticate retained inputs and optionally replay ordinary proofs/plans."""
import argparse
import gzip
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path)
    parser.add_argument('--scratch', type=Path)
    parser.add_argument('--materialize', type=Path, help='Write selected inputs into a fresh directory; never unpack private stores or targets')
    args = parser.parse_args()
    index = json.loads((HERE / 'selected-inputs-index.json').read_bytes())
    archive = HERE / 'selected-inputs.tar.gz'
    assert sha(archive.read_bytes()) == index['archive_sha256']
    history = HERE.parent / 'counts'
    assert sha((history / 'selected-inputs.tar.gz').read_bytes()) == index['historical_archive_sha256']
    assert sha((history / 'selected-inputs-index.json').read_bytes()) == index['historical_index_sha256']
    prior = json.loads((history / 'selected-inputs-index.json').read_bytes())

    def contents(path, needed=None):
        blobs = {}
        with tarfile.open(path) as tar:
            for member in tar.getmembers():
                assert member.isfile() and re.fullmatch(r'blobs/[0-9a-f]{64}', member.name)
                digest = member.name[6:]
                if needed is not None and digest not in needed:
                    continue
                raw = tar.extractfile(member).read()
                assert sha(raw) == digest and digest not in blobs
                blobs[digest] = raw
        return blobs

    blobs = contents(archive)
    assert len(blobs) == index['blobs']
    needed = {prior['files'][row['historical_reference']]['blob']
              for row in index['files'].values() if 'historical_reference' in row}
    historical = contents(history / 'selected-inputs.tar.gz', needed)
    assert set(historical) == needed

    def raw(name):
        row = index['files'][name]
        if 'historical_reference' in row:
            old = prior['files'][row['historical_reference']]
            value = historical[old['blob']]
            if old.get('transform') == 'append-lf':
                value += b'\n'
        else:
            value = blobs[row['sha256']]
        assert sha(value) == row['sha256'] and len(value) == row['bytes']
        return value

    def read(name):
        return json.loads(raw(name))

    for name in index['files']:
        assert not Path(name).is_absolute() and '..' not in Path(name).parts
        raw(name)
    if args.materialize:
        destination = args.materialize.resolve()
        destination.mkdir(parents=True, exist_ok=False)
        for name in index['files']:
            path = destination / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw(name))
    pins = read('final-source-pins.json')
    core = read('core-package-validated.json')
    private = read('private-package-validation.json')
    assert private['status'] == 'passed' and private['private_checkout'] and private['private_target']
    assert private['core_tree'] == core['core_tree'] == pins['core_tree']
    for revision in [core['commit'], core['source'], pins['distribution_source']]:
        assert subprocess.check_output(['git', 'rev-parse', revision + ':core'], cwd=ROOT, text=True).strip() == core['core_tree']
    outcomes = re.findall(rb'test result: (\w+)\. (\d+) passed; (\d+) failed', raw('private-package.log'))
    assert all(ok == b'ok' and failed == b'0' for ok, count, failed in outcomes)
    assert sum(int(count) for ok, count, failed in outcomes) == 503
    assert b'Ran 4 tests' in raw('knowledge-tests.log') and raw('knowledge-tests.log').rstrip().endswith(b'OK')
    assert read('legacy-terminal.json')['seeds'] == 647
    assert len(re.findall(rb'^logic:seed\d+ \(', raw('legacy-full.log'), re.M)) == 647
    assert pins['development_image_byte_identical'] and pins['all_five_emitter_runtime_source_bodies_unchanged']
    for package in ['lowerings-rust', 'lowerings-js', 'lowerings-wasm', 'lowerings-gpu', 'runtime']:
        receipt = read('pin-publication/' + package + '/receipt.json')
        assert receipt['locked_fetch_passed'] and receipt['pins']['ink-core'] == core['commit']
    from ink_knowledge import Store, canonical, identity, semantic_entry
    bank = read('count-bank/index.json')
    claims, total, modes = [], 0, {}
    matrix = read('reproduced-final/terminal.json')
    assert len(matrix['rows']) == len(bank['rows']) == 18
    selected = {row['name']: row for row in matrix['rows']}
    for row in bank['rows']:
        encoded = gzip.decompress(raw('count-bank/' + row['sha256'] + '.json.gz'))
        claim = json.loads(encoded)
        assert identity(claim) == row['sha256'] == selected[row['name']]['selected_sha256']
        total += len(encoded)
        mode = claim['proof']['BitVector']['certificate']['encoding']
        modes[mode] = modes.get(mode, 0) + 1
        claims.append(claim)
    assert total == 208862 and modes == {'shared-v2': 9, 'shared-select-v3': 9}
    assert sum(row['old_bytes'] for row in matrix['rows']) == 297075
    assert sum(row['new_bytes'] for row in matrix['rows']) == 219604
    for row in matrix['rows']:
        for encoding, expected in row['circuits'].items():
            problem = read('reproduced-final/' + row['name'] + '/' + encoding + '.json')
            assert problem['sha256'] == expected['sha256'] and problem['variables'] == expected['variables']
            assert len(problem['clauses']) == expected['clauses']
    program = read('count-program/terminal.json')
    emitted = read('emission/receipt.json')
    assert program['applications'] == 14 and program['calls'] == 21
    assert emitted['new_selection_bytes'] == 166730 and emitted['old_selection_bytes'] == 218219
    assert len(emitted['files']) == 26 and all(row['equal'] for row in emitted['files'].values())
    for name, row in emitted['files'].items():
        actual = 'count-program/' + name if name in ['baseline.mjs', 'searched.mjs'] else 'emission/' + name
        assert sha(raw(actual)) == row['sha256']
        assert prior['files']['count-conformance-final/' + name]['sha256'] == row['sha256']
    dense = read('dense-comparison.json')
    assert dense['processes'] == 3 and dense['rounds'] == 11 and not dense['adopt']
    assert all(not row['extrema_guard'] and row['all_complete_hints_equal'] for row in dense['rows'])
    for name, digest in read('dense-inputs.json')['inputs'].items():
        assert sha(raw(name)) == digest
    observations = json.loads((HERE / 'component-observations.json').read_bytes())['objects']
    assert len(observations) == 6
    store = Store(ROOT / 'knowledge')
    for observation in observations:
        Store.validate_observation(observation)
        assert observation['entries'] == [] and observation['metrics']['peak_bytes'] is None
        assert observation['target']['backend'] == 'external-python-rup-hint-construction'
        shape = observation['workload']['shape']
        source = dense['rows'][shape['process']]['samples'][shape['implementation']]
        assert shape['raw_seconds'] == [str(sample) for sample in source]
        assert observation['metrics']['complete_call_ns'] == [str(int(Decimal(str(sample)) * Decimal(1000000000))) for sample in source]
        assert json.loads((store.data / 'observations' / (identity(observation) + '.json')).read_bytes()) == observation
    observation_receipt = json.loads((HERE / 'component-database-readback.json').read_bytes())
    assert observation_receipt['before_after_observation_context_equal'] and observation_receipt['proof_snapshot_unchanged']
    terminal = read('corpus/terminal.json')
    report = read('corpus/report.json')
    records = read('corpus/records.json')
    assert terminal['exit_status'] == 0 and terminal['final_source_context_check_passed']
    assert len(records) == 10 and all(row['status'] == 0 for row in records)
    assert report['context'] == read('corpus/context.json')
    assert report['context']['compiler_sha256'] == pins['compiler_sha256']
    assert terminal['new_count_roots_attributed'] == []
    roots = {identity(claim) for claim in claims} | {identity(semantic_entry(claim)) for claim in claims}
    assert not roots & set(report['attribution'])
    if args.compiler:
        assert args.scratch, 'fresh --scratch required'
        scratch = args.scratch.resolve()
        scratch.mkdir(parents=True, exist_ok=False)
        (scratch / 'storage-retention.json').write_text(json.dumps(dict(schema=1,
            keep=[dict(path='.', reason='Selected ordinary mixed/V3 proof and source-plan replay')],
            safe_to_remove=[]), indent=2) + '\n')
        (scratch / 'source.core.json').write_bytes(raw('source.core.json'))
        groups = {'mixed': claims, 'v3': [read('reproduced-final/' + row['name'] + '/law.json') for row in matrix['rows']]}
        commands = []
        for name, group in groups.items():
            entries = [semantic_entry(claim) for claim in group]
            store = Store.publish(scratch / name, entries)
            view = scratch / (name + '.json')
            view.write_bytes(canonical(store.bundle([identity(entry) for entry in entries])))
            commands.append((name, ['knowledge-check', scratch / 'source.core.json', view]))
        for name in ['core.json', 'searched.plan.json']:
            (scratch / name).write_bytes(raw('count-program/' + name))
        commands.append(('source-plan', ['check-plan', scratch / 'core.json', scratch / 'searched.plan.json', '--core']))
        for label, command in commands:
            result = subprocess.run([str(args.compiler.resolve()), *map(str, command)], capture_output=True, text=True, timeout=180, cwd=ROOT)
            (scratch / (label + '.stdout')).write_text(result.stdout)
            (scratch / (label + '.stderr')).write_text(result.stderr)
            assert result.returncode == 0, result.stderr[-2000:]
    print('PASS503 private tests,647 legacy seeds,18 paired obligations,9 smaller proofs,14 source applications,26 unchanged emissions, separate frozen10 and rejected3x11 helper comparison; no timing-context transfer')


if __name__ == '__main__':
    main()
