#!/usr/bin/env python3
"""Untrusted self-zip pipeline fusion and conserved weighted word arithmetic."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, binary, bound, lam, law, op, value, var


def induction():
    return {'Induction': dict(variable='xs', names=['head', 'tail'],
                             base='Normalize', step='Normalize')}


def named_laws():
    entries = []
    for t in ('U32', 'I32', 'U64', 'F32'):
        s, ls = value(t), value({'List': t})
        xs, x = var(ls, 'xs'), bound(s, 0)
        fs = arrow(s, s)
        f, k = var(fs, 'f'), var(s, 'k')
        def apply(callback, argument):
            return op(callback['sort']['Arrow'][1], 'apply', callback, argument)
        def combine(a, b):
            return binary('-', a, binary('*', b, k))
        def target(body):
            return op(ls, 'method:map', xs, lam(s, body))
        zipper = lam(s, lam(s, combine(bound(s,1), bound(s,0))))
        entries.append((f'weighted_difference_self_zip_{t.lower()}', law(
            {'xs': ls, 'k': s}, op(ls, 'method:zip', xs, xs, zipper),
            target(combine(x,x)), induction())))
        entries.append((f'weighted_self_zip_then_map_{t.lower()}', law(
            {'xs': ls, 'f': fs, 'k': s},
            op(ls, 'method:map', op(ls, 'method:zip', xs, xs, zipper), f),
            target(apply(f,combine(x,x))), induction())))
        if t != 'F32':
            a, d = var(s, 'x'), var(s, 'd')
            total = binary('+', binary('*', a,k), binary('*', binary('-',d,a),k))
            entries.append((f'conserved_weighted_total_{t.lower()}', law(
                {'x': s, 'd': s, 'k': s}, total, binary('*',d,k))))
    return entries


def representative_source(t='u32'):
    return f'''module Compute4;
fn generic_self_zip(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.zip(xs,fn(a)=>fn(b)=>a-b*k);}}
fn zip_then_map(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.zip(xs,fn(a)=>fn(b)=>a-b*k).map(fn(x)=>x+seed);}}
''' + ('' if t == 'f32' else f'''fn conserved_total(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>x*k+(seed-x)*k);}}
''')


def publish(output):
    output = Path(output)
    named = named_laws()
    objects = [semantic_entry(candidate) for _, candidate in named]
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, objects, names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest = dict(schema=1, laws=len(objects), names=names, snapshot=store.snapshot_id,
                    scope='Pure same-source map/zip fusion preserves per-element expression grouping; wrapping scalar conservation laws exclude F32. No profitability assertion.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    parser.add_argument('--examples', type=Path)
    args = parser.parse_args()
    _, manifest = publish(args.output_store)
    if args.examples:
        args.examples.write_text(representative_source())
    print(json.dumps(manifest))


if __name__ == '__main__':
    main()
