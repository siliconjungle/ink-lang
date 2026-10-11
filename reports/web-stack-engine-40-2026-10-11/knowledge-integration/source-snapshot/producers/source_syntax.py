#!/usr/bin/env python3
"""Untrusted complete-code data producer. No replacement or interpreter authority.

Reads ink emit-core / emit-actions outputs and publishes a per-program snapshot.
The core independently reconstructs and checks every declaration and the image.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, identity
from ink_knowledge.store import entry, read

SEMANTICS = 'ink-source-syntax-v1'
MATH = 'first-order-inductive-equality-v1'


def construct(datatype, tag, args):
    return {'Construct': {'datatype': datatype, 'constructor': tag, 'arguments': args}}


def publish(module, actions, directory):
    objects = []
    roles = dict(schema=1, semantics=SEMANTICS)

    def definition(role, declaration, deps=()):
        body = next(iter(declaration.values()))
        obj = entry('definition', MATH, {'declaration': declaration}, deps,
                    parameters=dict(body.get('params', [])), result=body.get('result'))
        objects.append(obj)
        roles[role] = identity(obj)

    def datatype(role, constructors, deps=()):
        definition(role, {'Datatype': {'constructors': [dict(name=n, fields=f) for n, f in constructors]}}, deps)

    datatype('words', [('Empty', []), ('Word', ['U64']), ('Branch', ['U64', 'SelfType', 'SelfType'])])
    datatype('fields', [('Empty', []), ('Field', ['U64', 'U64']), ('Branch', ['U64', 'SelfType', 'SelfType'])])
    datatype('node', [('Null', []), ('Bool', ['Bool']), ('Number', ['U64']),
                      ('Text', ['U64', {'Data': roles['words']}]), ('Array', [{'Data': roles['words']}]),
                      ('Object', [{'Data': roles['fields']}])], [roles['words'], roles['fields']])
    datatype('nodes', [('Empty', []), ('Node', [{'Data': roles['node']}]),
                       ('Branch', ['U64', 'SelfType', 'SelfType'])], [roles['node']])
    datatype('image', [('Image', [{'Data': roles['nodes']}, 'U64'])], [roles['nodes']])
    nodes = []
    remaining = 100_000

    def ctor(role, tag, args):
        nonlocal remaining
        remaining -= 1 + sum('U64' in x or 'Bool' in x for x in args)
        if remaining < 0:
            raise ValueError('source syntax term budget exhausted')
        return construct(roles[role], tag, args)

    def tree(role, leaves):
        if not leaves:
            return ctor(role, 0, [])
        if len(leaves) == 1:
            return leaves[0]
        half = len(leaves) // 2
        return ctor(role, 2, [{'U64': half}, tree(role, leaves[:half]), tree(role, leaves[half:])])

    def words(values):
        return tree('words', [ctor('words', 1, [{'U64': x}]) for x in values])

    def node(value, depth=0):
        if depth > 128:
            raise ValueError('source syntax depth limit')
        if value is None:
            term = ctor('node', 0, [])
        elif isinstance(value, bool):
            term = ctor('node', 1, [{'Bool': value}])
        elif isinstance(value, int):
            if not 0 <= value < 2**64:
                raise ValueError('source syntax requires unsigned integer JSON')
            term = ctor('node', 2, [{'U64': value}])
        elif isinstance(value, str):
            raw = value.encode('utf8')
            chunks = [int.from_bytes(raw[i:i+8], 'little') for i in range(0, len(raw), 8)]
            term = ctor('node', 3, [{'U64': len(raw)}, words(chunks)])
        elif isinstance(value, list):
            refs = [node(x, depth + 1) for x in value]
            term = ctor('node', 4, [words(refs)])
        elif isinstance(value, dict):
            fields = []
            for key in sorted(value):
                a, b = node(key, depth + 1), node(value[key], depth + 1)
                fields.append(ctor('fields', 1, [{'U64': a}, {'U64': b}]))
            term = ctor('node', 5, [tree('fields', fields)])
        else:
            raise ValueError('unsupported JSON value')
        index = len(nodes)
        nodes.append(term)
        return index

    root = node(dict(schema=1, semantics=SEMANTICS, module=module, typed_actions=actions))
    table = tree('nodes', [ctor('nodes', 1, [x]) for x in nodes])
    body = ctor('image', 0, [table, {'U64': root}])
    definition('program', {'Function': dict(params=[], result={'Data': roles['image']}, body=body, recursive=None)},
               [roles[x] for x in ['words', 'fields', 'node', 'nodes', 'image']])
    store = Store.publish(directory, objects)
    return roles, store.bundle([roles['program']])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('core')
    parser.add_argument('actions')
    parser.add_argument('-o', '--output', required=True)
    args = parser.parse_args()
    output = Path(args.output)
    # Construction and validation finish before publishing pointers.
    roles, view = publish(read(Path(args.core)), read(Path(args.actions)), output / 'database')
    output.mkdir(parents=True, exist_ok=True)
    (output / 'roles.json').write_text(json.dumps(roles, indent=2) + '\n')
    (output / 'view.json').write_text(json.dumps(view, indent=2) + '\n')
    print(json.dumps(dict(status='produced', program=roles['program'], authority='code data only')))


if __name__ == '__main__':
    main()
