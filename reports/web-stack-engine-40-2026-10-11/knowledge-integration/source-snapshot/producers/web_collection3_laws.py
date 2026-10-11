#!/usr/bin/env python3
"""Untrusted same-source mapped zip fusion; F32 operation order is unchanged."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import binary, bound, lam, law, op, value, var


def named_laws():
    result = []
    for t in ('U32', 'I32', 'U64', 'F32'):
        s, ls = value(t), value({'List': t})
        xs, k, d = var(ls, 'xs'), var(s, 'k'), var(s, 'd')
        item = bound(s, 0)
        mapping = lambda coefficient: op(ls, 'method:map', xs,
            lam(s, binary('*', item, coefficient)))
        plus = lam(s, lam(s, binary('+', bound(s, 1), bound(s, 0))))
        minus = lam(s, lam(s, binary('-', bound(s, 1), bound(s, 0))))
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                  base='Normalize', step='Normalize')}
        candidates = [
            ('mapped_left_zip', {'xs': ls, 'k': s},
             op(ls, 'method:zip', mapping(k), xs, plus),
             binary('+', binary('*', item, k), item)),
            ('mapped_right_zip', {'xs': ls, 'k': s},
             op(ls, 'method:zip', xs, mapping(k), minus),
             binary('-', item, binary('*', item, k))),
            ('mapped_both_zip', {'xs': ls, 'k': s, 'd': s},
             op(ls, 'method:zip', mapping(k), mapping(d), minus),
             binary('-', binary('*', item, k), binary('*', item, d))),
        ]
        for name, params, source, expression in candidates:
            target = op(ls, 'method:map', xs, lam(s, expression))
            result.append((name+'_'+t.lower(), law(params, source, target, proof)))
    return result


def source_functions():
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        if name.startswith('mapped_left_zip_'):
            body = 'xs.map(fn(x)=>x*k).zip(xs,fn(x)=>fn(y)=>x+y)'
        elif name.startswith('mapped_right_zip_'):
            body = 'xs.zip(xs.map(fn(x)=>x*k),fn(x)=>fn(y)=>x-y)'
        else:
            body = 'xs.map(fn(x)=>x*k).zip(xs.map(fn(x)=>x*seed),fn(x)=>fn(y)=>x-y)'
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
        scope='Same-source mapped zip to one map. Pure exact ordered element arithmetic; no profitability premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
