#!/usr/bin/env python3
"""Untrusted projection pipeline elimination and wrapping complement fusion."""
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
        f, g, d = var(unary, 'f'), var(unary, 'g'), var(s, 'd')
        first = op(ls, 'method:map', xs, f)
        postmap = lambda item: op(s, 'apply', g, item)
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                  base='Normalize', step='Normalize')}
        for name, left, right, projected in [
            ('discarded_left_projection', first, xs, bound(s, 0)),
            ('discarded_right_projection', xs, first, bound(s, 1)),
        ]:
            zipped = op(ls, 'method:zip', left, right, lam(s, lam(s, projected)))
            source = op(ls, 'method:map', zipped, g)
            target = op(ls, 'method:map', xs, g)
            result.append((name+'_'+t.lower(), law({'xs': ls, 'f': unary, 'g': unary},
                                                   source, target, proof)))
        if t != 'F32':
            complementary = op(ls, 'method:map', xs, lam(s, binary('-', d, x)))
            adding = lam(s, lam(s, binary('+', bound(s, 1), bound(s, 0))))
            zipped = op(ls, 'method:zip', complementary, xs, adding)
            source = op(ls, 'method:map', zipped, g)
            target = op(ls, 'method:map', xs, lam(s, postmap(d)))
            result.append(('complemented_zip_postmap_'+t.lower(), law(
                {'xs': ls, 'd': s, 'g': unary}, source, target, proof)))
    return result


def source_functions():
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        if name.startswith('discarded_left_'):
            body = 'xs.map(fn(x)=>x*x+seed).zip(xs,fn(a)=>fn(b)=>b).map(fn(x)=>x*k+seed)'
        elif name.startswith('discarded_right_'):
            body = 'xs.zip(xs.map(fn(x)=>x*x+seed),fn(a)=>fn(b)=>a).map(fn(x)=>choose(x<seed,x*k,x+seed))'
        else:
            body = 'xs.map(fn(x)=>seed-x).zip(xs,fn(a)=>fn(b)=>a+b).map(fn(x)=>x*k+seed)'
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
        scope='Pure projection zip/map stage elimination; wrapping complement conservation excludes F32. Output length preserved; no timing premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
