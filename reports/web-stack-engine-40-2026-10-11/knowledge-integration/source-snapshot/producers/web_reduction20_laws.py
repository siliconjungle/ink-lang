"""Same-source zip producer fused into an arbitrary ordered right-fold.

Both callbacks are pure and total. Each callback's primitive grouping and the
right-fold accumulator order survive, including F32. The global schedule of h
changes from forward materialization to reverse consumption. No associativity
or cancellation premise is used; no claim of automatic profitability is made.
"""
import json
from pathlib import Path
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, bound, lam, law, op, value, var


def fold_laws():
    rows=[]
    for t in ('U32','I32','U64','F32'):
        s,ls=value(t),value({'List':t});bi=arrow(s,arrow(s,s))
        xs,z,h,g=var(ls,'xs'),var(s,'z'),var(bi,'h'),var(bi,'g')
        ap=lambda fn,x:op(fn['sort']['Arrow'][1],'apply',fn,x)
        source=op(s,'call:foldr',op(ls,'method:zip',xs,xs,h),z,g)
        item,acc=bound(s,1),bound(s,0)
        reducer=lam(s,lam(s,ap(ap(g,ap(ap(h,item),item)),acc)))
        target=op(s,'call:foldr',xs,z,reducer)
        proof={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step='Normalize')}
        rows.append(('self_zip_arbitrary_ordered_fold_'+t.lower(),
                     law(dict(xs=ls,z=s,h=bi,g=bi),source,target,proof)))
    return rows


def composed_zip_laws():
    """Fresh direct endpoints composed from old identity-map and zip17.

    These are deployments of existing mathematics, not new primitive laws.
    """
    from producers.semantic_laws import examples
    from producers.web_zip17_laws import grouped_laws
    old=dict(grouped_laws()[1]);rows=[]
    for t in ('U32','I32','U64','F32'):
        s,ls=value(t),value({'List':t});un=arrow(s,s);bi=arrow(s,un)
        xs,ys,h,g=var(ls,'xs'),var(ls,'ys'),var(bi,'h'),var(un,'g')
        ident=lam(s,bound(s,0))
        identity_map=next(v for v in examples() if v['from']==op(ls,'method:map',xs,ident) and v['to']==xs)
        prior=old['independent_left_mapped_zip_postmap_'+t.lower()]
        ap=lambda fn,x:op(fn['sort']['Arrow'][1],'apply',fn,x)
        source=op(ls,'method:map',op(ls,'method:zip',xs,ys,h),g)
        middle=op(ls,'method:map',op(ls,'method:zip',op(ls,'method:map',xs,ident),ys,h),g)
        expanded=op(ls,'method:zip',xs,ys,lam(s,lam(s,ap(g,ap(ap(h,ap(ident,bound(s,1))),bound(s,0))))))
        target=op(ls,'method:zip',xs,ys,lam(s,lam(s,ap(g,ap(ap(h,bound(s,1)),bound(s,0))))))
        def use(candidate,args):return {'Use':dict(law=identity(semantic_entry(candidate)),arguments=dict(sorted(args.items())),premises=[])}
        insert={'Congruence':[{'Congruence':[{'Sym':use(identity_map,dict(xs=xs))},'Normalize','Normalize']},'Normalize']}
        proof={'Trans':dict(middle=middle,left=insert,right={'Trans':dict(middle=expanded,left=use(prior,dict(xs=xs,ys=ys,f=ident,h=h,g=g)),right='Normalize')})}
        rows.append(('independent_plain_zip_postmap_'+t.lower(),law(dict(xs=ls,ys=ls,h=bi,g=un),source,target,proof,dependencies=[identity(semantic_entry(identity_map)),identity(semantic_entry(prior))])))
    return rows


def named_laws():return fold_laws()+composed_zip_laws()


def dependency_objects():
    st=Store(Path(__file__).resolve().parents[1]);objects={}
    def add(oid):
        if oid in objects:return
        entry=st.object(oid);objects[oid]=entry
        for child in entry['dependencies']:add(child)
    for _,v in composed_zip_laws():
        for oid in v['dependencies']:add(oid)
    return list(objects.values())


def source_functions(held_out=False):
    rows=[]
    for t in ('u32','i32','u64','f32'):
        if held_out:
            name='paired_ordered_signal_heldout_'+t
            h='fn(a)=>fn(b)=>choose(a>k,a*b+seed,a+b*k)'
            g='fn(v)=>fn(acc)=>choose(v<seed,v+acc*k,v-acc)'
        else:
            name='paired_ordered_score_'+t
            h='fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b*k)'
            g='fn(v)=>fn(acc)=>choose(acc<seed,v-acc,v+acc*k)'
        body='foldr(xs.zip(xs,'+h+'),seed,'+g+')'
        rows.append((name,t,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{t}{{return {body};}}'))
    return rows


def vector_source_functions(held_out=False):
    rows=[]
    for t in ('u32','i32','u64','f32'):
        if held_out:
            name='paired_contrast_heldout_'+t
            h='fn(a)=>fn(b)=>choose(a>b,a-b,b-a)'
            g='fn(v)=>choose(v<seed,v*k,v+seed)'
        else:
            name='paired_calibrated_'+t
            h='fn(a)=>fn(b)=>choose(a<seed,a+b*k,a-b*k)'
            g='fn(v)=>choose(v>k,v-seed,v+seed)'
        body='xs.zip(ys,'+h+').map('+g+')'
        rows.append((name,t,f'pub fn {name}(xs:List<{t}>,ys:List<{t}>,seed:{t},k:{t})->List<{t}>{{return {body};}}'))
    return rows


def specialize(subject):
    from producers.beta_sharing17 import derive
    return derive(subject,named_laws())


def publish(output,extra=()):
    output=Path(output);named=named_laws()+list(extra)
    names={n:identity(semantic_entry(v)) for n,v in named}
    st=Store.publish(output,dependency_objects()+[semantic_entry(v) for _,v in named],names);st.rebuild()
    (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n')
    (output/'manifest.json').write_text(json.dumps(dict(schema=1,names=names,snapshot=st.snapshot_id),indent=2)+'\n')
    return st
