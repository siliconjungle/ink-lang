#!/usr/bin/env python3
"""Untrusted generic action-value carrier/encoder. No aggregate dependency.

Carrier definitions are admitted by Ink against the complete checked source.
The encoding is data correspondence, not an action interpreter or optimisation.
"""
import argparse
import json
import math
import struct
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, identity
from ink_knowledge.store import entry, read
from producers.source_syntax import publish as publish_syntax, construct, MATH

SEMANTICS = 'ink-action-values-v1'


def publish(module, actions, directory):
    syntax, view = publish_syntax(module, actions, directory)
    objects = list(view['objects'].values())
    roles = dict(schema=1, semantics=SEMANTICS)

    def datatype(role, ctors, deps):
        obj = entry('definition', MATH, {'declaration': {'Datatype': {
            'constructors': [dict(name=n, fields=f) for n, f in ctors]}}}, deps)
        roles[role] = identity(obj)
        objects.append(obj)

    words = {'Data': syntax['words']}
    datatype('node', [('Unit', []), ('Bool', ['Bool']), ('U32', ['U64']), ('U64', ['U64']),
             ('Integer', ['Bool', 'U64', words]), ('String', ['U64', words]),
             ('Id', ['U64', 'U64', 'U64']), ('Enum', ['U64', 'U64']),
             ('Record', ['U64', words]), ('None', []), ('Some', ['U64']),
             ('Ok', ['U64']), ('Err', ['U64']), ('List', [words])], [syntax['words']])
    datatype('nodes', [('Empty', []), ('Node', [{'Data': roles['node']}]),
                       ('Branch', ['U64', 'SelfType', 'SelfType'])], [roles['node']])
    datatype('value', [('Value', [{'Data': roles['nodes']}, 'U64'])], [roles['nodes']])
    store = Store.publish(directory, objects)
    return syntax, roles, store.bundle([syntax['program'], roles['value']])


def encode(syntax, roles, program, ty, value):
    """Independent encoder for canonical typed runtime JSON; bounded proof data."""
    remaining = 100_000

    def ctor(id, tag, args):
        nonlocal remaining
        remaining -= 1 + sum('U64' in x or 'Bool' in x for x in args)
        if remaining < 0:
            raise ValueError('action value node budget exceeded')
        return construct(id, tag, args)

    def v(tag, args):
        return ctor(roles['value'], tag, args)

    def tree(leaves, id, empty, leaf, branch):
        if not leaves:
            return ctor(id, empty, [])
        if len(leaves) == 1:
            return ctor(id, leaf, [leaves[0]]) if leaf is not None else leaves[0]
        h = len(leaves) // 2
        return ctor(id, branch, [{'U64': h}, tree(leaves[:h], id, empty, leaf, branch),
                                tree(leaves[h:], id, empty, leaf, branch)])

    def bytes_(raw):
        if len(raw) > 16_777_216:
            raise ValueError('action value byte budget exceeded')
        words = [ctor(syntax['words'], 1, [{'U64': int.from_bytes(raw[i:i+8], 'little')}])
                 for i in range(0, len(raw), 8)]
        return tree(words, syntax['words'], 0, None, 2)

    def go(ty, value, depth):
        if depth > 128:
            raise ValueError('action value depth budget exceeded')
        if ty == 'Unit' and value is None:
            return v(0, [])
        if ty == 'Bool' and type(value) is bool:
            return v(1, [{'Bool': value}])
        if ty in ('U32', 'U64') and type(value) is int and 0 <= value < 2**(32 if ty == 'U32' else 64):
            return v(2 if ty == 'U32' else 3, [{'U64': value}])
        if ty == 'I32' and type(value) is int and -(2**31) <= value < 2**31:
            return v(2, [{'U64': value & (2**32-1)}])
        if ty == 'F32':
            if isinstance(value, dict) and set(value) == {'F32Bits'}:
                bits = value['F32Bits']
                if type(bits) is not int or not 0 <= bits < 2**32:
                    raise ValueError('f32 bits width')
            elif type(value) in (int, float) and math.isfinite(value):
                try:
                    raw = struct.pack('<f', value)
                except (OverflowError, struct.error):
                    raise ValueError('finite f32 or F32Bits required') from None
                if not math.isfinite(struct.unpack('<f', raw)[0]):
                    raise ValueError('finite f32 or F32Bits required')
                bits = int.from_bytes(raw, 'little')
            else:
                raise ValueError('finite f32 or F32Bits required')
            return v(2, [{'U64': bits}])
        if isinstance(ty, dict) and set(ty) == {'Vector'}:
            inner, n = ty['Vector']
            if inner not in ('U32', 'I32', 'F32') or n not in (2, 3, 4):
                raise ValueError('invalid vector type')
            if not isinstance(value, list) or len(value) != n:
                raise ValueError('vector dimension mismatch')
            return v(13, [tree([go(inner, x, depth+1) for x in value], roles['value'], 14, 15, 16)])
        if ty == 'Int' and isinstance(value, dict) and set(value) == {'Int'}:
            x = int(value['Int']); size = (abs(x).bit_length() + 7) // 8
            if size > 16_777_216:
                raise ValueError('integer byte limit')
            raw = abs(x).to_bytes(size, 'little')
            return v(4, [{'Bool': x < 0}, {'U64': len(raw)}, bytes_(raw)])
        if ty == 'String' and isinstance(value, str):
            raw = value.encode('utf8')
            return v(5, [{'U64': len(raw)}, bytes_(raw)])
        if isinstance(ty, dict) and set(ty) == {'Named'}:
            n = ty['Named']
            if n in program['ids'] and isinstance(value, str) and len(value) == 32:
                x = int(value, 16)
                if not 0 <= x < 2**128:
                    raise ValueError('ID width')
                return v(6, [{'U64': sorted(program['ids']).index(n)}, {'U64': x >> 64}, {'U64': x & (2**64-1)}])
            if (n == 'ArithmeticError' or n in program['enums']) and isinstance(value, str):
                variants = ['Overflow'] if n == 'ArithmeticError' else program['enums'][n]
                variant = value.removeprefix(n + '.')
                if value == variant:
                    raise ValueError('enum nominal mismatch')
                index = len(program['enums']) if n == 'ArithmeticError' else sorted(program['enums']).index(n)
                return v(7, [{'U64': index}, {'U64': variants.index(variant)}])
            if n in program['records'] and isinstance(value, dict):
                fields = program['records'][n]
                if set(value) != {name for name, _ in fields}:
                    raise ValueError('record fields')
                leaves = [go(t, value[f], depth+1) for f, t in fields]
                return v(8, [{'U64': sorted(program['records']).index(n)}, tree(leaves, roles['value'], 14, 15, 16)])
        if isinstance(ty, dict) and set(ty) == {'Option'} and isinstance(value, dict):
            if set(value) == {'None'} and value['None'] is None:
                return v(9, [])
            if set(value) == {'Some'}:
                return v(10, [go(ty['Option'], value['Some'], depth+1)])
        if isinstance(ty, dict) and set(ty) == {'Result'} and isinstance(value, dict):
            for i, name in enumerate(['Ok', 'Err']):
                if set(value) == {name}:
                    return v(11+i, [go(ty['Result'][i], value[name], depth+1)])
        if isinstance(ty, dict) and set(ty) == {'List'} and isinstance(value, list):
            if len(value) > remaining:
                raise ValueError('action value node budget exceeded')
            return v(13, [tree([go(ty['List'], x, depth+1) for x in value], roles['value'], 14, 15, 16)])
        raise ValueError('value does not inhabit source type')

    # A temporary owned tree is flattened into a canonical postorder image.
    # Tree depth no longer becomes JSON transport depth. Child occurrences have
    # distinct nodes; the core rejects sharing, forward references and leftovers.
    nested = go(ty, value, 0)
    remaining = 100_000
    nodes = []

    def leaves(t):
        c = t['Construct']
        if c['constructor'] == 14:
            return []
        if c['constructor'] == 15:
            return c['arguments']
        return leaves(c['arguments'][1]) + leaves(c['arguments'][2])

    def refs(values):
        return tree([ctor(syntax['words'], 1, [{'U64': x}]) for x in values],
                    syntax['words'], 0, None, 2)

    def flatten(t):
        c = t['Construct']; tag = c['constructor']; args = list(c['arguments'])
        if tag in (10, 11, 12):
            args = [{'U64': flatten(args[0])}]
        elif tag in (8, 13):
            index = 1 if tag == 8 else 0
            args[index] = refs([flatten(v) for v in leaves(args[index])])
        n = ctor(roles['node'], tag, args)
        index = len(nodes)
        nodes.append(n)
        return index

    root = flatten(nested)
    table = tree(nodes, roles['nodes'], 0, 1, 2)
    return ctor(roles['value'], 0, [table, {'U64': root}])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('core')
    parser.add_argument('actions')
    parser.add_argument('-o', '--output', required=True)
    args = parser.parse_args()
    output = Path(args.output)
    syntax, roles, view = publish(read(Path(args.core)), read(Path(args.actions)), output / 'database')
    for name, value in [('syntax-roles', syntax), ('value-roles', roles), ('view', view)]:
        (output / (name + '.json')).write_text(json.dumps(value, indent=2) + '\n')
    print(json.dumps(dict(status='produced', value=roles['value'], authority='code and value data only')))


if __name__ == '__main__':
    main()
