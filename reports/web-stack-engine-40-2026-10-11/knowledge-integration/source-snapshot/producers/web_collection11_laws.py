#!/usr/bin/env python3
"""Untrusted bounded-prefix zip fusion that skips unused concatenated suffixes."""
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
        xs, ys, x = var(ls, 'xs'), var(ls, 'ys'), bound(s, 0)
        unary = arrow(s, s)
        f, g = var(unary, 'f'), var(unary, 'g')
        k = var(s, 'k')
        a, b = bound(s, 1), bound(s, 0)
        postmap = lambda item: op(s, 'apply', g, item)
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                  base='Normalize', step='Normalize')}
        adding = lam(s, lam(s, binary('+', a, b)))
        padded = op(ls, 'method:concat', xs, ys)
        source = op(ls, 'method:map', op(ls, 'method:zip', xs, padded, adding), g)
        target = op(ls, 'method:map', xs, lam(s, postmap(binary('+', x, x))))
        result.append(('right_padded_prefix_zip_'+t.lower(), law(
            {'xs': ls, 'ys': ls, 'g': unary}, source, target, proof)))
        mapped = op(ls, 'method:map', xs, f)
        padded_mapped = op(ls, 'method:concat', mapped, ys)
        subtracting = lam(s, lam(s, binary('-', a, binary('*', b, k))))
        source = op(ls, 'method:map', op(ls, 'method:zip', xs, padded_mapped, subtracting), g)
        mapped_x = op(s, 'apply', f, x)
        target = op(ls, 'method:map', xs, lam(s, postmap(binary('-', x, binary('*', mapped_x, k)))))
        result.append(('right_padded_mapped_zip_'+t.lower(), law(
            {'xs': ls, 'ys': ls, 'f': unary, 'g': unary, 'k': s}, source, target, proof)))
        multiplying = lam(s, lam(s, binary('*', a, b)))
        source = op(ls, 'method:map', op(ls, 'method:zip', padded, mapped, multiplying), g)
        target = op(ls, 'method:map', xs, lam(s, postmap(binary('*', x, mapped_x))))
        result.append(('left_padded_mapped_product_'+t.lower(), law(
            {'xs': ls, 'ys': ls, 'f': unary, 'g': unary}, source, target, proof)))
    return result


def source_functions():
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        if name.startswith('right_padded_prefix_'):
            body = 'xs.zip(xs.concat(xs),fn(a)=>fn(b)=>a+b).map(fn(x)=>choose(x<seed,x*k,x+seed))'
        elif name.startswith('right_padded_mapped_'):
            body = 'xs.zip(xs.map(fn(x)=>x*x+seed).concat(xs),fn(a)=>fn(b)=>a-b*k).map(fn(x)=>x+seed)'
        else:
            body = 'xs.concat(xs).zip(xs.map(fn(x)=>x*k+seed),fn(a)=>fn(b)=>a*b).map(fn(x)=>x+seed)'
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
        scope='Pure prefix-bounded zip fusion with arbitrary unused concatenated suffixes; F32 primitive arithmetic grouping retained. Pure callback invocation scheduling changes. No timing premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
