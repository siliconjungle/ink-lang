#!/usr/bin/env python3
"""Direct same-source mapped zip fusion for arbitrary pure total callbacks.

Each element retains f, r and h's primitive grouping. Global callback scheduling
changes. Curried callback specialization uses existing checked sharing witnesses,
never a compiler rule or runtime validation requirement.
"""
import json
from pathlib import Path
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,op,value,var


def named_laws():
    rows=[]
    for t in ('U32','I32','U64','F32'):
        s,ls=value(t),value({'List':t});un=arrow(s,s);bi=arrow(s,un)
        xs=var(ls,'xs');f,r,h=var(un,'f'),var(un,'r'),var(bi,'h')
        ap=lambda fn,x:op(fn['sort']['Arrow'][1],'apply',fn,x)
        mapped=lambda fn:op(ls,'method:map',xs,fn)
        item=bound(s,0)
        source=op(ls,'method:zip',mapped(f),mapped(r),h)
        target=mapped(lam(s,ap(ap(h,ap(f,item)),ap(r,item))))
        proof={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step='Normalize')}
        rows.append(('paired_mapped_zip_'+t.lower(),law(dict(xs=ls,f=un,r=un,h=bi),source,target,proof)))
    return rows


def source_functions(held_out=False):
    rows=[]
    for t in ('u32','i32','u64','f32'):
        if held_out:
            name='paired_signal_heldout_'+t
            f='fn(x)=>choose(x>k,x,seed)';r='fn(x)=>choose(x>k,seed,x)'
            h='fn(a)=>fn(b)=>choose(a>b,a*b+seed,a+b*k)'
        else:
            name='paired_score_'+t
            f='fn(x)=>choose(x<seed,x,k)';r='fn(x)=>choose(x<seed,k,x)'
            h='fn(a)=>fn(b)=>choose(a<b,a+b*k,a-b*k)'
        body='xs.map('+f+').zip(xs.map('+r+'),'+h+')'
        rows.append((name,t,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return {body};}}'))
    return rows


def specialize(subject):
    from producers.beta_sharing17 import derive
    return derive(subject,named_laws())


def publish(output,extra=()):
    output=Path(output);named=named_laws()+list(extra)
    names={n:identity(semantic_entry(v)) for n,v in named}
    st=Store.publish(output,[semantic_entry(v) for _,v in named],names);st.rebuild()
    (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n')
    (output/'manifest.json').write_text(json.dumps(dict(schema=1,names=names,snapshot=st.snapshot_id),indent=2)+'\n')
    return st
