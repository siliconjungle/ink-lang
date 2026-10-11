#!/usr/bin/env python3
"""Checked insertion lemmas and sort aggregation erasure; no kernel rules."""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from semantic_laws import value, var, word, op, law


def examples():
    objects, roots = {}, []
    for source in ('U32', 'U64', 'I32'):
        s, ls = value(source), value({'List': source})
        xs, x = var(ls, 'xs'), var(s, 'x')
        head, tail = var(s, 'head'), var(ls, 'tail')
        for name, result in [('length', 'U32'), ('count', 'U64'), ('sum', source)]:
            r = value(result)
            cardinality = lambda seq: op(r, 'call:' + name, seq)
            # Keep the primitive's actual increment order (and word wrapping).
            increment = lambda n, element: op(r, 'binary:+', *(
                [n, word(result, 1)] if name == 'length' else
                [element if name == 'sum' else word(result, 1), n]))
            helper_name = f'sort/insert-{name}-{source.lower()}'
            helper = law({'xs': ls, 'x': s},
                cardinality(op(ls, 'list.insert', x, xs)), increment(cardinality(xs), x),
                {'Induction': dict(variable='xs', names=['head', 'tail'],
                    base='Normalize', step={'Cases': dict(
                        condition=op(value('Bool'), 'binary:<=', x, head),
                        on_false='Normalize', on_true='Normalize')})})
            objects[helper_name] = helper
            dependency = identity(semantic_entry(helper))
            sorted_tail = op(ls, 'method:sort', tail)
            inserted = cardinality(op(ls, 'list.insert', head, sorted_tail))
            incremented = increment(cardinality(sorted_tail), head)
            # Normalize the sort constructor, instantiate the insertion lemma,
            # then use the sort induction hypothesis. Use requires exact endpoints.
            step = {'Trans': dict(middle=inserted, left='Normalize', right={
                'Trans': dict(middle=incremented,
                    left={'Use': dict(law=dependency,
                        arguments={'xs': sorted_tail, 'x': head}, premises=[])},
                    right='Normalize')})}
            root_name = f'sort/{name}-{source.lower()}'
            objects[root_name] = law({'xs': ls},
                cardinality(op(ls, 'method:sort', xs)), cardinality(xs),
                {'Induction': dict(variable='xs', names=['head', 'tail'],
                                   base='Normalize', step=step)},
                dependencies=[dependency])
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
    (output / 'store/sort-cardinality-view.json').write_bytes(canonical(store.bundle(new_roots)) + b'\n')
    return store


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    args = parser.parse_args()
    store = publish(args.output_store)
    print(json.dumps({'laws': len(examples()[0]), 'snapshot': store.snapshot_id}))
