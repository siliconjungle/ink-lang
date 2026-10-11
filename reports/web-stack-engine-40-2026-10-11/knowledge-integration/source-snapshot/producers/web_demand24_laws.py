"""Unconditional mapped-head demand and composed first-accepted consumers.

Arbitrary pure total unary callbacks commute with first lookup only when the
fallback is transformed by the same callback. No fixed-point premise, numeric
reassociation, caller validation or optimizer rule is added.
"""
import json
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,op,value,var,word

PIN='dfb31ef951db9bb8a7737208dec2514e8488ce35093342e37bad70dce80e007f'


def grouped_laws():
    from producers.web_skip23_laws import named_laws as prior_laws
    old=dict(prior_laws());roots=[];deployments=[]
    for t in ('U32','I32','U64','F32'):
        s,ls=value(t),value({'List':t});un=arrow(s,s);ps=arrow(s,value('Bool'))
        xs,z,f,p=var(ls,'xs'),var(s,'z'),var(un,'f'),var(ps,'p')
        ap=lambda g,x:op(g['sort']['Arrow'][1],'apply',g,x)
        first=lambda a,fallback:op(s,'method:at_or',a,word('U32',0),fallback)
        mapped=lambda a:op(ls,'method:map',a,f)
        proof={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step='Normalize')}
        root=law(dict(xs=ls,z=s,f=un),first(mapped(xs),ap(f,z)),ap(f,first(xs,z)),proof)
        rid=identity(semantic_entry(root));roots.append(('demand_mapped_head_'+t.lower(),root))
        filtered=op(ls,'method:filter',xs,p);accepted=old['skip_first_accepted_'+t.lower()];aid=identity(semantic_entry(accepted));middle=ap(f,first(filtered,z))
        reducer=lam(s,lam(s,op(s,'call:choose',ap(p,bound(s,1)),bound(s,1),bound(s,0))))
        target=ap(f,op(s,'call:foldr',xs,z,reducer))
        use=lambda gid,args:{'Use':dict(law=gid,arguments=dict(sorted(args.items())),premises=[])}
        composed={'Trans':dict(middle=middle,left=use(rid,dict(xs=filtered,z=z,f=f)),right={'Congruence':['Normalize',use(aid,dict(xs=xs,p=p,z=z))]})}
        deployments.append(('demand_filtered_mapped_head_'+t.lower(),law(dict(xs=ls,z=s,f=un,p=ps),first(mapped(filtered),ap(f,z)),target,composed,dependencies=[rid,aid])))
    return roots,deployments


def named_laws():
    roots,deployments=grouped_laws();return roots+deployments


def law_roles():
    roots,deployments=grouped_laws();return {**{n:'optimization_endpoint' for n,_ in roots},**{n:'deployment_composition' for n,_ in deployments}}


def source_functions(held_out=False):
    rows=[]
    for t in ('u32','i32','u64','f32'):
        mapper=(lambda x:f'choose({x}<k,{x}*{x}+seed,({x}-seed)*({x}+k))') if held_out else (lambda x:f'choose({x}>k,{x}*k+seed,seed-{x})')
        predicate='x<k' if held_out else 'x>seed'
        for family in ('demand_mapped_head','demand_filtered_mapped_head'):
            name=family+('_heldout' if held_out else '')+'_'+t;seq='xs.filter(fn(x)=>'+predicate+')' if family=='demand_filtered_mapped_head' else 'xs'
            body=seq+'.map(fn(x)=>'+mapper('x')+').at_or(0,'+mapper('seed')+')'
            rows.append((name,t,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{t}'+'{return '+body+';}'))
    return rows


def specialize(subject):
    # The parser accepts named calls only; repeated inline f(z) fallback syntax
    # is recovered by a bounded expression search, then Normalize checked.
    from producers.beta_sharing17 import derive,beta_share
    from producers.beta_specialization15 import outside_lambda_positions,free_parameters,lift_use
    from ink_planner.semantic_search import substitute,replace
    rows=derive(subject,named_laws());generic=dict(named_laws())
    for fn,body in sorted(subject['functions'].items()):
        for path,v in outside_lambda_positions(body):
            node=v['node']
            if not isinstance(node,dict) or node.get('Op',[None])[0]!='method:at_or':continue
            seq,index,fallback=node['Op'][1]
            if index['node']!={'Word':0}:continue
            node=seq['node']
            if not isinstance(node,dict) or node.get('Op',[None])[0]!='method:map':continue
            original,f=node['Op'][1];s=seq['sort']['Value']['List'];sort=value(s)
            if s not in ('U32','I32','U64','F32'):continue
            candidates=[x for _,x in outside_lambda_positions(fallback) if x['sort']==sort]
            if len(candidates)>128:raise ValueError('fallback specialization candidate bound exceeded')
            variants=[('demand_mapped_head',dict(xs=original,f=f))]
            nd=original['node']
            if isinstance(nd,dict) and nd.get('Op',[None])[0]=='method:filter':
                xs,p=nd['Op'][1];variants.append(('demand_filtered_mapped_head',dict(xs=xs,f=f,p=p)))
            for z in candidates:
                transformed=op(sort,'apply',f,z)
                if beta_share(transformed)!=beta_share(fallback):continue
                for family,arguments in variants:
                    arguments=dict(arguments,z=z);name=family+'_'+s.lower();rule=generic[name];gid=identity(semantic_entry(rule))
                    expanded=replace(body,path,substitute(rule['from'],arguments));middle=replace(body,path,substitute(rule['to'],arguments));target=beta_share(middle)
                    use={'Use':dict(law=gid,arguments=dict(sorted(arguments.items())),premises=[])}
                    proof={'Trans':dict(middle=expanded,left='Normalize',right={'Trans':dict(middle=middle,left=lift_use(expanded,path,use),right='Normalize')})}
                    rows.append((fn+'_transport_'+name,law(free_parameters(body),body,target,proof,dependencies=[gid])))
    unique={identity(semantic_entry(v)):(n,v) for n,v in rows}
    return [unique[k] for k in sorted(unique)]


def publish(output,extra=()):
    root=Path(__file__).resolve().parents[1];old=Store(root,root/'store/snapshots'/f'{PIN}.json');rows=named_laws()+list(extra);names={n:identity(semantic_entry(v)) for n,v in rows};objects={identity(semantic_entry(v)):semantic_entry(v) for _,v in rows};pending=[d for o in objects.values() for d in o['dependencies']]
    while pending:
        i=pending.pop()
        if i in objects:continue
        objects[i]=old.object(i);pending+=objects[i]['dependencies']
    st=Store.publish(output,list(objects.values()),names);st.rebuild();(st.root/'view.json').write_bytes(canonical(st.bundle(sorted(names.values())))+b'\n');return st
