#!/usr/bin/env python3
"""Proved count erasure and same-source zip fusion; no core authority."""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from semantic_laws import value, arrow, var, bound, op, lam, law

TYPES = ('U32', 'U64', 'I32', 'F32', 'Bool')


def examples():
    result = {}
    induction = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                   base='Normalize', step='Normalize')}
    for source in TYPES:
        s = value(source)
        ls = value({'List': source})
        xs = var(ls, 'xs')
        for target in TYPES:
            t = value(target)
            lt = value({'List': target})
            mapper = arrow(s, t)
            f = var(mapper, 'f')
            result[f'shared/count-map-{source.lower()}-{target.lower()}'] = law(
                {'xs': ls, 'f': mapper},
                op(value('U64'), 'call:count', op(lt, 'method:map', xs, f)),
                op(value('U64'), 'call:count', xs), induction)
        for which, index in [('first', 1), ('second', 0)]:
            reducer = lam(s, lam(s, bound(s, index)))
            result[f'shared/zip-self-{which}-{source.lower()}'] = law(
                {'xs': ls}, op(ls, 'method:zip', xs, xs, reducer), xs, induction)
        if source == 'Bool':
            continue
        mapper = arrow(s, s)
        f, g = var(mapper, 'f'), var(mapper, 'g')
        left_map, right_map = op(ls, 'method:map', xs, f), op(ls, 'method:map', xs, g)
        x = bound(s, 0)
        for name, operator in [('sum', '+'), ('difference', '-'), ('product', '*')]:
            reducer = lam(s, lam(s, op(s, 'binary:' + operator, bound(s, 1), bound(s, 0))))
            for shape, left, right, a, b, params in [
                ('raw', xs, xs, x, x, {'xs': ls}),
                ('left-map', left_map, xs, op(s, 'apply', f, x), x, {'xs': ls, 'f': mapper}),
                ('right-map', xs, right_map, x, op(s, 'apply', g, x), {'xs': ls, 'g': mapper}),
                ('both-map', left_map, right_map, op(s, 'apply', f, x), op(s, 'apply', g, x),
                 {'xs': ls, 'f': mapper, 'g': mapper}),
            ]:
                result[f'shared/zip-{shape}-{name}-{source.lower()}'] = law(
                    params, op(ls, 'method:zip', left, right, reducer),
                    op(ls, 'method:map', xs, lam(s, op(s, 'binary:' + operator, a, b))), induction)
    return result


def publish(output):
    output = Path(output)
    previous = Store(output) if (output / 'store/snapshot.json').exists() else None
    objects = [previous.object(i) for i in previous.members()] if previous else []
    names = json.loads((output / 'store/names.json').read_text()) if previous else {}
    roots = json.loads((output / 'store/rewrite-view.json').read_text())['roots'] if previous else []
    new_roots = []
    for name, proof in examples().items():
        entry = semantic_entry(proof)
        ident = identity(entry)
        objects.append(entry)
        names['rewrite/' + name] = ident
        roots.append(ident)
        new_roots.append(ident)
    store = Store.publish(output, objects, names)
    store.rebuild()
    for path in sorted((output / 'store').glob('*-view.json')):
        path.write_bytes(canonical(store.bundle(json.loads(path.read_text())['roots'])) + b'\n')
    (output / 'store/rewrite-view.json').write_bytes(canonical(store.bundle(roots)) + b'\n')
    (output / 'store/shared-sequence-view.json').write_bytes(canonical(store.bundle(new_roots)) + b'\n')
    return store


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    args = parser.parse_args()
    store = publish(args.output_store)
    print(json.dumps({'laws': len(examples()), 'snapshot': store.snapshot_id}))
