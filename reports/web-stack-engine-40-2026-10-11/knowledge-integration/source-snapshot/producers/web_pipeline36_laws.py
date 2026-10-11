"""Content-bound deployments of existing arbitrary ordered-fold fusion laws.

No new generic theorem: the old map-fold, filtered-map-fold and concat-fold
proofs already cover these equalities. These certificates preserve scalar helper
calls and bind their complete transitive definitions so generic substitutions can
execute. Mapping order and last-to-first accumulator order are unchanged.
"""
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import law
from producers.web_pipeline32_laws import chain,use
PRIOR_SNAPSHOT=Path(__file__).resolve().parents[1]/'store/snapshots/b7d979fd4861a1b82897f142737e9b8161f8c2946e9f7fa6514b50aefd45240b.json'


def reference_laws():
    from producers.web_fold17_laws import named_laws as mapped
    from producers.web_fold16_laws import named_laws as filtered
    from producers.web_sequence_laws import named_laws as sequence
    return [('prior_'+n,v) for fn,prefix in [(mapped,'mapped_arbitrary_fold_'),(filtered,'filtered_mapped_arbitrary_fold_'),(sequence,'concat_ordered_fold_')] for n,v in fn() if n.startswith(prefix) and n.rsplit('_',1)[-1] in ('u32','i32','u64')]


def named_laws():
    """There is no new generic mathematics in this deployment batch."""
    return []


def law_roles():return {}


def publish(output,extra=()):
    rows=reference_laws()+list(extra);objects={identity(semantic_entry(v)):semantic_entry(v) for _,v in rows};names={n:identity(semantic_entry(v)) for n,v in rows}
    prior=Store(Path(__file__).resolve().parents[1],snapshot=PRIOR_SNAPSHOT);pending=[d for obj in objects.values() for d in obj['dependencies']]
    while pending:
        oid=pending.pop()
        if oid not in objects:objects[oid]=prior.object(oid);pending.extend(objects[oid]['dependencies'])
    st=Store.publish(Path(output),objects.values(),names);st.rebuild();(st.root/'view.json').write_bytes(canonical(st.bundle(names.values()))+b'\n');return st


def source_functions(held_out=False):
    rows=[]
    for family in (('filtered','concat') if held_out else ('plain','nested')):
        name='pipeline36_'+family+'_ordered'+('_heldout' if held_out else '')+'_u32'
        xs='xs.filter(fn(x)=>accepts_word(x,seed,k))' if family=='filtered' else 'xs'
        seq=xs+'.map(fn(x)=>left_word(x,seed,k))'
        if family=='nested':seq+='.map(fn(x)=>post_word(x,seed,k))'
        if family=='concat':seq+='.concat(ys.map(fn(x)=>right_word(x,seed,k)))'
        expr='foldr('+seq+',seed,fn(x)=>fn(acc)=>reduce_word(x,acc,seed,k))'
        helpers='\nfn left_word(x:u32,seed:u32,k:u32)->u32{return calibrate_left(x,k)+seed;}\nfn calibrate_left(x:u32,k:u32)->u32{return quot_or(x,k,0);}\nfn right_word(x:u32,seed:u32,k:u32)->u32{return calibrate_right(x,k)+k;}\nfn calibrate_right(x:u32,k:u32)->u32{return rem_or(x,k,0);}\nfn reduce_word(x:u32,acc:u32,seed:u32,k:u32)->u32{return mix_word(x,acc,seed,k);}\nfn mix_word(x:u32,acc:u32,seed:u32,k:u32)->u32{return choose(acc<seed,x+acc*k,x-acc);}'
        if family=='nested':helpers+='\nfn post_word(x:u32,seed:u32,k:u32)->u32{return repair_word(x,seed,k);}\nfn repair_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,x+k,x-k);}'
        if family=='filtered':helpers+='\nfn accepts_word(x:u32,seed:u32,k:u32)->Bool{return acceptance_test(x,seed,k);}\nfn acceptance_test(x:u32,seed:u32,k:u32)->Bool{return rem_or(x,k,0)<seed;}'
        rows.append((name,'u32',f'pub fn {name}(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->u32'+'{return '+expr+';}'+helpers))
    return rows


def specialize(subject,core=None):
    from producers.beta_specialization15 import free_parameters,outside_lambda_positions,lift_use
    from producers.beta_sharing17 import beta_share
    from producers.definition_context28 import bind
    from ink_planner.semantic_search import replace,substitute,match
    # Consume the strongest matching whole-fold shape before plain map fusion.
    prior=dict(reference_laws());roots=[(n,v) for prefix in ('prior_filtered_mapped_','prior_concat_ordered_','prior_mapped_arbitrary_') for n,v in prior.items() if n.startswith(prefix)]
    rows=[]
    for fn,body in sorted(subject['functions'].items()):
        current,proof,deps,hit=body,'Normalize',[],False
        for _ in range(12):
            found=False
            for path,node in outside_lambda_positions(current):
                for n,rule in roots:
                    args={}
                    if not match(rule['from'],node,rule['params'],args) or set(args)!=set(rule['params']):continue
                    middle=replace(current,path,substitute(rule['to'],args));gid=identity(semantic_entry(rule))
                    witness=chain(middle,lift_use(current,path,use(gid,**args)),'Normalize')
                    proof=chain(current,proof,witness);current=beta_share(middle);deps.append(gid);found,hit=True,True
                    break
                if found:break
            if not found:break
        if hit:
            candidate=law(free_parameters(body),body,current,proof,dependencies=sorted(set(deps)))
            rows.append((fn+'_bound_ordered_fold_deployment',bind(candidate,core,subject) if core is not None else candidate))
    return rows
