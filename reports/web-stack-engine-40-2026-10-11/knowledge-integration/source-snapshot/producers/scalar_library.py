#!/usr/bin/env python3
"""Translate historical scalar libraries to general, independently checked logic.

Inputs, translation and rule selection are untrusted. Imported hashes identify
source bytes; only the compiler's general checker establishes the new theorems.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
from inductive_proofs import SEMANTICS, binary, var


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--library', type=Path, action='append', required=True)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    compiler, out = args.compiler.resolve(), args.output_dir.resolve()
    out.mkdir(parents=True, exist_ok=True)
    if any(out.iterdir()):
        parser.error('output directory must be empty')
    (out / 'objects').mkdir()
    compiler_hash = hashlib.sha256(compiler.read_bytes()).hexdigest()
    objects, translations, active, names = {}, {}, set(), {}
    roots, selected, inputs = [], [], []

    def store(name, kind, declaration, dependencies=()):
        value = dict(schema=1, semantics=SEMANTICS, name=name, dependencies=sorted(set(dependencies)), declaration={kind: declaration})
        data = (json.dumps(value, separators=(',', ':')) + '\n').encode()
        identity = hashlib.sha256(data).hexdigest()
        (out / 'objects' / f'{identity}.json').write_bytes(data)
        names[name] = identity
        roots.append(identity)
        return identity

    def term(t):
        kind, value = next(iter(t.items()))
        if kind == 'Num':
            return {'U64': value}
        if kind in ('Var', 'Bool'):
            return t
        if kind == 'Binary':
            return binary(value[0], term(value[1]), term(value[2]))
        if kind == 'Call':
            return {'Call': dict(function=visit(value[0]), arguments=[term(a) for a in value[1]])}
        raise ValueError(f'unsupported scalar term {kind}')

    def proof(p):
        kind, value = next(iter(p.items()))
        if kind == 'Hypothesis':
            return p
        if kind == 'Refl':
            return {'Refl': term(value)}
        if kind == 'Compute':
            return {'Convert': {k: term(v) for k, v in value.items()}}
        if kind == 'Sym':
            return {'Sym': proof(value)}
        if kind == 'Trans':
            return {'Trans': [proof(v) for v in value]}
        if kind == 'Binary':
            return {'Binary': dict(op=value['op'], left=proof(value['left']), right=proof(value['right']))}
        if kind == 'BoolCases':
            return {'BoolCases': dict(variable=value['variable'], **{k: term(value[k]) for k in ('from', 'to')},
                on_false=proof(value['on_false']), on_true=proof(value['on_true']))}
        if kind in ('Use', 'UseConditional'):
            return {'Use': dict(theorem=visit(value['theorem']), arguments=[term(v) for v in value['arguments']],
                premises=[proof(v) for v in value.get('premises', [])])}
        raise ValueError(f'unsupported historical proof {kind}')

    def visit(identity):
        if identity in translations:
            return translations[identity]
        if identity in active or len(active) > 64 or len(translations) >= 128:
            raise ValueError('scalar translation dependency budget/cycle')
        active.add(identity)
        obj = objects[identity]
        dependencies = [visit(d) for d in obj.get('dependencies', [])]
        if any(t not in ('U64', 'Bool') for _, t in obj['params']):
            raise ValueError('scalar library parameters must be U64 or Bool')
        if obj.get('kind') == 'definition':
            declaration = dict(params=obj['params'], result=obj['result'], body=term(obj['body']), recursive=None)
            new = store(obj['name'], 'Function', declaration, dependencies)
        else:
            declaration = dict(params=obj['params'], conditions=[{k: term(v) for k, v in c.items()} for c in obj.get('conditions', [])],
                **{'from': term(obj['from']), 'to': term(obj['to'])}, proof=proof(obj['proof']))
            new = store(obj['name'], 'Theorem', declaration, dependencies)
        translations[identity] = new
        active.remove(identity)
        return new

    for path in args.library:
        path = path.resolve()
        lock_bytes = path.read_bytes()
        lock = json.loads(lock_bytes)
        if lock['schema'] != 1 or lock['semantics'] != 'total-scalar-equality-v1':
            parser.error('expected a historical scalar lock')
        for object_path in sorted((path.parent / 'objects').glob('*.json')):
            data = object_path.read_bytes()
            identity = hashlib.sha256(data).hexdigest()
            if object_path.stem != identity:
                parser.error('historical object hash mismatch')
            obj = json.loads(data)
            if obj['schema'] != 1 or obj['semantics'] != lock['semantics']:
                parser.error('historical object semantics mismatch')
            objects[identity] = obj
        inputs.append(dict(lock_sha256=hashlib.sha256(lock_bytes).hexdigest(), roots=lock['objects']))
        for identity in lock['objects']:
            new = visit(identity)
            if 'Theorem' in json.loads((out / 'objects' / f'{new}.json').read_text())['declaration']:
                selected.append(new)

    def substitute(t, name, value):
        if t == var(name):
            return {'Bool': value}
        if 'Binary' in t:
            b = t['Binary']
            return binary(b['op'], substitute(b['left'], name, value), substitute(b['right'], name, value))
        return t

    def cases(a, b, variables):
        if not variables:
            return {'Convert': dict(**{'from': a, 'to': b})}
        name, *rest = variables
        return {'BoolCases': dict(variable=name, **{'from': a, 'to': b},
            on_false=cases(substitute(a, name, False), substitute(b, name, False), rest),
            on_true=cases(substitute(a, name, True), substitute(b, name, True), rest))}

    # Branch closing uses ordinary DB theorems, not primitive Boolean identities.
    for op, value, name in [('&&', False, 'and_false'), ('&&', True, 'and_true'), ('||', False, 'or_false'), ('||', True, 'or_true')]:
        a = binary(op, {'Bool': value}, var('a'))
        b = var('a') if value == (op == '&&') else {'Bool': value}
        identity = store(name, 'Theorem', dict(params=[['a', 'Bool']], conditions=[], **{'from': a, 'to': b}, proof=cases(a, b, ['a'])))
        selected.append(identity)
    (out / 'lock.json').write_text(json.dumps(dict(schema=1, semantics=SEMANTICS, objects=list(dict.fromkeys(roots))), indent=2) + '\n')
    (out / 'rewrite-index.json').write_text(json.dumps(dict(schema=1, semantics='untrusted-rewrite-index-v1', library='lock.json', rules=list(dict.fromkeys(selected))), indent=2) + '\n')
    (out / 'names.json').write_text(json.dumps(names, indent=2) + '\n')
    subprocess.run([compiler, 'verify-library', out / 'lock.json'], check=True, capture_output=True)
    assert hashlib.sha256(compiler.read_bytes()).hexdigest() == compiler_hash
    print(json.dumps(dict(status='checked', compiler_sha256=compiler_hash, inputs=inputs, translations=translations)))


if __name__ == '__main__':
    main()
