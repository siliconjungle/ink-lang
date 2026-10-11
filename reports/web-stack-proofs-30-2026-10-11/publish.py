"""Publish only independently checked DB entries; measurements remain separate."""
from pathlib import Path
import argparse, hashlib, json, subprocess, sys

R = Path(__file__).resolve().parent
B = R.parents[1]
K = B / 'knowledge'
sys.path.insert(0, str(K))
from ink_knowledge import Store, identity

read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidate-store', type=Path, required=True)
    parser.add_argument('--source-core', type=Path, required=True)
    args = parser.parse_args()
    pins = read(R / 'initial-pins.json')
    compiler = Path(pins['compiler'])
    assert sha(compiler) == pins['compiler_sha256']
    old = Store(K, K / 'store/snapshots' / (pins['baseline_snapshot'] + '.json'))
    candidate = Store(args.candidate_store)
    old_ids = set(old.members())
    fresh = set(candidate.members()) - old_ids
    assert fresh, 'no fresh checked objects'
    view = candidate.bundle(sorted(fresh))
    (R / 'candidate-view.json').write_text(json.dumps(view, indent=2) + '\n')
    commands = []
    def check(roots):
        bundle = candidate.bundle(roots)
        path = R / ('admission-' + str(len(commands)) + '.json')
        path.write_text(json.dumps(bundle) + '\n')
        argv = [str(compiler), 'knowledge-check', str(args.source_core.resolve()), str(path)]
        proc = subprocess.run(argv, capture_output=True, text=True, cwd=B)
        commands.append(dict(argv=argv, exit_code=proc.returncode, stdout=proc.stdout,
                             stderr=proc.stderr, roots=roots, closure=sorted(bundle['objects']),
                             bundle_sha256=sha(path)))
        (R / 'publication-checks.json').write_text(json.dumps(commands, indent=2) + '\n')
        if proc.returncode:
            if 'semantic proof work/depth limit' in proc.stderr and len(roots) > 1:
                middle = len(roots) // 2
                check(roots[:middle]); check(roots[middle:])
            else:
                raise RuntimeError(proc.stderr)
        else:
            result = json.loads(proc.stdout)
            assert set(result['entries']) == set(bundle['objects'])
    for at in range(0, len(fresh), 16):
        check(sorted(fresh)[at:at+16])
    assert sha(compiler) == pins['compiler_sha256']
    current = Store(K)
    assert current.snapshot_id == old.snapshot_id, 'canonical catalogue changed concurrently'
    names = read(K / 'store/names.json')
    assert names == pins['baseline_names']
    for name, oid in read(candidate.data / 'names.json').items():
        if oid not in fresh:
            continue
        assert name not in names or names[name] == oid, 'discovery name collision'
        names[name] = oid
    objects = [old.object(i) for i in sorted(old_ids)] + [candidate.object(i) for i in sorted(fresh)]
    new = Store.publish(K, objects, names)
    assert set(new.members()) == old_ids | fresh
    assert all(identity(new.object(i)) == pins['baseline_objects'][i] for i in old_ids)
    assert all(names[name] == oid for name, oid in pins['baseline_names'].items())
    new.rebuild()
    receipt = dict(status='checked_and_published', previous_snapshot=old.snapshot_id,
                   snapshot=new.snapshot_id, previous_entries=len(old_ids), entries=len(new.members()),
                   new_entries=len(fresh), new_ids=sorted(fresh),
                   reused_dependencies=sorted(set(view['objects']) & old_ids),
                   candidate_snapshot=candidate.snapshot_id, compiler_sha256=sha(compiler),
                   candidate_view_sha256=sha(R / 'candidate-view.json'),
                   admission_checks_sha256=sha(R / 'publication-checks.json'),
                   prior_objects_and_names_preserved=True,
                   scope='Existing equality rules; no runtime checker, compiler change, or performance axiom')
    (R / 'publication.json').write_text(json.dumps(receipt, indent=2) + '\n')
    archive = K / 'research/web-stack-proofs-30'
    archive.mkdir(parents=True, exist_ok=True)
    for name in ['publication.json', 'candidate-view.json']:
        (archive / name).write_bytes((R / name).read_bytes())
    print(json.dumps(receipt))

if __name__ == '__main__':
    main()
