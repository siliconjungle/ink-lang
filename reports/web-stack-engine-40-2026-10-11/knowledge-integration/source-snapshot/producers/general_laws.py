#!/usr/bin/env python3
"""Untrusted producer: general (parametric) collection laws as database entries.

Every law here is stated once over abstract symbols:

  sorts       Element, Image, Source, Total
  functions   plus(Total, Total), zero(), f: Element -> Image,
              e: Source -> Element, p, q: Element -> Bool,
              g: Image -> Total, w, v: Element -> Total
  assumptions zero_right, zero_left, plus_associates, plus_commutes,
              weights_agree

and proved once by the unchanged kernel rules (induction, case splits,
congruence, computation). A concrete program reaches a law only through
`Proof::Instance`, which interprets each abstract sort by a sort, each
abstract function by a closed term, maps each parametric list/map/filter/sum
definition to an existing definition whose declaration is the instantiated
one, and proves every assumption the law rests on for that interpretation.

  sum_map         sum_g(map_f(xs))         = sum_{g.f}(xs)
  sum_filter      sum_w(filter_p(xs))      = sum_{p ? w : 0}(xs)       [zero_right]
  sum_congruence  sum_w(xs)                = sum_v(xs)                 [w = v pointwise]
  sum_append      sum_w(xs ++ ys)          = sum_w(xs) + sum_w(ys)     [monoid, commutative]
  map_append      map_f(xs ++ ys)          = map_f(xs) ++ map_f(ys)
  filter_append   filter_p(xs ++ ys)       = filter_p(xs) ++ filter_p(ys)
  map_fusion      map_f(map_e(xs))         = map_{f.e}(xs)
  filter_fusion   filter_p(filter_q(xs))   = filter_{q && p}(xs)

Binder names follow the compiler's view export (`xs`, `head`, `tail`), so the
compiler's stage functions are literal instances of `map`/`filter`/`sum`.
"""
import argparse, hashlib, json, subprocess
from pathlib import Path
from workspace import KNOWLEDGE_ROOT, compiler_path

SEMANTICS = 'first-order-inductive-equality-v1'


def var(n): return {'Var': n}
def call(f, *a): return {'Call': {'function': f, 'arguments': list(a)}}
def construct(d, i, *a): return {'Construct': {'datatype': d, 'constructor': i, 'arguments': list(a)}}
def iff(c, t, f): return {'If': {'condition': c, 'on_true': t, 'on_false': f}}
def match(s, *branches): return {'Match': {'scrutinee': s, 'branches': [{'bindings': b, 'body': t} for b, t in branches]}}
def self_call(*a): return {'SelfCall': list(a)}
def refl(t): return {'Refl': t}
def hyp(i): return {'Hypothesis': i}
def sym(p): return {'Sym': p}
def congruence(f, *proofs): return {'Call': {'function': f, 'arguments': list(proofs)}}
def construct_congruence(d, i, *proofs): return {'Construct': {'datatype': d, 'constructor': i, 'arguments': list(proofs)}}
def use(theorem, *args): return {'Use': {'theorem': theorem, 'arguments': list(args), 'premises': []}}
def substitute(hole, context, equality): return {'Substitute': {'variable': hole, 'context': context, 'equality': equality}}
def induction(variable, left, right, nil, cons):
    return {'Induction': {'variable': variable, 'from': left, 'to': right, 'cases': [
        {'bindings': [], 'proof': nil}, {'bindings': ['head', 'tail'], 'proof': cons}]}}
def split(condition, left, right, on_false, on_true):
    return {'BoolSplit': {'condition': condition, 'from': left, 'to': right, 'on_false': on_false, 'on_true': on_true}}


def trans(*proofs):
    if len(proofs) == 1:
        return proofs[0]
    mid = len(proofs) // 2
    return {'Trans': [trans(*proofs[:mid]), trans(*proofs[mid:])]}


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


class Library:
    def __init__(self, directory, compiler):
        self.directory, self.compiler = directory, compiler
        (directory / 'objects').mkdir(parents=True, exist_ok=True)
        self.names, self.order = {}, []

    def store(self, name, kind, declaration):
        deps = sorted(references(declaration))
        data = (json.dumps(dict(schema=1, semantics=SEMANTICS, name=name, dependencies=deps,
                                declaration={kind: declaration}), separators=(',', ':')) + '\n').encode()
        identity = hashlib.sha256(data).hexdigest()
        path = self.directory / 'objects' / f'{identity}.json'
        if path.exists():
            assert path.read_bytes() == data
        else:
            path.write_bytes(data)
        self.names[name] = identity
        self.order.append(identity)
        check = self.directory / 'checking.json'
        check.write_text(json.dumps(dict(schema=1, semantics=SEMANTICS, objects=[identity])))
        r = subprocess.run([str(self.compiler), 'verify-library', str(check)], capture_output=True, text=True)
        check.unlink()
        if r.returncode:
            raise SystemExit(f'{name}: {r.stderr.strip() or r.stdout.strip()}')
        print(name, ': checked', flush=True)
        return identity

    def sort(self, name):
        return {'Data': self.store(name, 'AbstractSort', dict(name=name))}

    def abstract(self, name, params, result):
        named = [[f'argument_{i}', sort] for i, sort in enumerate(params)]
        return self.store(name, 'AbstractFunction', dict(name=name, params=named, result=result))

    def list_of(self, name, element):
        return self.store(name, 'Datatype', dict(constructors=[
            dict(name='Nil', fields=[]), dict(name='Cons', fields=[element, 'SelfType'])]))

    def function(self, name, params, result, body, recursive=None):
        return self.store(name, 'Function', dict(params=params, result=result, body=body, recursive=recursive))

    def assumption(self, name, params, left, right):
        return self.store(name, 'Assumption', dict(params=params, conditions=[], **{'from': left, 'to': right}))

    def theorem(self, name, params, left, right, proof):
        return self.store(name, 'Theorem', dict(params=params, conditions=[], **{'from': left, 'to': right}, proof=proof))


def build(lib):
    E, F, D, M = lib.sort('Element'), lib.sort('Image'), lib.sort('Source'), lib.sort('Total')
    plus = lib.abstract('plus', [M, M], M)
    zero_fn = lib.abstract('zero', [], M)
    f = lib.abstract('map_function', [E], F)
    e = lib.abstract('inner_map_function', [D], E)
    p = lib.abstract('predicate', [E], 'Bool')
    q = lib.abstract('inner_predicate', [E], 'Bool')
    g = lib.abstract('image_weight', [F], M)
    w = lib.abstract('weight', [E], M)
    v = lib.abstract('other_weight', [E], M)
    zero = call(zero_fn)
    add = lambda a, b: call(plus, a, b)
    a, b, c = var('a'), var('b'), var('c')
    zero_right = lib.assumption('zero_right', [['a', M]], add(a, zero), a)
    zero_left = lib.assumption('zero_left', [['a', M]], add(zero, a), a)
    associates = lib.assumption('plus_associates', [['a', M], ['b', M], ['c', M]],
                                add(add(a, b), c), add(a, add(b, c)))
    commutes = lib.assumption('plus_commutes', [['a', M], ['b', M]], add(a, b), add(b, a))
    head, tail, xs, ys = var('head'), var('tail'), var('xs'), var('ys')
    agree = lib.assumption('weights_agree', [['head', E]], call(w, head), call(v, head))

    LE, LF, LD = (lib.list_of(n, s) for n, s in (('ElementList', E), ('ImageList', F), ('SourceList', D)))
    LEs, LFs, LDs = {'Data': LE}, {'Data': LF}, {'Data': LD}
    nil = lambda L: construct(L, 0)
    cons = lambda L, h, t: construct(L, 1, h, t)

    def mapping(name, source, target, term):
        return lib.function(name, [['xs', {'Data': source}]], {'Data': target}, match(
            xs, ([], nil(target)), (['head', 'tail'], cons(target, term, self_call(tail)))), 0)

    def filtering(name, keep):
        return lib.function(name, [['xs', LEs]], LEs, match(
            xs, ([], nil(LE)), (['head', 'tail'], iff(keep, cons(LE, head, self_call(tail)), self_call(tail)))), 0)

    def summing(name, source, item):
        return lib.function(name, [['xs', {'Data': source}]], M, match(
            xs, ([], zero), (['head', 'tail'], add(self_call(tail), item))), 0)

    def appending(name, L):
        Ls = {'Data': L}
        return lib.function(name, [['xs', Ls], ['ys', Ls]], Ls, match(
            xs, ([], ys), (['head', 'tail'], cons(L, head, self_call(tail, ys)))), 0)

    map_ = mapping('map', LE, LF, call(f, head))
    filter_ = filtering('filter', call(p, head))
    sum_images = summing('sum_images', LF, call(g, head))
    after_map = lib.function('weight_after_map', [['head', E]], M, call(g, call(f, head)))
    sum_after_map = summing('sum_weight_after_map', LE, call(after_map, head))
    sum_ = summing('sum', LE, call(w, head))
    guarded = lib.function('guarded_weight', [['head', E]], M, iff(call(p, head), call(w, head), zero))
    sum_guarded = summing('sum_guarded_weight', LE, call(guarded, head))
    sum_other = summing('sum_other_weight', LE, call(v, head))
    append = appending('append', LE)
    append_images = appending('append_images', LF)
    inner_map = mapping('inner_map', LD, LE, call(e, head))
    composed = lib.function('composed_map_function', [['head', D]], F, call(f, call(e, head)))
    composed_map = mapping('composed_map', LD, LF, call(composed, head))
    inner_filter = filtering('inner_filter', call(q, head))
    conjoined = lib.function('conjoined_predicate', [['head', E]], 'Bool',
                             iff(call(q, head), call(p, head), {'Bool': False}))
    conjoined_filter = filtering('conjoined_filter', call(conjoined, head))

    # sum_g(map_f(xs)) = sum_{g.f}(xs)
    left, right = call(sum_images, call(map_, xs)), call(sum_after_map, xs)
    lib.theorem('sum_map', [['xs', LEs]], left, right, induction(
        'xs', left, right, refl(zero),
        congruence(plus, hyp(0), refl(call(g, call(f, head))))))

    # One Boolean split on p(head), rewriting the stuck condition in context.
    def kept_or_dropped(condition, left_context, right_context, on_false, on_true, at):
        fix = lambda context: substitute('view_condition', context, hyp(1))
        cons_xs = cons(LE, head, tail)
        return split(condition, at[0](cons_xs), at[1](cons_xs),
                     trans(fix(left_context), *on_false, sym(fix(right_context))),
                     trans(fix(left_context), *on_true, sym(fix(right_context))))

    hole = var('view_condition')
    # sum_w(filter_p(xs)) = sum_{p ? w : 0}(xs)
    left, right = call(sum_, call(filter_, xs)), call(sum_guarded, xs)
    lhs = call(sum_, iff(hole, cons(LE, head, call(filter_, tail)), call(filter_, tail)))
    rhs = add(call(sum_guarded, tail), iff(hole, call(w, head), zero))
    step = kept_or_dropped(call(p, head), lhs, rhs,
                           [hyp(0), sym(use(zero_right, call(sum_guarded, tail)))],
                           [congruence(plus, hyp(0), refl(call(w, head)))],
                           (lambda t: call(sum_, call(filter_, t)), lambda t: call(sum_guarded, t)))
    lib.theorem('sum_filter', [['xs', LEs]], left, right, induction('xs', left, right, refl(zero), step))

    # sum_w(xs) = sum_v(xs) when w and v agree pointwise
    left, right = call(sum_, xs), call(sum_other, xs)
    lib.theorem('sum_congruence', [['xs', LEs]], left, right, induction(
        'xs', left, right, refl(zero), congruence(plus, hyp(0), use(agree, head))))

    # sum_w(xs ++ ys) = sum_w(xs) + sum_w(ys)
    S = lambda t: call(sum_, t)
    left, right = S(call(append, xs, ys)), add(S(xs), S(ys))
    wh = call(w, head)
    lib.theorem('sum_append', [['xs', LEs], ['ys', LEs]], left, right, induction(
        'xs', left, right, sym(use(zero_left, S(ys))),
        trans(congruence(plus, hyp(0), refl(wh)),
              use(associates, S(tail), S(ys), wh),
              congruence(plus, refl(S(tail)), use(commutes, S(ys), wh)),
              sym(use(associates, S(tail), wh, S(ys))))))

    # map_f(xs ++ ys) = map_f(xs) ++ map_f(ys)
    left, right = call(map_, call(append, xs, ys)), call(append_images, call(map_, xs), call(map_, ys))
    lib.theorem('map_append', [['xs', LEs], ['ys', LEs]], left, right, induction(
        'xs', left, right, refl(call(map_, ys)),
        construct_congruence(LF, 1, refl(call(f, head)), hyp(0))))

    # filter_p(xs ++ ys) = filter_p(xs) ++ filter_p(ys)
    left, right = call(filter_, call(append, xs, ys)), call(append, call(filter_, xs), call(filter_, ys))
    rest = call(filter_, call(append, tail, ys))
    lhs = iff(hole, cons(LE, head, rest), rest)
    rhs = call(append, iff(hole, cons(LE, head, call(filter_, tail)), call(filter_, tail)), call(filter_, ys))
    step = kept_or_dropped(call(p, head), lhs, rhs, [hyp(0)],
                           [construct_congruence(LE, 1, refl(head), hyp(0))],
                           (lambda t: call(filter_, call(append, t, ys)),
                            lambda t: call(append, call(filter_, t), call(filter_, ys))))
    lib.theorem('filter_append', [['xs', LEs], ['ys', LEs]], left, right,
                induction('xs', left, right, refl(call(filter_, ys)), step))

    # map_f(map_e(xs)) = map_{f.e}(xs)
    left, right = call(map_, call(inner_map, xs)), call(composed_map, xs)
    lib.theorem('map_fusion', [['xs', LDs]], left, right, induction(
        'xs', left, right, refl(nil(LF)),
        construct_congruence(LF, 1, refl(call(f, call(e, head))), hyp(0))))

    # filter_p(filter_q(xs)) = filter_{q && p}(xs)
    left, right = call(filter_, call(inner_filter, xs)), call(conjoined_filter, xs)
    inner_rest, fused_rest = call(inner_filter, tail), call(conjoined_filter, tail)
    lhs = call(filter_, iff(hole, cons(LE, head, inner_rest), inner_rest))
    rhs = iff(iff(hole, call(p, head), {'Bool': False}), cons(LE, head, fused_rest), fused_rest)
    d = var('fused_tail')
    same_tail = substitute('fused_tail', iff(call(p, head), cons(LE, head, d), d), hyp(0))
    step = kept_or_dropped(call(q, head), lhs, rhs, [hyp(0)], [same_tail],
                           (lambda t: call(filter_, call(inner_filter, t)), lambda t: call(conjoined_filter, t)))
    lib.theorem('filter_fusion', [['xs', LEs]], left, right,
                induction('xs', left, right, refl(nil(LE)), step))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('directory', type=Path, nargs='?', default=KNOWLEDGE_ROOT / 'general-laws')
    parser.add_argument('--compiler', type=Path, default=compiler_path('target/release/ink'))
    args = parser.parse_args()
    lib = Library(args.directory.resolve(), args.compiler.resolve())
    build(lib)
    (lib.directory / 'lock.json').write_text(
        json.dumps(dict(schema=1, semantics=SEMANTICS, objects=lib.order), indent=2) + '\n')
    (lib.directory / 'names.json').write_text(json.dumps(lib.names, indent=2) + '\n')
    r = subprocess.run([str(lib.compiler), 'verify-library', str(lib.directory / 'lock.json')],
                       capture_output=True, text=True)
    if r.returncode:
        raise SystemExit(r.stderr)
    print(f'Checked {len(lib.order)} general-law objects with the generic kernel.')


if __name__ == '__main__':
    main()
