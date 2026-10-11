#!/usr/bin/env python3
"""Untrusted pure same-source selecting zip and postmap fusion candidates."""
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
        f_sort = arrow(s, s)
        f, k, d = var(f_sort, 'f'), var(s, 'k'), var(s, 'd')
        a, b = bound(s, 1), bound(s, 0)
        choose = lambda condition, yes, no: op(s, 'call:choose', condition, yes, no)
        compare = lambda operator, left, right: op(value('Bool'), 'binary:'+operator, left, right)
        candidates = [
            ('minimum_zip_postmap', {'xs': ls, 'f': f_sort},
             choose(compare('<', a, b), a, b), x),
            ('maximum_zip_postmap', {'xs': ls, 'f': f_sort},
             choose(compare('<', a, b), b, a), x),
            ('equality_zip_postmap', {'xs': ls, 'f': f_sort, 'k': s, 'd': s},
             choose(compare('==', a, b), binary('*', a, k), binary('*', b, d)),
             choose(compare('==', x, x), binary('*', x, k), binary('*', x, d))),
        ]
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                  base='Normalize', step='Normalize')}
        for name, params, combining, fused in candidates:
            zipped = op(ls, 'method:zip', xs, xs, lam(s, lam(s, combining)))
            source = op(ls, 'method:map', zipped, f)
            target = op(ls, 'method:map', xs, lam(s, op(s, 'apply', f, fused)))
            result.append((name+'_'+t.lower(), law(params, source, target, proof)))
    return result


def source_functions():
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        if name.startswith('minimum_'):
            body = 'xs.zip(xs,fn(a)=>fn(b)=>choose(a<b,a,b)).map(fn(x)=>x*k+seed)'
        elif name.startswith('maximum_'):
            body = 'xs.zip(xs,fn(a)=>fn(b)=>choose(a<b,b,a)).map(fn(x)=>choose(x<seed,x*k,x+seed))'
        else:
            body = 'xs.zip(xs,fn(a)=>fn(b)=>choose(a==b,a*k,b*seed)).map(fn(x)=>x+seed)'
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
        scope='Pure same-source selecting zip plus arbitrary unary postmap; exact F32 values and equality predicate preserved; no timing premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
