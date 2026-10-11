#!/usr/bin/env python3
"""Untrusted wrapping-integer laws for eliminating per-element web compute work.

All objects require the unchanged Ink semantic checker. No claim about emitted
machine code or measured profitability follows from proof admission.
"""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import binary, bound, lam, law, op, value, var, word


def induction(variable, names):
    return {'Induction': dict(variable=variable, names=names, base='Normalize', step='Normalize')}


def square(x):
    return binary('*', x, x)


def cube(x):
    return binary('*', square(x), x)


def quadratic_difference(t, x, k):
    # (x+k)^2 - x^2 - 2*x*k = k^2 in every wrapping word ring.
    shifted = binary('+', x, k)
    cross = binary('*', binary('*', word(t, 2), x), k)
    return binary('-', binary('-', square(shifted), square(x)), cross)


def cubic_difference(t, x, k):
    # (x+k)^3 - x^3 - 3*x^2*k - 3*x*k^2 = k^3.
    shifted = binary('+', x, k)
    cross_a = binary('*', binary('*', binary('*', word(t, 3), x), x), k)
    cross_b = binary('*', binary('*', binary('*', word(t, 3), x), k), k)
    return binary('-', binary('-', binary('-', cube(shifted), cube(x)), cross_a), cross_b)


def named_laws():
    entries = []
    for t in ('U32', 'I32', 'U64'):
        s, ls = value(t), value({'List': t})
        n, x, k = var('Nat', 'n'), var(s, 'x'), var(s, 'k')
        count, a = op(s, 'nat.word', n), bound(s, 0)
        qdiff, cdiff = quadratic_difference(t, a, k), cubic_difference(t, a, k)
        bilinear = binary('-', binary('*', binary('+', a, k), binary('-', a, k)), square(a))
        partition = binary('+', binary('*', a, k), binary('*', a, binary('-', word(t, 1), k)))
        families = [
            ('repeat_quadratic_increment', binary('+', qdiff, a), binary('+', x, binary('*', count, square(k)))),
            ('repeat_cubic_increment', binary('+', cdiff, a), binary('+', x, binary('*', count, cube(k)))),
            ('repeat_bilinear_decrement', binary('+', bilinear, a), binary('-', x, binary('*', count, square(k)))),
            ('repeat_partition_invariant', partition, x),
            ('repeat_quadratic_invariant', binary('-', binary('+', qdiff, a), square(k)), x),
            ('repeat_cubic_invariant', binary('-', binary('+', cdiff, a), cube(k)), x),
        ]
        for name, body, result in families:
            source = op(s, 'call:repeat', n, x, lam(value('U32'), lam(s, body)))
            entries.append((name + '_' + t.lower(), law({'n': 'Nat', 'x': s, 'k': s}, source, result,
                induction('n', ['previous_count']))))
        xs = var(ls, 'xs')
        for name, body, result in [('map_quadratic_difference', qdiff, square(k)),
                                    ('map_cubic_difference', cdiff, cube(k))]:
            source = op(ls, 'method:map', xs, lam(s, body))
            target = op(ls, 'method:map', xs, lam(s, result))
            entries.append((name + '_' + t.lower(), law({'xs': ls, 'k': s}, source, target,
                induction('xs', ['head', 'tail']))))
    return entries


def publish(output):
    output = Path(output)
    named = named_laws()
    objects = [semantic_entry(candidate) for _, candidate in named]
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, objects, names)
    store.rebuild()
    (output / 'view.json').write_bytes(canonical(store.bundle(sorted(names.values()))) + b'\n')
    manifest = dict(schema=1, laws=len(objects), names=names, snapshot=store.snapshot_id,
                    scope='Wrapping U32/I32/U64 only; no F32 reassociation, target-code proof or profitability claim.')
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return store, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    args = parser.parse_args()
    _, manifest = publish(args.output_store)
    print(json.dumps(manifest))


if __name__ == '__main__':
    main()
