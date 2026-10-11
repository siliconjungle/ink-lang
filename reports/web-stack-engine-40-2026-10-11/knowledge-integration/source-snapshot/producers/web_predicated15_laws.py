#!/usr/bin/env python3
"""Untrusted generic predicated wrapping sums; no runtime input conditions."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, bound, lam, law, op, value, var, word


def named_laws():
    result = []
    for t in ('U32', 'I32', 'U64'):
        s, ls, boolean = value(t), value({'List': t}), value('Bool')
        unary, predicate = arrow(s, s), arrow(s, boolean)
        xs, f, p = var(ls, 'xs'), var(unary, 'f'), var(predicate, 'p')
        item = bound(s, 0)
        apply = lambda callback, x: op(callback['sort']['Arrow'][1], 'apply', callback, x)
        choose = lambda test, yes: op(s, 'call:choose', test, yes, word(t, 0))
        mapped = lambda sequence, callback: op(ls, 'method:map', sequence, callback)
        filtered = lambda sequence: op(ls, 'method:filter', sequence, p)
        summed = lambda sequence: op(s, 'call:sum', sequence)
        shared = apply(lam(s, choose(apply(p, item), item)), apply(f, item))
        families = [
            ('filtered_predicated_sum', {'p': predicate}, filtered(xs),
             lam(s, choose(apply(p, item), item)), apply(p, var(s, 'head'))),
            ('mapped_filtered_predicated_sum', {'f': unary, 'p': predicate}, filtered(mapped(xs, f)),
             lam(s, shared), apply(p, apply(f, var(s, 'head')))),
            ('filtered_mapped_predicated_sum', {'f': unary, 'p': predicate}, mapped(filtered(xs), f),
             lam(s, choose(apply(p, item), apply(f, item))), apply(p, var(s, 'head'))),
        ]
        for name, callbacks, sequence, callback, condition in families:
            proof = {'Induction': dict(variable='xs', names=['head', 'tail'], base='Normalize',
                step={'Cases': dict(condition=condition, on_false='Normalize', on_true='Normalize')})}
            result.append((name+'_'+t.lower(), law(dict(xs=ls, **callbacks),
                summed(sequence), summed(mapped(xs, callback)), proof)))
    return result


def source_functions(held_out=False):
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        mapper = 'fn(x)=>choose(x<seed,seed-x,x-seed)' if held_out else 'fn(x)=>x*3+k'
        predicate = 'fn(x)=>x>k' if held_out else 'fn(x)=>x<seed'
        if name.startswith('mapped_filtered_'):
            sequence = f'xs.map({mapper}).filter({predicate})'
        elif name.startswith('filtered_mapped_'):
            sequence = f'xs.filter({predicate}).map({mapper})'
        else:
            sequence = f'xs.filter({predicate})'
        result.append((name, f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{t}'+'{return sum('+sequence+');}'))
    return result


def publish(output):
    output = Path(output)
    named = named_laws()
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, [semantic_entry(candidate) for _, candidate in named], names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest = dict(schema=1, laws=len(named), snapshot=store.snapshot_id, names=names,
        scope='Arbitrary pure total unary mappers/predicates; wrapping integer sums only. Rejected contributions become zero; mapped predicate/value shared once. No runtime guards or profitability premise. F32 excluded.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
