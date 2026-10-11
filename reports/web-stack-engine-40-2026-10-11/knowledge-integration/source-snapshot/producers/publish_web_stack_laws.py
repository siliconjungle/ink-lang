#!/usr/bin/env python3
"""Publish a web proof batch only after local mathematical admission.

Immutable snapshots retain the previous catalogue. Performance observations are
separate and this publisher never claims target profitability.
"""
import argparse
import hashlib
import importlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ink_knowledge import Store, canonical, identity, semantic_entry


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def publish(root, compiler, report, producers, expected_previous=None):
    root, compiler, report = Path(root).resolve(), Path(compiler).resolve(), Path(report).resolve()
    if report.exists():
        raise ValueError('refusing to overwrite an archived publication receipt')
    compiler_hash = digest(compiler)
    original = Store(root)
    if expected_previous and original.snapshot_id != expected_previous:
        raise ValueError('canonical catalogue differs from the requested prior pin')
    original_ids = set(original.members())
    original_names = json.loads((root / 'store/names.json').read_text())
    names, batch, provenance = dict(original_names), [], []
    for producer in producers:
        module = importlib.import_module('producers.' + producer)
        named = module.named_laws()
        provenance.append(dict(producer=producer, source_sha256=digest(module.__file__),
                               entries=len(named)))
        for name, candidate in named:
            obj = semantic_entry(candidate)
            batch.append(obj)
            label = 'web-stack/' + name
            identifier = identity(obj)
            if label in names and names[label] != identifier:
                raise ValueError('existing discovery name has different mathematical content: ' + label)
            names[label] = identifier
    batch_ids = sorted(identity(obj) for obj in batch)
    if len(batch_ids) != len(set(batch_ids)):
        raise ValueError('duplicate semantic content within the batch')
    if set(batch_ids) & original_ids:
        raise ValueError('batch contains previously published entries')
    objects = [original.object(i) for i in sorted(original_ids)] + batch
    with tempfile.TemporaryDirectory(prefix='ink-web-admission-') as directory:
        stage = Path(directory)
        source, core, view = stage / 'subject.ink', stage / 'subject.core.json', stage / 'view.json'
        source.write_text('module web_admission;\npub fn identity(x: u32) -> u32 { return x; }\n')
        subprocess.run([str(compiler), 'emit-core', str(source), '-o', str(core)], check=True,
                       capture_output=True, text=True)
        staged = Store.publish(stage, objects, names)
        staged.rebuild()
        bundle = staged.bundle(batch_ids)
        view.write_bytes(canonical(bundle) + b'\n')
        checked = subprocess.run([str(compiler), 'knowledge-check', str(core), str(view)],
                                 check=True, capture_output=True, text=True)
        admission = json.loads(checked.stdout)
        # Admission includes the dependency closure, including previously
        # published lemmas. Authenticate every loaded object, not only roots.
        if set(admission['entries']) != set(bundle['objects']):
            raise RuntimeError('checker did not admit the complete dependency closure')
        if digest(compiler) != compiler_hash:
            raise RuntimeError('compiler changed during admission')
        extended = Store.publish(root, objects, names)
        if extended.snapshot_id != staged.snapshot_id:
            raise RuntimeError('published snapshot differs from admitted snapshot')
        extended.rebuild()
        view.write_bytes(canonical(extended.bundle(batch_ids)) + b'\n')
        subprocess.run([str(compiler), 'knowledge-check', str(core), str(view)], check=True,
                       capture_output=True, text=True)
    old = Store(root, root / 'store/snapshots' / (original.snapshot_id + '.json'))
    if set(old.members()) != original_ids or not original_ids <= set(extended.members()):
        raise RuntimeError('publication did not preserve the prior snapshot')
    if digest(compiler) != compiler_hash:
        raise RuntimeError('compiler changed during publication')
    result = dict(schema=1, status='checked', previous_snapshot=original.snapshot_id,
                  snapshot=extended.snapshot_id, previous_entries=len(original_ids),
                  entries=len(extended.members()), added_entries=len(batch_ids),
                  batch_entries=batch_ids, producers=provenance, compiler_sha256=compiler_hash,
                  admission=admission, previous_snapshot_preserved=True,
                  scope='Pure total values; target lowering/runtime are trusted and profitability requires measurements.')
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(result, indent=2) + '\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--producer', action='append', required=True)
    parser.add_argument('--expect-previous')
    args = parser.parse_args()
    print(json.dumps(publish(args.root, args.compiler, args.report, args.producer, args.expect_previous)))
