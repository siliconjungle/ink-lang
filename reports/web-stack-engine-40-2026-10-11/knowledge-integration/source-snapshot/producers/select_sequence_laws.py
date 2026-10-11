#!/usr/bin/env python3
"""Construct and replay an explicit candidate for sequence profitability trials.

The default structural planner cannot rank equal-size or larger source terms
that avoid copying. This tool does not declare them profitable: it emits one
locally checked alternative for a named task, to be measured against its input.
"""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT.parent / 'planner'))
from ink_knowledge import Store, identity, semantic_entry
from ink_planner.semantic_search import match
from producers.web_sequence_laws import named_laws


def select(compiler, core, knowledge, mappings, output):
    compiler, core, output = Path(compiler).resolve(), Path(core).resolve(), Path(output).resolve()
    store = Store(knowledge)
    named = dict(named_laws())
    with tempfile.TemporaryDirectory(prefix='ink-sequence-candidate-') as directory:
        subject_path = Path(directory) / 'subject.json'
        subprocess.run([str(compiler), 'emit-semantic', str(core), '--core', '-o', str(subject_path)],
                       capture_output=True, text=True, check=True)
        subject = json.loads(subject_path.read_text())
        applications, ids = [], []
        for function, name in mappings:
            candidate = named[name]
            identifier = identity(semantic_entry(candidate))
            if identifier not in store.members():
                raise ValueError('requested candidate absent from pinned knowledge: ' + name)
            arguments = {}
            if not match(candidate['from'], subject['functions'][function], candidate['params'], arguments):
                raise ValueError('candidate does not match the exact source body: ' + function)
            if set(arguments) != set(candidate['params']):
                raise ValueError('unbound candidate parameter')
            applications.append(dict(function=function, path=[], law=identifier,
                                     arguments=dict(sorted(arguments.items())), premises=[]))
            ids.append(identifier)
        package = dict(schema=1, semantics='ink-evidence-v1',
                       input_core_sha256=subject['input_core_sha256'],
                       knowledge=store.bundle(sorted(set(ids))), applications=applications)
        staged = Path(directory) / 'candidate.json'
        staged.write_text(json.dumps(package, indent=2) + '\n')
        checked = subprocess.run([str(compiler), 'check-selection', str(core), str(staged)],
                                 capture_output=True, text=True, check=True)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_bytes(staged.read_bytes())
        return json.loads(checked.stdout)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--core', type=Path, required=True)
    parser.add_argument('--knowledge-root', type=Path, required=True)
    parser.add_argument('--function-law', action='append', required=True)
    parser.add_argument('-o', type=Path, required=True)
    args = parser.parse_args()
    mappings = [tuple(item.split(':', 1)) for item in args.function_law]
    if any(len(item) != 2 for item in mappings) or len({a for a, _ in mappings}) != len(mappings):
        parser.error('function-law requires unique FUNCTION:LAW mappings')
    print(json.dumps(select(args.compiler, args.core, args.knowledge_root, mappings, args.o)))
