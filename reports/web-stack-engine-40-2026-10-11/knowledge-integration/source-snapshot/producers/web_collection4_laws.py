#!/usr/bin/env python3
"""Untrusted callback-generic same-source mapped zip fusion candidates."""
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
        unary = arrow(s, s)
        xs = var(ls, 'xs')
        f, h, k = var(unary, 'f'), var(unary, 'h'), var(s, 'k')
        item = bound(s, 0)
        apply = lambda callback, argument: op(s, 'apply', callback, argument)
        fx, hx = apply(f, item), apply(h, item)
        combine = lambda left, right: binary('-', left, binary('*', right, k))
        combining = lam(s, lam(s, combine(bound(s, 1), bound(s, 0))))
        mapped = lambda callback: op(ls, 'method:map', xs, callback)
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                  base='Normalize', step='Normalize')}
        candidates = [
            ('callback_left_zip', {'xs': ls, 'f': unary, 'k': s},
             op(ls, 'method:zip', mapped(f), xs, combining), combine(fx, item)),
            ('callback_right_zip', {'xs': ls, 'f': unary, 'k': s},
             op(ls, 'method:zip', xs, mapped(f), combining), combine(item, fx)),
            ('callback_both_zip', {'xs': ls, 'f': unary, 'h': unary, 'k': s},
             op(ls, 'method:zip', mapped(f), mapped(h), combining), combine(fx, hx)),
        ]
        for name, params, source, expression in candidates:
            target = op(ls, 'method:map', xs, lam(s, expression))
            result.append((name+'_'+t.lower(), law(params, source, target, proof)))
    return result


def source_functions():
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        if name.startswith('callback_left_zip_'):
            body = 'xs.map(fn(x)=>x*x+seed).zip(xs,fn(x)=>fn(y)=>x-y*k)'
        elif name.startswith('callback_right_zip_'):
            body = 'xs.zip(xs.map(fn(x)=>x*x+seed),fn(x)=>fn(y)=>x-y*k)'
        else:
            body = 'xs.map(fn(x)=>x*x+seed).zip(xs.map(fn(x)=>x+seed),fn(x)=>fn(y)=>x-y*k)'
        source = f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return {body};}}'
        result.append((name, source))
    return result


def publish(output):
    output = Path(output)
    named = named_laws()
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, [semantic_entry(candidate) for _, candidate in named], names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest = dict(schema=1, laws=len(named), snapshot=store.snapshot_id, names=names,
        scope='Arbitrary pure unary maps in same-source scaled subtraction zip; exact operation order preserved; no profitability premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
