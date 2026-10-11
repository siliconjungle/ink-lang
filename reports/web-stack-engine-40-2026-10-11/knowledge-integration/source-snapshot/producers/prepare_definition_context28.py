"""Prepare private portable certificates and audit the pinned prior catalogue.

Consumes independently checked core fixtures, not canonical publication authority.
Every candidate is rechecked by the supplied compiler from a dummy module and at
its actual source. Failed admissions are retained; no canonical store is changed.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.definition_context28 import bind, capture


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--repo', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    repo = args.repo.resolve(); out = args.output.resolve(); out.mkdir(parents=True, exist_ok=True)
    compiler = args.compiler.resolve(); compiler_sha = hashlib.sha256(compiler.read_bytes()).hexdigest()
    commands = []

    def write(path, obj):
        path.write_bytes(canonical(obj))

    def run(command, *, allow_failure=False):
        result = subprocess.run([str(x) for x in command], capture_output=True, text=True)
        row = dict(command=[str(x) for x in command], returncode=result.returncode,
                   stdout=result.stdout, stderr=result.stderr)
        commands.append(row)
        write(out / 'commands.json', commands)
        if result.returncode and not allow_failure:
            raise RuntimeError(result.stderr)
        return row

    dummy_source = out / 'dummy.ink'; dummy = out / 'dummy.core.json'
    dummy_source.write_text('module Dummy; fn identity(x:u32)->u32{return x;}\n')
    run([compiler, 'emit-core', dummy_source, '-o', dummy])
    prior = Store(repo / 'knowledge')
    prior_members = prior.members()
    if len(prior_members) != 1822:
        raise ValueError('unexpected prior catalogue size; do not silently use another snapshot')
    candidates = []; objects = {}
    for spelling in ('u32', 'i32', 'u64', 'f32'):
        for variant in ('primary', 'heldout'):
            stem = f'{spelling}-{variant}'
            view = json.loads((out / f'{stem}-context-view.json').read_text())
            core_path = out / f'{stem}-input.core.json'
            subject_path = out / f'{stem}-subject.json'
            run([compiler, 'emit-semantic', core_path, '--core', '-o', subject_path])
            core = json.loads(core_path.read_text()); subject = json.loads(subject_path.read_text())
            for ident, entry in view['objects'].items():
                objects[ident] = entry
                context = entry['payload'].get('definition_context')
                if context is None:
                    if ident not in prior_members:
                        raise ValueError('generic fixture is not the existing checked map-fusion entry')
                    continue
                if context != capture(core, subject, ['helper']):
                    raise ValueError('independent producer/core context disagreement')
                candidates.append(dict(name=f'context_composed_mapfusion_{variant}_{spelling}',
                                       id=ident, role='definition_bound_source_certificate',
                                       source_core=str(core_path), source_sha256=hashlib.sha256(core_path.read_bytes()).hexdigest()))
            run([compiler, 'knowledge-check', dummy, out / f'{stem}-context-view.json'])
            run([compiler, 'check-selection', core_path, out / f'{stem}-selection.json'])
    # Recover the previously rejected portable-context case without changing its
    # equation/proof, and retain the exact original source and failed old receipt.
    old = repo / 'reports/web-stack-proofs-27-2026-10-11/let-context-review'
    row = json.loads((old / 'row.json').read_text())
    core_path = repo / 'reports/web-stack-proofs-27-2026-10-11/input-preparation/helper_accepted_projection_u32/input.core.json'
    subject_path = out / 'batch27-let.subject.json'
    run([compiler, 'emit-semantic', core_path, '--core', '-o', subject_path])
    law = bind(row['law'], json.loads(core_path.read_text()), json.loads(subject_path.read_text()))
    obj = semantic_entry(law); promoted_id = identity(obj); objects[promoted_id] = obj
    candidates.append(dict(name='context_batch27_list_materialization_normalize_u32', id=promoted_id,
                           role='definition_bound_source_certificate', original_context_free_id=row['content_id'],
                           source_core=str(core_path), source_sha256=hashlib.sha256(core_path.read_bytes()).hexdigest()))
    store = Store.publish(out / 'candidate-store', list(objects.values()), {r['name']: r['id'] for r in candidates})
    view_path = out / 'candidate-view.json'; write(view_path, store.bundle([r['id'] for r in candidates]))
    run([compiler, 'knowledge-check', dummy, view_path])
    selection = json.loads((old / 'selection.json').read_text()); selection['knowledge'] = store.bundle([promoted_id])
    for app in selection['applications']:
        app['law'] = promoted_id
    selection_path = out / 'batch27-let.selection.json'; write(selection_path, selection)
    run([compiler, 'check-selection', core_path, selection_path])
    run([compiler, 'emit-core', core_path, '--core', '--selection', selection_path, '-o', out / 'batch27-let.selected.core.json'])
    write(out / 'candidate-rows.json', candidates)
    # Full old snapshot admission, including non-rewrite domains. Each view is a
    # bounded authenticated closure. Budget failures split deterministically.
    audits = []

    def audit(ids, label):
        path = out / f'prior-check-{label}.json'; view = prior.bundle(ids); write(path, view)
        result = run([compiler, 'knowledge-check', dummy, path], allow_failure=True)
        audits.append(dict(roots=ids, closure=list(view['objects']), view_sha256=hashlib.sha256(path.read_bytes()).hexdigest(), **result))
        if result['returncode']:
            if len(ids) > 1 and any(word in result['stderr'] for word in ('budget', 'oversized', 'closure limit')):
                mid = len(ids) // 2; audit(ids[:mid], label+'a'); audit(ids[mid:], label+'b')
            else:
                write(out / 'prior-audit-failure.json', audits)
                raise RuntimeError('prior catalogue admission failed: '+result['stderr'])
        else:
            # Passing views are reconstructible from the bound immutable snapshot;
            # keep commands/root IDs/hash rather than duplicate every closure.
            path.unlink()

    all_ids = sorted(prior_members)
    for at in range(0, len(all_ids), 16):
        audit(all_ids[at:at+16], str(at//16))
    write(out / 'prior-catalogue-audit.json', dict(status='PASS', snapshot=prior.snapshot_id,
          members=len(all_ids), checked_roots=sorted({i for a in audits if not a['returncode'] for i in a['roots']}), attempts=audits))
    if hashlib.sha256(compiler.read_bytes()).hexdigest() != compiler_sha:
        raise ValueError('compiler changed during preparation')
    write(out / 'candidate-evidence.json', dict(status='PASS', compiler=str(compiler), compiler_sha256=compiler_sha,
          preliminary_compiler=True, prior_snapshot=prior.snapshot_id, prior_entries=len(all_ids),
          new_certificates=len(candidates), reused_generic_dependencies=len(objects)-len(candidates),
          candidate_snapshot=store.snapshot_id, rows=candidates, commands=len(commands),
          scope='Existing proof rules, portable exact definition contexts; no canonical publication or timing'))
    print(json.dumps(dict(status='PASS', certificates=len(candidates), prior_entries=len(all_ids))))


if __name__ == '__main__':
    main()
