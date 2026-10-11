#!/usr/bin/env python3
"""Untrusted captured contribution/blend/compensation recurrence proofs."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import binary,bound,lam,law,op,value,var,word


def induction():
    return {'Induction':dict(variable='n',names=['previous_count'],base='Normalize',step='Normalize')}


def branch_proof(repeat,result):
    return {'Trans':dict(middle=repeat,left='Normalize',right={
        'Trans':dict(middle=result,left=induction(),right='Normalize')})}


def named_laws():
    entries=[]
    for t in ('U32','I32','U64'):
        s=value(t)
        n,x,k,d,v=var('Nat','n'),var(s,'x'),var(s,'k'),var(s,'d'),var(s,'offset')
        c,a=var(value('Bool'),'c'),bound(s,0)
        count=op(s,'nat.word',n)
        def choose(yes,no):return op(s,'call:choose',c,yes,no)
        def repeat(body):return op(s,'call:repeat',n,x,lam(value('U32'),lam(s,body)))
        def translated(increment):return binary('+',x,binary('*',count,increment))
        left=binary('*',a,k)
        right=binary('*',binary('-',d,a),k)
        body=binary('+',binary('+',a,choose(left,right)),choose(right,left))
        yes=binary('+',binary('+',a,left),right)
        no=binary('+',binary('+',a,right),left)
        result=translated(binary('*',d,k))
        proof={'Cases':dict(condition=c,on_false=branch_proof(repeat(no),result),on_true=branch_proof(repeat(yes),result))}
        entries.append((f'complementary_contribution_repeat_{t.lower()}',law(
            {'n':'Nat','x':s,'k':s,'d':s,'c':value('Bool')},repeat(body),result,proof)))

        def weighted(weight):
            return binary('+',binary('*',a,weight),binary('*',binary('+',a,v),binary('-',word(t,1),weight)))
        complement_k,complement_d=binary('-',word(t,1),k),binary('-',word(t,1),d)
        body=binary('+',choose(binary('*',a,k),binary('*',a,d)),
                    choose(binary('*',binary('+',a,v),complement_k),binary('*',binary('+',a,v),complement_d)))
        result=translated(binary('*',v,choose(complement_k,complement_d)))
        proof={'Cases':dict(condition=c,
            on_false=branch_proof(repeat(weighted(d)),translated(binary('*',v,complement_d))),
            on_true=branch_proof(repeat(weighted(k)),translated(binary('*',v,complement_k))))}
        entries.append((f'conditional_blend_repeat_{t.lower()}',law(
            {'n':'Nat','x':s,'k':s,'d':s,'offset':s,'c':value('Bool')},repeat(body),result,proof)))

        def compensated(old,new):
            return binary('-',binary('+',binary('+',binary('-',a,old),new),old),new)
        yes,no=compensated(d,k),compensated(k,d)
        proof={'Cases':dict(condition=c,on_false=branch_proof(repeat(no),x),on_true=branch_proof(repeat(yes),x))}
        entries.append((f'compensated_patch_repeat_{t.lower()}',law(
            {'n':'Nat','x':s,'k':s,'d':s,'c':value('Bool')},repeat(choose(yes,no)),x,proof)))
    return entries


def representative_source(repetitions=64,t='u32'):
    return f'''module Compute6;
fn contribution_repeat(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>repeat({repetitions},x,fn(i)=>fn(a)=>a+choose(x<seed,a*k,(seed-a)*k)+choose(x<seed,(seed-a)*k,a*k))+seed);}}
fn conditional_blend(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>repeat({repetitions},x,fn(i)=>fn(a)=>choose(x<seed,a*k,a*seed)+choose(x<seed,(a+seed)*(1-k),(a+seed)*(1-seed)))+seed);}}
fn compensated_patch(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>repeat({repetitions},x,fn(i)=>fn(a)=>choose(x<seed,a-seed+k+seed-k,a-k+seed+k-seed))+seed);}}
'''


def publish(output):
    output=Path(output)
    named=named_laws()
    objects=[semantic_entry(candidate) for _,candidate in named]
    names={name:identity(semantic_entry(candidate)) for name,candidate in named}
    store=Store.publish(output,objects,names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest=dict(schema=1,laws=len(objects),names=names,snapshot=store.snapshot_id,
                  scope='Wrapping words and captured Bool decisions; universal Nat recurrence laws. Benchmark instances are explicit synthetic64-step kernels, not real-application claims.')
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return store,manifest


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store',type=Path,required=True)
    parser.add_argument('--examples',type=Path)
    parser.add_argument('--repeat-count',type=int,default=64)
    args=parser.parse_args()
    _,manifest=publish(args.output_store)
    if args.examples:
        args.examples.write_text(representative_source(args.repeat_count))
    print(json.dumps(manifest))
