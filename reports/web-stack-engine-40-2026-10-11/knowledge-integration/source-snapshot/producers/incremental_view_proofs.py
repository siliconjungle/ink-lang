#!/usr/bin/env python3
"""Untrusted producer: incremental-view (DBSP-style) laws as database entries.

Builds on the exact-integer library (canonical unary integers, finite sums,
append) and proves, with the unchanged generic kernel:

  linearity     map_f(xs ++ ys) = map_f(xs) ++ map_f(ys)
                filter_p(xs ++ ys) = filter_p(xs) ++ filter_p(ys)
  composition   sum(map_f(xs ++ ys)) = sum(map_f ys) + sum(map_f xs)
                count(filter_p(xs ++ ys)) = count(filter_p ys) + count(filter_p xs)
  order         sum(xs ++ ys) = sum(ys ++ xs)
  bilinearity   join(as ++ da, bs) = join(da, bs) + join(as, bs)
                join(as, bs ++ db) = join(as, db) + join(as, bs)
  join delta    join(as ++ da, bs ++ db)
                  = (join(da,db) + join(da,bs)) + (join(as,db) + join(as,bs))

`map_f`, `filter_p` and the join's combining function are first-order
instances. The schema functions below generate the same proofs for any scalar
function or predicate, so a search tool can instantiate them for an actual
program's lambdas. Nothing here authorises a source or stateful
transformation by itself: a separate correspondence check must bind these
definitions to the program, as the exact-maintenance bridge does for sums.
"""
import argparse, hashlib, json, shutil, subprocess
from pathlib import Path
from inductive_proofs import SEMANTICS, var, call, construct, refl
from integer_proofs import match, induction, congruence, use, sym, trans
from workspace import KNOWLEDGE_ROOT, compiler_path


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--compiler', type=Path, default=compiler_path('target/release/ink'))
    parser.add_argument('--integers', type=Path, default=KNOWLEDGE_ROOT / 'exact-integers',
                        help='checked exact-integer library whose objects are reused unchanged')
    args = parser.parse_args()
    directory = args.directory.resolve()
    (directory / 'objects').mkdir(parents=True, exist_ok=True)
    compiler = args.compiler.resolve()

    # Reuse the checked exact-integer objects byte for byte.
    base = json.loads((args.integers / 'lock.json').read_text())
    names = json.loads((args.integers / 'names.json').read_text())
    for identity in base['objects']:
        source = args.integers / 'objects' / f'{identity}.json'
        target = directory / 'objects' / f'{identity}.json'
        if target.exists():
            assert target.read_bytes() == source.read_bytes()
        else:
            shutil.copyfile(source, target)
    order = list(base['objects'])

    def references(value):
        if isinstance(value, list):
            return set().union(*(references(v) for v in value)) if value else set()
        if not isinstance(value, dict):
            return set()
        out = set()
        for key, val in value.items():
            if key in ('datatype', 'function', 'theorem') and isinstance(val, str):
                out.add(val)
            if key == 'Data':
                out.add(val)
            out |= references(val)
        return out

    def store(name, kind, declaration, extra=()):
        deps = sorted(references(declaration) | set(extra))
        if kind == 'Theorem':
            deps = sorted(set(deps) | {names['Natural'], names['Integer']})
        data = (json.dumps(dict(schema=1, semantics=SEMANTICS, name=name, dependencies=deps,
                                declaration={kind: declaration}), separators=(',', ':')) + '\n').encode()
        identity = hashlib.sha256(data).hexdigest()
        path = directory / 'objects' / f'{identity}.json'
        if path.exists():
            assert path.read_bytes() == data
        else:
            path.write_bytes(data)
        names[name] = identity
        order.append(identity)
        check = directory / 'checking.json'
        check.write_text(json.dumps(dict(schema=1, semantics=SEMANTICS, objects=[identity])))
        r = subprocess.run([str(compiler), 'verify-library', str(check)], capture_output=True, text=True)
        if r.returncode:
            raise SystemExit(f'{name}: {r.stderr.strip() or r.stdout.strip()}')
        print(name, ': checked', flush=True)
        return identity

    def function(name, params, result, body, recursive=None):
        return store(name, 'Function', dict(params=params, result=result, body=body, recursive=recursive))

    def theorem(name, params, left, right, proof):
        return store(name, 'Theorem', dict(params=params, conditions=[], **{'from': left, 'to': right}, proof=proof))

    nat, integer = names['Natural'], names['Integer']
    I = {'Data': integer}
    Z = construct(integer, 0)
    zero = construct(nat, 0)
    one = construct(integer, 1, zero)
    addition, successor = names['addition'], names['successor']
    add = lambda a, b: call(addition, a, b)
    commute, associate = names['addition_commutes'], names['addition_associates']
    second_succ = names['addition_successor_second']
    integers = names['IntegerList']
    L = {'Data': integers}
    nil = construct(integers, 0)
    cons = lambda h, t: construct(integers, 1, h, t)
    summation, append, sum_append = names['sum_integers'], names['append'], names['sum_append']
    total = lambda xs: call(summation, xs)
    joined = lambda a, b: call(append, a, b)
    xs, ys, h, tail = var('xs'), var('ys'), var('head'), var('tail')
    a, b, c, d = var('a'), var('b'), var('c'), var('d')

    # ---- order independence and the interchange law --------------------
    order_independent = theorem(
        'sum_append_commutes', [['xs', L], ['ys', L]], total(joined(xs, ys)), total(joined(ys, xs)),
        trans(use(sum_append, xs, ys), use(commute, total(ys), total(xs)), sym(use(sum_append, ys, xs))))
    interchange = theorem(
        'addition_interchange', [['a', I], ['b', I], ['c', I], ['d', I]],
        add(add(a, b), add(c, d)), add(add(a, c), add(b, d)),
        trans(use(associate, a, b, add(c, d)),
              congruence(addition, refl(a), sym(use(associate, b, c, d))),
              congruence(addition, refl(a), congruence(addition, use(commute, b, c), refl(d))),
              congruence(addition, refl(a), use(associate, c, b, d)),
              sym(use(associate, a, c, add(b, d)))))

    # ---- linearity of map, as a schema over any scalar function ---------
    def linear_map(scalar_name, scalar):
        mapping = function(f'map_{scalar_name}', [['xs', L]], L,
                           match(xs, ([], nil), (['head', 'tail'], cons(call(scalar, h), {'SelfCall': [tail]}))), 0)
        m = lambda rows: call(mapping, rows)
        left, right = m(joined(xs, ys)), joined(m(xs), m(ys))
        step = {'Construct': dict(datatype=integers, constructor=1,
                                  arguments=[refl(call(scalar, h)), {'Hypothesis': 0}])}
        map_append = theorem(f'map_{scalar_name}_append', [['xs', L], ['ys', L]], left, right,
                             induction('xs', left, right, ([], refl(m(ys))), (['head', 'tail'], step)))
        sum_map = theorem(f'sum_map_{scalar_name}_append', [['xs', L], ['ys', L]],
                          total(m(joined(xs, ys))), add(total(m(ys)), total(m(xs))),
                          trans(congruence(summation, use(map_append, xs, ys)),
                                use(sum_append, m(xs), m(ys))))
        return mapping, map_append, sum_map

    x = var('x')
    doubled = function('double_integer', [['x', I]], I, add(x, x))
    linear_map('double_integer', doubled)

    # ---- linearity of filter, with Boolean case analysis ----------------
    counting = function('count_integers', [['xs', L]], I,
                        match(xs, ([], Z), (['head', 'tail'], add({'SelfCall': [tail]}, one))), 0)
    count = lambda rows: call(counting, rows)
    left, right = count(joined(xs, ys)), add(count(ys), count(xs))
    step = trans(congruence(successor, {'Hypothesis': 0}), sym(use(second_succ, count(ys), count(tail))))
    count_append = theorem('count_append', [['xs', L], ['ys', L]], left, right,
                           induction('xs', left, right, ([], refl(count(ys))), (['head', 'tail'], step)))

    def linear_filter(predicate_name, predicate):
        p = lambda v: call(predicate, v)
        keep = lambda v, rest: {'If': dict(condition=p(v), on_true=cons(v, rest), on_false=rest)}
        filtering = function(f'filter_{predicate_name}', [['xs', L]], L,
                             match(xs, ([], nil), (['head', 'tail'], keep(h, {'SelfCall': [tail]}))), 0)
        f = lambda rows: call(filtering, rows)
        left, right = f(joined(xs, ys)), joined(f(xs), f(ys))
        hole = 'filter_condition'
        cond = var(hole)

        # Under p(head) = value, rewrite the condition inside both sides and
        # finish with the induction hypothesis (plus a cons when kept).
        def branch(value, hypothesis_index):
            lhs_context = {'If': dict(condition=cond, on_true=cons(h, f(joined(tail, ys))),
                                      on_false=f(joined(tail, ys)))}
            rhs_context = joined({'If': dict(condition=cond, on_true=cons(h, f(tail)), on_false=f(tail))}, f(ys))
            fix_left = {'Substitute': dict(variable=hole, context=lhs_context, equality={'Hypothesis': hypothesis_index})}
            fix_right = {'Substitute': dict(variable=hole, context=rhs_context, equality={'Hypothesis': hypothesis_index})}
            middle = ({'Construct': dict(datatype=integers, constructor=1, arguments=[refl(h), {'Hypothesis': 0}])}
                      if value else {'Hypothesis': 0})
            return trans(fix_left, middle, sym(fix_right))

        step = {'BoolSplit': dict(condition=p(h), **{'from': f(joined(cons(h, tail), ys)),
                                                       'to': joined(f(cons(h, tail)), f(ys))},
                                  on_false=branch(False, 1), on_true=branch(True, 1))}
        filter_append = theorem(f'filter_{predicate_name}_append', [['xs', L], ['ys', L]], left, right,
                                induction('xs', left, right, ([], refl(f(ys))), (['head', 'tail'], step)))
        count_filter = theorem(f'count_filter_{predicate_name}_append', [['xs', L], ['ys', L]],
                               count(f(joined(xs, ys))), add(count(f(ys)), count(f(xs))),
                               trans(congruence(counting, use(filter_append, xs, ys)),
                                     use(count_append, f(xs), f(ys))))
        return filtering, filter_append, count_filter

    n = var('n')
    positive = function('is_positive', [['x', I]], 'Bool',
                        match(x, ([], {'Bool': False}), (['n'], {'Bool': True}), (['n'], {'Bool': False})))
    linear_filter('is_positive', positive)

    # ---- bilinearity of an equi-join aggregate --------------------------
    rows = store('KeyedRows', 'Datatype', dict(constructors=[dict(name='Nil', fields=[]),
                                                             dict(name='Cons', fields=['U64', I, 'SelfType'])]))
    R = {'Data': rows}
    rnil = construct(rows, 0)
    rcons = lambda k, v, t: construct(rows, 1, k, v, t)
    key, value, other, weight = var('key'), var('value'), var('other'), var('weight')
    rappend = function('append_rows', [['xs', R], ['ys', R]], R,
                       match(xs, ([], ys), (['k', 'v', 'tail'], rcons(var('k'), var('v'), {'SelfCall': [tail, ys]}))), 0)
    rjoin = lambda p, q: call(rappend, p, q)
    contribution = lambda k, v, k2, w: {'If': dict(condition={'Binary': dict(op='==', left=k, right=k2)},
                                                   on_true=add(v, w), on_false=Z)}
    matching = function('join_matches', [['key', 'U64'], ['value', I], ['bs', R]], I,
                        match(var('bs'), ([], Z),
                              (['other', 'weight', 'tail'],
                               add({'SelfCall': [key, value, tail]}, contribution(key, value, other, weight)))), 2)
    M = lambda k, v, q: call(matching, k, v, q)
    bs, db, as_, da = var('bs'), var('db'), var('as'), var('da')
    left, right = M(key, value, rjoin(bs, db)), add(M(key, value, db), M(key, value, bs))
    step = trans(congruence(addition, {'Hypothesis': 0}, refl(contribution(key, value, other, weight))),
                 use(associate, M(key, value, db), M(key, value, tail), contribution(key, value, other, weight)))
    match_append = theorem('join_matches_append', [['key', 'U64'], ['value', I], ['bs', R], ['db', R]], left, right,
                           induction('bs', left, right, ([], refl(M(key, value, db))),
                                     (['other', 'weight', 'tail'], step)))
    joining = function('join_sum', [['as', R], ['bs', R]], I,
                       match(as_, ([], Z), (['key', 'value', 'tail'],
                                            add({'SelfCall': [tail, bs]}, M(key, value, bs)))), 0)
    J = lambda p, q: call(joining, p, q)
    left, right = J(rjoin(as_, da), bs), add(J(da, bs), J(as_, bs))
    step = trans(congruence(addition, {'Hypothesis': 0}, refl(M(key, value, bs))),
                 use(associate, J(da, bs), J(tail, bs), M(key, value, bs)))
    join_left = theorem('join_left_append', [['as', R], ['da', R], ['bs', R]], left, right,
                        induction('as', left, right, ([], refl(J(da, bs))), (['key', 'value', 'tail'], step)))
    left, right = J(as_, rjoin(bs, db)), add(J(as_, db), J(as_, bs))
    step = trans(congruence(addition, {'Hypothesis': 0}, use(match_append, key, value, bs, db)),
                 use(interchange, J(tail, db), J(tail, bs), M(key, value, db), M(key, value, bs)))
    join_right = theorem('join_right_append', [['as', R], ['bs', R], ['db', R]], left, right,
                         induction('as', left, right, ([], refl(Z)), (['key', 'value', 'tail'], step)))
    theorem('join_delta', [['as', R], ['da', R], ['bs', R], ['db', R]],
            J(rjoin(as_, da), rjoin(bs, db)),
            add(add(J(da, db), J(da, bs)), add(J(as_, db), J(as_, bs))),
            trans(use(join_left, as_, da, rjoin(bs, db)),
                  congruence(addition, use(join_right, da, bs, db), use(join_right, as_, bs, db))))

    (directory / 'lock.json').write_text(json.dumps(dict(schema=1, semantics=SEMANTICS, objects=order), indent=2) + '\n')
    (directory / 'names.json').write_text(json.dumps(names, indent=2) + '\n')
    r = subprocess.run([str(compiler), 'verify-library', str(directory / 'lock.json')], capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr)
    (directory / 'checking.json').unlink()
    print(f'Checked {len(order)} objects ({len(order) - len(base["objects"])} new) with the unchanged generic kernel.')


if __name__ == '__main__':
    main()
