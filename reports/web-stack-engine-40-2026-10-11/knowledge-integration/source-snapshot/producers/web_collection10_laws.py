#!/usr/bin/env python3
"""Untrusted ordered nested-zip and mapped-product pipeline fusion."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, binary, bound, lam, law, op, value, var


def named_laws():
    result = []
    for t in ('U32', 'I32', 'U64', 'F32'):
        s, ls = value(t), value({'List': t})
        xs, x = var(ls, 'xs'), bound(s, 0)
        unary = arrow(s, s)
        f, h, g = (var(unary, name) for name in ('f', 'h', 'g'))
        k, d = var(s, 'k'), var(s, 'd')
        a, b = bound(s, 1), bound(s, 0)
        postmap = lambda item: op(s, 'apply', g, item)
        weighted = lam(s, lam(s, binary('+', a, binary('*', b, k))))
        paired = op(ls, 'method:zip', xs, xs, weighted)
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                  base='Normalize', step='Normalize')}
        subtract_right = lam(s, lam(s, binary('-', a, binary('*', b, d))))
        source = op(ls, 'method:map', op(ls, 'method:zip', paired, xs, subtract_right), g)
        inner = binary('+', x, binary('*', x, k))
        target = op(ls, 'method:map', xs, lam(s, postmap(binary('-', inner, binary('*', x, d)))))
        result.append(('nested_left_weighted_zip_'+t.lower(), law(
            {'xs': ls, 'k': s, 'd': s, 'g': unary}, source, target, proof)))
        subtract_left = lam(s, lam(s, binary('-', binary('*', a, d), b)))
        source = op(ls, 'method:map', op(ls, 'method:zip', xs, paired, subtract_left), g)
        target = op(ls, 'method:map', xs, lam(s, postmap(binary('-', binary('*', x, d), inner))))
        result.append(('nested_right_weighted_zip_'+t.lower(), law(
            {'xs': ls, 'k': s, 'd': s, 'g': unary}, source, target, proof)))
        left, right = op(ls, 'method:map', xs, f), op(ls, 'method:map', xs, h)
        multiply = lam(s, lam(s, binary('*', a, b)))
        source = op(ls, 'method:map', op(ls, 'method:zip', left, right, multiply), g)
        product = binary('*', op(s, 'apply', f, x), op(s, 'apply', h, x))
        target = op(ls, 'method:map', xs, lam(s, postmap(product)))
        result.append(('mapped_pair_product_'+t.lower(), law(
            {'xs': ls, 'f': unary, 'h': unary, 'g': unary}, source, target, proof)))
    return result


def source_functions():
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        if name.startswith('nested_left_'):
            body = 'xs.zip(xs,fn(a)=>fn(b)=>a+b*k).zip(xs,fn(a)=>fn(b)=>a-b*seed).map(fn(x)=>x+seed)'
        elif name.startswith('nested_right_'):
            body = 'xs.zip(xs.zip(xs,fn(a)=>fn(b)=>a+b*k),fn(a)=>fn(b)=>a*seed-b).map(fn(x)=>choose(x<seed,x*k,x+seed))'
        else:
            body = 'xs.map(fn(x)=>x*k+seed).zip(xs.map(fn(x)=>x*k-seed),fn(a)=>fn(b)=>a*b).map(fn(x)=>x+seed)'
        result.append((name, f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return {body};}}'))
    return result


def publish(output):
    output = Path(output)
    named = named_laws()
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, [semantic_entry(candidate) for _, candidate in named], names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest = dict(schema=1, laws=len(named), snapshot=store.snapshot_id, names=names,
        scope='Pure ordered nested zip and mapped product fusion. F32 arithmetic expression grouping and rounding retained; pure callback invocation scheduling changes. No timing premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
