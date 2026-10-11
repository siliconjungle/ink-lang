#!/usr/bin/env python3
"""Untrusted producer: prove that a maintained view equals its row decomposition.

Input is the compiler's `ink model-view` output for one `keep`: literal stage
list functions for a `sum`/`count` over any chain of `map`/`filter` stages, the
final fold, `pipeline(rows)` and `decomposed(rows) = sum of projection(row)`.
Output is `ink verify-view` evidence: the same bundle plus definitions, and a
proof of

    for all rows. pipeline(rows) = decomposed(rows)

No per-program induction is done here. The proof instantiates three general
laws from the knowledge database (research/general-laws), each stated once
over abstract sorts, functions and a monoid and checked once:

    sum_map         sum_g(map_f(xs))    = sum_{g.f}(xs)
    sum_filter      sum_w(filter_p(xs)) = sum_{p ? w : 0}(xs)    [plus(a, zero) = a]
    sum_congruence  sum_w(xs)           = sum_v(xs)              [w = v pointwise]

For stage k the compiler's stage function is a literal instance of the
general `map`/`filter` (f or p interpreted by the stage's lambda), and the
running weight is a closed lambda. Each step adds one projection definition
proj_k and its sum sp_k, which the kernel checks are exactly the instantiated
general definitions, and discharges the assumptions by computation.

    pipeline(rows) = fold(stage_n(...)) = sp_n(stage_{n-1}(...)) = ... = sp_1(rows) = decomposed(rows)

The compiler checks every object and the proof with its kernel; nothing here
is trusted.
"""
import argparse, copy, hashlib, json, sys
from pathlib import Path

SEMANTICS = 'first-order-inductive-equality-v1'
VIEW_SEMANTICS = 'source-view-pipeline-decomposition-v1'
LAWS = Path(__file__).resolve().parents[1] / 'research' / 'general-laws'


def var(n): return {'Var': n}
def call(f, *args): return {'Call': {'function': f, 'arguments': list(args)}}
def lam(params, body): return {'params': list(params), 'body': body}
def list_match(scrutinee, nil, cons):
    return {'Match': {'scrutinee': var(scrutinee), 'branches': [
        {'bindings': [], 'body': nil}, {'bindings': ['head', 'tail'], 'body': cons}]}}


def trans(proofs):
    """Balanced transitivity keeps proof depth logarithmic in chain length."""
    if len(proofs) == 1:
        return proofs[0]
    mid = len(proofs) // 2
    return {'Trans': [trans(proofs[:mid]), trans(proofs[mid:])]}


def references(value):
    out = set()
    if isinstance(value, list):
        for v in value:
            out |= references(v)
    elif isinstance(value, dict):
        for k, v in value.items():
            if k in ('datatype', 'function', 'theorem', 'Data') and isinstance(v, str):
                out.add(v)
            out |= references(v)
    return out


def apply_head(body, argument):
    """body[head := argument] for a binder-free weight body."""
    if isinstance(body, dict):
        assert 'Match' not in body, 'weight lambdas are binder-free'
        if body == var('head'):
            return argument
        return {k: apply_head(v, argument) for k, v in body.items()}
    if isinstance(body, list):
        return [apply_head(v, argument) for v in body]
    return body


def produce(view, laws=LAWS):
    description = view['description']
    bundle = copy.deepcopy(view['library'])
    objects, lock = bundle['objects'], bundle['lock']['objects']
    law_names = json.loads((laws / 'names.json').read_text())
    law_raw = lambda ident: (laws / 'objects' / f'{ident}.json').read_text()
    decl = lambda ident: json.loads(objects[ident])['declaration']
    N = law_names

    # Field matches inside translated lambdas can reach nested record sorts
    # that no explicit reference names; import every source value sort.
    value_sorts = {v['Data'] for v in description['row']['types'].values() if isinstance(v, dict) and 'Data' in v}

    def store(name, declaration):
        deps = sorted(references(declaration) | value_sorts)
        raw = json.dumps({'schema': 1, 'semantics': SEMANTICS, 'name': name,
                          'dependencies': deps, 'declaration': {'Function': declaration}},
                         separators=(',', ':'))
        ident = hashlib.sha256(raw.encode()).hexdigest()
        if ident not in objects:
            objects[ident] = raw
            lock.append(ident)
        return ident

    def import_law(name):
        """Copy a checked general law and its dependency closure, byte for byte."""
        pending = [N[name]]
        while pending:
            ident = pending.pop()
            if ident in objects:
                continue
            raw = law_raw(ident)
            assert hashlib.sha256(raw.encode()).hexdigest() == ident
            objects[ident] = raw
            pending.extend(json.loads(raw)['dependencies'])
        if N[name] not in lock:
            lock.append(N[name])
        return N[name]

    keep = description['row']['keep']
    fold_id = description['fold']
    fold = decl(fold_id)['Function']
    I = fold['result']
    # The exported fold is Nil -> 0, Cons -> add(fold(tail), item).
    zero = fold['body']['Match']['branches'][0]['body']
    cons_body = fold['body']['Match']['branches'][1]['body']['Call']
    addition, item = cons_body['function'], cons_body['arguments'][1]
    monoid = {N['plus']: lam(['a', 'b'], call(addition, var('a'), var('b'))), N['zero']: lam([], zero)}

    stages = description['stages']
    sorts = [description['rows']] + [s['output'] for s in stages]   # L_1 .. L_{n+1}
    element = lambda list_sort: decl(list_sort['Data'])['Datatype']['constructors'][1]['fields'][0]
    n = len(stages)

    # weight[k] is the closed per-element weight consumed after stage k-1;
    # total[k] is the sum of that weight over list sort L_k.
    weight = {n + 1: lam(['head'], item)}
    total = {n + 1: fold_id}
    steps = {}
    for k in range(n, 0, -1):
        stage = stages[k - 1]
        f = stage['function']
        body = decl(f)['Function']['body']['Match']['branches'][1]['body']
        E_in = element(sorts[k - 1])
        common_sorts = {N['Element']: E_in, N['Total']: I}
        if stage['kind'] == 'map':
            term = body['Construct']['arguments'][0]
            proj_body = apply_head(weight[k + 1]['body'], term)
        else:
            term = body['If']['condition']
            proj_body = {'If': {'condition': term, 'on_true': weight[k + 1]['body'], 'on_false': zero}}
        proj = store(f'view_{keep}_proj_{k}', {'params': [['head', E_in]], 'result': I,
                                                'body': proj_body, 'recursive': None})
        sp = store(f'view_{keep}_sum_proj_{k}', {
            'params': [['xs', sorts[k - 1]]], 'result': I,
            'body': list_match('xs', zero, call(addition, {'SelfCall': [var('tail')]}, call(proj, var('head')))),
            'recursive': 0})
        if stage['kind'] == 'map':
            steps[k] = dict(
                theorem=import_law('sum_map'),
                sorts={**common_sorts, N['Image']: element(sorts[k])},
                functions={**monoid, N['map_function']: lam(['head'], term), N['image_weight']: weight[k + 1]},
                definitions={N['ElementList']: sorts[k - 1]['Data'], N['ImageList']: sorts[k]['Data'],
                             N['map']: f, N['sum_images']: total[k + 1],
                             N['weight_after_map']: proj, N['sum_weight_after_map']: sp},
                assumptions={})
        else:
            steps[k] = dict(
                theorem=import_law('sum_filter'),
                sorts=common_sorts,
                functions={**monoid, N['predicate']: lam(['head'], term), N['weight']: weight[k + 1]},
                definitions={N['ElementList']: sorts[k - 1]['Data'], N['filter']: f, N['sum']: total[k + 1],
                             N['guarded_weight']: proj, N['sum_guarded_weight']: sp},
                # plus(a, zero) = a holds by computation for exact integers.
                assumptions={N['zero_right']: {'Convert': {'from': call(addition, var('a'), zero), 'to': var('a')}}})
        weight[k] = lam(['head'], call(proj, var('head')))
        total[k] = sp

    projection = description['row']['projection']
    agree = dict(
        theorem=import_law('sum_congruence'),
        sorts={N['Element']: element(sorts[0]), N['Total']: I},
        functions={**monoid, N['weight']: weight[1], N['other_weight']: lam(['head'], call(projection, var('head')))},
        definitions={N['ElementList']: sorts[0]['Data'], N['sum']: total[1],
                     N['sum_other_weight']: description['decomposed']},
        # The two per-row projections agree by computation.
        assumptions={N['weights_agree']: {'Convert': {'from': weight[1]['body'],
                                                      'to': call(projection, var('head'))}}})

    # Keep only what the obligation needs: the exported definitions, the new
    # projection sums and the imported laws, with their dependency closures.
    # (The row model's library also carries unrelated maintenance entries.)
    roots = set(description['row']['definitions']) | set(description['definitions'])
    roots |= {ident for step in [*steps.values(), agree] for ident in step['definitions'].values()}
    roots |= {step['theorem'] for step in [*steps.values(), agree]}
    keep_ids, pending = set(), list(roots)
    while pending:
        ident = pending.pop()
        if ident not in keep_ids:
            keep_ids.add(ident)
            pending.extend(json.loads(objects[ident])['dependencies'])
    for ident in list(objects):
        if ident not in keep_ids:
            del objects[ident]
    bundle['lock']['objects'] = [i for i in lock if i in keep_ids] + sorted(keep_ids - set(lock))

    instance = lambda step, argument: {'Instance': {**step, 'arguments': [argument], 'premises': []}}
    rows = var('rows')
    inner = [rows]
    for stage in stages:
        inner.append(call(stage['function'], inner[-1]))
    # pipeline(rows) = fold(inner_n) = sp_n(inner_{n-1}) = ... = sp_1(rows) = decomposed(rows)
    chain = [instance(steps[k], inner[k - 1]) for k in range(n, 0, -1)] + [instance(agree, rows)]
    return {'schema': 1, 'semantics': VIEW_SEMANTICS, 'keep': keep, 'library': bundle, 'proof': trans(chain)}


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('view', type=Path, help='ink model-view output')
    parser.add_argument('-o', '--output', type=Path, required=True)
    parser.add_argument('--laws', type=Path, default=LAWS, help='checked general-law library')
    args = parser.parse_args()
    view = json.loads(args.view.read_text())
    if view['description'].get('semantics') != VIEW_SEMANTICS:
        sys.exit('unsupported view model semantics')
    args.output.write_text(json.dumps(produce(view, args.laws), separators=(',', ':')))
    print(f'wrote {args.output}; the compiler must check it with verify-view')


if __name__ == '__main__':
    main()
