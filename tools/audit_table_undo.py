#!/usr/bin/env python3
"""Check standalone row-undo packages; optionally reproduce with the SAT producer.

This audits mathematical evidence, not native representation admission.
"""
import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, default=ROOT/'target/release/lang')
    parser.add_argument('--reproduce', action='store_true')
    parser.add_argument('--python', default='python3', help='Python with python-sat for reproduction')
    args = parser.parse_args()
    compiler = args.compiler.resolve()
    compiler_hash = sha(compiler)
    result = dict(compiler_sha256=compiler_hash, packages=[], scope='Abstract whole-row lookup/cache undo; no native admission')
    report = ROOT/'reports/whole-row-undo-phase1'
    if (report/'verification.json').exists():
        receipt = json.loads((report/'verification.json').read_text())
        for name, expected in receipt['source_sha256'].items():
            assert sha(report/'sources'/name) == expected, name
        for name, expected in receipt['artifact_sha256'].items():
            assert sha(report/name) == expected, name
        assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',(report/'tests.log').read_text()))) == receipt['tests'] == 78
        result['archived_validation'] = True
    for variant, folder, evidence_name in [('reversible', 'table-undo', 'table.evidence.json'),
                                          ('snapshot', 'table-undo-snapshot', 'table-snapshot.evidence.json')]:
        path = ROOT/'knowledge'/folder
        bundle = json.loads((path/'bundle.json').read_text())
        model = json.loads((path/'model.json').read_text())
        names = json.loads((path/'names.json').read_text())
        parent = ROOT/'knowledge/table-maintenance'/evidence_name
        assert model['variant'] == variant
        assert model['parent_evidence_sha256'] == sha(parent)
        assert json.loads((path/'lock.json').read_text()) == bundle['lock']
        assert set(bundle['lock']['objects']) == set(bundle['objects']) == set(names.values())
        assert len(bundle['objects']) == 96 and len(model['roles']) == 33
        if (report/'verification.json').exists():
            assert sha(path/'bundle.json') == receipt['bundle_sha256'][folder]
        assert set(p.stem for p in (path/'objects').glob('*.json')) == set(bundle['objects'])
        for identity, raw in bundle['objects'].items():
            assert hashlib.sha256(raw.encode()).hexdigest() == identity
            assert (path/'objects'/f'{identity}.json').read_bytes() == raw.encode()
        for role, identity in model['roles'].items():
            assert names[role] == identity
        for role, name in [('row_lookup','stored_lookup_undo'),('cache_inverse','exact_cache_entry_undo'),
                           ('step','rollback_row_step_exact'),('history','rollback_row_history_exact')]:
            assert model['roots'][role] == names[name]
        subprocess.run([str(compiler), 'verify-library', str(path/'lock.json')], check=True, capture_output=True)
        if args.reproduce:
            with tempfile.TemporaryDirectory(prefix='table-undo-replay-') as scratch:
                replay = Path(scratch)
                subprocess.run([args.python, str(ROOT/'knowledge/tools/table_undo_proofs.py'), str(replay),
                                '--variant',variant,'--compiler',str(compiler)], check=True, capture_output=True)
                for p in path.rglob('*'):
                    if p.is_file():
                        assert (replay/p.relative_to(path)).read_bytes() == p.read_bytes(), str(p)
        result['packages'].append(dict(variant=variant, objects=96, new_objects=33,
                                       bundle_sha256=sha(path/'bundle.json'), reproduced=args.reproduce))
    assert sha(compiler) == compiler_hash
    result['status'] = 'passed'
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()
