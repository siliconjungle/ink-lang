#!/usr/bin/env python3
"""Authenticate selected V8 count-lane evidence and optionally replay the plans."""
import argparse
from fractions import Fraction
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path[:0] = [str(ROOT / 'knowledge'), str(ROOT / 'planner')]
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.frozen_laws import index as law_index, load
from producers.v8_count_lanes import templates
from ink_knowledge.implementation_candidates import candidate_entry
from ink_planner.representation_selection import rank
from ink_planner.implementation_selection import measurement_id


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path)
    parser.add_argument('--scratch', type=Path)
    parser.add_argument('--materialize', type=Path)
    args = parser.parse_args()
    manifest = json.loads((HERE / 'selected-inputs-index.json').read_bytes())
    archive = HERE / 'selected-inputs.tar.gz'
    assert sha(archive.read_bytes()) == manifest['archive_sha256']
    blobs = {}
    with tarfile.open(archive) as stream:
        for member in stream:
            assert member.isfile() and member.name.startswith('blobs/')
            key = member.name.removeprefix('blobs/')
            assert len(key) == 64 and '/' not in key and key not in blobs
            raw = stream.extractfile(member).read()
            assert sha(raw) == key
            blobs[key] = raw
    assert len(blobs) == manifest['unique_blobs']
    files = manifest['files']
    assert len(files) == manifest['logical_files']
    for name, row in files.items():
        path = Path(name)
        assert not path.is_absolute() and '..' not in path.parts
        assert len(blobs[row['blob']]) == row['bytes'] and sha(blobs[row['blob']]) == row['sha256']
    def raw(name):
        return blobs[files[name]['blob']]
    def read(name):
        return json.loads(raw(name))
    if args.materialize:
        destination = args.materialize.resolve()
        destination.mkdir(parents=True, exist_ok=False)
        for name in files:
            path = destination / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw(name))
    pins = read('source-pins.json')
    assert pins['compiler_sha256'] == '667edd4dff0dd6cf7c06445948fcf3f141e28cb5db8501f9ec02003b6ef5c1fb'
    assert pins['rust_compiler_source_and_locks_unchanged']
    data = ROOT / 'knowledge/producers/data/v8-count-lanes'
    installed = {row['name']: load(data, row) for row in law_index(data)}
    assert len(installed) == 7
    roots = set()
    for row in templates():
        claim = read('proofs/' + row['name'] + '/law.json')
        assert claim == installed[row['name']]
        assert {k: claim[k] for k in ['params', 'conditions', 'from', 'to']} == row['goal']
        certificate = claim['proof']['BitVector']['certificate']
        assert certificate['encoding'] == 'shared-select-v3'
        problem = read('proofs/' + row['name'] + '/cnf.json')
        assert certificate['problem_sha256'] == problem['sha256']
        roots |= {identity(claim), identity(semantic_entry(claim))}
    labels = read('measurement/candidates.json')['labels']
    baseline = next(key for key, label in labels.items() if label == 'literal')
    for measured, label in labels.items():
        package = read(('literal' if label == 'literal' else label) + '.plan.json')
        assert measurement_id(identity(candidate_entry(package)), pins['compiler_sha256'], 'javascript') == measured
    objects = read('observations.json')['objects']
    assert len(objects) == 864 and len({identity(o) for o in objects}) == 864
    store = Store(ROOT / 'knowledge')
    for observation in objects:
        Store.validate_observation(observation)
        assert observation['entries'] == [] and observation['target']['backend'] == 'javascript'
        assert len(observation['metrics']['complete_call_ns']) == 11
        assert observation['metrics']['peak_bytes'] > 0
        assert json.loads((store.data / 'observations' / (identity(observation) + '.json')).read_bytes()) == observation
    class Evidence:
        def observations(self, program, plans, target, workload):
            return [o for o in objects if o['program'] == program and o['plan'] in plans and o['target'] == target and o['workload'] == workload]
    previous = set()
    chosen_training = None
    ratios = {}
    for split in ['training', 'holdout']:
        report = read('measurement/' + split + '-report.json')
        acquisition = report['acquisition']
        assert acquisition['rejected'] == [] and acquisition['acquisition']['processes'] == 3
        fingerprints = set(acquisition['acquisition']['input_fingerprints'])
        assert len(fingerprints) == 36 and not previous & fingerprints
        previous |= fingerprints
        assert len(acquisition['observations']) == 432
        assert set(acquisition['observations']) <= {identity(o) for o in objects}
        assert set(acquisition['validated_measurements']) == set(labels)
        selected, costs = rank(Evidence(), read('literal.plan.json')['input_core_sha256'], list(labels), report['target'], report['workload'], report['profile'], baseline, minimum_gain_ppm=100000, sample_guard=True)
        assert selected == report['selected'] and costs == report['selection']
        if split == 'training':
            chosen_training = selected
        assert chosen_training == report['training_selected']
        held, guard = rank(Evidence(), read('literal.plan.json')['input_core_sha256'], [baseline, chosen_training], report['target'], report['workload'], report['profile'], baseline, minimum_gain_ppm=100000, sample_guard=True)
        assert held == chosen_training and guard == report['heldout_gate'] and report['heldout_survives']
        ratios[split] = str(Fraction(costs['total_ns'][baseline]) / Fraction(costs['total_ns'][chosen_training]))
        for artifact in acquisition['artifacts']:
            # The original absolute paths are provenance, never execution instructions.
            name = next(n for n in files if n.startswith('measurement/measurement-') and n.endswith('/' + Path(artifact['path']).name))
            assert sha(raw(name)) == artifact['artifact_sha256']
    assert labels[chosen_training] == 'checked-all'
    for row in read('summary.json')['rows']:
        assert ratios[row['split']] == row['ratio'] and row['gain_guard_passed']
    assert read('database-readback.json')['proof_snapshot_unchanged']
    for name, count in [('knowledge-tests-final.log', 3), ('previous-count-tests.log', 3), ('frozen-library-tests.log', 4)]:
        log = raw(name).decode()
        assert 'Ran ' + str(count) + ' tests' in log and log.rstrip().endswith('OK')
    conformance = read('conformance/execution.json')
    assert conformance['exit_status'] == 0 and len(conformance['rows']) == 4
    assert all(row['calls'] == 56 and sha(raw('conformance/' + row['label'] + '.wasm')) == row['wasm_sha256'] for row in conformance['rows'])
    assert raw('conformance/native-run.stdout').strip() == b'56'
    assert read('conformance/build-terminal.json')['exit_status'] == 0
    discovery = read('discovery/terminal.json')
    assert discovery['exit_status'] == 0 and discovery['candidates'] == 8 and discovery['selected_plan_steps'] == 0
    assert len(discovery['new_roots_admitted']) == 7 and set(discovery['new_roots_admitted']) <= roots
    receipt = read('discovery/compiled.mjs.planning.json.receipt.json')
    for row in receipt['candidates']:
        obj = read('discovery/candidates/' + row['candidate'] + '.json')
        assert identity(obj) == row['candidate'] and obj == candidate_entry(obj['payload']['package'])
    terminal = read('corpus/terminal.json')
    corpus = read('corpus/report.json')
    assert terminal['exit_status'] == 0 and terminal['final_source_context_check_passed']
    assert terminal['new_count_roots_attributed'] == [] and not roots & set(corpus['attribution'])
    assert corpus['context'] == read('corpus/context.json')
    assert corpus['context']['compiler_sha256'] == pins['compiler_sha256']
    assert len(read('corpus/records.json')) == 10 and corpus['headline']['compiled'] == 10
    final_objects = read('observations-final.json')['objects']
    assert len(final_objects) == 216
    assert not {identity(o) for o in objects} & {identity(o) for o in final_objects}
    for observation in final_objects:
        Store.validate_observation(observation)
        assert observation['entries'] == [] and len(observation['metrics']['complete_call_ns']) == 11
        assert json.loads((store.data / 'observations' / (identity(observation) + '.json')).read_bytes()) == observation
    objects = objects + final_objects
    final_labels = read('measurement-final/candidates.json')['labels']
    assert set(final_labels.values()) == {'literal', 'checked-all'}
    final_baseline = next(key for key, label in final_labels.items() if label == 'literal')
    for measured, label in final_labels.items():
        package = read(label + '.plan.json')
        assert measurement_id(identity(candidate_entry(package)), read('summary-final.json')['compiler_sha256'], 'javascript') == measured
    final_selected, previous = None, set()
    final_ratios = {}
    for split in ['training', 'holdout']:
        report = read('measurement-final/' + split + '-report.json')
        acquisition = report['acquisition']
        assert acquisition['rejected'] == [] and acquisition['acquisition']['processes'] == 3
        fingerprints = set(acquisition['acquisition']['input_fingerprints'])
        assert len(fingerprints) == 36 and not previous & fingerprints
        previous |= fingerprints
        assert len(acquisition['observations']) == 108
        assert set(acquisition['observations']) <= {identity(o) for o in final_objects}
        selected, costs = rank(Evidence(), read('literal.plan.json')['input_core_sha256'], list(final_labels), report['target'], report['workload'], report['profile'], final_baseline, minimum_gain_ppm=100000, sample_guard=True)
        assert selected == report['selected'] and costs == report['selection']
        if split == 'training':
            final_selected = selected
        assert final_selected == report['training_selected'] and report['heldout_survives']
        assert final_labels[final_selected] == 'checked-all'
        held, guard = rank(Evidence(), read('literal.plan.json')['input_core_sha256'], [final_baseline, final_selected], report['target'], report['workload'], report['profile'], final_baseline, minimum_gain_ppm=100000, sample_guard=True)
        assert held == final_selected and guard == report['heldout_gate']
        final_ratios[split] = str(Fraction(costs['total_ns'][final_baseline]) / Fraction(costs['total_ns'][final_selected]))
        for artifact in acquisition['artifacts']:
            name = next(n for n in files if n.startswith('measurement-final/measurement-') and n.endswith('/' + Path(artifact['path']).name))
            assert sha(raw(name)) == artifact['artifact_sha256']
    for row in read('summary-final.json')['rows']:
        assert row['ratio'] == final_ratios[row['split']] and row['gain_guard_passed']
    build = read('integration/build-terminal.json')
    assert build['exit_status'] == 0 and build['core_tree'] == pins['core_package']['core_tree']
    assert build['compiler_sha256'] == read('summary-final.json')['compiler_sha256']
    comparison = read('integration/emissions/receipt.json')
    assert comparison['compiler_sha256'] == build['compiler_sha256']
    assert len(comparison['files']) == 64 and sum(row['equal'] for row in comparison['files']) == 52
    assert all(row['equal'] or row['name'].endswith('.mjs') for row in comparison['files'])
    for row in comparison['files']:
        assert sha(raw('integration/emissions/' + row['name'])) == row['sha256']
        assert sha(raw(row['old'])) == row['old_sha256']
    assert read('integration/emissions/execution.json')['exit_status'] == 0
    assert all(row['calls'] == 56 for row in read('integration/emissions/execution.json')['rows'])
    for name, count in [('integration-final/count-tests.log', 3), ('integration-final/guarded-tests.log', 9)]:
        log = raw(name).decode()
        assert 'Ran ' + str(count) + ' tests' in log and log.rstrip().endswith('OK')
    assert '2 passed; 0 failed' in raw('integration-final/function-specialization-tests.stdout').decode()
    for prefix in ['corpus-final', 'corpus-merged']:
        end = read(prefix + '/terminal.json')
        result = read(prefix + '/report.json')
        assert end['exit_status'] == 0 and end['final_source_context_check_passed']
        assert not end['new_count_roots_attributed'] and not roots & set(result['attribution'])
        assert result['context'] == read(prefix + '/context.json')
        assert result['context']['compiler_sha256'] == build['compiler_sha256']
        assert len(read(prefix + '/records.json')) == 10 and result['headline']['compiled'] == 10
    assert read('final-checkout-context.json')['matches_final_corpus_context']
    assert read('final-database-readback.json')['proof_snapshot_unchanged']
    replay = read('final-proof-replay.json')
    assert replay['exit_status'] == 0 and replay['commands'] == 27 and replay['exact_emissions'] == 2
    assert replay['compiler_sha256'] == build['compiler_sha256']
    for row in replay['rows']:
        assert sha(raw('final-archive-replay/' + row['path'])) == row['sha256']
    if args.compiler:
        assert args.scratch, '--scratch must be a fresh directory'
        scratch = args.scratch.resolve()
        scratch.mkdir(parents=True, exist_ok=False)
        (scratch / 'storage-retention.json').write_text(json.dumps(dict(schema=1, keep=[dict(path='.', reason='Required ordinary count-lane proof and source-plan replay inputs')], safe_to_remove=[]), indent=2) + '\n')
        commands = []
        for source in ['core.json', 'conformance/core.json']:
            path = scratch / source
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw(source))
        for name, claim in installed.items():
            entries = [semantic_entry(claim)]
            proof_store = Store.publish(scratch / ('proof-' + name), entries)
            path = scratch / (name + '-view.json')
            path.write_bytes(canonical(proof_store.bundle([identity(e) for e in entries])))
            commands.append(('proof-' + name, ['knowledge-check', scratch / 'core.json', path]))
        plans = [name for name in files if name.endswith('.plan.json') and '/' not in name]
        plans += ['conformance/' + label + '.plan.json' for label in ['literal', 'plain', 'zero', 'sparse']]
        for i, name in enumerate(plans):
            path = scratch / ('plan-' + str(i) + '.json')
            path.write_bytes(raw(name))
            source = scratch / ('conformance/core.json' if name.startswith('conformance/') else 'core.json')
            commands.append(('plan-' + str(i), ['check-plan', source, path, '--core']))
        for i, row in enumerate(receipt['candidates']):
            obj = read('discovery/candidates/' + row['candidate'] + '.json')
            path = scratch / ('discovery-' + str(i) + '.json')
            path.write_bytes(canonical(obj['payload']['package']))
            commands.append(('discovery-' + str(i), ['check-plan', scratch / 'core.json', path, '--core']))
        for label, command in commands:
            result = subprocess.run([str(args.compiler.resolve()), *map(str, command)], capture_output=True, text=True, timeout=180)
            (scratch / (label + '.stdout')).write_text(result.stdout)
            (scratch / (label + '.stderr')).write_text(result.stderr)
            assert result.returncode == 0, result.stderr[-2000:]
        actual_compiler = sha(args.compiler.read_bytes())
        cohort = ('measurement-final' if actual_compiler == build['compiler_sha256'] else 'measurement' if actual_compiler == pins['compiler_sha256'] else None)
        emissions = 0
        if cohort:
            for measured, label in read(cohort + '/candidates.json')['labels'].items():
                plan = scratch / ('emit-' + label + '.plan.json')
                plan.write_bytes(raw(label + '.plan.json'))
                output = scratch / ('emit-' + label + '.mjs')
                result = subprocess.run([str(args.compiler.resolve()), 'emit-plan', str(scratch / 'core.json'), str(plan), '--core', '--target', 'javascript', '-o', str(output)], capture_output=True, text=True, timeout=180)
                assert result.returncode == 0, result.stderr[-2000:]
                name = next(n for n in files if n.startswith(cohort + '/measurement-') and n.endswith('/' + measured + '.mjs'))
                assert output.read_bytes() == raw(name)
                emissions += 1
        (scratch / 'terminal.json').write_text(json.dumps(dict(exit_status=0, commands=len(commands), exact_emissions=emissions, compiler_sha256=actual_compiler)) + '\n')
    print(json.dumps(dict(status='authenticated', files=len(files), blobs=len(blobs), proofs=7, observations=1080, development_ratios=ratios, final_ratios=final_ratios, corpus=read('corpus-merged/report.json')['headline'])))


if __name__ == '__main__':
    main()
