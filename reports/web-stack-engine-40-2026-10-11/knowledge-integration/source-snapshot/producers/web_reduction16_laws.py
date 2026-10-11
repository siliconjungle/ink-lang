#!/usr/bin/env python3
"""Untrusted generic wrapping-word contribution-weight sinking laws."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,binary,bound,lam,law,op,term,value,var,word


def named_laws():
    result=[]
    for t in ('U32','I32','U64'):
        s,ls=value(t),value({'List':t});unary=arrow(s,s);pred=arrow(s,value('Bool'))
        xs,f,p=var(ls,'xs'),var(unary,'f'),var(pred,'p')
        k,d=var(s,'k'),var(s,'d');x=bound(s,0)
        fx=op(s,'apply',f,x)
        summed=lambda body:op(s,'call:sum',op(ls,'method:map',xs,lam(s,body)))
        total=op(s,'call:sum',op(ls,'method:map',xs,f))
        induction=lambda step='Normalize':{'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step=step)}
        for family,sign in [('shared_contribution_add','+'),('shared_contribution_subtract','-')]:
            source=summed(binary(sign,binary('*',fx,k),binary('*',fx,d)))
            target=binary('*',total,binary(sign,k,d))
            result.append((family+'_'+t.lower(),law({'xs':ls,'f':unary,'k':s,'d':s},source,target,induction())))
        condition=op(value('Bool'),'apply',p,var(s,'head'))
        cases={'Cases':dict(condition=condition,on_false='Normalize',on_true='Normalize')}
        selected=op(value('Bool'),'apply',p,x)
        source=summed(op(s,'call:choose',selected,binary('+',binary('*',fx,k),binary('*',fx,d)),word(t,0)))
        target=binary('*',summed(op(s,'call:choose',selected,fx,word(t,0))),binary('+',k,d))
        result.append(('masked_contribution_add_'+t.lower(),law({'xs':ls,'f':unary,'p':pred,'k':s,'d':s},source,target,induction(cases))))
    return result


def source_functions(heldout=False):
    result=[]
    for name,_ in named_laws():
        t=name.rsplit('_',1)[1]
        f='choose(x<seed,seed-x,x-seed)' if not heldout else 'x*x+seed'
        if name.startswith('shared_contribution'):
            sign='-' if 'subtract' in name else '+'
            body=f'({f})*k{sign}({f})*seed'
        else:body=f'choose(x<seed,({f})*k+({f})*seed,0)' if not heldout else f'choose(x>k,({f})*k+({f})*seed,0)'
        result.append((name,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{t}{{return sum(xs.map(fn(x)=>{body}));}}'))
    return result


def publish(output):
    output=Path(output);named=named_laws();names={n:identity(semantic_entry(v)) for n,v in named}
    store=Store.publish(output,[semantic_entry(v) for _,v in named],names)
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest=dict(schema=1,laws=len(named),names=names,snapshot=store.snapshot_id,scope='Wrapping U32/I32/U64 only; arbitrary pure total unary callback/predicate; weight sinking and callback reuse. No target profitability claim.')
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return store,manifest

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output-store',type=Path,required=True)
    _,manifest=publish(p.parse_args().output_store);print(json.dumps(manifest))


def specialize(subject):
    """Untrusted explicit callback-instantiation certificates for these recipes.

    Higher-order matching is not added to the planner. The checker validates
    Normalize to a generic instance, Use, then Normalize; source syntax alone
    has no authority. These are static callback certificates, not new generic laws.
    """
    import copy
    from producers.beta_specialization15 import beta_normalize,free_parameters
    from ink_planner.semantic_search import substitute
    generic=dict(named_laws());result=[]
    for name,body in sorted(subject['functions'].items()):
        if name not in generic:continue
        g=generic[name];s=g['from']['sort'];mapped=body['node']['Op'][1][0]
        xs,callback=mapped['node']['Op'][1]
        element=callback['node']['Lambda']
        k=var(s,'k');d=var(s,'seed')
        args={'xs':xs,'k':k}
        if name.startswith('shared_contribution'):
            fx=element['node']['Op'][1][0]['node']['Op'][1][0]
            args.update(f=lam(s,fx),d=d)
        else:
            condition,weighted,_=element['node']['Op'][1]
            args.update(f=lam(s,weighted['node']['Op'][1][0]['node']['Op'][1][0]),p=lam(s,condition),d=d)
        source=substitute(copy.deepcopy(g['from']),args)
        target=substitute(copy.deepcopy(g['to']),args)
        compact=beta_normalize(target);gid=identity(semantic_entry(g))
        use={'Use':dict(law=gid,arguments=dict(sorted(args.items())),premises=[])}
        proof={'Trans':dict(middle=source,left='Normalize',right={'Trans':dict(middle=target,left=use,right='Normalize')})}
        result.append((name+'_static',law(free_parameters(body),body,compact,proof,dependencies=[gid])))
    return result
