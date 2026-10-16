#!/usr/bin/env python3
"""Reprove the same pinned equations; only ordinary replay admits a result."""
import argparse
import copy
import gzip
import hashlib
import json
import re
from pathlib import Path
import subprocess

from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.bitvector_proofs import certificate
from producers.rup_transport import pack_certificate

ROOT = Path(__file__).resolve().parents[3]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', required=True, type=Path)
    parser.add_argument('--core', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--baseline-knowledge', default='bc5d6625f44f5f699001f70a90798ea2e658ce5b')
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9a-f]{40}', args.baseline_knowledge):
        parser.error('baseline knowledge must be a full commit SHA')
    out = args.output.resolve()
    out.mkdir(parents=True, exist_ok=False)
    (out / 'storage-retention.json').write_text(json.dumps(dict(schema=1,
        keep=[dict(path='.', reason='Active selected proof-size comparison and ordinary replay inputs')],
        safe_to_remove=[]), indent=2) + '\n')

    def baseline(name):
        return subprocess.check_output(['git', 'show', args.baseline_knowledge + ':producers/data/v8-count-laws/' + name], cwd=ROOT / 'knowledge')

    compiler = args.compiler.resolve()
    core = args.core.resolve()
    rows, entries = [], []
    index = json.loads(baseline('index.json'))
    for row in index['rows']:
        directory = out / row['name']
        directory.mkdir()
        original = gzip.decompress(baseline(row['sha256'] + '.json.gz'))
        assert hashlib.sha256(original).hexdigest() == row['sha256']
        old = json.loads(original)
        goal = {key: old[key] for key in ['params', 'conditions', 'from', 'to']}
        (directory / 'goal.json').write_bytes(canonical(goal))

        def run(label, *arguments):
            result = subprocess.run([str(compiler), *map(str, arguments)], capture_output=True, text=True, timeout=120)
            (directory / (label + '.stdout')).write_text(result.stdout)
            (directory / (label + '.stderr')).write_text(result.stderr)
            if result.returncode:
                raise RuntimeError(label + ': ' + result.stderr[-2000:])

        problems = {}
        for encoding in ['shared-v2', 'shared-select-v3']:
            destination = directory / (encoding + '.json')
            run(encoding, 'semantic-bitvector-obligation', core, directory / 'goal.json', '--core',
                '--semantics', 'fixed-counts-v5', '--encoding', encoding, '-o', destination)
            problems[encoding] = json.loads(destination.read_bytes())
        assert problems['shared-v2']['sha256'] == old['proof']['BitVector']['certificate']['problem_sha256']
        new = copy.deepcopy(old)
        new['proof']['BitVector']['certificate'] = pack_certificate(certificate(
            problems['shared-select-v3'], seconds=5, conflicts=40000, total_seconds=15))
        encoded = canonical(new)
        (directory / 'law.json').write_bytes(encoded)
        entry = semantic_entry(new)
        entries.append(entry)
        store = Store.publish(directory / 'candidate', [entry])
        (directory / 'view.json').write_bytes(canonical(store.bundle([identity(entry)])))
        run('check', 'knowledge-check', core, directory / 'view.json')
        selected = new if len(encoded) < len(original) else old
        rows.append(dict(name=row['name'], old_bytes=len(original), new_bytes=len(encoded),
                         selected_bytes=min(len(original), len(encoded)), selected_sha256=identity(selected),
                         circuits={encoding: dict(sha256=problem['sha256'], variables=problem['variables'],
                                   clauses=len(problem['clauses'])) for encoding, problem in problems.items()}))
    result = dict(schema=1, exit_status=0, baseline_knowledge=args.baseline_knowledge,
                  compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),
                  core_input_sha256=hashlib.sha256(core.read_bytes()).hexdigest(), rows=rows,
                  scope='Same18 equations, fixed authoring budgets and ordinary RUP replay. Certificate/CNF sizes only; no runtime-selection or compiler-speed claim.')
    (out / 'terminal.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({key: sum(row[key] for row in rows) for key in ['old_bytes', 'new_bytes', 'selected_bytes']}))


if __name__ == '__main__':
    main()
