#!/usr/bin/env python3
"""Checked-data candidates for arbitrary ordered map/concatenation consumers.

Plain map fusion is new; concatenation endpoints compose that theorem with the
existing ordered concat-fold theorem. Callbacks are pure and total, same-type,
and need no associativity. F32 reducer order and grouping remain exact.
"""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, bound, lam, law, op, value, var
from producers.web_sequence_laws import named_laws as sequence_laws


def use(candidate, arguments):
    return {'Use': dict(law=identity(semantic_entry(candidate)), arguments=dict(sorted(arguments.items())), premises=[])}


def named_laws():
    result = []
    old = dict(sequence_laws())
    for t in ('U32', 'I32', 'U64', 'F32'):
        s, ls = value(t), value({'List': t})
        fs, gs = arrow(s, s), arrow(s, arrow(s, s))
        xs, ys, z = var(ls, 'xs'), var(ls, 'ys'), var(s, 'z')
        f, g = var(fs, 'f'), var(gs, 'g')
        apply = lambda callback, arg: op(callback['sort']['Arrow'][1], 'apply', callback, arg)
        mapping = lambda sequence: op(ls, 'method:map', sequence, f)
        concat = lambda a, b: op(ls, 'method:concat', a, b)
        folded = lambda sequence, initial, reducer: op(s, 'call:foldr', sequence, initial, reducer)
        fused = lam(s, lam(s, apply(apply(g, apply(f, bound(s, 1))), bound(s, 0))))
        mapped = law(dict(xs=ls, z=s, f=fs, g=gs), folded(mapping(xs), z, g),
            folded(xs, z, fused), {'Induction': dict(variable='xs', names=['head','tail'], base='Normalize', step='Normalize')})
        result.append(('mapped_arbitrary_fold_'+t.lower(), mapped))
        old_concat = old['concat_ordered_fold_'+t.lower()]
        dependencies = [identity(semantic_entry(mapped)), identity(semantic_entry(old_concat))]
        prefix_initial = folded(ys, z, g)
        prefix_middle = folded(mapping(xs), prefix_initial, g)
        prefix_proof = {'Trans': dict(middle=prefix_middle,
            left=use(old_concat, dict(xs=mapping(xs), ys=ys, z=z, g=g)),
            right=use(mapped, dict(xs=xs, z=prefix_initial, f=f, g=g)))}
        result.append(('mapped_prefix_arbitrary_fold_'+t.lower(), law(dict(xs=ls,ys=ls,z=s,f=fs,g=gs),
            folded(concat(mapping(xs),ys),z,g), folded(xs,prefix_initial,fused), prefix_proof, dependencies=dependencies)))
        mapped_initial = folded(mapping(ys),z,g)
        first_middle = folded(mapping(xs),mapped_initial,g)
        second_middle = folded(xs,mapped_initial,fused)
        both_proof = {'Trans': dict(middle=first_middle,
            left=use(old_concat,dict(xs=mapping(xs),ys=mapping(ys),z=z,g=g)),
            right={'Trans': dict(middle=second_middle,
                left=use(mapped,dict(xs=xs,z=mapped_initial,f=f,g=g)),
                right={'Congruence':['Normalize',use(mapped,dict(xs=ys,z=z,f=f,g=g)),'Normalize']})})}
        result.append(('mapped_concat_arbitrary_fold_'+t.lower(), law(dict(xs=ls,ys=ls,z=s,f=fs,g=gs),
            folded(concat(mapping(xs),mapping(ys)),z,g), folded(xs,folded(ys,z,fused),fused),
            both_proof, dependencies=dependencies)))
    return result


def dependency_objects():
    old = dict(sequence_laws())
    return [semantic_entry(old['concat_ordered_fold_'+t.lower()]) for t in ('U32','I32','U64','F32')]


def source_functions(alternate=False):
    result=[]
    for name,_ in named_laws():
        t=name.rsplit('_',1)[1]
        mapper='fn(x)=>choose(x<seed,seed-x,x-seed)' if alternate else 'fn(x)=>x*3+k'
        reducer='fn(x)=>fn(a)=>choose(a<seed,x-a,x+a)' if alternate else 'fn(x)=>fn(a)=>choose(x<seed,x+a*k,x-a)'
        sequence='xs.map('+mapper+')'
        if name.startswith('mapped_prefix_'):sequence+='.concat(ys)'
        elif name.startswith('mapped_concat_'):sequence+='.concat(ys.map('+mapper+'))'
        result.append((name,f'pub fn {name}(xs:List<{t}>,ys:List<{t}>,seed:{t},k:{t})->{t}'
                       +'{return foldr('+sequence+',seed,'+reducer+');}'))
    return result


def publish(output):
    output=Path(output);named=named_laws()
    names={n:identity(semantic_entry(v)) for n,v in named}
    store=Store.publish(output,dependency_objects()+[semantic_entry(v) for _,v in named],names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(list(names.values())))+b'\n')
    manifest=dict(schema=1,laws=12,dependency_objects=4,names=names,snapshot=store.snapshot_id,
        scope='New arbitrary map-fold plus general composed mapped-prefix/mapped-concat endpoints using existing ordered concat-fold. Pure total same-type callbacks; exact right-fold order including F32; no profitability premise.')
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return store,manifest


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output-store',type=Path,required=True)
    print(json.dumps(publish(p.parse_args().output_store)[1]))
