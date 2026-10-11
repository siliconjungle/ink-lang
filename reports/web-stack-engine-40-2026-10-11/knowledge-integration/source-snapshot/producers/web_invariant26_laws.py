"""Ordinary checked two-live-branch invariant control hoisting."""
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,op,value,var
PIN='3edbf7ac57cd7395aaaadf479f3959c9947829751f99956cf4674ef1ba9bdc4f'

def named_laws():
    rows=[]
    for t in ('U32','I32','U64','F32'):
        s,ls,b=value(t),value({'List':t}),value('Bool')
        xs,c,z=var(ls,'xs'),var(b,'c'),var(s,'z')
        ap=lambda fn,x:op(fn['sort']['Arrow'][1],'apply',fn,x)
        choose=lambda sort,a,d:op(sort,'call:choose',c,a,d)
        induction={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step='Normalize')}
        def bridge(before,after):
            return {'Trans':dict(middle=before,left='Normalize',right={'Trans':dict(middle=after,left=induction,right='Normalize')})}
        un=arrow(s,s);f,g=var(un,'f'),var(un,'g');x=bound(s,0)
        source=op(ls,'method:map',xs,lam(s,choose(s,ap(f,x),ap(g,x))))
        target=choose(ls,op(ls,'method:map',xs,f),op(ls,'method:map',xs,g))
        proof={'Cases':dict(condition=c,on_false=bridge(op(ls,'method:map',xs,lam(s,ap(g,x))),op(ls,'method:map',xs,g)),on_true=bridge(op(ls,'method:map',xs,lam(s,ap(f,x))),op(ls,'method:map',xs,f)))}
        rows.append(('invariant_two_branch_map_'+t.lower(),law(dict(xs=ls,c=b,f=un,g=un),source,target,proof)))
        hs=arrow(s,arrow(s,s));h,j=var(hs,'h'),var(hs,'j');item,acc=bound(s,1),bound(s,0)
        step=lambda cb:ap(ap(cb,item),acc)
        callback=lam(s,lam(s,choose(s,step(h),step(j))))
        source=op(s,'call:foldr',xs,z,callback);target=choose(s,op(s,'call:foldr',xs,z,h),op(s,'call:foldr',xs,z,j))
        proof={'Cases':dict(condition=c,on_false=bridge(op(s,'call:foldr',xs,z,lam(s,lam(s,step(j)))),op(s,'call:foldr',xs,z,j)),on_true=bridge(op(s,'call:foldr',xs,z,lam(s,lam(s,step(h)))),op(s,'call:foldr',xs,z,h)))}
        rows.append(('invariant_two_branch_fold_'+t.lower(),law(dict(xs=ls,c=b,z=s,h=hs,j=hs),source,target,proof)))
    return rows

def law_roles():return {n:'optimization_endpoint' for n,_ in named_laws()}

def publish(output,extra=()):
    output=Path(output);rows=named_laws()+list(extra);objects={identity(semantic_entry(v)):semantic_entry(v) for _,v in rows};names={n:identity(semantic_entry(v)) for n,v in rows}
    old=Store(Path(__file__).resolve().parents[1],Path(__file__).resolve().parents[1]/'store/snapshots'/f'{PIN}.json')
    pending=[i for v in objects.values() for i in v['dependencies']]
    while pending:
        i=pending.pop()
        if i in objects:continue
        objects[i]=old.object(i);pending+=objects[i]['dependencies']
    st=Store.publish(output,objects.values(),names);st.rebuild();(output/'view.json').write_bytes(canonical(st.bundle(names.values()))+b'\n');return st

def source_functions(held_out=False):
    rows=[]
    for t in ('u32','i32','u64','f32'):
        yes='choose(x<seed,a*k+x,a-x)' if held_out else 'choose(a<seed,x+a*k,x-a)'
        no='choose(a<k,x*k+a,x-a*seed)' if held_out else 'choose(a>k,a-x*seed,a+x)'
        f='choose(x>k,x*k-seed,seed+x)' if held_out else 'choose(x<seed,seed-x,x+seed)'
        g='choose(x<k,x+seed,x-k)' if held_out else 'choose(x>seed,x-seed,x*k)'
        for kind in ('fold','map'):
            name='invariant_'+kind+('_heldout' if held_out else '')+'_'+t
            body=f'foldr(xs,seed,fn(x)=>fn(a)=>choose(seed<k,{yes},{no}))' if kind=='fold' else f'xs.map(fn(x)=>choose(seed<k,{f},{g}))'
            out=t if kind=='fold' else 'List<'+t+'>'
            rows.append((name,t,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{out}'+'{return '+body+';}'))
    return rows

def specialize(subject):
    import copy
    from producers.beta_sharing17 import derive,beta_share
    from producers.beta_specialization15 import free_parameters,outside_lambda_positions,lift_use,instantiate_bound,substitute
    from ink_planner.semantic_search import replace
    rows=derive(subject,named_laws());generic=dict(named_laws())
    for fn,body in sorted(subject['functions'].items()):
        for path,v in outside_lambda_positions(body):
            nd=v['node'];operation=nd.get('Op',[None])[0] if isinstance(nd,dict) else None
            if operation not in ('call:foldr','method:map'):continue
            args=nd['Op'][1];xs,callback=args[0],args[-1];s=xs['sort']['Value']['List'];sort=value(s)
            if s not in ('U32','I32','U64','F32'):continue
            depth=2 if operation=='call:foldr' else 1;inner=callback
            for _ in range(depth):
                if not isinstance(inner['node'],dict) or 'Lambda' not in inner['node']:break
                inner=inner['node']['Lambda']
            else:
                cn=inner['node']
                if not isinstance(cn,dict) or cn.get('Op',[None])[0]!='call:choose':continue
                c,yes,no=cn['Op'][1]
                # Extract captures without allowing either callback binder to escape.
                try:
                    for _ in range(depth):c=instantiate_bound(c,{'sort':sort,'node':{'Free':'__unused_invariant26'}})
                except (KeyError,ValueError):continue
                if '__unused_invariant26' in str(c):continue
                if operation=='call:foldr':
                    family='invariant_two_branch_fold';vals=dict(xs=xs,z=args[1],c=c,h=lam(sort,lam(sort,yes)),j=lam(sort,lam(sort,no)))
                else:family='invariant_two_branch_map';vals=dict(xs=xs,c=c,f=lam(sort,yes),g=lam(sort,no))
                rule=generic[family+'_'+s.lower()];gid=identity(semantic_entry(rule));expanded=replace(body,path,substitute(copy.deepcopy(rule['from']),vals));middle=replace(body,path,substitute(copy.deepcopy(rule['to']),vals));target=beta_share(middle)
                proof={'Trans':dict(middle=expanded,left='Normalize',right={'Trans':dict(middle=middle,left=lift_use(expanded,path,{'Use':dict(law=gid,arguments=dict(sorted(vals.items())),premises=[])}),right='Normalize')})}
                rows.append((fn+'_'+family,law(free_parameters(body),body,target,proof,dependencies=[gid])))
    unique={identity(semantic_entry(v)):(n,v) for n,v in rows};return [unique[k] for k in sorted(unique)]
