#!/usr/bin/env python3
"""Prove aggregate preservation through sorted filtering; no core rules."""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from semantic_laws import value, arrow, term, var, word, op, law


def examples():
    objects, roots = {}, []
    boolean = value('Bool')
    for source in ('U32', 'U64', 'I32'):
        s, ls = value(source), value({'List': source})
        xs, x = var(ls, 'xs'), var(s, 'x')
        head, tail = var(s, 'head'), var(ls, 'tail')
        predicate = arrow(s, boolean)
        p = var(predicate, 'p')
        test = lambda element: op(boolean, 'apply', p, element)
        filtered = lambda seq: op(ls, 'method:filter', seq, p)
        cases = lambda condition, body: {'Cases': dict(condition=condition,
            on_false=body, on_true=body)}
        for name, result in [('length', 'U32'), ('count', 'U64'), ('sum', source)]:
            r = value(result)
            aggregate = lambda seq: op(r, 'call:' + name, filtered(seq))
            increment = lambda n, element: op(r, 'binary:+', *(
                [n, word(result, 1)] if name == 'length' else
                [element if name == 'sum' else word(result, 1), n]))
            dependencies = []
            for flag, suffix in [(False, 'dropped'), (True, 'kept')]:
                helper_name = f'filtered-sort/insert-{name}-{suffix}-{source.lower()}'
                step = cases(op(boolean, 'binary:<=', x, head), cases(test(head), 'Normalize'))
                helper = law({'xs': ls, 'x': s, 'p': predicate},
                    aggregate(op(ls, 'list.insert', x, xs)),
                    increment(aggregate(xs), x) if flag else aggregate(xs),
                    {'Induction': dict(variable='xs', names=['head', 'tail'],
                        base='Normalize', step=step)},
                    conditions=[{'from': test(x), 'to': term(boolean, {'Bool': flag})}])
                objects[helper_name] = helper
                dependencies.append(identity(semantic_entry(helper)))
            sorted_tail = op(ls, 'method:sort', tail)
            inserted = aggregate(op(ls, 'list.insert', head, sorted_tail))
            branches = []
            for flag, dependency in zip([False, True], dependencies):
                middle = increment(aggregate(sorted_tail), head) if flag else aggregate(sorted_tail)
                branches.append({'Trans': dict(middle=inserted, left='Normalize', right={
                    'Trans': dict(middle=middle,
                        left={'Use': dict(law=dependency,
                            arguments={'xs': sorted_tail, 'x': head, 'p': p},
                            premises=[{'Hypothesis': 1}])}, right='Normalize')})})
            step = {'Cases': dict(condition=test(head), on_false=branches[0], on_true=branches[1])}
            root_name = f'filtered-sort/{name}-{source.lower()}'
            objects[root_name] = law({'xs': ls, 'p': predicate},
                aggregate(op(ls, 'method:sort', xs)), aggregate(xs),
                {'Induction': dict(variable='xs', names=['head', 'tail'],
                    base='Normalize', step=step)}, dependencies=dependencies)
            roots.append(root_name)
    return objects, roots


def publish(output):
    output = Path(output)
    previous = Store(output)
    objects = [previous.object(i) for i in previous.members()]
    names = json.loads((output / 'store/names.json').read_text())
    roots = json.loads((output / 'store/rewrite-view.json').read_text())['roots']
    laws, root_names = examples()
    new_roots = []
    for name, proof in laws.items():
        entry = semantic_entry(proof)
        ident = identity(entry)
        objects.append(entry)
        names['rewrite/' + name] = ident
        if name in root_names:
            roots.append(ident)
            new_roots.append(ident)
    store = Store.publish(output, objects, names)
    store.rebuild()
    for path in sorted((output / 'store').glob('*-view.json')):
        path.write_bytes(canonical(store.bundle(json.loads(path.read_text())['roots'])) + b'\n')
    (output / 'store/rewrite-view.json').write_bytes(canonical(store.bundle(roots)) + b'\n')
    (output / 'store/filtered-sort-view.json').write_bytes(canonical(store.bundle(new_roots)) + b'\n')
    return store


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    args = parser.parse_args()
    store = publish(args.output_store)
    print(json.dumps({'laws': len(examples()[0]), 'snapshot': store.snapshot_id}))
