#!/usr/bin/env python3
"""Extend a pinned canonical store only after the existing Ink checker accepts a batch."""
import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.performance_laws import named_laws


def publish(root, compiler, report):
    root, compiler = Path(root).resolve(), Path(compiler).resolve()
    compiler_hash = hashlib.sha256(compiler.read_bytes()).hexdigest()
    original = Store(root)
    original_ids = set(original.members())
    objects = [original.object(i) for i in sorted(original_ids)]
    names = json.loads((root / 'store/names.json').read_text())
    batch = [semantic_entry(law) for _, law in named_laws()]
    batch_ids = sorted({identity(obj) for obj in batch})
    names.update({f'performance/{name}': identity(semantic_entry(law))
                  for name, law in named_laws()})
    with tempfile.TemporaryDirectory(prefix='ink-performance-admission-') as directory:
        stage = Path(directory)
        source, core, view = stage / 'subject.ink', stage / 'subject.core.json', stage / 'view.json'
        source.write_text('module performance_admission;\npub fn identity(x: u32) -> u32 { return x; }\n')
        subprocess.run([str(compiler), 'emit-core', str(source), '-o', str(core)], check=True,
                       capture_output=True, text=True)
        staged = Store.publish(stage, objects + batch, names)
        view.write_bytes(canonical(staged.bundle(batch_ids)) + b'\n')
        checked = subprocess.run([str(compiler), 'knowledge-check', str(core), str(view)],
                                 check=True, capture_output=True, text=True)
        admission = json.loads(checked.stdout)
        # No publication or pointer change precedes mathematical admission.
        extended = Store.publish(root, objects + batch, names)
        if extended.snapshot_id != staged.snapshot_id:
            raise RuntimeError('published snapshot differs from checked snapshot')
        extended.rebuild()
        view.write_bytes(canonical(extended.bundle(batch_ids)) + b'\n')
        subprocess.run([str(compiler), 'knowledge-check', str(core), str(view)],
                       check=True, capture_output=True, text=True)
    old = Store(root, root / 'store/snapshots' / f'{original.snapshot_id}.json')
    if set(old.members()) != original_ids or not original_ids <= set(extended.members()):
        raise RuntimeError('publication did not preserve the original snapshot')
    if hashlib.sha256(compiler.read_bytes()).hexdigest() != compiler_hash:
        raise RuntimeError('compiler changed during admission')
    result = dict(schema=1, status='checked', previous_snapshot=original.snapshot_id,
                  snapshot=extended.snapshot_id, previous_entries=len(original_ids),
                  entries=len(extended.members()), added_entries=len(set(batch_ids) - original_ids),
                  batch_entries=batch_ids, compiler_sha256=compiler_hash,
                  admission=admission, previous_snapshot_preserved=True,
                  scope='Pure total values. Target lowering and runtime remain trusted; timings are separate.')
    report = Path(report)
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(result, indent=2) + '\n')
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    print(json.dumps(publish(args.root, args.compiler, args.report)))
