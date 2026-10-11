#!/usr/bin/env python3
"""Untrusted conditional mapped-zip fusion with skipped pure callback work."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, bound, lam, law, op, value, var


def named_laws():
    result = []
    for t in ('U32', 'I32', 'U64', 'F32'):
        s, ls = value(t), value({'List': t})
        xs, x = var(ls, 'xs'), bound(s, 0)
        unary = arrow(s, s)
        f, h, g = (var(unary, name) for name in ('f', 'h', 'g'))
        d, k = var(s, 'd'), var(s, 'k')
        a, b = bound(s, 1), bound(s, 0)
        choose = lambda c, yes, no: op(s, 'call:choose', c, yes, no)
        less = lambda left, right: op(value('Bool'), 'binary:<', left, right)
        apply = lambda callback, argument: op(s, 'apply', callback, argument)
        mapped = lambda callback: op(ls, 'method:map', xs, callback)
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                  base='Normalize', step='Normalize')}
        candidates = [
            ('gated_left_mapped_zip', {'xs': ls, 'f': unary, 'g': unary, 'd': s},
             mapped(f), xs, choose(less(b, d), a, b),
             choose(less(x, d), apply(f, x), x)),
            ('gated_right_mapped_zip', {'xs': ls, 'f': unary, 'g': unary, 'd': s},
             xs, mapped(f), choose(less(a, d), a, b),
             choose(less(x, d), x, apply(f, x))),
            ('mode_selected_mapped_zip', {'xs': ls, 'f': unary, 'h': unary, 'g': unary, 'd': s, 'k': s},
             mapped(f), mapped(h), choose(less(d, k), a, b),
             choose(less(d, k), apply(f, x), apply(h, x))),
        ]
        for name, params, left, right, combining, fused in candidates:
            source = op(ls, 'method:map', op(ls, 'method:zip', left, right, lam(s, lam(s, combining))), g)
            target = op(ls, 'method:map', xs, lam(s, apply(g, fused)))
            result.append((name+'_'+t.lower(), law(params, source, target, proof)))
    return result


def source_functions():
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        if name.startswith('gated_left_'):
            body = 'xs.map(fn(x)=>x*x+seed).zip(xs,fn(a)=>fn(b)=>choose(b<seed,a,b)).map(fn(x)=>x*k+seed)'
        elif name.startswith('gated_right_'):
            body = 'xs.zip(xs.map(fn(x)=>x*x+seed),fn(a)=>fn(b)=>choose(a<seed,a,b)).map(fn(x)=>x*k+seed)'
        else:
            body = 'xs.map(fn(x)=>x*x+seed).zip(xs.map(fn(x)=>x*k-seed),fn(a)=>fn(b)=>choose(seed<k,a,b)).map(fn(x)=>x+seed)'
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
        scope='Pure total value semantics: conditional mapped zip/postmap fusion. Unselected callbacks may be skipped; global invocation scheduling changes. Numeric predicates and F32 primitive expression grouping retained. No timing premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
