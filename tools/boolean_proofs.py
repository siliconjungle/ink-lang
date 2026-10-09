#!/usr/bin/env python3
"""Untrusted proof producer: enumerate Boolean cases; the compiler checks every leaf.
Input is an array of objects with name, params, from and to in the scalar AST format.
No compiler code or optimisation catalogue is modified. Existing objects are immutable.
"""
import argparse
import hashlib
import json
from pathlib import Path

SEMANTICS = 'total-scalar-equality-v1'

def substitute(term, variable, value):
    if term == {'Var': variable}:
        return {'Bool': value}
    if 'Binary' in term:
        op, a, b = term['Binary']
        return {'Binary': [op, substitute(a, variable, value), substitute(b, variable, value)]}
    return term

def prove(before, after, variables):
    if not variables:
        return {'Compute': {'from': before, 'to': after}}
    variable, *rest = variables
    return {'BoolCases': {
        'variable': variable, 'from': before, 'to': after,
        'on_false': prove(substitute(before, variable, False), substitute(after, variable, False), rest),
        'on_true': prove(substitute(before, variable, True), substitute(after, variable, True), rest),
    }}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('rules', type=Path)
    parser.add_argument('database', type=Path)
    args = parser.parse_args()
    objects = args.database / 'objects'
    objects.mkdir(parents=True, exist_ok=True)
    ids = []
    for rule in json.loads(args.rules.read_text()):
        if any(ty != 'Bool' for _, ty in rule['params']) or len(rule['params']) > 8:
            raise ValueError('This producer supports at most eight Boolean parameters')
        obj = dict(schema=1, semantics=SEMANTICS, **rule,
                   proof=prove(rule['from'], rule['to'], [name for name, _ in rule['params']]))
        data = (json.dumps(obj, separators=(',', ':'), ensure_ascii=True) + '\n').encode()
        identity = hashlib.sha256(data).hexdigest()
        target = objects / f'{identity}.json'
        if target.exists():
            assert target.read_bytes() == data
        else:
            with target.open('xb') as out:
                out.write(data)
        ids.append(identity)
    (args.database / 'lock.json').write_text(json.dumps(dict(schema=1, semantics=SEMANTICS, objects=ids), indent=2)+'\n')
    print(f'Wrote {len(ids)} untrusted proof candidates; run lang verify-database on the lockfile.')

if __name__ == '__main__':
    main()
