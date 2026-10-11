#!/usr/bin/env python3
"""Untrusted linear net-total and ignored-head reduction elimination laws."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import binary, bound, lam, law, op, value, var, word


def induction():
    return {'Induction': dict(variable='xs', names=['head', 'tail'],
                             base='Normalize', step='Normalize')}


def named_laws():
    entries = []
    for t in ('U32', 'I32', 'U64', 'F32'):
        s, ls = value(t), value({'List': t})
        xs, z = var(ls, 'xs'), var(s, 'z')
        fold = op(s, 'call:foldr', xs, z, lam(s,lam(s,bound(s,0))))
        entries.append((f'ignored_head_fold_{t.lower()}',law({'xs':ls,'z':s},fold,z,induction())))
        if t == 'F32':
            continue
        x, k, d = bound(s,0), var(s,'k'),var(s,'d')
        summed = op(s,'call:sum',xs)
        for name,body,factor,params in (
            ('discount_total',binary('-',x,binary('*',x,k)),binary('-',word(t,1),k),{'xs':ls,'k':s}),
            ('spread_total',binary('-',binary('*',x,k),binary('*',x,d)),binary('-',k,d),{'xs':ls,'k':s,'d':s}),
        ):
            mapped = op(ls,'method:map',xs,lam(s,body))
            source = op(s,'call:sum',mapped)
            target = binary('*',summed,factor)
            entries.append((f'{name}_{t.lower()}',law(params,source,target,induction())))
        a = var(s,'x')
        source = binary('-',binary('*',a,k),binary('*',a,d))
        target = binary('*',a,binary('-',k,d))
        entries.append((f'spread_factor_{t.lower()}',law({'x':s,'k':s,'d':s},source,target)))
    return entries


def representative_source(t='u32'):
    parts = [f'module Reduction5;',
        f'fn dead_map_fold(xs:List<{t}>,seed:{t},k:{t})->{t}{{return foldr(xs.map(fn(x)=>x*k+seed),seed,fn(x)=>fn(a)=>a);}}']
    if t != 'f32':
        parts += [f'fn discount_total(xs:List<{t}>,seed:{t},k:{t})->{t}{{return sum(xs.map(fn(x)=>x-x*k));}}',
                  f'fn spread_total(xs:List<{t}>,seed:{t},k:{t})->{t}{{return sum(xs.map(fn(x)=>x*k-x*seed));}}',
                  f'fn spread_map(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>x*k-x*seed);}}']
    return '\n'.join(parts)+'\n'


def publish(output):
    output = Path(output)
    named = named_laws()
    objects = [semantic_entry(candidate) for _,candidate in named]
    names = {name:identity(semantic_entry(candidate)) for name,candidate in named}
    store = Store.publish(output,objects,names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest = dict(schema=1,laws=len(objects),names=names,snapshot=store.snapshot_id,
                    scope='Wrapping linear word totals; ignored-head fold preserves exact seed including F32 bits. Pure semantics, no profitability assertion.')
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return store,manifest


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store',type=Path,required=True)
    parser.add_argument('--examples',type=Path)
    args=parser.parse_args()
    _,manifest=publish(args.output_store)
    if args.examples:
        args.examples.write_text(representative_source())
    print(json.dumps(manifest))
