"""Direct independent-list unused-map projection endpoints.

These endpoints are checked consequences of the existing map identity and
independent mapped-zip/postmap laws. They expose a useful demand rewrite directly
to search: replace the unobserved mapped stream by its input, preserving the
shortest-list extent. Mapping and retained helpers remain ordinary pure calls.
"""
from pathlib import Path
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import arrow, bound, lam, law, op, value, var, examples
from producers.web_pipeline32_laws import chain, use, apply
from producers.web_zip17_laws import named_laws as zip_laws


def reference_laws():
    rows = []
    for t in ('U32','I32','U64'):
        s, ls = value(t), value({'List':t})
        endpoint = op(ls,'method:map',var(ls,'xs'),lam(s,bound(s,0)))
        identity_map = next(v for v in examples() if v['from']==endpoint and v['to']==var(ls,'xs'))
        rows.append(('prior_identity_map_'+t.lower(),identity_map))
    rows += [('prior_'+n,v) for n,v in zip_laws() if any(n.endswith('_'+t) for t in ('u32','i32','u64')) and ('_left_' in n or '_right_' in n)]
    return rows


def named_laws():
    from ink_planner.semantic_search import substitute
    prior = dict(reference_laws())
    rows = []
    for t in ('U32','I32','U64'):
        s, ls = value(t), value({'List':t})
        un = arrow(s,s)
        xs, ys, f, g = var(ls,'xs'),var(ls,'ys'),var(un,'f'),var(un,'g')
        ident = lam(s,bound(s,0))
        for side in ('left','right'):
            projection = lam(s,lam(s,apply(g,bound(s,0 if side=='left' else 1))))
            zipper = lambda a: op(ls,'method:zip',a,ys,projection) if side=='left' else op(ls,'method:zip',ys,a,projection)
            source, target = zipper(op(ls,'method:map',xs,f)), zipper(xs)
            identity_map = prior['prior_identity_map_'+t.lower()]
            iid = identity(semantic_entry(identity_map))
            fusion = prior['prior_independent_'+side+'_mapped_zip_postmap_'+t.lower()]
            fid = identity(semantic_entry(fusion))
            args = dict(xs=xs,ys=ys,f=f,h=projection,g=ident) if side=='left' else dict(xs=ys,ys=xs,r=f,h=projection,g=ident)
            padded = op(ls,'method:map',source,ident)
            fused = substitute(fusion['to'],args)
            proof = chain(padded,{'Sym':use(iid,xs=source)},chain(fused,use(fid,**args),'Normalize'))
            rows.append(('independent_'+side+'_map_projection_erasure_'+t.lower(),law(dict(xs=ls,ys=ls,f=un,g=un),source,target,proof,dependencies=[iid,fid])))
    return rows


def law_roles():
    return {n:'derived_optimization_endpoint' for n,_ in named_laws()}


def publish(output, extra=()):
    rows = reference_laws()+named_laws()+list(extra)
    objects = {identity(semantic_entry(v)):semantic_entry(v) for _,v in rows}
    names = {n:identity(semantic_entry(v)) for n,v in rows}
    # Source controls may use existing independent scan erasure dependencies.
    prior = Store(Path(__file__).resolve().parents[1])
    pending = [d for obj in objects.values() for d in obj['dependencies']]
    while pending:
        oid = pending.pop()
        if oid not in objects:
            objects[oid] = prior.object(oid)
            pending.extend(objects[oid]['dependencies'])
    store = Store.publish(Path(output),objects.values(),names)
    store.rebuild()
    (store.root/'view.json').write_bytes(canonical(store.bundle(names.values()))+b'\n')
    return store


def source_functions(held_out=False):
    if held_out:
        # Exact old source names and bodies retain existing batch33 provenance.
        from producers.web_pipeline33_laws import source_functions as old
        return old(True)
    rows=[]
    for side in ('left','right'):
        name='pipeline34_'+side+'_projection_u32'
        discarded, selected = ('xs','ys') if side=='left' else ('ys','xs')
        mapped=discarded+'.map(fn(x)=>discarded_word(x,seed,k))'
        callback='fn(unused)=>fn(y)=>selected_word(y,seed,k)' if side=='left' else 'fn(y)=>fn(unused)=>selected_word(y,seed,k)'
        expr=mapped+'.zip('+selected+','+callback+')' if side=='left' else selected+'.zip('+mapped+','+callback+')'
        src=f'pub fn {name}(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>'+'{return '+expr+';}\nfn discarded_word(x:u32,seed:u32,k:u32)->u32{return calibrate_word(x,k)+seed;}\nfn calibrate_word(x:u32,k:u32)->u32{return quot_or(x,k,0)+rem_or(x,k,0);}\nfn selected_word(x:u32,seed:u32,k:u32)->u32{return repair_word(x,seed,k);}\nfn repair_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,x+k,x-k);}'
        rows.append((name,'u32',src))
    return rows


def specialize(subject, core=None, optimize=True):
    """Apply old scan laws first, then derived map-demand laws without inlining."""
    from producers.beta_specialization15 import free_parameters,outside_lambda_positions,lift_use,instantiate_bound
    from producers.beta_sharing17 import beta_share
    from producers.definition_context28 import bind
    from producers.web_pipeline33_laws import grouped_laws as scan_laws
    from ink_planner.semantic_search import replace,substitute,children
    roots = {n:v for n,v in scan_laws()[1]}
    if optimize:
        roots.update(dict(named_laws()))
    def occurs(v,depth):
        n=v['node']
        if isinstance(n,dict) and 'Bound' in n:
            return n['Bound']==depth
        return any(occurs(c,depth+int(isinstance(n,dict) and 'Lambda' in n)) for c in children(v))
    rows=[]
    for fn,body in sorted(subject['functions'].items()):
        current, proof, deps, hit, map_hit = body,'Normalize',[],False,False
        for _ in range(8):
            found=False
            for path,node in outside_lambda_positions(current):
                n=node['node']
                if not isinstance(n,dict) or n.get('Op',[None])[0]!='method:zip':
                    continue
                left,right,callback=n['Op'][1]
                cb=callback['node']
                if not isinstance(cb,dict) or 'Lambda' not in cb:
                    continue
                inner=cb['Lambda']
                if not isinstance(inner['node'],dict) or 'Lambda' not in inner['node']:
                    continue
                for side in ('left','right'):
                    discarded,other=(left,right) if side=='left' else (right,left)
                    dn=discarded['node']
                    if not isinstance(dn,dict):
                        continue
                    kind=dn.get('Op',[None])[0]
                    if kind not in (['method:scan','method:map'] if optimize else ['method:scan']):
                        continue
                    t=discarded['sort']['Value']['List'];s=value(t)
                    if side=='left':
                        if occurs(inner['node']['Lambda'],1):
                            continue
                        g=instantiate_bound(inner,dict(sort=s,node={'Word':0}))
                    else:
                        if occurs(inner['node']['Lambda'],0):
                            continue
                        g=lam(s,instantiate_bound(inner['node']['Lambda'],dict(sort=s,node={'Word':0})))
                    family='scan' if kind=='method:scan' else 'map'
                    rule=roots['independent_'+side+'_'+family+'_projection_erasure_'+t.lower()]
                    args=dict(xs=dn['Op'][1][0],ys=other,g=g)
                    if family=='map':
                        args['f']=dn['Op'][1][1]
                    expanded=replace(current,path,substitute(rule['from'],args))
                    middle=replace(current,path,substitute(rule['to'],args))
                    gid=identity(semantic_entry(rule))
                    witness=chain(expanded,'Normalize',chain(middle,lift_use(expanded,path,use(gid,**args)),'Normalize'))
                    proof=chain(current,proof,witness)
                    current=beta_share(middle)
                    deps.append(gid)
                    found,hit=True,True
                    map_hit |= family=='map'
                    break
                if found:
                    break
            if not found:
                break
        if hit and (map_hit or not optimize):
            candidate=law(free_parameters(body),body,current,proof,dependencies=sorted(set(deps)))
            rows.append((fn+('_independent_map_erasure' if optimize else '_shared_prior_scan_erasure'),bind(candidate,core,subject) if core is not None else candidate))
    return rows
