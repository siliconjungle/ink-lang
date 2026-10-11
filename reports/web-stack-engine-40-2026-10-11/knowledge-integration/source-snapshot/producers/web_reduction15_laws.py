#!/usr/bin/env python3
"""Untrusted generic wrapping-word two-consumer sum fusion."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, binary, bound, lam, law, op, value, var


def named_laws():
    result = []
    for t in ('U32', 'I32', 'U64'):
        s, ls = value(t), value({'List': t})
        unary = arrow(s, s)
        xs, f, g = var(ls, 'xs'), var(unary, 'f'), var(unary, 'g')
        k, d = var(s, 'k'), var(s, 'd')
        x = bound(s, 0)
        apply = lambda callback: op(s, 'apply', callback, x)
        summed = lambda callback: op(s, 'call:sum', op(ls, 'method:map', xs, callback))
        for family, combine, params in [
            ('dual_sum_add', lambda a,b: binary('+', a,b), {'xs':ls,'f':unary,'g':unary}),
            ('dual_sum_subtract', lambda a,b: binary('-', a,b), {'xs':ls,'f':unary,'g':unary}),
            ('dual_sum_weighted', lambda a,b: binary('+',binary('*',a,k),binary('*',b,d)), {'xs':ls,'f':unary,'g':unary,'k':s,'d':s}),
        ]:
            source = combine(summed(f), summed(g))
            target = op(s, 'call:sum', op(ls, 'method:map', xs, lam(s, combine(apply(f), apply(g)))))
            proof = {'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step='Normalize')}
            result.append((family+'_'+t.lower(), law(params, source, target, {'Sym':proof})))
    return result


def source_functions(heldout=False):
    result=[]
    for name,_ in named_laws():
        t=name.rsplit('_',1)[1]
        f='fn(x)=>choose(x<seed,seed-x,x-seed)' if not heldout else 'fn(x)=>choose(x>k,x-k,k-x)'
        g='fn(x)=>(x+seed)*k' if not heldout else 'fn(x)=>x*x+seed'
        a,b=f'sum(xs.map({f}))',f'sum(xs.map({g}))'
        body=f'{a}*k+{b}*seed' if 'weighted' in name else f'{a}-{b}' if 'subtract' in name else f'{a}+{b}'
        result.append((name,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{t}{{return {body};}}'))
    return result


def publish(output):
    output=Path(output);named=named_laws()
    names={name:identity(semantic_entry(candidate)) for name,candidate in named}
    store=Store.publish(output,[semantic_entry(candidate) for _,candidate in named],names);store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest=dict(schema=1,laws=len(named),snapshot=store.snapshot_id,names=names,
      scope='Wrapping U32/I32/U64 sums only; arbitrary pure total unary f/g. Two full mapped reductions become one combined map and ordinary sum. Callback scheduling changes; no profitability premise or F32 reassociation.')
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return store,manifest

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output-store',type=Path,required=True)
    _,manifest=publish(p.parse_args().output_store);print(json.dumps(manifest))
