#!/usr/bin/env python3
"""Untrusted antisymmetric centered-power differences in wrapping words."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import binary,bound,lam,law,op,value,var,word

FAMILIES=(('cubic_odd_difference',3),('quartic_odd_difference',4),('quintic_odd_difference',5))


def product(factors):
    result=factors[0]
    for factor in factors[1:]:result=binary('*',result,factor)
    return result


def named_laws():
    entries=[]
    for t in ('U32','I32','U64'):
        s=value(t)
        x,k=var(s,'x'),var(s,'k')
        positive,negative=binary('+',x,k),binary('-',x,k)
        for name,n in FAMILIES:
            source=binary('-',product([positive]*n),product([negative]*n))
            if n==3:target=binary('*',product([word(t,2),k]),binary('+',product([word(t,3),x,x]),product([k,k])))
            elif n==4:target=binary('*',product([word(t,8),x,k]),binary('+',product([x,x]),product([k,k])))
            else:
                # Existing unary beta/let semantics explicitly share both squares.
                xx,kk=bound(s,1),bound(s,0)
                horner=binary('+',binary('*',product([word(t,5),xx]),binary('+',xx,product([word(t,2),kk]))),product([kk,kk]))
                body=binary('*',product([word(t,2),k]),horner)
                inner=op(s,'apply',lam(s,body),product([k,k]))
                target=op(s,'apply',lam(s,inner),product([x,x]))
            entries.append((name+'_'+t.lower(),law({'x':s,'k':s},source,target)))
    return entries


def expanded_source(n):
    return '*'.join(['(x+k)']*n)+'-'+'*'.join(['(x-k)']*n)


def representative_source(t='u32'):
    return 'module Compute12;\n'+''.join(
        f'fn {name}(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>{expanded_source(n)}+seed);}}\n'
        for name,n in FAMILIES)


def publish(output):
    output=Path(output)
    named=named_laws()
    objects=[semantic_entry(candidate) for _,candidate in named]
    names={name:identity(semantic_entry(candidate)) for name,candidate in named}
    store=Store.publish(output,objects,names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest=dict(schema=1,laws=len(objects),names=names,snapshot=store.snapshot_id,
                  scope='Antisymmetric cubic/quartic/quintic centered differences in U32/I32/U64, with existing beta/let sharing for quintic. No F32 or derivative-accuracy claim.')
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return store,manifest


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store',type=Path,required=True)
    parser.add_argument('--examples',type=Path)
    args=parser.parse_args()
    _,manifest=publish(args.output_store)
    if args.examples:args.examples.write_text(representative_source())
    print(json.dumps(manifest))
