#!/usr/bin/env python3
"""Untrusted composition laws for the general ordered concat primitive.

Append computation belongs to the language. These equalities belong to the
database and require checking; cost and target suitability remain separate.
"""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, binary, lam, law, op, term, value, var


def induction(variable):
    return {'Induction': dict(variable=variable, names=['head', 'tail'],
                             base='Normalize', step='Normalize')}


def named_laws():
    result = []
    for t in ('U32', 'I32', 'U64', 'F32', 'Bool'):
        s, ls = value(t), value({'List': t})
        xs, ys, zs = [var(ls, name) for name in ('xs', 'ys', 'zs')]
        concat = lambda a, b: op(ls, 'method:concat', a, b)
        result.append(('concat_associative_' + t.lower(), law(
            {'xs': ls, 'ys': ls, 'zs': ls}, concat(concat(xs, ys), zs),
            concat(xs, concat(ys, zs)), induction('xs'))))
        false_filter = op(ls, 'method:filter', ys,
                          lam(s, term(value('Bool'), {'Bool': False})))
        result.append(('concat_empty_left_' + t.lower(), law(
            {'xs': ls, 'ys': ls}, concat(false_filter, xs), xs, induction('ys'))))
        middle = concat(xs, term(ls, 'Nil'))
        result.append(('concat_empty_right_' + t.lower(), law(
            {'xs': ls, 'ys': ls}, concat(xs, false_filter), xs,
            {'Trans': dict(middle=middle, left=induction('ys'), right=induction('xs'))})))
        count = lambda a: op(value('U64'), 'call:count', a)
        result.append(('concat_count_' + t.lower(), law(
            {'xs': ls, 'ys': ls}, count(concat(xs, ys)),
            binary('+', count(xs), count(ys)), induction('xs'))))
        f_sort = arrow(s, s)
        f = var(f_sort, 'f')
        mapped = lambda a: op(ls, 'method:map', a, f)
        result.append(('concat_map_fusion_' + t.lower(), law(
            {'xs': ls, 'ys': ls, 'f': f_sort}, concat(mapped(xs), mapped(ys)),
            mapped(concat(xs, ys)), induction('xs'))))
        if t in ('U32', 'I32', 'U64'):
            summed = lambda a: op(s, 'call:sum', a)
            result.append(('concat_sum_' + t.lower(), law(
                {'xs': ls, 'ys': ls}, summed(concat(xs, ys)),
                binary('+', summed(xs), summed(ys)), induction('xs'))))
        if t != 'Bool':
            fold_sort = arrow(s, arrow(s, s))
            g, z = var(fold_sort, 'g'), var(s, 'z')
            folded = lambda a, initial: op(s, 'call:foldr', a, initial, g)
            result.append(('concat_ordered_fold_' + t.lower(), law(
                {'xs': ls, 'ys': ls, 'z': s, 'g': fold_sort},
                folded(concat(xs, ys), z), folded(xs, folded(ys, z)), induction('xs'))))
    return result


def publish(output):
    output = Path(output)
    named = named_laws()
    objects = [semantic_entry(candidate) for _, candidate in named]
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, objects, names)
    store.rebuild()
    (output / 'view.json').write_bytes(canonical(store.bundle(sorted(names.values()))) + b'\n')
    manifest = dict(schema=1, laws=len(objects), snapshot=store.snapshot_id, names=names,
                    scope='Pure ordered sequences. F32 operation order is preserved; no F32 sum reassociation. No target profitability claim.')
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
