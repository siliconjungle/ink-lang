#!/usr/bin/env python3
"""Untrusted reduction fusion candidates; all require the existing checker.

No backend, runtime guard or trusted optimisation rule is added. F32 instances
only preserve exact ordered operations; no floating algebraic factoring.
"""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, binary, bound, lam, law, op, value, var


def induction(step='Normalize'):
    return {'Induction': dict(variable='xs', names=['head', 'tail'],
                             base='Normalize', step=step)}


def cases(condition):
    return {'Cases': dict(condition=condition, on_false='Normalize', on_true='Normalize')}


def named_laws():
    result = []
    for t in ('U32', 'I32', 'U64', 'F32'):
        s, ls = value(t), value({'List': t})
        xs = var(ls, 'xs')
        ps = arrow(s, value('Bool'))
        p = var(ps, 'p')
        filtered = lambda a: op(ls, 'method:filter', a, p)
        test = op(value('Bool'), 'apply', p, var(s, 'head'))
        z, k, d = [var(s, n) for n in ('z', 'k', 'd')]
        folding = lam(s, lam(s, binary('-', bound(s, 1), bound(s, 0))))
        folded = lambda a, f: op(s, 'call:foldr', a, z, f)
        item, acc = bound(s, 1), bound(s, 0)
        predicate = op(value('Bool'), 'apply', p, item)
        guarded = lam(s, lam(s, op(s, 'call:choose', predicate,
                                    binary('-', item, acc), acc)))
        result.append((f'filter_ordered_fold_{t.lower()}', law(
            {'xs': ls, 'z': s, 'p': ps}, folded(filtered(xs), folding),
            folded(xs, guarded), induction(cases(test)))))
        mapping = lam(s, binary('*', bound(s, 0), k))
        mapped = op(ls, 'method:map', xs, mapping)
        product = binary('*', item, k)
        mapped_guard = lam(s, lam(s, op(s, 'call:choose',
            op(value('Bool'), 'apply', p, product), binary('-', product, acc), acc)))
        mapped_test = op(value('Bool'), 'apply', p, binary('*', var(s, 'head'), k))
        result.append((f'mapped_filter_ordered_fold_{t.lower()}', law(
            {'xs': ls, 'z': s, 'k': s, 'p': ps}, folded(filtered(mapped), folding),
            folded(xs, mapped_guard), induction(cases(mapped_test)))))
        weighted = lam(s, lam(s, binary('+', binary('*', bound(s, 1), k),
                                       binary('*', bound(s, 0), d))))
        zipped = op(ls, 'method:zip', xs, xs, weighted)
        same_weighted = binary('+', binary('*', item, k), binary('*', item, d))
        fused_fold = lam(s, lam(s, binary('-', same_weighted, acc)))
        result.append((f'weighted_self_zip_ordered_fold_{t.lower()}', law(
            {'xs': ls, 'z': s, 'k': s, 'd': s}, folded(zipped, folding),
            folded(xs, fused_fold), induction())))
        if t != 'F32':
            result.append((f'weighted_self_zip_sum_{t.lower()}', law(
                {'xs': ls, 'k': s, 'd': s}, op(s, 'call:sum', zipped),
                binary('*', op(s, 'call:sum', xs), binary('+', k, d)), induction())))
    return result


def source_functions():
    """Concrete executable applications, retaining arbitrary function parameters."""
    functions = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        ls = f'List<{t}>'
        if name.startswith('mapped_filter_ordered_fold_'):
            params = f'xs:{ls},seed:{t},k:{t},z:{t}'
            body, result = 'foldr(xs.map(fn(x)=>x*k).filter(fn(x)=>x<seed),z,fn(x)=>fn(a)=>x-a)', t
        elif name.startswith('filter_ordered_fold_'):
            params = f'xs:{ls},seed:{t},z:{t}'
            body, result = 'foldr(xs.filter(fn(x)=>x<seed),z,fn(x)=>fn(a)=>x-a)', t
        elif name.startswith('weighted_self_zip_sum_'):
            params = f'xs:{ls},k:{t},d:{t}'
            body, result = 'sum(xs.zip(xs,fn(x)=>fn(y)=>x*k+y*d))', t
        else:
            params = f'xs:{ls},k:{t},d:{t},z:{t}'
            body, result = 'foldr(xs.zip(xs,fn(x)=>fn(y)=>x*k+y*d),z,fn(x)=>fn(a)=>x-a)', t
        functions.append((name, f'pub fn {name}({params})->{result}{{return {body};}}'))
    return functions


def publish(output):
    output = Path(output)
    named = named_laws()
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, [semantic_entry(candidate) for _, candidate in named], names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest = dict(schema=1, laws=len(named), snapshot=store.snapshot_id, names=names,
                    scope='Ordered pure reductions and wrapping integer sums; F32 operations remain ordered. No target profitability premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
