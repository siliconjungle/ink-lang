#!/usr/bin/env python3
"""Untrusted generic first-result and cardinality consumer work skipping."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,op,value,var,word


def named_laws():
    result=[]
    for t in ('U32','I32','U64','F32'):
        s,ls=value(t),value({'List':t})
        xs,ys,z=var(ls,'xs'),var(ls,'ys'),var(s,'z')
        f=var(arrow(s,s),'f')
        g=var(arrow(s,arrow(s,s)),'g')
        head=lambda a,fallback:op(s,'method:at_or',a,word('U32',0),fallback)
        apply=lambda callback,arg:op(s,'apply',callback,arg)
        proof={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step='Normalize')}
        mapped=op(ls,'method:map',xs,f)
        result.append(('callback_mapped_head_'+t.lower(),law({'xs':ls,'z':s,'f':f['sort']},
            head(mapped,z),apply(f,head(xs,z)),proof,conditions=[{'from':apply(f,z),'to':z}])))
        result.append(('concat_first_result_'+t.lower(),law({'xs':ls,'ys':ls,'z':s},
            head(op(ls,'method:concat',xs,ys),z),head(xs,head(ys,z)),proof)))
        result.append(('self_zip_cardinality_'+t.lower(),law({'xs':ls,'g':g['sort']},
            op(value('U64'),'call:count',op(ls,'method:zip',xs,xs,g)),
            op(value('U64'),'call:count',xs),proof)))
    return result


def source_functions():
    result=[]
    for name,_ in named_laws():
        t=name.rsplit('_',1)[1]
        if name.startswith('callback_mapped_head'):
            body='xs.map(fn(x)=>choose(x<seed,seed,x)).at_or(0,seed)*k'
            params=f'xs:List<{t}>,seed:{t},k:{t}';output=t
        elif name.startswith('concat_first_result'):
            body='xs.concat(ys).at_or(0,seed)+k'
            params=f'xs:List<{t}>,ys:List<{t}>,seed:{t},k:{t}';output=t
        else:
            body='count(xs.zip(xs,fn(a)=>fn(b)=>choose(a<seed,a*k+b,b-seed)))'
            params=f'xs:List<{t}>,seed:{t},k:{t}';output='u64'
        result.append((name,f'pub fn {name}({params})->{output}{{return {body};}}'))
    return result


def heldout_functions():
    """Different callbacks/outer consumers; no specialization of proof statements."""
    result=[]
    for t in ('u32','i32','u64','f32'):
        result.extend([
            ('callback_mapped_head_'+t, f'pub fn clamped_first_{t}(xs:List<{t}>,seed:{t},k:{t})->{t}'+'{return xs.map(fn(x)=>choose(x>k,k,x)).at_or(0,k)-seed;}'),
            ('concat_first_result_'+t, f'pub fn concat_signed_offset_{t}(xs:List<{t}>,ys:List<{t}>,seed:{t},k:{t})->{t}'+'{return xs.concat(ys).at_or(0,k)-seed;}'),
            ('self_zip_cardinality_'+t, f'pub fn paired_score_count_{t}(xs:List<{t}>,seed:{t},k:{t})->u64'+'{return count(xs.zip(xs,fn(a)=>fn(b)=>choose(a==b,a*k-seed,b+seed)));}'),
        ])
    return result


def publish(output):
    output=Path(output);named=named_laws()
    names={name:identity(semantic_entry(candidate)) for name,candidate in named}
    store=Store.publish(output,[semantic_entry(candidate) for _,candidate in named],names);store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest=dict(schema=1,laws=len(named),names=names,snapshot=store.snapshot_id,
        scope='Arbitrary pure total callbacks; mapped first-result requires a checked compile-time fixed-point equation f(z)=z, concat first-result and same-source zip cardinality are unconditional. Exact fallback/order/F32 grouping. No profitability premise.')
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return store,manifest

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output-store',type=Path,required=True)
    _,manifest=publish(parser.parse_args().output_store);print(json.dumps(manifest))
