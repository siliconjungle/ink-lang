#!/usr/bin/env python3
"""Author the fixed change boundary and its laws. No action-body or storage proof.

The canonical store imports these entries; names are discovery aliases only.
The compiler independently checks the definitions against its base semantics.
"""
import argparse
import hashlib
import json
from pathlib import Path
from inductive_proofs import SEMANTICS, var, call, construct, binary


def build(directory):
    objects = directory / 'objects'
    objects.mkdir(parents=True, exist_ok=True)
    names = {}

    def refs(value):
        if isinstance(value, list):
            return set().union(*(refs(x) for x in value)) if value else set()
        if not isinstance(value, dict):
            return set()
        result = set()
        for key, item in value.items():
            if key in ('datatype', 'function', 'theorem', 'Data'):
                result.add(item)
            result |= refs(item)
        return result

    def store(name, kind, value):
        entry = dict(schema=1, semantics=SEMANTICS, name=name,
                     dependencies=sorted(refs(value)), declaration={kind: value})
        data = (json.dumps(entry, separators=(',', ':')) + '\n').encode()
        identity = hashlib.sha256(data).hexdigest()
        target = objects / f'{identity}.json'
        if target.exists():
            assert target.read_bytes() == data
        else:
            target.write_bytes(data)
        names[name] = identity
        return identity

    decision = store('ChangeDecision', 'Datatype', dict(constructors=[
        dict(name='Rollback', fields=[]), dict(name='Commit', fields=['U64']),
        dict(name='Exhausted', fields=[])]))
    rollback, exhausted = construct(decision, 0), construct(decision, 2)
    version = var('version')
    next_version = binary('+', version, {'U64': 1})
    commit = construct(decision, 1, next_version)
    at_limit = binary('==', version, {'U64': 2**64 - 1})
    finish = store('finish_change', 'Function', dict(
        params=[['version', 'U64'], ['succeeded', 'Bool']],
        result={'Data': decision}, recursive=None,
        body={'If': dict(condition=var('succeeded'), on_false=rollback,
                         on_true={'If': dict(condition=at_limit,
                                             on_true=exhausted, on_false=commit)})}))

    def theorem(name, params, left, right, proof, conditions=()):
        return store(name, 'Theorem', dict(params=params, conditions=list(conditions),
                     **{'from': left, 'to': right}, proof=proof))

    def conversion(left, right):
        return {'Convert': dict(**{'from': left, 'to': right})}

    aborted = call(finish, version, {'Bool': False})
    theorem('domain_error_precedes_exhaustion', [['version', 'U64']],
            aborted, rollback, conversion(aborted, rollback))
    full = call(finish, {'U64': 2**64 - 1}, {'Bool': True})
    theorem('successful_change_exhaustion', [], full, exhausted,
            conversion(full, exhausted))
    last = call(finish, {'U64': 2**64 - 2}, {'Bool': True})
    last_commit = construct(decision, 1, {'U64': 2**64 - 1})
    theorem('last_successful_commit', [], last, last_commit,
            conversion(last, last_commit))
    # An explicit premise, never a profile observation, guards word addition.
    guarded = call(finish, version, {'Bool': True})
    theorem('guarded_commit', [['version', 'U64']], guarded, commit,
            {'Substitute': dict(variable='full',
                context={'If': dict(condition=var('full'), on_true=exhausted, on_false=commit)},
                equality={'Hypothesis': 0})},
            [dict(**{'from': at_limit, 'to': {'Bool': False}})])
    (directory / 'names.json').write_text(json.dumps(names, indent=2) + '\n')
    (directory / 'lock.json').write_text(json.dumps(dict(
        schema=1, semantics=SEMANTICS, objects=list(names.values())), indent=2) + '\n')
    return names


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    print(json.dumps(build(args.directory)))
