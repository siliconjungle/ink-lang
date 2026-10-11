#!/usr/bin/env python3
"""Replayable proof data for local-buffer observations and stopping loops.
No search, primitive implementation or mathematical authority lives here.
"""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from semantic_laws import value, arrow, term, var, bound, word, op, lam, law


def examples():
    result = {}
    boolean = value('Bool')
    for ty in ('U32', 'U64', 'I32', 'F32', 'Bool'):
        suffix = ty.lower()
        scalar = value(ty)
        sequence = value({'List': ty})
        buffer = value({'Buffer': ty})
        xs = var(sequence, 'xs')
        copied = op(buffer, 'call:buffer', xs)
        index = var(value('U32'), 'i')
        fallback = var(scalar, 'fallback')
        result[f'local-buffer/freeze-roundtrip-{suffix}'] = law(
            {'xs': sequence}, op(sequence, 'method:freeze', copied), xs)
        result[f'local-buffer/read-length-{suffix}'] = law(
            {'xs': sequence}, op(value('U32'), 'method:len', copied),
            op(value('U32'), 'call:length', xs))
        result[f'local-buffer/read-index-{suffix}'] = law(
            {'xs': sequence, 'i': value('U32'), 'fallback': scalar},
            op(scalar, 'method:at_or', copied, index, fallback),
            op(scalar, 'method:at_or', xs, index, fallback))

        predicate = arrow(scalar, boolean)
        p, q = var(predicate, 'p'), var(predicate, 'q')
        first = op(sequence, 'method:filter', xs, p)
        twice = op(sequence, 'method:filter', first, q)
        x = bound(scalar, 0)
        fused_predicate = lam(scalar, op(boolean, 'binary:&&',
            op(boolean, 'apply', p, x), op(boolean, 'apply', q, x)))
        fused = op(sequence, 'method:filter', xs, fused_predicate)
        induction = {'Induction': dict(variable='xs', names=['head', 'tail'],
            base='Normalize', step={'Cases': dict(
                condition=op(boolean, 'apply', p, var(scalar, 'head')),
                on_false='Normalize', on_true='Normalize')})}
        result[f'collections/filter-fusion-{suffix}'] = law(
            {'xs': sequence, 'p': predicate, 'q': predicate}, twice, fused, induction)
        true = term(boolean, {'Bool': True})
        result[f'collections/filter-true-{suffix}'] = law(
            {'xs': sequence}, op(sequence, 'method:filter', xs, lam(scalar, true)), xs,
            {'Induction': dict(variable='xs', names=['head', 'tail'],
                               base='Normalize', step='Normalize')})

        initial = var(scalar, 'initial')
        count = var(value('U32'), 'limit')
        stop_type = arrow(scalar, boolean)
        step_type = arrow(value('U32'), arrow(scalar, scalar))
        stop, step = var(stop_type, 'stop'), var(step_type, 'step')
        result[f'stopping/zero-bound-{suffix}'] = law(
            {'initial': scalar, 'stop': stop_type, 'step': step_type},
            op(scalar, 'call:repeat_until', word('U32', 0), initial, stop, step), initial)
        result[f'stopping/initial-stop-{suffix}'] = law(
            {'limit': value('U32'), 'initial': scalar, 'step': step_type},
            op(scalar, 'call:repeat_until', count, initial, lam(scalar, true), step), initial)
        result[f'stopping/proved-initial-stop-{suffix}'] = law(
            {'limit': value('U32'), 'initial': scalar, 'stop': stop_type, 'step': step_type},
            op(scalar, 'call:repeat_until', count, initial, stop, step), initial,
            conditions=[{'from': op(boolean, 'apply', stop, initial), 'to': true}])
        condition = {'from': op(boolean, 'binary:==', count, word('U32', 0)), 'to': true}
        equality = {'from': count, 'to': word('U32', 0)}
        result[f'stopping/guarded-zero-bound-{suffix}'] = law(
            {'limit': value('U32'), 'initial': scalar, 'stop': stop_type, 'step': step_type},
            op(scalar, 'call:repeat_until', count, initial, stop, step), initial,
            {'AssertEquality': dict(equality=equality, premise={'Hypothesis': 0}, body='Normalize')},
            conditions=[condition])
    return result


def publish(output):
    output = Path(output)
    names, objects, roots = {}, [], []
    if (output/'store/snapshot.json').exists():
        previous = Store(output)
        objects = [previous.object(i) for i in previous.members()]
        names = json.loads((output/'store/names.json').read_text())
        view = output/'store/rewrite-view.json'
        if view.exists(): roots = json.loads(view.read_text())['roots']
    laws = examples()
    for name, proof in laws.items():
        entry = semantic_entry(proof)
        ident = identity(entry)
        objects.append(entry)
        names['rewrite/'+name] = ident
        roots.append(ident)
    store = Store.publish(output, objects, names)
    store.rebuild()
    (output/'store/rewrite-view.json').write_bytes(canonical(store.bundle(roots))+b'\n')
    (output/'store/local-collection-view.json').write_bytes(canonical(store.bundle(
        [identity(semantic_entry(proof)) for proof in laws.values()]))+b'\n')
    return store


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    args = parser.parse_args()
    store = publish(args.output_store)
    print(json.dumps({'laws': len(examples()), 'snapshot': store.snapshot_id}))
