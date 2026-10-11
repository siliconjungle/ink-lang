#!/usr/bin/env python3
"""Untrusted constant-control Bernstein partition laws over wrapping words."""
import argparse
import json
from math import comb
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import binary,law,value,var,word

FAMILIES=(('bernstein_cubic_constant',3),('bernstein_quintic_constant',5),('bernstein_septic_constant',7))


def product(factors):
    result=factors[0]
    for factor in factors[1:]:result=binary('*',result,factor)
    return result


def named_laws():
    entries=[]
    for t in ('U32','I32','U64'):
        s=value(t)
        x,d=var(s,'x'),var(s,'d')
        complement=binary('-',word(t,1),x)
        for name,n in FAMILIES:
            terms=[]
            for j in range(n+1):
                coefficient=comb(n,j)
                factors=([word(t,coefficient)] if coefficient!=1 else [])+[d]+[x]*j+[complement]*(n-j)
                terms.append(product(factors))
            source=terms[0]
            for item in terms[1:]:source=binary('+',source,item)
            entries.append((name+'_'+t.lower(),law({'x':s,'d':s},source,d)))
    return entries


def expanded_source(n):
    terms=[]
    for j in range(n+1):
        coefficient=comb(n,j)
        factors=([str(coefficient)] if coefficient!=1 else [])+['seed']+['x']*j+['(1-x)']*(n-j)
        terms.append('*'.join(factors))
    return '+'.join(terms)


def representative_source(t='u32'):
    return 'module Compute9;\n'+''.join(
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
                  scope='Degree3/5/7 Bernstein partition unity with equal word control values in U32/I32/U64. No F32 or bounded-input premise; vector capture/output costs remain.')
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
