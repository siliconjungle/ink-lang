"""Erase unobserved wrapping scans under independent-list zip projection.

The retained list's complete values are observed only through the shortest-list
zip. The discarded stream still contributes its length, so it is replaced by
its input rather than deleting the receiver. Arbitrary initial states and pure
callbacks are checked by list induction. No floating scan law is admitted.
"""
from pathlib import Path
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, bound, lam, law, op, term, value, var, binary, word, nat
from producers.web_pipeline32_laws import chain, use, apply, expand_source


def grouped_laws():
    supports, roots = [], []
    for t in ('U32', 'I32', 'U64'):
        s, ls = value(t), value({'List': t})
        un = arrow(s, s)
        ix = arrow(value('U32'), un)
        f = var(ix, 'f')
        xs, ys, g = var(ls, 'xs'), var(ls, 'ys'), var(un, 'g')
        h, tail = var(s, 'head'), var(ls, 'tail')
        yh, yt = var(s, 'other_head'), var(ls, 'other_tail')
        state = var('Nat', '__congruence')
        cons = lambda a, b: term(ls, {'Cons': [a, b]})
        scan = lambda a, z: op(ls, 'indexed.from', a, z, f)
        for side in ('left', 'right'):
            callback = lam(s, lam(s, apply(g, bound(s, 0 if side == 'left' else 1))))
            zipper = lambda a, b: op(ls, 'method:zip', a, b, callback) if side == 'left' else op(ls, 'method:zip', b, a, callback)
            source = lambda a, b, z: zipper(scan(a, z), b)
            target = lambda a, b, z: zipper(a, b)
            function = lambda a, selected: lam(ls, lam('Nat', (target if selected else source)(a, bound(ls, 1), bound('Nat', 0))))
            app = lambda f, y, z: apply(apply(f, y), z)
            initial = var('Nat', 'initial')
            transport = law(dict(xs=ls, ys=ls, initial='Nat', f=ix, g=un), source(xs, ys, initial), app(function(xs, False), ys, initial))
            tid = identity(semantic_entry(transport))
            supports.append(('independent_' + side + '_indexed_projection_beta_' + t.lower(), transport))
            nxt = op('Nat','nat.succ',state)
            out = apply(g, yh)
            normal = cons(out, source(tail, yt, nxt))
            a = cons(out, app(function(tail, False), yt, nxt))
            b = cons(out, app(function(tail, True), yt, nxt))
            ih = {'Congruence': [{'Congruence': [{'Hypothesis': 0}, 'Normalize']}, 'Normalize']}
            step = chain(normal, 'Normalize', chain(a, {'Congruence': ['Normalize', use(tid, xs=tail, ys=yt, initial=nxt, f=f, g=g)]}, chain(b, {'Congruence': ['Normalize', ih]}, 'Normalize')))
            proof = {'Induction': dict(variable='xs', names=['head', 'tail'], base='Normalize', step={'Congruence': [{'Induction': dict(variable='__congruence', names=['other_head', 'other_tail'], base='Normalize', step={'Congruence': [step]})}]})}
            support = law(dict(xs=ls, f=ix, g=un), function(xs, False), function(xs, True), proof, dependencies=[tid])
            sid = identity(semantic_entry(support))
            supports.append(('independent_' + side + '_indexed_projection_state_' + t.lower(), support))
            zero = nat(0)
            a, b = app(function(xs, False), ys, zero), app(function(xs, True), ys, zero)
            publicproof = chain(a, 'Normalize', chain(b, {'Congruence': [{'Congruence': [use(sid, xs=xs, f=f, g=g), 'Normalize']}, 'Normalize']}, 'Normalize'))
            public = law(dict(xs=ls, ys=ls, f=ix, g=un), zipper(op(ls, 'method:map_indexed', xs, f), ys), zipper(xs, ys), publicproof, dependencies=[sid])
            roots.append(('independent_' + side + '_indexed_projection_erasure_' + t.lower(), public))
    return supports, roots


def named_laws():
    a, b = grouped_laws()
    return a + b


def law_roles():
    a, b = grouped_laws()
    return {**{n: 'proof_support' for n, _ in a}, **{n: 'optimization_endpoint' for n, _ in b}}


def publish(output, extra=()):
    rows = named_laws() + list(extra)
    objects = {identity(semantic_entry(v)): semantic_entry(v) for _, v in rows}
    names = {n: identity(semantic_entry(v)) for n, v in rows}
    store = Store.publish(Path(output), objects.values(), names)
    store.rebuild()
    (store.root / 'view.json').write_bytes(canonical(store.bundle(names.values())) + b'\n')
    return store



if __name__ == "__main__":
    publish(Path(__file__).parent / "indexed-proofability-store")
