#!/usr/bin/env python3
"""Untrusted shared mixed-radix geometric prefixes in wrapping-word rings."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import binary,bound,lam,law,op,value,var,word

FAMILIES=(('mixed_prefix6',1),('mixed_prefix12',2),('mixed_prefix24',3))


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


def shared_target(t,x,levels):
    s=value(t)
    # Existing unary beta applications reify to typed scalar Lets.
    def build(index):
        if index==levels+1:
            xx=bound(s,levels)
            base=binary('+',binary('+',word(t,1),x),xx)
            factors=[base]+[binary('+',word(t,1),bound(s,levels-j)) for j in range(1,levels+1)]
            return product(factors)
        if index==0:rhs=binary('*',x,x)
        elif index==1:rhs=binary('*',bound(s,0),x)
        else:rhs=binary('*',bound(s,0),bound(s,0))
        return op(s,'apply',lam(s,build(index+1)),rhs)
    return build(0)


def named_laws():
    entries=[]
    for t in ('U32','I32','U64'):
        s=value(t)
        x=var(s,'x')
        for name,levels in FAMILIES:
            count=3*(1<<levels)
            source=balanced_sum([word(t,1)]+[balanced_power(x,i) for i in range(1,count)])
            entries.append((name+'_'+t.lower(),law({'x':s},source,shared_target(t,x,levels))))
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
    return source_sum(['1']+[source_power(i) for i in range(1,3*(1<<levels))])


def representative_source(t='u32'):
    return 'module Compute13;\n'+''.join(
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
                  scope='Shared divisor-free6/12/24-term mixed-radix geometric prefixes for arbitrary U32/I32/U64. Static unrolled source and existing typed Lets; no F32/real-series accuracy claim or profitability premise.')
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
