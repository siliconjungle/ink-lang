#!/usr/bin/env python3
"""Untrusted fourth/fifth finite-difference laws in wrapping integer rings."""
import argparse
import json
from math import comb
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import binary, bound, lam, law, op, value, var, word


def product(factors):
    result = factors[0]
    for factor in factors[1:]:
        result = binary('*', result, factor)
    return result


def power(x, degree):
    return product([x] * degree)


def difference(t, x, k, degree):
    result = binary('-', power(binary('+', x, k), degree), power(x, degree))
    for i in range(1, degree):
        cross = product([word(t, comb(degree, i))] + [x] * (degree-i) + [k] * i)
        result = binary('-', result, cross)
    return result


def induction(variable, names):
    return {'Induction': dict(variable=variable, names=names, base='Normalize', step='Normalize')}


def named_laws():
    entries = []
    for t in ('U32', 'I32', 'U64'):
        s, ls = value(t), value({'List': t})
        n, x, k = var('Nat', 'n'), var(s, 'x'), var(s, 'k')
        a, count = bound(s, 0), op(s, 'nat.word', n)
        for degree, label in ((4, 'quartic'), (5, 'quintic')):
            delta, step = difference(t, a, k, degree), power(k, degree)
            for suffix, body, target in (
                ('increment', binary('+', delta, a), binary('+', x, binary('*', count, step))),
                ('invariant', binary('-', binary('+', delta, a), step), x),
            ):
                source = op(s, 'call:repeat', n, x, lam(value('U32'), lam(s, body)))
                candidate = law({'n': 'Nat', 'x': s, 'k': s}, source, target,
                                induction('n', ['previous_count']))
                entries.append((f'repeat_{label}_{suffix}_{t.lower()}', candidate))
            xs = var(ls, 'xs')
            source = op(ls, 'method:map', xs, lam(s, delta))
            target = op(ls, 'method:map', xs, lam(s, step))
            entries.append((f'map_{label}_difference_{t.lower()}',
                            law({'xs': ls, 'k': s}, source, target,
                                induction('xs', ['head', 'tail']))))
    return entries


def source_difference(x, degree):
    result = '*'.join([f'({x}+k)'] * degree) + '-' + '*'.join([x] * degree)
    for i in range(1, degree):
        result += '-' + '*'.join([str(comb(degree, i))] + [x] * (degree-i) + ['k'] * i)
    return result


def representative_source(repetitions=1024, all_families=False):
    """Source AST association matches the independently checked law patterns."""
    lines = ['module Compute2;']
    for degree, label in ((4, 'quartic'), (5, 'quintic')):
        delta, step = source_difference('a', degree), '*'.join(['k'] * degree)
        lines.append(f'fn {label}_repeat(xs:List<u32>,seed:u32,k:u32)->List<u32>{{return xs.map(fn(x)=>repeat({repetitions},x,fn(i)=>fn(a)=>{delta}+a));}}')
        if all_families:
            lines.append(f'fn {label}_invariant(xs:List<u32>,seed:u32,k:u32)->List<u32>{{return xs.map(fn(x)=>repeat({repetitions},x,fn(i)=>fn(a)=>{delta}+a-{step}));}}')
        if degree == 4 or all_families:
            lines.append(f'fn {label}_map(xs:List<u32>,seed:u32,k:u32)->List<u32>{{return xs.map(fn(x)=>{source_difference("x", degree)});}}')
    return '\n'.join(lines) + '\n'


def publish(output):
    output = Path(output)
    named = named_laws()
    objects = [semantic_entry(candidate) for _, candidate in named]
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, objects, names)
    store.rebuild()
    (output / 'view.json').write_bytes(canonical(store.bundle(sorted(names.values()))) + b'\n')
    manifest = dict(schema=1, laws=len(objects), names=names, snapshot=store.snapshot_id,
                    scope='Wrapping U32/I32/U64; no F32 changes, new checking rules, or profitability assertion.')
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return store, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    parser.add_argument('--examples', type=Path)
    parser.add_argument('--repeat-count', type=int, default=1024)
    args = parser.parse_args()
    _, manifest = publish(args.output_store)
    if args.examples:
        args.examples.write_text(representative_source(args.repeat_count))
    print(json.dumps(manifest))


if __name__ == '__main__':
    main()
