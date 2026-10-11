"""Erase unobserved indexed mapping under independent-list zip projection.

The retained list's complete values are observed only through the shortest-list
zip. The discarded stream still contributes its length, so it is replaced by
its input rather than deleting the receiver. Arbitrary Nat starting indices and pure
callbacks are checked by list induction. The initial deployment scope is U32/I32/U64; no float claim.
"""
from pathlib import Path
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, bound, lam, law, op, term, value, var, binary, word, nat
from producers.web_pipeline32_laws import chain, use, apply


def grouped_laws():
    supports, roots = [], []
    for t in ('U32', 'I32', 'U64'):
        s, ls = value(t), value({'List': t})
        un = arrow(s, s)
        ix = arrow(value('U32'), un)
        f = var(ix, 'f')
        xs, ys, g = var(ls, 'xs'), var(ls, 'ys'), var(un, 'g')
        tail = var(ls, 'tail')
        yh, yt = var(s, 'other_head'), var(ls, 'other_tail')
        state = var('Nat', '__congruence')
        cons = lambda a, b: term(ls, {'Cons': [a, b]})
        indexed = lambda a, z: op(ls, 'indexed.from', a, z, f)
        for side in ('left', 'right'):
            callback = lam(s, lam(s, apply(g, bound(s, 0 if side == 'left' else 1))))
            zipper = lambda a, b: op(ls, 'method:zip', a, b, callback) if side == 'left' else op(ls, 'method:zip', b, a, callback)
            source = lambda a, b, z: zipper(indexed(a, z), b)
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




PRIOR_SNAPSHOT=Path(__file__).resolve().parents[1]/'store/snapshots/7f5e7a94b49db567af55f5d1129dd07c5e2b469ebd45cb6e5cbc53595782b2be.json'


def source_functions(held_out=False):
    rows=[]
    for side in ('left','right'):
        name='pipeline37_'+side+'_projection'+('_heldout' if held_out else '')+'_u32'
        discarded,selected=('xs','ys') if side=='left' else ('ys','xs')
        indexed=discarded+'.map_indexed(fn(i)=>fn(x)=>discarded_index(i,x,seed,k))'
        cb='fn(unused)=>fn(y)=>selected_word(y,seed,k)' if side=='left' else 'fn(y)=>fn(unused)=>selected_word(y,seed,k)'
        expr=indexed+'.zip('+selected+','+cb+')' if side=='left' else selected+'.zip('+indexed+','+cb+')'
        if held_out:
            helpers='\nfn discarded_index(i:u32,x:u32,seed:u32,k:u32)->u32{return index_signal(i,x,seed,k); }\nfn index_signal(i:u32,x:u32,seed:u32,k:u32)->u32{return quot_or(x,k,0)+rem_or(i,k,0)+seed;}\nfn selected_word(y:u32,seed:u32,k:u32)->u32{return repair_word(y,seed,k);}\nfn repair_word(y:u32,seed:u32,k:u32)->u32{return choose(y<seed,quot_or(y,k,0)+seed,rem_or(y,k,0)+k);}'
        else:
            helpers='\nfn discarded_index(i:u32,x:u32,seed:u32,k:u32)->u32{return choose(i<seed,(x+k)+i,x-seed);}\nfn selected_word(y:u32,seed:u32,k:u32)->u32{return choose(y<seed,y+k,y-k);}'
        rows.append((name,'u32',f'pub fn {name}(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>'+'{return '+expr+';}'+helpers))
    return rows


def specialize(subject,core=None):
    from producers.beta_specialization15 import free_parameters,outside_lambda_positions,lift_use,instantiate_bound
    from producers.beta_sharing17 import beta_share
    from producers.definition_context28 import bind
    from ink_planner.semantic_search import replace,substitute,children
    generic=dict(grouped_laws()[1]);rows=[]
    def occurs(v,depth):
        n=v['node']
        if isinstance(n,dict) and 'Bound' in n:return n['Bound']==depth
        return any(occurs(c,depth+int(isinstance(n,dict) and 'Lambda' in n)) for c in children(v))
    for fn,body in sorted(subject['functions'].items()):
        current,proof,deps,hit=body,'Normalize',[],False
        for _ in range(8):
            found=False
            for path,node in outside_lambda_positions(current):
                n=node['node']
                if not isinstance(n,dict) or n.get('Op',[None])[0]!='method:zip':continue
                left,right,callback=n['Op'][1];cb=callback['node']
                if not isinstance(cb,dict) or 'Lambda' not in cb:continue
                inner=cb['Lambda']
                if not isinstance(inner['node'],dict) or 'Lambda' not in inner['node']:continue
                for side in ('left','right'):
                    discarded,other=(left,right) if side=='left' else (right,left);dn=discarded['node']
                    if not isinstance(dn,dict) or dn.get('Op',[None])[0]!='method:map_indexed':continue
                    t=discarded['sort']['Value']['List']
                    if t not in ('U32','I32','U64'):continue
                    s=value(t)
                    if side=='left':
                        if occurs(inner['node']['Lambda'],1):continue
                        g=instantiate_bound(inner,word(t,0))
                    else:
                        if occurs(inner['node']['Lambda'],0):continue
                        g=lam(s,instantiate_bound(inner['node']['Lambda'],word(t,0)))
                    rule=generic['independent_'+side+'_indexed_projection_erasure_'+t.lower()]
                    args=dict(xs=dn['Op'][1][0],ys=other,f=dn['Op'][1][1],g=g);gid=identity(semantic_entry(rule))
                    expanded=replace(current,path,substitute(rule['from'],args));middle=replace(current,path,substitute(rule['to'],args))
                    witness=chain(expanded,'Normalize',chain(middle,lift_use(expanded,path,use(gid,**args)),'Normalize'))
                    proof=chain(current,proof,witness);current=beta_share(middle);deps.append(gid);found,hit=True,True
                    break
                if found:break
            if not found:break
        if hit:
            candidate=law(free_parameters(body),body,current,proof,dependencies=sorted(set(deps)))
            rows.append((fn+'_independent_indexed_erasure',bind(candidate,core,subject) if core is not None else candidate))
    return rows
