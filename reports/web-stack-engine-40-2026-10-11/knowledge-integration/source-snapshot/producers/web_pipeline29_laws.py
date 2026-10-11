"""Cardinality erasure of unobserved scans and arbitrary indexed maps.

Two new identities, not new kernel rules. Scan is wrapping-integer only;
indexed-map callback outputs are arbitrary pure total same-type numeric values.
The existing concatenated-map identity is a reference, not new mathematics.
"""
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,binary,bound,lam,law,nat,op,value,var,word


def grouped_laws():
    supports=[];roots=[]
    for family,types in [('scan',('U32','I32','U64')),('indexed',('U32','I32','U64','F32'))]:
        for t in types:
            s,ls,u64=value(t),value({'List':t}),value('U64')
            xs,tail,head=var(ls,'xs'),var(ls,'tail'),var(s,'head')
            start_sort=s if family=='scan' else 'Nat'
            initial=var(start_sort,'n');index=value('U32');fs=arrow(index,arrow(s,s));f=var(fs,'f')
            count=lambda a:op(u64,'call:count',a)
            stage=lambda a,n:op(ls,'scan.acc',a,n) if family=='scan' else op(ls,'indexed.from',a,n,f)
            function=lambda a,selected:lam(start_sort,count(a) if selected else count(stage(a,bound(start_sort,0))))
            ap=lambda cb,arg:op(cb['sort']['Arrow'][1],'apply',cb,arg)
            params=dict(xs=ls,n=start_sort,**({} if family=='scan' else dict(f=fs)))
            transport=law(params,count(stage(xs,initial)),ap(function(xs,False),initial))
            tid=identity(semantic_entry(transport));supports.append((family+'_cardinality_beta_transport_'+t.lower(),transport))
            start=var(start_sort,'__congruence');nxt=binary('+',start,head) if family=='scan' else op('Nat','nat.succ',start)
            increment=lambda rest:binary('+',word('U64',1),rest)
            a0=increment(count(stage(tail,nxt)));a1=increment(ap(function(tail,False),nxt));a2=increment(ap(function(tail,True),nxt))
            args=dict(xs=tail,n=nxt,**({} if family=='scan' else dict(f=f)))
            use={'Use':dict(law=tid,arguments=dict(sorted(args.items())),premises=[])}
            step={'Trans':dict(middle=a0,left='Normalize',right={'Trans':dict(middle=a1,left={'Congruence':['Normalize',use]},right={'Trans':dict(middle=a2,left={'Congruence':['Normalize',{'Congruence':[{'Hypothesis':0},'Normalize']}]},right='Normalize')})})}
            functional={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Congruence':[step]})}
            zero=word(t,0) if family=='scan' else nat(0)
            a=ap(function(xs,False),zero);b=ap(function(xs,True),zero)
            proof={'Trans':dict(middle=a,left='Normalize',right={'Trans':dict(middle=b,left={'Congruence':[functional,'Normalize']},right='Normalize')})}
            public=op(ls,'method:scan',xs) if family=='scan' else op(ls,'method:map_indexed',xs,f)
            roots.append((family+'_cardinality_erasure_'+t.lower(),law(dict(xs=ls,**({} if family=='scan' else dict(f=fs))),count(public),count(xs),proof,dependencies=[tid])))
    return supports,roots


def named_laws():
    supports,roots=grouped_laws();return supports+roots


def optimization_laws():return grouped_laws()[1]


def law_roles():
    supports,roots=grouped_laws()
    return {**{n:'proof_support' for n,_ in supports},**{n:'optimization_endpoint' for n,_ in roots}}


def reference_laws():
    from producers.web_sequence_laws import named_laws as old
    return [(n,v) for n,v in old() if n in {'concat_map_fusion_'+t for t in ('u32','i32','u64','f32')}]


def specialize(subject,core=None):
    from producers.beta_sharing17 import derive
    from producers.definition_context28 import bind
    rows=derive(subject,optimization_laws()+reference_laws())
    if core is not None:rows=[(name,bind(v,core,subject)) for name,v in rows]
    return rows


def source_functions(held_out=False):
    rows=[]
    for t in ('u32','i32','u64','f32'):
        suffix='_heldout' if held_out else ''
        predicate='choose(x>seed,x<k,x==k)' if held_out else 'choose(x<seed,x<k,x>k)'
        indexed=('choose(rem_or(i,5,0)<2,choose(x>k,x-seed,x+k),x*k-seed)' if held_out else
                 'choose(rem_or(i,3,0)==0,x*k+seed,choose(x<seed,seed-x,x+k))')
        mapper='choose(x>k,seed-x,x+seed)' if held_out else 'choose(x<seed,x*k+seed,x-k)'
        accept=f'fn accepted(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.filter(fn(x)=>passes(x,seed,k));}}\nfn passes(x:{t},seed:{t},k:{t})->Bool{{return {predicate};}}'
        callbacks=f'\nfn indexed_value(i:u32,x:{t},seed:{t},k:{t})->{t}{{return {indexed};}}'
        for family in ('scan','indexed','merged'):
            if family=='scan' and t=='f32':continue
            name='pipeline_'+family+'_telemetry'+suffix+'_'+t
            if family=='merged':
                source=f'pub fn {name}(xs:List<{t}>,ys:List<{t}>,seed:{t},k:{t})->List<{t}>'+'{return xs.map(fn(x)=>calibrate(x,seed,k)).concat(ys.map(fn(x)=>calibrate(x,seed,k)));}\n'+f'fn calibrate(x:{t},seed:{t},k:{t})->{t}'+'{return '+mapper+';}'
            else:
                stage='accepted(xs,seed,k).scan()' if family=='scan' else 'accepted(xs,seed,k).map_indexed(fn(i)=>fn(x)=>indexed_value(i,x,seed,k))'
                source=f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->u64'+'{return count('+stage+');}\n'+accept+(callbacks if family=='indexed' else '')
            rows.append((name,t,source))
    return rows


def publish(output,extra=()):
    output=Path(output);rows=named_laws()+reference_laws()+list(extra)
    objects={identity(semantic_entry(v)):semantic_entry(v) for _,v in rows};names={n:identity(semantic_entry(v)) for n,v in rows}
    store=Store.publish(output,objects.values(),names);store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(list(names.values())))+b'\n')
    return store
