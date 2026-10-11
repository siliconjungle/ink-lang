#!/usr/bin/env python3
"""Untrusted collection-stage elimination laws for the existing Ink checker.

Different input/intermediate/output types matter: the old same-type map fusion
cannot instantiate these cross-type maps. No timing is a proof premise.
"""
import argparse
import json
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,binary,bound,lam,law,op,value,var,word


def induction(name='xs'):
    return {'Induction':dict(variable=name,names=['head','tail'],base='Normalize',step='Normalize')}


def named_laws():
    result=[]
    triples=[('U32','Bool','U32'),('I32','Bool','I32'),('U64','Bool','U64'),
             ('F32','Bool','F32'),('Bool','U32','Bool'),('U32','U64','U32'),
             ('U64','U32','U64'),('I32','U32','I32')]
    for a,b,c in triples:
        sa,sb,sc=value(a),value(b),value(c)
        la,lb,lc=value({'List':a}),value({'List':b}),value({'List':c})
        xs=var(la,'xs');fs,gs=arrow(sa,sb),arrow(sb,sc)
        f,g=var(fs,'f'),var(gs,'g')
        mapped=op(lb,'method:map',xs,f)
        source=op(lc,'method:map',mapped,g)
        composed=lam(sa,op(sc,'apply',g,op(sb,'apply',f,bound(sa,0))))
        target=op(lc,'method:map',xs,composed)
        result.append((f'map_cross_fusion_{a.lower()}_{b.lower()}_{c.lower()}',
                       law({'xs':la,'f':fs,'g':gs},source,target,induction())))
    for t in ('U32','I32','U64','F32','Bool'):
        s,ls=value(t),value({'List':t});xs=var(ls,'xs')
        operator='&&' if t=='Bool' else '+'
        step=lam(s,lam(s,binary(operator,bound(s,1),bound(s,0))))
        source=op(ls,'method:zip',xs,xs,step)
        target=op(ls,'method:map',xs,lam(s,binary(operator,bound(s,0),bound(s,0))))
        result.append((f'self_zip_map_{t.lower()}',law({'xs':ls},source,target,induction())))
    for t in ('U32','I32','U64','F32'):
        s,ls=value(t),value({'List':t});xs,z,k=var(ls,'xs'),var(s,'z'),var(s,'k')
        mapping=lam(s,binary('*',bound(s,0),k))
        folding=lam(s,lam(s,binary('-',bound(s,1),bound(s,0))))
        source=op(s,'call:foldr',op(ls,'method:map',xs,mapping),z,folding)
        fused=lam(s,lam(s,binary('-',binary('*',bound(s,1),k),bound(s,0))))
        target=op(s,'call:foldr',xs,z,fused)
        result.append((f'map_ordered_fold_{t.lower()}',law({'xs':ls,'z':s,'k':s},source,target,induction())))
    for t in ('U32','I32','U64'):
        s,ls=value(t),value({'List':t});xs=var(ls,'xs')
        mapped=op(ls,'method:map',xs,lam(s,binary('-',bound(s,0),bound(s,0))))
        source=op(ls,'method:scan',mapped)
        zeroes=op(ls,'method:map',xs,lam(s,word(t,0)))
        middle=op(ls,'method:scan',zeroes)
        proof={'Trans':dict(middle=middle,left='Normalize',right={'Trans':dict(middle=zeroes,left=induction(),right='Normalize')})}
        result.append((f'zero_map_scan_{t.lower()}',law({'xs':ls},source,mapped,proof)))
    return result


def publish(output):
    named=named_laws();objects=[semantic_entry(l) for _,l in named]
    names={n:identity(semantic_entry(l)) for n,l in named}
    store=Store.publish(output,objects,names);store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest=dict(schema=1,laws=len(objects),snapshot=store.snapshot_id,names=names,
                  scope='Pure collection-stage elimination; F32 arithmetic order is unchanged; no profitability claim.')
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return store,manifest


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output-store',type=Path,required=True)
    _,manifest=publish(parser.parse_args().output_store);print(json.dumps(manifest))

if __name__=='__main__':main()
