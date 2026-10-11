"""Direct independent mapped-zip fusion with observed paired values.

All endpoints are checked consequences of existing mapped-zip/postmap fusion
and map identity. Arbitrary pure total callbacks keep their per-element grouping
and paired input order. Only the common prefix is mapped in the fused form.
This is an additional database search shape, not new proof-kernel authority.
"""
from pathlib import Path
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, bound, lam, law, op, value, var, examples
from producers.web_pipeline32_laws import chain, use, apply
from producers.web_zip17_laws import named_laws as zip_laws
PRIOR_SNAPSHOT = Path(__file__).resolve().parents[1] / 'store/snapshots/7cf9b7ec48a8edd25b05951b8e424ea26444467fc176257aa34ac5a8e40aa644.json'


def reference_laws():
    rows=[]
    for t in ('U32','I32','U64'):
        s,ls=value(t),value({'List':t})
        endpoint=op(ls,'method:map',var(ls,'xs'),lam(s,bound(s,0)))
        rows.append(('prior_identity_map_'+t.lower(),next(v for v in examples() if v['from']==endpoint and v['to']==var(ls,'xs'))))
    rows += [('prior_'+n,v) for n,v in zip_laws() if any(n.endswith('_'+t) for t in ('u32','i32','u64'))]
    return rows


def named_laws():
    from ink_planner.semantic_search import substitute
    prior=dict(reference_laws());rows=[]
    for t in ('U32','I32','U64'):
        s,ls=value(t),value({'List':t});un=arrow(s,s);bi=arrow(s,un)
        xs,ys,f,r,h=var(ls,'xs'),var(ls,'ys'),var(un,'f'),var(un,'r'),var(bi,'h')
        ident=lam(s,bound(s,0))
        for family in ('left','right','both'):
            args=dict(xs=xs,ys=ys,h=h,g=ident)
            if family in ('left','both'):args['f']=f
            if family in ('right','both'):args['r']=r
            left=op(ls,'method:map',xs,f) if family in ('left','both') else xs
            right=op(ls,'method:map',ys,r) if family in ('right','both') else ys
            source=op(ls,'method:zip',left,right,h)
            a,b=bound(s,1),bound(s,0)
            if family in ('left','both'):a=apply(f,a)
            if family in ('right','both'):b=apply(r,b)
            target=op(ls,'method:zip',xs,ys,lam(s,lam(s,apply(apply(h,a),b))))
            identity_map=prior['prior_identity_map_'+t.lower()];iid=identity(semantic_entry(identity_map))
            fusion=prior['prior_independent_'+family+'_mapped_zip_postmap_'+t.lower()];fid=identity(semantic_entry(fusion))
            padded=op(ls,'method:map',source,ident);fused=substitute(fusion['to'],args)
            proof=chain(padded,{'Sym':use(iid,xs=source)},chain(fused,use(fid,**args),'Normalize'))
            params=dict(xs=ls,ys=ls,h=bi)
            if family in ('left','both'):params['f']=un
            if family in ('right','both'):params['r']=un
            rows.append(('independent_'+family+'_observed_mapped_zip_fusion_'+t.lower(),law(params,source,target,proof,dependencies=[iid,fid])))
    return rows


def law_roles():
    return {n:'derived_optimization_endpoint' for n,_ in named_laws()}


def publish(output,extra=()):
    rows=reference_laws()+named_laws()+list(extra)
    objects={identity(semantic_entry(v)):semantic_entry(v) for _,v in rows}
    names={n:identity(semantic_entry(v)) for n,v in rows}
    prior=Store(Path(__file__).resolve().parents[1],snapshot=PRIOR_SNAPSHOT)
    pending=[d for o in objects.values() for d in o['dependencies']]
    while pending:
        oid=pending.pop()
        if oid not in objects:
            objects[oid]=prior.object(oid);pending.extend(objects[oid]['dependencies'])
    st=Store.publish(Path(output),objects.values(),names);st.rebuild()
    (st.root/'view.json').write_bytes(canonical(st.bundle(names.values()))+b'\n')
    return st


def source_functions(held_out=False):
    rows=[]
    for family in (('both','nested') if held_out else ('left','right')):
        name='pipeline35_'+family+'_observed'+('_heldout' if held_out else '')+'_u32'
        left='xs.map(fn(x)=>left_word(x,seed,k))' if family in ('left','both','nested') else 'xs'
        if family=='nested':left+='.map(fn(x)=>post_word(x,seed,k))'
        right='ys.map(fn(y)=>right_word(y,seed,k))' if family in ('right','both','nested') else 'ys'
        body=left+'.zip('+right+',fn(a)=>fn(b)=>combine_words(a,b,seed,k))'
        mixer='choose(a<seed,(a+b)*k,(a-b)+seed)' if held_out else 'choose(a<b,a+b*k,a-b*k)+seed'
        helpers='\nfn left_word(x:u32,seed:u32,k:u32)->u32{return normalize_left(x,k)+seed;}\nfn normalize_left(x:u32,k:u32)->u32{return quot_or(x,k,0)+x;}\nfn right_word(y:u32,seed:u32,k:u32)->u32{return normalize_right(y,k)+k;}\nfn normalize_right(y:u32,k:u32)->u32{return rem_or(y,k,0)+y;}\nfn combine_words(a:u32,b:u32,seed:u32,k:u32)->u32{return mix_words(a,b,seed,k);}\nfn mix_words(a:u32,b:u32,seed:u32,k:u32)->u32{return '+mixer+';}'
        if family=='nested':helpers+='\nfn post_word(x:u32,seed:u32,k:u32)->u32{return shift_word(x,seed,k);}\nfn shift_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,x+k,x-k);}'
        rows.append((name,'u32',f'pub fn {name}(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>'+'{return '+body+';}'+helpers))
    return rows


def specialize(subject,core=None):
    """Fuse literal observed maps while preserving all composed helper calls."""
    from producers.beta_specialization15 import free_parameters,outside_lambda_positions,lift_use
    from producers.beta_sharing17 import beta_share
    from producers.definition_context28 import bind
    from ink_planner.semantic_search import replace,substitute,match
    roots=dict(named_laws());rows=[]
    for fn,body in sorted(subject['functions'].items()):
        current,proof,deps,hit=body,'Normalize',[],False
        for _ in range(8):
            found=False
            for path,node in outside_lambda_positions(current):
                n=node['node']
                if not isinstance(n,dict) or n.get('Op',[None])[0]!='method:zip':continue
                left,right,h=n['Op'][1]
                def mapped(v):return isinstance(v['node'],dict) and v['node'].get('Op',[None])[0]=='method:map'
                ml,mr=mapped(left),mapped(right)
                if not (ml or mr):continue
                family='both' if ml and mr else ('left' if ml else 'right')
                t=node['sort']['Value']['List']
                if t not in ('U32','I32','U64'):continue
                rule=roots['independent_'+family+'_observed_mapped_zip_fusion_'+t.lower()]
                args={}
                if not match(rule['from'],node,rule['params'],args) or set(args)!=set(rule['params']):continue
                middle=replace(current,path,substitute(rule['to'],args));gid=identity(semantic_entry(rule))
                witness=chain(middle,lift_use(current,path,use(gid,**args)),'Normalize')
                proof=chain(current,proof,witness);current=beta_share(middle);deps.append(gid);hit,found=True,True
                break
            if not found:break
        if hit:
            candidate=law(free_parameters(body),body,current,proof,dependencies=sorted(set(deps)))
            rows.append((fn+'_observed_map_fusion',bind(candidate,core,subject) if core is not None else candidate))
    return rows
