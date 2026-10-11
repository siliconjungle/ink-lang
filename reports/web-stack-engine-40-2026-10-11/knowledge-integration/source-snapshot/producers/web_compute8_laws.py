#!/usr/bin/env python3
"""Untrusted static even centered-moment identities over wrapping words."""
import argparse
import json
from math import comb
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import binary,law,value,var,word

FAMILIES=(('centered_fourth_moment',4),('centered_sixth_moment',6),('centered_eighth_moment',8))


def product(factors):
    result=factors[0]
    for factor in factors[1:]:result=binary('*',result,factor)
    return result


def compact_power(base,n):
    if n==1:return base
    if n%2==0:
        half=compact_power(base,n//2)
        return binary('*',half,half)
    return binary('*',compact_power(base,n-1),base)


def named_laws():
    entries=[]
    for t in ('U32','I32','U64'):
        s=value(t)
        x,d=var(s,'x'),var(s,'d')
        for name,n in FAMILIES:
            terms=[]
            for j in range(n+1):
                coefficient=comb(n,j)
                factors=([word(t,coefficient)] if coefficient!=1 else [])+[x]*(n-j)+[d]*j
                terms.append(product(factors))
            expanded=terms[0]
            for j,item in enumerate(terms[1:],1):expanded=binary('-' if j%2 else '+',expanded,item)
            target=compact_power(binary('-',x,d),n)
            entries.append((name+'_'+t.lower(),law({'x':s,'d':s},expanded,target)))
    return entries


def expanded_source(n):
    terms=[]
    for j in range(n+1):
        coefficient=comb(n,j)
        factors=([str(coefficient)] if coefficient!=1 else [])+['x']*(n-j)+['seed']*j
        terms.append('*'.join(factors))
    result=terms[0]
    for j,item in enumerate(terms[1:],1):result+=('-' if j%2 else '+')+item
    return result


def representative_source(t='u32'):
    return 'module Compute8;\n'+''.join(
        f'fn {name}(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>{expanded_source(n)});}}\n'
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
                  scope='Static centered moments of degree4/6/8 in U32/I32/U64 wrapping rings. No F32 reassociation, synthetic recurrence count or profitability premise.')
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
