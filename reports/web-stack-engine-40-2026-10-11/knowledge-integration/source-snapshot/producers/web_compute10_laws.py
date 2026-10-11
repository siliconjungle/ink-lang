#!/usr/bin/env python3
"""Untrusted centered second-difference stencils in wrapping-word arithmetic."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import binary,law,value,var,word

FAMILIES=(('cubic_difference',3),('quartic_difference',4),('quintic_difference',5))


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
            source=binary('+',binary('-',product([positive]*n),product([word(t,2)]+[x]*n)),product([negative]*n))
            if n==3:target=product([word(t,6),x,k,k])
            elif n==4:target=binary('*',product([word(t,2),k,k]),binary('+',product([word(t,6),x,x]),product([k,k])))
            else:target=binary('*',product([word(t,10),x,k,k]),binary('+',product([word(t,2),x,x]),product([k,k])))
            entries.append((name+'_'+t.lower(),law({'x':s,'k':s},source,target)))
    return entries


def expanded_source(n):
    return '*'.join(['(x+k)']*n)+'-2*'+'*'.join(['x']*n)+'+'+'*'.join(['(x-k)']*n)


def representative_source(t='u32'):
    return 'module Compute10;\n'+''.join(
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
                  scope='Centered second differences of cubic/quartic/quintic word polynomials. U32/I32/U64 wrapping rings, no F32 or numerical-accuracy claim, no artificial repetition.')
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
