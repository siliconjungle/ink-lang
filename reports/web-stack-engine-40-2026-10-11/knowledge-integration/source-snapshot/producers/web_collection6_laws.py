#!/usr/bin/env python3
"""Untrusted square self-zip fusion and wrapping self-distance elimination."""
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
        xs, item = var(ls, 'xs'), bound(s, 0)
        product = lam(s, lam(s, binary('*', bound(s, 1), bound(s, 0))))
        zipped = op(ls, 'method:zip', xs, xs, product)
        square = binary('*', item, item)
        mapped = lambda body: op(ls, 'method:map', xs, lam(s, body))
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                  base='Normalize', step='Normalize')}
        result.append(('square_self_zip_'+t.lower(), law({'xs': ls}, zipped,
                                                       mapped(square), proof)))
        fs = arrow(s, s)
        f = var(fs, 'f')
        result.append(('square_self_zip_postmap_'+t.lower(), law({'xs': ls, 'f': fs},
            op(ls, 'method:map', zipped, f), mapped(op(s, 'apply', f, square)), proof)))
        if t != 'F32':
            difference = binary('-', bound(s, 1), bound(s, 0))
            distance = lam(s, lam(s, binary('*', difference, difference)))
            result.append(('zero_self_squared_distance_'+t.lower(), law({'xs': ls},
                op(ls, 'method:zip', xs, xs, distance), mapped(word(t, 0)), proof)))
    return result


def source_functions():
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        if name.startswith('square_self_zip_postmap_'):
            body = 'xs.zip(xs,fn(a)=>fn(b)=>a*b).map(fn(x)=>x*k+seed)'
        elif name.startswith('zero_self_squared_distance_'):
            body = 'xs.zip(xs,fn(a)=>fn(b)=>(a-b)*(a-b))'
        else:
            body = 'xs.zip(xs,fn(a)=>fn(b)=>a*b)'
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
        scope='Pure same-source square zip and arbitrary unary postmap fusion; wrapping self-distance zero excludes F32. No timing premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
