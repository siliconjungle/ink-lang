#!/usr/bin/env python3
"""Author executable work-skipping laws for the existing semantic checker.

These are untrusted proof objects, not compiler rules or performance claims.
Profitability must be measured separately for each backend and workload.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, binary, bound, lam, law, op, term, value, var, word


def induction(variable, names, step='Normalize'):
    return {'Induction': dict(variable=variable, names=names, base='Normalize', step=step)}


def named_laws():
    """Return deterministic (display name, typed law) pairs; names grant no authority."""
    result = []
    for t in ('U32', 'U64', 'I32'):
        s = value(t)
        n, x, k, d = var('Nat', 'n'), var(s, 'x'), var(s, 'k'), var(s, 'd')
        accumulator = bound(s, 0)
        count = op(s, 'nat.word', n)
        proof = induction('n', ['step_count'])
        bodies = [
            ('repeat_subtract', {'n': 'Nat', 'x': s, 'k': s},
             binary('-', accumulator, k), binary('-', x, binary('*', count, k))),
            ('repeat_product', {'n': 'Nat', 'x': s, 'k': s, 'd': s},
             binary('+', accumulator, binary('*', k, d)),
             binary('+', x, binary('*', count, binary('*', k, d)))),
            ('repeat_identity', {'n': 'Nat', 'x': s}, accumulator, x),
            ('repeat_cancel', {'n': 'Nat', 'x': s, 'k': s},
             binary('-', binary('+', accumulator, k), k), x),
        ]
        for name, params, body, target in bodies:
            source = op(s, 'call:repeat', n, x, lam(value('U32'), lam(s, body)))
            result.append((f'{name}_{t.lower()}', law(params, source, target, proof)))

        ls, xs = value({'List': t}), var(value({'List': t}), 'xs')
        proof = induction('xs', ['head', 'tail'])
        scaled = op(ls, 'method:map', xs, lam(s, binary('*', bound(s, 0), k)))
        result.append((f'scaled_sum_{t.lower()}', law({'xs': ls, 'k': s},
            op(s, 'call:sum', scaled), binary('*', op(s, 'call:sum', xs), k), proof)))
        zero_map = op(ls, 'method:map', xs, lam(s, word(t, 0)))
        result.append((f'zero_sum_{t.lower()}', law({'xs': ls},
            op(s, 'call:sum', zero_map), word(t, 0), proof)))
        false_filter = op(ls, 'method:filter', xs, lam(s, term(value('Bool'), {'Bool': False})))
        result.append((f'false_filter_sum_{t.lower()}', law({'xs': ls},
            op(s, 'call:sum', false_filter), word(t, 0), proof)))
        if t == 'U64':
            constant_map = op(ls, 'method:map', xs, lam(s, k))
            result.append(('constant_sum_u64', law({'xs': ls, 'k': s},
                op(s, 'call:sum', constant_map), binary('*', op(s, 'call:count', xs), k), proof)))

    for t in ('U32', 'U64', 'I32', 'F32', 'Bool'):
        s, ls = value(t), value({'List': t})
        xs = var(ls, 'xs')
        proof = induction('xs', ['head', 'tail'])
        f = var(arrow(s, s), 'f')
        mapped = op(ls, 'method:map', xs, f)
        count_sort = value('U64')
        result.append((f'mapped_count_{t.lower()}', law({'xs': ls, 'f': f['sort']},
            op(count_sort, 'call:count', mapped), op(count_sort, 'call:count', xs), proof)))
        true_filter = op(ls, 'method:filter', xs, lam(s, term(value('Bool'), {'Bool': True})))
        result.append((f'true_filter_{t.lower()}', law({'xs': ls}, true_filter, xs, proof)))
        false_filter = op(ls, 'method:filter', xs, lam(s, term(value('Bool'), {'Bool': False})))
        result.append((f'false_filter_count_{t.lower()}', law({'xs': ls},
            op(count_sort, 'call:count', false_filter), word('U64', 0), proof)))

        predicate_sort = arrow(s, value('Bool'))
        p = var(predicate_sort, 'p')
        filtered = op(ls, 'method:filter', xs, p)
        condition = op(value('Bool'), 'apply', p, var(s, 'head'))
        step = {'Cases': dict(condition=condition, on_false='Normalize', on_true='Normalize')}
        result.append((f'filter_idempotent_{t.lower()}', law({'xs': ls, 'p': predicate_sort},
            op(ls, 'method:filter', filtered, p), filtered,
            induction('xs', ['head', 'tail'], step))))
        q = var(predicate_sort, 'q')
        q_condition = op(value('Bool'), 'apply', q, var(s, 'head'))
        q_cases = {'Cases': dict(condition=q_condition, on_false='Normalize', on_true='Normalize')}
        both_cases = {'Cases': dict(condition=condition, on_false='Normalize', on_true=q_cases)}
        combined = lam(s, binary('&&', op(value('Bool'), 'apply', p, bound(s, 0)),
                                 op(value('Bool'), 'apply', q, bound(s, 0))))
        result.append((f'filter_fusion_{t.lower()}', law({'xs': ls, 'p': predicate_sort, 'q': predicate_sort},
            op(ls, 'method:filter', filtered, q), op(ls, 'method:filter', xs, combined),
            induction('xs', ['head', 'tail'], both_cases))))
    return result


def publish(output):
    named = named_laws()
    objects = [semantic_entry(l) for _, l in named]
    names = {name: identity(semantic_entry(l)) for name, l in named}
    store = Store.publish(output, objects, names)
    store.rebuild()
    (output / 'view.json').write_bytes(canonical(store.bundle(sorted(names.values()))) + b'\n')
    manifest = dict(schema=1, laws=len(objects), snapshot=store.snapshot_id, names=names,
                    scope='Pure total value semantics; wrapping integers. No measured profitability.')
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    return store, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    args = parser.parse_args()
    _, manifest = publish(args.output_store)
    print(json.dumps(manifest))


if __name__ == '__main__':
    main()
