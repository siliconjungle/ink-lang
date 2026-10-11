#!/usr/bin/env python3
"""Untrusted generic map/filter reduction fusion, checked by the frozen core.

Unary mappers and predicates are arbitrary pure total callbacks. Ordered affine
folds preserve every primitive operation and accepted-element right-fold order.
Ordinary sum fusion is limited to wrapping integers; F32 sum is a left fold.
"""
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
        s, ls, boolean = value(t), value({'List': t}), value('Bool')
        unary, predicate = arrow(s, s), arrow(s, boolean)
        xs, f, p = var(ls, 'xs'), var(unary, 'f'), var(predicate, 'p')
        z, k = var(s, 'z'), var(s, 'k')
        item, acc = bound(s, 1), bound(s, 0)
        apply = lambda callback, argument: op(callback['sort']['Arrow'][1], 'apply', callback, argument)
        mapped = op(ls, 'method:map', xs, f)
        filtered = lambda sequence: op(ls, 'method:filter', sequence, p)
        choose = lambda condition, yes, no: op(s, 'call:choose', condition, yes, no)
        for consumer in ('ordered_affine_fold', 'sum'):
            if consumer == 'sum' and t == 'F32':
                continue
            initial = z if consumer == 'ordered_affine_fold' else word(t, 0)
            combine = lambda x, a: binary('+', x, binary('*', a, k)) if consumer == 'ordered_affine_fold' else binary('+', x, a)
            folding = lam(s, lam(s, combine(item, acc)))
            folded = lambda sequence, reducer: op(s, 'call:foldr', sequence, initial, reducer)
            source_consumer = lambda sequence: folded(sequence, folding) if consumer == 'ordered_affine_fold' else op(s, 'call:sum', sequence)
            base_params = {'xs': ls}
            if consumer == 'ordered_affine_fold':
                base_params.update(z=s, k=s)
            shared, shared_acc = bound(s, 0), bound(s, 1)
            shared_guard = apply(lam(s, choose(apply(p, shared), combine(shared, shared_acc), shared_acc)), apply(f, item))
            candidates = [
                ('mapped', {'f': unary}, mapped,
                 lam(s, lam(s, combine(apply(f, item), acc))), None),
                ('filtered', {'p': predicate}, filtered(xs),
                 lam(s, lam(s, choose(apply(p, item), combine(item, acc), acc))),
                 apply(p, var(s, 'head'))),
                ('mapped_filtered', {'f': unary, 'p': predicate}, filtered(mapped),
                 lam(s, lam(s, shared_guard)), apply(p, apply(f, var(s, 'head')))),
            ]
            for family, callbacks, sequence, reducer, condition in candidates:
                step = 'Normalize' if condition is None else {'Cases': dict(condition=condition, on_false='Normalize', on_true='Normalize')}
                proof = {'Induction': dict(variable='xs', names=['head', 'tail'], base='Normalize', step=step)}
                name = f'{family}_{consumer}_{t.lower()}'
                result.append((name, law(dict(base_params, **callbacks), source_consumer(sequence), folded(xs, reducer), proof)))
    return result


def source_functions(held_out=False):
    """Different ordinary callback bodies instantiate the same generic entries."""
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        mapper = 'fn(x)=>quot_or(x+seed,k,seed)' if held_out and t != 'f32' else ('fn(x)=>choose(x<seed,x+k,x-seed)' if held_out else 'fn(x)=>(x+seed)*k')
        predicate = 'fn(x)=>x<k' if held_out else 'fn(x)=>x<seed'
        sequence = 'xs'
        if name.startswith('mapped_'):
            sequence += '.map('+mapper+')'
        if name.startswith('filtered_') or name.startswith('mapped_filtered_'):
            sequence += '.filter('+predicate+')'
        body = f'sum({sequence})' if '_sum_' in name else f'foldr({sequence},seed,fn(x)=>fn(a)=>x+a*k)'
        result.append((name, f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{t}{{return {body};}}'))
    return result


def publish(output):
    output = Path(output)
    named = named_laws()
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, [semantic_entry(candidate) for _, candidate in named], names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest = dict(schema=1, laws=len(named), snapshot=store.snapshot_id, names=names,
        scope='Arbitrary pure total unary mappers/predicates. Ordered affine right folds preserve exact F32 grouping; ordinary sums only wrapping integers. Mapped predicate/result is shared once. Scheduling may change; no profitability premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
