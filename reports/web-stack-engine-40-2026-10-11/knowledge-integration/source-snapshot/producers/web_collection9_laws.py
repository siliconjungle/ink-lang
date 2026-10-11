#!/usr/bin/env python3
"""Untrusted paired cancellation and padded-prefix collection elimination."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, binary, bound, lam, law, op, value, var, word


def named_laws():
    result = []
    for t in ('U32', 'I32', 'U64', 'F32'):
        s, ls = value(t), value({'List': t})
        xs, ys, x = var(ls, 'xs'), var(ls, 'ys'), bound(s, 0)
        unary = arrow(s, s)
        f, g, k, d = var(unary, 'f'), var(unary, 'g'), var(s, 'k'), var(s, 'd')
        postmap = lambda item: op(s, 'apply', g, item)
        adding = lam(s, lam(s, binary('+', bound(s, 1), bound(s, 0))))
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                  base='Normalize', step='Normalize')}
        if t != 'F32':
            mapped = op(ls, 'method:map', xs, f)
            subtracting = lam(s, lam(s, binary('-', bound(s, 1), bound(s, 0))))
            source = op(ls, 'method:map', op(ls, 'method:zip', mapped, mapped, subtracting), g)
            target = op(ls, 'method:map', xs, lam(s, postmap(word(t, 0))))
            result.append(('identical_mapped_difference_'+t.lower(), law(
                {'xs': ls, 'f': unary, 'g': unary}, source, target, proof)))
            product = binary('*', x, k)
            scaled = op(ls, 'method:map', xs, lam(s, product))
            complement = op(ls, 'method:map', xs, lam(s, binary('-', d, product)))
            source = op(ls, 'method:map', op(ls, 'method:zip', scaled, complement, adding), g)
            target = op(ls, 'method:map', xs, lam(s, postmap(d)))
            result.append(('paired_scaled_complement_'+t.lower(), law(
                {'xs': ls, 'k': s, 'd': s, 'g': unary}, source, target, proof)))
        padded = op(ls, 'method:concat', xs, ys)
        source = op(ls, 'method:map', op(ls, 'method:zip', padded, xs, adding), g)
        target = op(ls, 'method:map', xs, lam(s, postmap(binary('+', x, x))))
        result.append(('padded_prefix_zip_'+t.lower(), law(
            {'xs': ls, 'ys': ls, 'g': unary}, source, target, proof)))
    return result


def source_functions():
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        if name.startswith('identical_'):
            body = 'xs.map(fn(x)=>x*k+seed).zip(xs.map(fn(x)=>x*k+seed),fn(a)=>fn(b)=>a-b).map(fn(x)=>x+seed)'
        elif name.startswith('paired_'):
            body = 'xs.map(fn(x)=>x*k).zip(xs.map(fn(x)=>seed-x*k),fn(a)=>fn(b)=>a+b).map(fn(x)=>x+seed)'
        else:
            body = 'xs.concat(xs).zip(xs,fn(a)=>fn(b)=>a+b).map(fn(x)=>choose(x<seed,x*k,x+seed))'
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
        scope='Pure paired wrapping cancellation and exact padded-prefix truncation; F32 included only for ordered prefix addition/postmap. No timing premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
