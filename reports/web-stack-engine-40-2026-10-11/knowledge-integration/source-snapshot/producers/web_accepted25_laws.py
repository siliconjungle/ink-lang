"""Untrusted accepted-branch specialization for pure total callbacks.

Filtering fixes a repeated predicate's truth value in a subsequent mapping
stage. Removing its unreachable branch preserves per-element arithmetic and
F32 exceptional values; callback scheduling is not an observable effect here.
"""
import json
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,op,value,var
PIN='a7b97db7e513ae4619176902750c6b58717962660a3f1bcb106a4d46ed9d68fa'

def root_laws():
    rows=[]
    for t in ('U32','I32','U64','F32'):
        s,ls,b=value(t),value({'List':t}),value('Bool');un,ps=arrow(s,s),arrow(s,b)
        xs,p,f,g=var(ls,'xs'),var(ps,'p'),var(un,'f'),var(un,'g')
        ap=lambda cb,x:op(cb['sort']['Arrow'][1],'apply',cb,x)
        x=bound(s,0);mapper=lam(s,op(s,'call:choose',ap(p,x),ap(f,x),ap(g,x)))
        filtered=op(ls,'method:filter',xs,p)
        proof={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Cases':dict(condition=ap(p,var(s,'head')),on_false='Normalize',on_true='Normalize')})}
        rows.append(('accepted_branch_map_'+t.lower(),law(dict(xs=ls,p=ps,f=un,g=un),op(ls,'method:map',filtered,mapper),op(ls,'method:map',filtered,f),proof)))
    return rows

def grouped_laws():
    from producers.web_fold16_laws import named_laws as old_laws
    roots=root_laws();old=dict(old_laws());deployments=[]
    for name,root in roots:
        t=name.rsplit('_',1)[1].upper();s,ls=value(t),value({'List':t});un=arrow(s,s);ps=arrow(s,value('Bool'));hs=arrow(s,arrow(s,s))
        xs,p,f,g,z,h=var(ls,'xs'),var(ps,'p'),var(un,'f'),var(un,'g'),var(s,'z'),var(hs,'h')
        before=op(s,'call:foldr',root['from'],z,h);middle=op(s,'call:foldr',root['to'],z,h)
        previous=old['filtered_mapped_arbitrary_fold_'+t.lower()];pid=identity(semantic_entry(previous));rid=identity(semantic_entry(root))
        from producers.beta_specialization15 import substitute
        target=substitute(previous['to'],dict(xs=xs,p=p,f=f,z=z,g=h))
        use=lambda i,args:{'Use':dict(law=i,arguments=dict(sorted(args.items())),premises=[])}
        proof={'Trans':dict(middle=middle,left={'Congruence':[use(rid,dict(xs=xs,p=p,f=f,g=g)),'Normalize','Normalize']},right=use(pid,dict(xs=xs,p=p,f=f,z=z,g=h)))}
        deployments.append(('accepted_branch_fold_'+t.lower(),law(dict(xs=ls,p=ps,f=un,g=un,z=s,h=hs),before,target,proof,dependencies=[rid,pid])))
    from producers.web_predicated15_laws import named_laws as predicated_laws
    root=roots[0][1];previous=dict(predicated_laws())['filtered_mapped_predicated_sum_u32'];rid,pid=identity(semantic_entry(root)),identity(semantic_entry(previous));s=value('U32')
    args={n:var(sort,n) for n,sort in root['params'].items()};source=op(s,'call:sum',root['from']);middle=op(s,'call:sum',root['to']);target=substitute(previous['to'],{k:args[k] for k in ('xs','p','f')})
    proof={'Trans':dict(middle=middle,left={'Congruence':[use(rid,args)]},right=use(pid,{k:args[k] for k in ('xs','p','f')}))}
    deployments.append(('accepted_branch_sum_u32',law(root['params'],source,target,proof,dependencies=[rid,pid])))
    return roots,deployments

def named_laws():
    roots,deployments=grouped_laws();return roots+deployments

def law_roles():
    roots,deployments=grouped_laws();return {**{n:'optimization_endpoint' for n,_ in roots},**{n:'deployment_composition' for n,_ in deployments}}

def publish(output,extra=()):
    output=Path(output);rows=named_laws()+list(extra);objects={identity(semantic_entry(v)):semantic_entry(v) for _,v in rows};names={n:identity(semantic_entry(v)) for n,v in rows};root=Path(__file__).resolve().parents[1];old=Store(root,root/'store/snapshots'/f'{PIN}.json');pending=[d for v in objects.values() for d in v['dependencies']]
    while pending:
        i=pending.pop()
        if i in objects:continue
        objects[i]=old.object(i);pending.extend(objects[i]['dependencies'])
    st=Store.publish(output,objects.values(),names);st.rebuild();(output/'view.json').write_bytes(canonical(st.bundle(names.values()))+b'\n');return st

def source_functions(held_out=False):
    rows=[]
    for t in ('u32','i32','u64','f32'):
        if t=='f32':
            p='choose(x<seed,x+k,x-k)>k' if held_out else 'choose(x>k,x-seed,seed-x)<k'
        else:
            p='choose(x<seed,rem_or(seed-x,k,0),rem_or(x-seed,k,0))<quot_or(k,2,0)' if held_out else 'rem_or(x,seed,0)<k'
        f='choose(x>k,x*k-seed,seed+x)' if held_out else 'choose(x<seed,seed-x,x+seed)'
        g='choose(x<k,x+seed,x-k)' if held_out else 'choose(x>seed,x-seed,x*k)'
        seq='xs.filter(fn(x)=>'+p+').map(fn(x)=>choose('+p+','+f+','+g+'))'
        for context in ('repair','checksum'):
            name='accepted_'+context+('_heldout' if held_out else '')+'_'+t
            body=seq if context=='repair' else 'foldr('+seq+',seed,fn(x)=>fn(a)=>choose(a<seed,x+a*k,x-a))'
            output='List<'+t+'>' if context=='repair' else t
            rows.append((name,t,f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->{output}'+'{return '+body+';}'))
    if not held_out:
        t='u32';name='accepted_total_u32';p='rem_or(x,seed,0)<k';f='choose(x<seed,seed-x,x+seed)';g='choose(x>seed,x-seed,x*k)'
        rows.append((name,t,'pub fn '+name+'(xs:List<u32>,seed:u32,k:u32)->u32{return sum(xs.filter(fn(x)=>'+p+').map(fn(x)=>choose('+p+','+f+','+g+')));}'))
    return rows

def specialize(subject):
    from producers.beta_sharing17 import derive,beta_share
    from producers.beta_specialization15 import outside_lambda_positions,free_parameters,lift_use
    from ink_planner.semantic_search import substitute,replace
    rows=derive(subject,named_laws());generic=dict(named_laws())
    def arguments(v):
        node=v['node']
        if not isinstance(node,dict) or node.get('Op',[None])[0]!='method:map':return None
        filtered,mapper=node['Op'][1];nd=filtered['node']
        if not isinstance(nd,dict) or nd.get('Op',[None])[0]!='method:filter':return None
        xs,p=nd['Op'][1]
        if not isinstance(mapper['node'],dict) or 'Lambda' not in mapper['node']:return None
        cn=mapper['node']['Lambda']['node']
        if not isinstance(cn,dict) or cn.get('Op',[None])[0]!='call:choose':return None
        condition,left,right=cn['Op'][1];t=xs['sort']['Value']['List']
        if t not in ('U32','I32','U64','F32') or mapper['sort']!=arrow(value(t),value(t)):return None
        if beta_share(op(value('Bool'),'apply',p,bound(value(t),0)))!=beta_share(condition):return None
        return t,dict(xs=xs,p=p,f=lam(value(t),left),g=lam(value(t),right))
    for fn,body in sorted(subject['functions'].items()):
        for path,v in outside_lambda_positions(body):
            found=arguments(v);family='accepted_branch_map'
            nd=v['node']
            if isinstance(nd,dict) and nd.get('Op',[None])[0]=='call:foldr':
                sequence,z,h=nd['Op'][1];found=arguments(sequence);family='accepted_branch_fold'
                if found:found=(found[0],dict(found[1],z=z,h=h))
            if isinstance(nd,dict) and nd.get('Op',[None])[0]=='call:sum':
                found=arguments(nd['Op'][1][0]);family='accepted_branch_sum'
                if found and found[0]!='U32':found=None
            if not found:continue
            t,args=found;name=family+'_'+t.lower();rule=generic[name];gid=identity(semantic_entry(rule))
            expanded=replace(body,path,substitute(rule['from'],args));middle=replace(body,path,substitute(rule['to'],args));target=beta_share(middle)
            use={'Use':dict(law=gid,arguments=dict(sorted(args.items())),premises=[])}
            proof={'Trans':dict(middle=expanded,left='Normalize',right={'Trans':dict(middle=middle,left=lift_use(expanded,path,use),right='Normalize')})}
            rows.append((fn+'_'+family,law(free_parameters(body),body,target,proof,dependencies=[gid])))
    unique={identity(semantic_entry(v)):(n,v) for n,v in rows}
    return [unique[k] for k in sorted(unique)]
