#!/usr/bin/env python3
"""Untrusted pure no-op write laws inspired by pinned Frontier diff/apply source.

These model word values, not JSON patches, paths, validation or object identity.
Every law requires the unchanged semantic checker; profitability is separate.
"""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import bound, lam, law, op, value, var

SOURCE_COMMIT = '2c72dbb4030e2695b682d3e49ec82d8c5c8ffec2'
SOURCE_URL = 'https://github.com/siliconjungle/-shapeshift-labs-frontier'


def equal(a, b):
    return op(value('Bool'), 'binary:==', a, b)


def cases_equality(a, b, premise):
    return {'Cases': dict(condition=equal(a, b), on_false='Normalize',
        on_true={'AssertEquality': dict(equality={'from': a, 'to': b},
            premise={'Hypothesis': premise}, body='Normalize')})}


def named_laws():
    result = []
    for t in ('U32', 'I32', 'U64'):
        s = value(t)
        x, k, n = var(s, 'x'), var(s, 'k'), var('Nat', 'n')
        guarded = op(s, 'call:choose', equal(x, k), k, x)
        result.append((f'guarded_same_value_write_{t.lower()}',
            law({'x': s, 'k': s}, guarded, x, cases_equality(x, k, 0))))
        # Restore the exact initial value at each write, including zero writes.
        repeat = op(s, 'call:repeat', n, x, lam(value('U32'), lam(s, x)))
        proof = {'Induction': dict(variable='n', names=['previous_count'],
                                  base='Normalize', step='Normalize')}
        result.append((f'repeat_restore_initial_{t.lower()}',
            law({'n': 'Nat', 'x': s}, repeat, x, proof)))
    for t in ('U32', 'U64'):
        s, ls = value(t), value({'List': t})
        xs, k = var(ls, 'xs'), var(s, 'k')
        head, accumulator = bound(s, 1), bound(s, 0)
        step = lam(s, lam(s, op(s, 'call:choose', equal(head, k), head, accumulator)))
        source = op(s, 'call:foldr', xs, k, step)
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
            base='Normalize', step=cases_equality(var(s, 'head'), k, 1))}
        result.append((f'fold_guarded_same_value_write_{t.lower()}',
            law({'xs': ls, 'k': s}, source, k, proof)))
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
        source=dict(repository=SOURCE_URL, commit=SOURCE_COMMIT),
        scope='Pure wrapping word no-op writes only; no JSON-patch or target-code proof; no measured profitability.')
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return store, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))


if __name__ == '__main__':
    main()
