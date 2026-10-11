#!/usr/bin/env python3
"""Untrusted filter/map fusion for arbitrary pure total right-fold reducers.

Reducers need neither associativity nor an arithmetic shape. Accepted elements
retain their right-fold order, including F32 primitive grouping. Generic callback
applications may require separately checked known-callback specialization before
source reification; admission alone does not establish deployability or speed.
"""
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
        s, ls, boolean = value(t), value({'List': t}), value('Bool')
        fs, ps, gs = arrow(s, s), arrow(s, boolean), arrow(s, arrow(s, s))
        xs, z = var(ls, 'xs'), var(s, 'z')
        f, p, g = var(fs, 'f'), var(ps, 'p'), var(gs, 'g')
        apply = lambda callback, arg: op(callback['sort']['Arrow'][1], 'apply', callback, arg)
        reduce = lambda x, a: apply(apply(g, x), a)
        choose = lambda c, yes, no: op(s, 'call:choose', c, yes, no)
        mapped = lambda sequence: op(ls, 'method:map', sequence, f)
        filtered = lambda sequence: op(ls, 'method:filter', sequence, p)
        folded = lambda sequence, reducer: op(s, 'call:foldr', sequence, z, reducer)
        x, a = bound(s, 1), bound(s, 0)
        y, outer_a = bound(s, 0), bound(s, 1)
        # Share the mapped value in the semantic target. A later beta certificate
        # can inline it; that certificate's operational sharing must be measured.
        shared = apply(lam(s, choose(apply(p, y), reduce(y, outer_a), outer_a)), apply(f, x))
        families = [
            ('filtered_arbitrary_fold', {'p': ps}, filtered(xs),
             choose(apply(p, x), reduce(x, a), a), apply(p, var(s, 'head'))),
            ('mapped_filtered_arbitrary_fold', {'f': fs, 'p': ps}, filtered(mapped(xs)),
             shared, apply(p, apply(f, var(s, 'head')))),
            ('filtered_mapped_arbitrary_fold', {'f': fs, 'p': ps}, mapped(filtered(xs)),
             choose(apply(p, x), reduce(apply(f, x), a), a), apply(p, var(s, 'head'))),
        ]
        for name, callbacks, sequence, body, condition in families:
            proof = {'Induction': dict(variable='xs', names=['head', 'tail'], base='Normalize',
                step={'Cases': dict(condition=condition, on_false='Normalize', on_true='Normalize')})}
            params = dict(xs=ls, z=s, g=gs, **callbacks)
            result.append((name+'_'+t.lower(), law(params, folded(sequence, g),
                                                   folded(xs, lam(s, lam(s, body))), proof)))
    return result


def source_functions(held_out=False):
    """Two distinct callback recipes, neither reducer covered by affine folds."""
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        mapper = 'fn(x)=>choose(x<seed,seed-x,x-seed)' if held_out else 'fn(x)=>x*3+k'
        predicate = 'fn(x)=>x>k' if held_out else 'fn(x)=>x<seed'
        reducer = ('fn(x)=>fn(a)=>choose(a<seed,x-a,x+a)' if held_out else
                   'fn(x)=>fn(a)=>choose(x<k,x+a*k,x-a)')
        sequence = 'xs'
        if name.startswith('mapped_filtered_'):
            sequence += '.map('+mapper+').filter('+predicate+')'
        elif name.startswith('filtered_mapped_'):
            sequence += '.filter('+predicate+').map('+mapper+')'
        else:
            sequence += '.filter('+predicate+')'
        result.append((name, f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{t}'
                       +'{return foldr('+sequence+',seed,'+reducer+');}'))
    return result


def publish(output):
    output = Path(output)
    named = named_laws()
    names = {n: identity(semantic_entry(v)) for n, v in named}
    store = Store.publish(output, [semantic_entry(v) for _, v in named], names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest = dict(schema=1, laws=len(named), names=names, snapshot=store.snapshot_id,
        scope='Arbitrary pure total same-type curried reducers, unary mappers and predicates. Exact accepted-element right-fold order. No F32 algebra or profitability assertion.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    print(json.dumps(publish(parser.parse_args().output_store)[1]))
