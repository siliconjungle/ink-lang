"""Index-preserving structural fusion with arbitrary pure total callbacks.

Public endpoints reify to one map_indexed. Proofs generalize the internal Nat
start index, so a recursive tail does not incorrectly reset the public index.
Each element's F32 expression grouping is unchanged; callback scheduling changes.
"""
import json
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,nat,op,term,value,var


def grouped_laws():
    support=[];roots=[]
    for t in ('U32','I32','U64','F32'):
        s,ls=value(t),value({'List':t});index=value('U32');un=arrow(s,s);ix=arrow(index,un)
        xs=var(ls,'xs');n=var('Nat','n');tx=var(ls,'tail');head=var(s,'head')
        for family in ('map_indexed','indexed_map','indexed_indexed'):
            fs=un if family=='map_indexed' else ix;gs=un if family=='indexed_map' else ix
            f,g=var(fs,'f'),var(gs,'g')
            ap=lambda fn,arg:op(fn['sort']['Arrow'][1],'apply',fn,arg)
            mapped=lambda a,fn:op(ls,'method:map',a,fn)
            indexed=lambda a,start,fn:op(ls,'indexed.from',a,start,fn)
            def combine(i,x):
                first=ap(f,x) if family=='map_indexed' else ap(ap(f,i),x)
                return ap(g,first) if family=='indexed_map' else ap(ap(g,i),first)
            fused=lam(index,lam(s,combine(bound(index,1),bound(s,0))))
            def source(a,start):
                if family=='map_indexed':return indexed(mapped(a,f),start,g)
                if family=='indexed_map':return mapped(indexed(a,start,f),g)
                return indexed(indexed(a,start,f),start,g)
            def target(a,start):return indexed(a,start,fused)
            def function(a,selected):return lam('Nat',(target if selected else source)(a,bound('Nat',0)))
            params=dict(xs=ls,n='Nat',f=fs,g=gs)
            transport=law(params,source(xs,n),ap(function(xs,False),n))
            tid=identity(semantic_entry(transport));support.append(('indexed_'+family+'_beta_transport_'+t.lower(),transport))
            start=var('Nat','__congruence');next_index=op('Nat','nat.succ',start)
            combined=combine(op(index,'nat.word',start),head)
            cons=lambda tail:term(ls,{'Cons':[combined,tail]})
            a0=cons(source(tx,next_index));a1=cons(ap(function(tx,False),next_index));a2=cons(ap(function(tx,True),next_index))
            use={'Use':dict(law=tid,arguments=dict(sorted(dict(xs=tx,n=next_index,f=f,g=g).items())),premises=[])}
            step={'Trans':dict(middle=a0,left='Normalize',right={'Trans':dict(middle=a1,left={'Congruence':['Normalize',use]},right={'Trans':dict(middle=a2,left={'Congruence':['Normalize',{'Congruence':[{'Hypothesis':0},'Normalize']}]},right='Normalize')})})}
            functional={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Congruence':[step]})}
            a=ap(function(xs,False),nat(0));b=ap(function(xs,True),nat(0))
            proof={'Trans':dict(middle=a,left='Normalize',right={'Trans':dict(middle=b,left={'Congruence':[functional,'Normalize']},right='Normalize')})}
            public_indexed=lambda a,fn:op(ls,'method:map_indexed',a,fn)
            if family=='map_indexed':left=public_indexed(mapped(xs,f),g)
            elif family=='indexed_map':left=mapped(public_indexed(xs,f),g)
            else:left=public_indexed(public_indexed(xs,f),g)
            roots.append((family+'_fusion_'+t.lower(),law(dict(xs=ls,f=fs,g=gs),left,public_indexed(xs,fused),proof,dependencies=[tid])))
    return support,roots


def named_laws():
    supports,roots=grouped_laws();return supports+roots


def optimization_laws():return grouped_laws()[1]


def source_functions(held_out=False):
    rows=[]
    for t in ('u32','i32','u64','f32'):
        for family in ('map_indexed','indexed_map','indexed_indexed'):
            suffix='_heldout' if held_out else ''
            name=family+suffix+'_'+t
            unary='fn(x)=>choose(x>k,x-seed,seed-x)' if held_out else 'fn(x)=>choose(x<seed,x+k,x-k)'
            first='fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x+k,x-seed)'
            second='fn(i)=>fn(x)=>choose(rem_or(i,3,0)==0,x*k,x+seed)' if held_out else 'fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x*k,x+seed)'
            if family=='map_indexed':body='xs.map('+unary+').map_indexed('+second+')'
            elif family=='indexed_map':body='xs.map_indexed('+first+').map('+unary+')'
            else:body='xs.map_indexed('+first+').map_indexed('+second+')'
            rows.append((name,t,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return {body};}}'))
    return rows


def specialize(subject):
    from producers.beta_sharing17 import derive
    return derive(subject,optimization_laws())


def publish(output,extra=()):
    output=Path(output);named=named_laws()+list(extra)
    names={n:identity(semantic_entry(v)) for n,v in named};st=Store.publish(output,[semantic_entry(v) for _,v in named],names);st.rebuild()
    (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n')
    (output/'manifest.json').write_text(json.dumps(dict(schema=1,names=names,snapshot=st.snapshot_id),indent=2)+'\n')
    return st
