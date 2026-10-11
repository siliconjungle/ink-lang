"""Stage a dependency-closed checked extension; publish only the staged bytes.

Proof authoring, discovery and measured profitability are separate. The private
fair prior includes every old-only source certificate also offered to current.
No certificate is trusted because of its name, hash or performance observation.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from ink_knowledge import Store, canonical, identity, semantic_entry


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def stage(root, compiler, rows_path, output):
    root, compiler, rows_path, output = map(lambda p: Path(p).resolve(),
                                          (root, compiler, rows_path, output))
    if (output / 'stage.json').exists():
        raise ValueError('preserve existing admission evidence; choose a new output')
    original = Store(root)
    old = set(original.members())
    names = json.loads((root / 'store/names.json').read_text())
    data = json.loads(rows_path.read_text())
    rows = data if isinstance(data, list) else data['rows']
    objects = {oid: original.object(oid) for oid in sorted(old)}
    fresh, shared = set(), set()
    for row in rows:
        obj = semantic_entry(row['law'])
        oid = identity(obj)
        if row.get('id', oid) != oid:
            raise ValueError('row identity differs from supplied mathematical bytes')
        name = 'web-stack/' + row['name']
        if name in names and names[name] != oid:
            raise ValueError('existing discovery name would change')
        names[name] = oid
        objects[oid] = obj
        if oid not in old:
            (shared if row['role'] == 'shared_old' else fresh).add(oid)
    if not fresh or fresh & shared:
        raise ValueError('need disjoint fresh and old-only extensions')
    prior_ids = old | shared
    for oid in prior_ids:
        if not set(objects[oid]['dependencies']) <= prior_ids:
            raise ValueError('fair prior depends on a fresh law')
    output.mkdir(parents=True, exist_ok=True)
    prior = Store.publish(output / 'fair-prior',
                          [objects[i] for i in sorted(prior_ids)],
                          {n: i for n, i in names.items() if i in prior_ids})
    current = Store.publish(output / 'current', objects.values(), names)
    prior.rebuild()
    current.rebuild()
    source = output / 'dummy.ink'
    source.write_text('module ProofAdmission33;\npub fn identity(x:u32)->u32{return x;}\n')
    core = output / 'dummy.core.json'
    commands = []
    compiler_hash = sha(compiler)

    def run(argv):
        p = subprocess.run(list(map(str, argv)), capture_output=True, text=True)
        commands.append(dict(argv=list(map(str, argv)), exit_code=p.returncode,
                             stdout=p.stdout, stderr=p.stderr))
        (output / 'commands.json').write_text(json.dumps(commands, indent=2) + '\n')
        return p

    p = run([compiler, 'emit-core', source, '-o', core])
    if p.returncode:
        raise RuntimeError(p.stderr)

    def admit(ids):
        view = output / ('admission-' + str(len(commands)) + '.json')
        bundle = current.bundle(ids)
        view.write_bytes(canonical(bundle) + b'\n')
        p = run([compiler, 'knowledge-check', core, view])
        if p.returncode:
            if len(ids) > 1 and 'semantic proof work/depth limit' in p.stderr:
                half = len(ids) // 2
                admit(ids[:half])
                admit(ids[half:])
            else:
                raise RuntimeError(p.stderr)
        elif set(json.loads(p.stdout)['entries']) != set(bundle['objects']):
            raise ValueError('checker did not admit the complete closure')

    roots = sorted(fresh | shared)
    for start in range(0, len(roots), 32):
        admit(roots[start:start + 32])
    if sha(compiler) != compiler_hash or Store(root).snapshot_id != original.snapshot_id:
        raise ValueError('compiler or canonical catalogue changed during admission')
    receipt = dict(status='checked', previous_snapshot=original.snapshot_id,
                   previous_entries=len(old), fair_prior_snapshot=prior.snapshot_id,
                   fair_prior_entries=len(prior_ids), snapshot=current.snapshot_id,
                   entries=len(objects), fresh_entries=sorted(fresh),
                   shared_old_entries=sorted(shared), rows_sha256=sha(rows_path),
                   original_names_sha256=sha(root / 'store/names.json'),
                   staged_names_sha256=sha(current.data / 'names.json'),
                   commands_sha256=sha(output / 'commands.json'),
                   admission_bindings={p.name: sha(p) for p in sorted(output.glob('admission-*.json'))},
                   compiler=str(compiler), compiler_sha256=compiler_hash,
                   scope='Private staging only; no canonical publication or speed claim.')
    (output / 'stage.json').write_text(json.dumps(receipt, indent=2) + '\n')
    return receipt


def publish(root, staged, receipt_path):
    root, staged, receipt_path = map(lambda p: Path(p).resolve(),
                                    (root, staged, receipt_path))
    if receipt_path.exists():
        raise ValueError('preserve previous publication receipt')
    receipt = json.loads((staged / 'stage.json').read_text())
    original, candidate = Store(root), Store(staged / 'current')
    if receipt['status'] != 'checked':
        raise ValueError('staging was not completed')
    if original.snapshot_id != receipt['previous_snapshot']:
        raise ValueError('canonical catalogue changed after staging')
    if candidate.snapshot_id != receipt['snapshot']:
        raise ValueError('staged candidate changed')
    if sha(receipt['compiler']) != receipt['compiler_sha256']:
        raise ValueError('admitting compiler changed')
    previous_ids = set(original.members())
    candidate_ids = set(candidate.members())
    if not previous_ids <= candidate_ids:
        raise ValueError('candidate omitted a previous immutable object')
    if candidate_ids - previous_ids != set(receipt['fresh_entries']) | set(receipt['shared_old_entries']):
        raise ValueError('staged extension membership changed')
    names = json.loads((candidate.data / 'names.json').read_text())
    old_names = json.loads((root / 'store/names.json').read_text())
    if any(names.get(n) != i for n, i in old_names.items()):
        raise ValueError('candidate omitted or changed a previous discovery name')
    if sha(root / 'store/names.json') != receipt['original_names_sha256'] or sha(candidate.data / 'names.json') != receipt['staged_names_sha256']:
        raise ValueError('discovery names changed after staging')
    if sha(staged / 'commands.json') != receipt['commands_sha256']:
        raise ValueError('staged admission evidence changed')
    for path, digest in receipt['admission_bindings'].items():
        if sha(staged / path) != digest:
            raise ValueError('staged checked proof view changed')
    result = Store.publish(root, [candidate.object(i) for i in candidate.members()], names)
    result.rebuild()
    previous = Store(root, root / 'store/snapshots' / (receipt['previous_snapshot'] + '.json'))
    if set(previous.members()) != previous_ids or not previous_ids <= set(result.members()):
        raise ValueError('previous immutable snapshot was not preserved')
    result_receipt = dict(receipt, status='published', previous_snapshot_preserved=True,
                          scope='Checked DB extension; profitability evidence is separate.')
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(result_receipt, indent=2) + '\n')
    return result_receipt


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--compiler', type=Path)
    parser.add_argument('--rows', type=Path)
    parser.add_argument('--stage', type=Path, required=True)
    parser.add_argument('--publish', type=Path)
    args = parser.parse_args()
    if args.publish:
        result = publish(args.root, args.stage, args.publish)
    else:
        if args.compiler is None or args.rows is None:
            parser.error('--compiler and --rows are required for staging')
        result = stage(args.root, args.compiler, args.rows, args.stage)
    print(json.dumps(result))
