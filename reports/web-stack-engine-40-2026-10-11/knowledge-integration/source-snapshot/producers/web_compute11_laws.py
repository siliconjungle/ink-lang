#!/usr/bin/env python3
"""Untrusted divisor-free geometric-prefix products in wrapping-word rings."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import binary,law,value,var,word

FAMILIES=(('geometric_prefix8',3),('geometric_prefix16',4),('geometric_prefix32',5))


def product(factors):
    result=factors[0]
    for factor in factors[1:]:result=binary('*',result,factor)
    return result


def balanced_power(base,n):
    if n==1:return base
    if n%2:return binary('*',balanced_power(base,n-1),base)
    half=balanced_power(base,n//2)
    return binary('*',half,half)


def balanced_sum(items):
    if len(items)==1:return items[0]
    middle=len(items)//2
    return binary('+',balanced_sum(items[:middle]),balanced_sum(items[middle:]))


def named_laws():
    entries=[]
    for t in ('U32','I32','U64'):
        s=value(t)
        x=var(s,'x')
        for name,levels in FAMILIES:
            source=balanced_sum([word(t,1)]+[balanced_power(x,i) for i in range(1,1<<levels)])
            factors=[binary('+',word(t,1),balanced_power(x,1<<j)) for j in range(levels)]
            entries.append((name+'_'+t.lower(),law({'x':s},source,product(factors))))
    return entries


def source_power(n):
    if n==1:return 'x'
    if n%2:return '('+source_power(n-1)+'*x)'
    half=source_power(n//2)
    return '('+half+'*'+half+')'


def source_sum(items):
    if len(items)==1:return items[0]
    middle=len(items)//2
    return '('+source_sum(items[:middle])+'+'+source_sum(items[middle:])+')'


def expanded_source(levels):
    return source_sum(['1']+[source_power(i) for i in range(1,1<<levels)])


def representative_source(t='u32'):
    return 'module Compute11;\n'+''.join(
        f'fn {name}(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>({expanded_source(levels)})*k+seed);}}\n'
        for name,levels in FAMILIES)


def publish(output):
    output=Path(output)
    named=named_laws()
    objects=[semantic_entry(candidate) for _,candidate in named]
    names={name:identity(semantic_entry(candidate)) for name,candidate in named}
    store=Store.publish(output,objects,names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest=dict(schema=1,laws=len(objects),names=names,snapshot=store.snapshot_id,
                  scope='Divisor-free8/16/32-term geometric prefixes for arbitrary U32/I32/U64. Static unrolled source, no F32/real-series accuracy claim or profitability premise.')
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
