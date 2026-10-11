#!/usr/bin/env python3
"""Collection pipeline laws using the unchanged general equality checker."""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from semantic_laws import value, arrow, term, var, word, op, lam, bound, law

TYPES = ('U32', 'U64', 'I32', 'F32', 'Bool')


def examples():
    result = {}
    boolean = value('Bool')
    induction = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                   base='Normalize', step='Normalize')}
    for source in TYPES:
        s = value(source)
        ls = value({'List': source})
        xs = var(ls, 'xs')
        for target in TYPES:
            t = value(target)
            lt = value({'List': target})
            mapper = arrow(s, t)
            f = var(mapper, 'f')
            mapped = op(lt, 'method:map', xs, f)
            suffix = source.lower() + '-' + target.lower()
            result['pipelines/length-map-' + suffix] = law(
                {'xs': ls, 'f': mapper}, op(value('U32'), 'call:length', mapped),
                op(value('U32'), 'call:length', xs), induction)
            if source != target or source == 'Bool':
                continue  # Existing foldr correspondence requires one numeric element/accumulator sort.
            initial = var(t, 'initial')
            for name, operator in [('sum', '+'), ('difference', '-'), ('product', '*')]:
                reducer = lam(t, lam(t, op(t, 'binary:' + operator, bound(t, 1), bound(t, 0))))
                fused = lam(s, lam(t, op(t, 'binary:' + operator,
                    op(t, 'apply', f, bound(s, 1)), bound(t, 0))))
                result[f'pipelines/fold-map-{name}-{source.lower()}'] = law(
                    {'xs': ls, 'f': mapper, 'initial': t},
                    op(t, 'call:foldr', mapped, initial, reducer),
                    op(t, 'call:foldr', xs, initial, fused), induction)
                if name == 'sum' and source != 'F32':
                    result[f'pipelines/sum-map-{source.lower()}'] = law(
                        {'xs': ls, 'f': mapper}, op(t, 'call:sum', mapped),
                        op(t, 'call:foldr', xs, word(source, 0), fused), induction)
        predicate = arrow(s, boolean)
        p = var(predicate, 'p')
        initial = var(s, 'initial')
        element, accumulator = bound(s, 1), bound(s, 0)
        filtered = op(ls, 'method:filter', xs, p)
        cases = {'Induction': dict(variable='xs', names=['head', 'tail'],
            base='Normalize', step={'Cases': dict(
                condition=op(boolean, 'apply', p, var(s, 'head')),
                on_false='Normalize', on_true='Normalize')})}
        if source != 'Bool':
            for name, operator in [('sum', '+'), ('difference', '-'), ('product', '*')]:
                reducer = lam(s, lam(s, op(s, 'binary:' + operator, element, accumulator)))
                body = op(s, 'call:choose', op(boolean, 'apply', p, element),
                          op(s, 'binary:' + operator, element, accumulator), accumulator)
                fused = lam(s, lam(s, body))
                result[f'pipelines/fold-filter-{name}-{source.lower()}'] = law(
                    {'xs': ls, 'p': predicate, 'initial': s},
                    op(s, 'call:foldr', filtered, initial, reducer),
                    op(s, 'call:foldr', xs, initial, fused), cases)
                if name == 'sum' and source != 'F32':
                    result[f'pipelines/sum-filter-{source.lower()}'] = law(
                        {'xs': ls, 'p': predicate}, op(s, 'call:sum', filtered),
                        op(s, 'call:foldr', xs, word(source, 0), fused), cases)
        if source != 'Bool':
            mapper = arrow(s, s)
            f = var(mapper, 'f')
            mapped = op(ls, 'method:map', filtered, f)
            for name, operator in [('sum', '+'), ('difference', '-'), ('product', '*')]:
                reducer = lam(s, lam(s, op(s, 'binary:' + operator, element, accumulator)))
                body = op(s, 'call:choose', op(boolean, 'apply', p, element),
                    op(s, 'binary:' + operator, op(s, 'apply', f, element), accumulator), accumulator)
                fused = lam(s, lam(s, body))
                result[f'pipelines/fold-filter-map-{name}-{source.lower()}'] = law(
                    {'xs': ls, 'p': predicate, 'f': mapper, 'initial': s},
                    op(s, 'call:foldr', mapped, initial, reducer),
                    op(s, 'call:foldr', xs, initial, fused), cases)
                if name == 'sum' and source != 'F32':
                    result[f'pipelines/sum-filter-map-{source.lower()}'] = law(
                        {'xs': ls, 'p': predicate, 'f': mapper}, op(s, 'call:sum', mapped),
                        op(s, 'call:foldr', xs, word(source, 0), fused), cases)
        discarded = op(ls, 'method:filter', xs, lam(s, term(boolean, {'Bool': False})))
        for name, width in [('length', 'U32'), ('count', 'U64')]:
            result[f'pipelines/{name}-discarded-{source.lower()}'] = law(
                {'xs': ls}, op(value(width), 'call:' + name, discarded),
                word(width, 0), induction)
    return result


def publish(output):
    output = Path(output)
    previous = Store(output) if (output / 'store/snapshot.json').exists() else None
    objects = [previous.object(i) for i in previous.members()] if previous else []
    names = json.loads((output / 'store/names.json').read_text()) if previous else {}
    roots = json.loads((output / 'store/rewrite-view.json').read_text())['roots'] if previous else []
    pipeline_roots = []
    for name, proof in examples().items():
        entry = semantic_entry(proof)
        ident = identity(entry)
        objects.append(entry)
        names['rewrite/' + name] = ident
        roots.append(ident)
        pipeline_roots.append(ident)
    store = Store.publish(output, objects, names)
    store.rebuild()
    # Refresh transport witnesses for other named views against this snapshot.
    # Their selected roots and immutable object bytes remain unchanged.
    for path in sorted((output / 'store').glob('*-view.json')):
        old = json.loads(path.read_text())
        path.write_bytes(canonical(store.bundle(old['roots'])) + b'\n')
    (output / 'store/rewrite-view.json').write_bytes(canonical(store.bundle(roots)) + b'\n')
    (output / 'store/collection-pipeline-view.json').write_bytes(canonical(store.bundle(pipeline_roots)) + b'\n')
    return store


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    args = parser.parse_args()
    store = publish(args.output_store)
    print(json.dumps({'laws': len(examples()), 'snapshot': store.snapshot_id}))
