"""Pure wrapping integer statistics do not depend on insertion-sort order.

Insertion lemmas are explicit dependencies, not separate work-skipping stages.
No sortedness, associativity of callbacks, or numeric input validators required.
"""
import json
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,binary,law,op,term,value,var,word


def use(candidate,args):
    return {'Use':dict(law=identity(semantic_entry(candidate)),arguments=dict(sorted(args.items())),premises=[])}


def named_laws():
    result=[]
    for t in ['U32','I32','U64']:
        s,ls=value(t),value({'List':t});u64=value('U64')
        x,h=var(s,'x'),var(s,'head');xs,tail=var(ls,'xs'),var(ls,'tail')
        fsort=arrow(s,s);f=var(fsort,'f')
        insert=lambda a,b:op(ls,'list.insert',a,b)
        sorted_=lambda a:op(ls,'method:sort',a)
        mapping=lambda a:op(ls,'method:map',a,f)
        summed=lambda a:op(s,'call:sum',mapping(a))
        applied=lambda a:op(s,'apply',f,a)
        count=lambda a:op(u64,'call:count',a)
        insertion_case={'Cases':dict(condition=op(value('Bool'),'binary:<=',x,h),on_true='Normalize',on_false='Normalize')}
        ind=lambda step:{'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step=step)}
        contribution=law(dict(xs=ls,x=s,f=fsort),summed(insert(x,xs)),binary('+',applied(x),summed(xs)),ind(insertion_case))
        count_insert=law(dict(xs=ls,x=s),count(insert(x,xs)),binary('+',word('U64',1),count(xs)),ind(insertion_case))
        for n,v in [('insert_mapped_sum_contribution',contribution),('insert_count_contribution',count_insert)]:result.append((n+'_'+t.lower(),v))
        def sorted_proof(measure,lemma,args,middle):
            inserted=measure(insert(h,sorted_(tail)))
            return ind({'Trans':dict(middle=inserted,left='Normalize',right={'Trans':dict(middle=middle,
                left=use(lemma,args),right='Normalize')})})
        result.append(('sorted_mapped_sum_'+t.lower(),law(dict(xs=ls,f=fsort),summed(sorted_(xs)),summed(xs),
            sorted_proof(summed,contribution,dict(x=h,xs=sorted_(tail),f=f),binary('+',applied(h),summed(sorted_(tail)))),dependencies=[identity(semantic_entry(contribution))])))
        result.append(('sorted_count_'+t.lower(),law(dict(xs=ls),count(sorted_(xs)),count(xs),
            sorted_proof(count,count_insert,dict(x=h,xs=sorted_(tail)),binary('+',word('U64',1),count(sorted_(tail)))),dependencies=[identity(semantic_entry(count_insert))])))
    return result


def publish(path):
    named=named_laws();names={n:identity(semantic_entry(v)) for n,v in named}
    store=Store.publish(Path(path),[semantic_entry(v) for _,v in named],names);store.rebuild()
    (store.root/'view.json').write_bytes(canonical(store.bundle(list(names.values())))+b'\n')
    return store


def source_functions():
    rows=[]
    formulas=[('sorted_calibrated_total','x*3+k'),('sorted_squared_energy','x*x+k'),
        ('sorted_distance_total','choose(x<seed,seed-x,x-seed)'),
        ('sorted_calibrated_total_heldout','choose(x<seed,x*k,x+k)'),
        ('sorted_squared_energy_heldout','(x-seed)*(x-seed)'),
        ('sorted_distance_total_heldout','choose(x<seed,x,seed)')]
    for t in ['u32','i32','u64']:
        for label,formula in formulas:
            name=label.replace('_heldout','')+'_'+t+('_heldout' if label.endswith('_heldout') else '')
            rows.append((name,t,label,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{t}'+'{return sum(xs.sort().map(fn(x)=>'+formula+'));}'))
        name='sorted_count_'+t
        rows.append((name,t,'count',f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->u64'+'{return count(xs.sort());}'))
    return rows
