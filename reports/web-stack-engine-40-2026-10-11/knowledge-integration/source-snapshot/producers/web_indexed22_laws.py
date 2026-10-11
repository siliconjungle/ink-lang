"""Same-input indexed zip fusions, with generalized Nat-offset induction.

Arbitrary pure total callbacks retain each element's exact primitive grouping.
Global callback stages interleave; output length/order and U32 index wrapping stay.
These public deployment endpoints are distinct from earlier unary indexed fusions.
"""
import json
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,nat,op,term,value,var


def grouped_laws():
    supports=[];roots=[]
    for t in ('U32','I32','U64','F32'):
        s,ls=value(t),value({'List':t});index=value('U32');un=arrow(s,s);ix=arrow(index,un);bi=arrow(s,un)
        xs=var(ls,'xs');n=var('Nat','n');tail=var(ls,'tail');head=var(s,'head')
        ap=lambda fn,arg:op(fn['sort']['Arrow'][1],'apply',fn,arg)
        indexed=lambda a,start,fn:op(ls,'indexed.from',a,start,fn)
        public=lambda a,fn:op(ls,'method:map_indexed',a,fn)
        for family in ('indexed_both_zip','indexed_left_zip','indexed_right_zip'):
            f,g,h=var(ix,'f'),var(ix,'g'),var(bi,'h')
            params=dict(xs=ls,h=bi)
            if family!='indexed_right_zip':params['f']=ix
            if family!='indexed_left_zip':params['g']=ix
            callbacks={k:var(sort,k) for k,sort in params.items() if k!='xs'}
            def combine(i,x):
                left=x if family=='indexed_right_zip' else ap(ap(f,i),x)
                right=x if family=='indexed_left_zip' else ap(ap(g,i),x)
                return ap(ap(h,left),right)
            fused=lam(index,lam(s,combine(bound(index,1),bound(s,0))))
            def source(a,start):
                left=a if family=='indexed_right_zip' else indexed(a,start,f)
                right=a if family=='indexed_left_zip' else indexed(a,start,g)
                return op(ls,'method:zip',left,right,h)
            target=lambda a,start:indexed(a,start,fused)
            function=lambda a,selected:lam('Nat',(target if selected else source)(a,bound('Nat',0)))
            transport=law(dict(params,n='Nat'),source(xs,n),ap(function(xs,False),n));tid=identity(semantic_entry(transport));supports.append((family+'_beta_transport_'+t.lower(),transport))
            start=var('Nat','__congruence');next_index=op('Nat','nat.succ',start);combined=combine(op(index,'nat.word',start),head);cons=lambda x:term(ls,{'Cons':[combined,x]})
            a0=cons(source(tail,next_index));a1=cons(ap(function(tail,False),next_index));a2=cons(ap(function(tail,True),next_index))
            use={'Use':dict(law=tid,arguments=dict(sorted(dict(callbacks,xs=tail,n=next_index).items())),premises=[])}
            step={'Trans':dict(middle=a0,left='Normalize',right={'Trans':dict(middle=a1,left={'Congruence':['Normalize',use]},right={'Trans':dict(middle=a2,left={'Congruence':['Normalize',{'Congruence':[{'Hypothesis':0},'Normalize']}]},right='Normalize')})})}
            functional={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Congruence':[step]})}
            a=ap(function(xs,False),nat(0));b=ap(function(xs,True),nat(0));proof={'Trans':dict(middle=a,left='Normalize',right={'Trans':dict(middle=b,left={'Congruence':[functional,'Normalize']},right='Normalize')})}
            left=xs if family=='indexed_right_zip' else public(xs,f);right=xs if family=='indexed_left_zip' else public(xs,g)
            roots.append((family+'_fusion_'+t.lower(),law(params,op(ls,'method:zip',left,right,h),public(xs,fused),proof,dependencies=[tid])))
    return supports,roots


def named_laws():
    supports,roots=grouped_laws();return supports+roots

def optimization_laws():return grouped_laws()[1]


def source_functions(held_out=False):
    rows=[]
    for t in ('u32','i32','u64','f32'):
        for family in ('indexed_both_zip','indexed_left_zip','indexed_right_zip'):
            name=family+('_heldout' if held_out else '')+'_'+t
            if held_out:
                f='fn(i)=>fn(x)=>choose(rem_or(i,3,0)==0,choose(x>k,x,seed),x+k)'
                g='fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,seed-x,x*3)'
                h='fn(a)=>fn(b)=>choose(a>b,a*b+seed,a+b*k)'
            else:
                f='fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,x+k,x-seed)'
                g='fn(i)=>fn(x)=>choose(rem_or(i,3,0)==0,x*3+k,x+seed)'
                h='fn(a)=>fn(b)=>choose(a<b,a+b*k,a-b*k)'
            left='xs' if family=='indexed_right_zip' else 'xs.map_indexed('+f+')'
            right='xs' if family=='indexed_left_zip' else 'xs.map_indexed('+g+')'
            rows.append((name,t,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return {left}.zip({right},{h});}}'))
    return rows


def specialize(subject):
    from producers.beta_sharing17 import derive
    return derive(subject,optimization_laws())


def publish(output,extra=()):
    output=Path(output);rows=named_laws()+list(extra);names={n:identity(semantic_entry(v)) for n,v in rows};st=Store.publish(output,[semantic_entry(v) for _,v in rows],names);st.rebuild()
    (output/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n');(output/'manifest.json').write_text(json.dumps(dict(schema=1,names=names,snapshot=st.snapshot_id),indent=2)+'\n');return st
