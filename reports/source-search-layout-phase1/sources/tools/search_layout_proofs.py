#!/usr/bin/env python3
"""External search cuts: complete sequence reconstruction and ordered lookup.

This is a linear lower-bound model. Native binary-search/Vec correspondence
and effect-safe representation installation remain separate obligations.
"""
import argparse, hashlib, json, subprocess
from pathlib import Path
from inductive_proofs import var, call, construct, refl, binary
from integer_proofs import match, induction, congruence, use, sym, trans
from table_transition_proofs import conditional, constructed, generalized, hypothesis, substitute
from bitvector_proofs import certificate
ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--sorted', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--compiler', type=Path, default=ROOT/'build/source-search-original/lang')
    parser.add_argument('--maintenance', type=Path, default=ROOT/'knowledge/table-maintenance/table.json')
    args = parser.parse_args(); out = args.directory.resolve(); (out/'objects').mkdir(parents=True, exist_ok=True)
    compiler = args.compiler.resolve(); parent = json.loads((args.sorted/'bundle.json').read_text())
    source = json.loads((args.sorted/'binding.json').read_text())
    original = json.loads((args.sorted/'names.json').read_text())
    roots = list(source['description']['definitions']) + [original[n] for n in
        ['layout_row_lookup', 'sorted_implies_unique', 'sorted_write', 'sorted_history',
         'layout_future_enumeration', 'sorted_column_history']]
    (out/'basis-roots.json').write_text(json.dumps(roots, indent=2)+'\n')
    subprocess.run([str(compiler), 'project-library', str(args.sorted/'lock.json'),
                    str(out/'basis-roots.json'), '-o', str(out/'basis.json')], check=True, capture_output=True)
    bundle = json.loads((out/'basis.json').read_text()); selected = set(bundle['objects'])
    # Explicitly import the checked definitions that new objects/concrete terms
    # name. Projection itself does not make dependency names ambient authority.
    bundle['lock']['objects'] = [i for i in parent['lock']['objects'] if i in selected]
    names = {n:i for n,i in original.items() if i in selected}; initial = set(names)
    for i,raw in bundle['objects'].items(): (out/'objects'/f'{i}.json').write_text(raw)
    def references(value):
        if isinstance(value,list): return set().union(*(references(v) for v in value))
        if not isinstance(value,dict): return set()
        result = set()
        for k,v in value.items():
            if k in ('datatype','function','theorem','Data') and isinstance(v,str): result.add(v)
            result |= references(v)
        return result
    def store(name,kind,declaration):
        deps = references(declaration) | {i for i,raw in bundle['objects'].items() if 'Datatype' in json.loads(raw)['declaration']}
        raw = json.dumps(dict(schema=1,semantics=bundle['lock']['semantics'],name=name,
            dependencies=sorted(deps),declaration={kind:declaration}),separators=(',',':'))+'\n'
        identity = hashlib.sha256(raw.encode()).hexdigest(); names[name] = identity
        bundle['objects'][identity] = raw; bundle['lock']['objects'].append(identity)
        (out/'objects'/f'{identity}.json').write_text(raw)
        check = out/'checking.json'; check.write_text(json.dumps(dict(bundle['lock'],objects=[identity])))
        result = subprocess.run([str(compiler),'verify-library',str(check)],capture_output=True,text=True)
        if result.returncode: raise ValueError(name+': '+result.stderr)
        print(name+': checked',flush=True); return identity
    def datatype(name,cases): return store(name,'Datatype',dict(constructors=[dict(name=n,fields=f) for n,f in cases]))
    def function(name,params,result,body,recursive=None): return store(name,'Function',dict(params=params,result=result,body=body,recursive=recursive))
    def theorem(name,params,left,right,proof): return store(name,'Theorem',dict(params=params,conditions=[],**{'from':left,'to':right},proof=proof))
    def scalar(name,params,left,right,conditions=(),selected=()):
        goal=out/(name+'.goal.json');cnf=out/(name+'.cnf.json')
        goal.write_text(json.dumps(dict(params=params,conditions=list(conditions),**{'from':left,'to':right})))
        subprocess.run([str(compiler),'bitvector-obligation',str(goal),'-o',str(cnf)],check=True,capture_output=True)
        problem=json.loads(cnf.read_text());cache=out/(name+'.certificate.json')
        proof=json.loads(cache.read_text()) if cache.exists() else None
        if not proof or proof['problem_sha256']!=problem['sha256']:
            proof=certificate(problem,seconds=60);cache.write_text(json.dumps(proof,indent=2)+'\n')
        return {'BitVector':dict(**{'from':left,'to':right},hypotheses=list(selected),certificate=proof)}
    T={'Bool':True};F={'Bool':False};conj=lambda a,b:binary('&&',a,b)
    bc=lambda a,b:dict(Binary=dict(op='&&',left=a,right=b))
    K={'Data':names['TableKey128']};R={'Data':names['LayoutRows']};O={'Data':names['LayoutOptionalRow']};V=source['description']['row_sort']
    rs,key,q,hk,hv,tail,prefix,suffix,new,cut=map(var,['rows','key','query','head_key','head_value','tail','prefix','suffix','new','cut'])
    eq=lambda a,b:call(names['table_key_equal'],a,b);lt=lambda a,b:call(names['layout_key_less'],a,b)
    cons=lambda k,v,t:construct(names['LayoutRows'],1,k,v,t);nil=construct(names['LayoutRows'],0)
    none=construct(names['LayoutOptionalRow'],0);some=lambda v:construct(names['LayoutOptionalRow'],1,v)
    get=lambda r,k:call(names['layout_row_lookup'],r,k)
    above=lambda k,r:call(names['sorted_rows_above'],r,k);ordered=lambda r:call(names['sorted_rows'],r)
    excludes=lambda r,k:call(names['sorted_excludes'],r,k)
    def given(name,args,*premises): return {'Use':dict(theorem=names[name],arguments=list(args),premises=list(premises))}
    def left(a,b,p): return given('sorted_conjunction_left',[a,b],p)
    def right(a,b,p): return given('sorted_conjunction_right',[a,b],p)
    def guarded(condition,value,proof,index=0,target=T):
        ctx=conditional(var('hole'),value,target);goal=conditional(condition,value,target)
        return {'BoolSplit':dict(condition=condition,**{'from':goal,'to':target},
            on_false=substitute(ctx,{'Hypothesis':index}),
            on_true=trans(substitute(ctx,{'Hypothesis':index}),proof))}
    def apply_guard(condition,value,equality,premise,target=T):
        return trans(sym(substitute(conditional(var('hole'),value,target),premise)),equality)
    def decide(condition,from_term,to_term,context,false,true,index):
        return {'BoolSplit':dict(condition=condition,**{'from':from_term,'to':to_term},
            on_false=trans(substitute(context,{'Hypothesis':index}),false),
            on_true=trans(substitute(context,{'Hypothesis':index}),true))}

    # Generic key replacement evidence from the two exact 64-bit components.
    a,b=var('a'),var('b')
    ka=construct(names['TableKey128'],0,var('ahi'),var('alo'));kb=construct(names['TableKey128'],0,var('bhi'),var('blo'))
    guard=conj(binary('==',var('ahi'),var('bhi')),binary('==',var('alo'),var('blo')))
    params=[[n,'U64'] for n in ['ahi','alo','bhi','blo']];conditions=[dict(**{'from':guard,'to':T})]
    hi=scalar('matching_key_high',params,var('ahi'),var('bhi'),conditions,[0])
    lo=scalar('matching_key_low',params,var('alo'),var('blo'),conditions,[0])
    inner=conditional(eq(ka,kb),ka,kb);ctx=conditional(var('hole'),ka,kb)
    proof={'BoolSplit':dict(condition=eq(ka,kb),**{'from':inner,'to':kb},
        on_false=substitute(ctx,{'Hypothesis':0}),
        on_true=trans(substitute(ctx,{'Hypothesis':0}),constructed(names['TableKey128'],0,hi,lo)))}
    choice=theorem('search_matching_key_choice',[['a',K],['b',K]],conditional(eq(a,b),a,b),b,
        induction('a',conditional(eq(a,b),a,b),b,(['ahi','alo'],
            induction('b',conditional(eq(ka,b),ka,b),b,(['bhi','blo'],proof)))))
    def matching(a,b,p): return trans(sym(substitute(conditional(var('hole'),a,b),p)),use(choice,a,b))

    # Absence proof is independent of payloads. The guarded equality avoids
    # leaking a fixed state premise into an induction over different tails.
    head=cons(hk,hv,tail);g=excludes(rs,key);goal=conditional(g,get(rs,key),none)
    head_exclusion=excludes(head,key);ctx=conditional(var('hole'),F,excludes(tail,key))
    false_value=apply_guard(excludes(tail,key),get(tail,key),hypothesis(key),{'Hypothesis':1},none)
    # Split equality first; a matching head makes the outer guard false.
    absence=theorem('search_excluded_lookup',[['rows',R],['key',K]],goal,none,
        generalized('rows',['key'],goal,none,([],refl(none)),
            (['head_key','head_value','tail'],
             {'BoolSplit':dict(condition=eq(hk,key),**{'from':conditional(head_exclusion,get(head,key),none),'to':none},
                on_false=trans(substitute(conditional(conditional(var('hole'),F,excludes(tail,key)),
                    conditional(var('hole'),some(hv),get(tail,key)),none),{'Hypothesis':0}),
                    guarded(excludes(tail,key),get(tail,key),false_value,index=1,target=none)),
                on_true=substitute(conditional(conditional(var('hole'),F,excludes(tail,key)),
                    conditional(var('hole'),some(hv),get(tail,key)),none),{'Hypothesis':0}))})))
    g=above(key,rs);goal=conditional(g,get(rs,key),none)
    p_excludes=apply_guard(g,excludes(rs,key),use(names['sorted_above_excludes'],rs,key),{'Hypothesis':0})
    theorem('search_above_lookup',[['rows',R],['key',K]],goal,none,
        guarded(g,get(rs,key),apply_guard(excludes(rs,key),get(rs,key),use(absence,rs,key),p_excludes,none),target=none))

    append_id=function('search_append',[['prefix',R],['suffix',R]],R,
        match(prefix,([],suffix),(['head_key','head_value','tail'],cons(hk,hv,{'SelfCall':[tail,suffix]}))),0)
    append=lambda a,b:call(append_id,a,b)
    cut_id=datatype('SearchCut',[('Missing',[R,R]),('Found',[R,K,V,R])]);C={'Data':cut_id}
    missing=lambda p,s:construct(cut_id,0,p,s);found=lambda p,k,v,s:construct(cut_id,1,p,k,v,s)
    push_id=function('search_prepend',[['key',K],['value',V],['cut',C]],C,
        match(cut,(['prefix','suffix'],missing(cons(key,var('value'),prefix),suffix)),
            (['prefix','found_key','found_value','suffix'],found(cons(key,var('value'),prefix),var('found_key'),var('found_value'),suffix))),2)
    push=lambda k,v,c:call(push_id,k,v,c)
    locate_id=function('search_locate',[['rows',R],['key',K]],C,
        match(rs,([],missing(nil,nil)),(['head_key','head_value','tail'],
            conditional(eq(hk,key),found(nil,hk,hv,tail),
                conditional(lt(key,hk),missing(nil,head),push(hk,hv,{'SelfCall':[tail,key]}))))),0)
    locate=lambda r,k:call(locate_id,r,k)
    rebuild_id=function('search_rebuild',[['cut',C]],R,
        match(cut,(['prefix','suffix'],append(prefix,suffix)),
            (['prefix','found_key','found_value','suffix'],append(prefix,cons(var('found_key'),var('found_value'),suffix)))),0)
    rebuild=lambda c:call(rebuild_id,c)
    value_id=function('search_value',[['cut',C]],O,
        match(cut,(['prefix','suffix'],none),(['prefix','found_key','found_value','suffix'],some(var('found_value')))),0)
    value=lambda c:call(value_id,c)
    apply_id=function('search_apply',[['cut',C],['key',K],['new',O]],R,
        match(cut,(['prefix','suffix'],append(prefix,call(names['layout_row_overlay'],key,suffix,new))),
            (['prefix','found_key','found_value','suffix'],append(prefix,call(names['layout_row_overlay'],var('found_key'),suffix,new)))),0)
    apply=lambda c,k,n:call(apply_id,c,k,n)
    rebuild_push=theorem('search_rebuild_prepend',[['key',K],['value',V],['cut',C]],
        rebuild(push(key,var('value'),cut)),cons(key,var('value'),rebuild(cut)),
        induction('cut',rebuild(push(key,var('value'),cut)),cons(key,var('value'),rebuild(cut)),
            (['prefix','suffix'],refl(cons(key,var('value'),append(prefix,suffix)))),
            (['prefix','found_key','found_value','suffix'],refl(cons(key,var('value'),append(prefix,cons(var('found_key'),var('found_value'),suffix)))))))
    value_push=theorem('search_value_prepend',[['key',K],['value',V],['cut',C]],value(push(key,var('value'),cut)),value(cut),
        induction('cut',value(push(key,var('value'),cut)),value(cut),
            (['prefix','suffix'],refl(none)),(['prefix','found_key','found_value','suffix'],refl(some(var('found_value'))))))
    apply_push=theorem('search_apply_prepend',[['head_key',K],['head_value',V],['cut',C],['key',K],['new',O]],
        apply(push(hk,hv,cut),key,new),cons(hk,hv,apply(cut,key,new)),
        induction('cut',apply(push(hk,hv,cut),key,new),cons(hk,hv,apply(cut,key,new)),
            (['prefix','suffix'],refl(cons(hk,hv,append(prefix,call(names['layout_row_overlay'],key,suffix,new))))),
            (['prefix','found_key','found_value','suffix'],refl(cons(hk,hv,append(prefix,call(names['layout_row_overlay'],var('found_key'),suffix,new)))))))
    def search_cases(observer,from_term,to_term,equal_proof,gap_proof,next_proof,offset=0):
        next_term=push(hk,hv,locate(tail,key));gap=missing(nil,head);hit=found(nil,hk,hv,tail)
        context=observer(conditional(var('hole'),gap,next_term))
        less={'BoolSplit':dict(condition=lt(key,hk),**{'from':observer(conditional(lt(key,hk),gap,next_term)),'to':to_term},
            on_false=trans(substitute(context,{'Hypothesis':offset+1}),next_proof),
            on_true=trans(substitute(context,{'Hypothesis':offset+1}),gap_proof))}
        context=observer(conditional(var('hole'),hit,conditional(lt(key,hk),gap,next_term)))
        return {'BoolSplit':dict(condition=eq(hk,key),**{'from':from_term,'to':to_term},
            on_false=trans(substitute(context,{'Hypothesis':offset}),less),
            on_true=trans(substitute(context,{'Hypothesis':offset}),equal_proof))}
    theorem('search_reconstructs',[['rows',R],['key',K]],rebuild(locate(rs,key)),rs,
        generalized('rows',['key'],rebuild(locate(rs,key)),rs,([],refl(nil)),
            (['head_key','head_value','tail'],search_cases(rebuild,rebuild(locate(head,key)),head,refl(head),refl(head),
                trans(use(rebuild_push,hk,hv,locate(tail,key)),constructed(names['LayoutRows'],1,refl(hk),refl(hv),hypothesis(key)))))))
    def split_equality(condition,lhs,rhs,lcontext,rcontext,false_proof,true_proof,index):
        def branch(proof):
            parts=[substitute(lcontext,{'Hypothesis':index}),proof]
            if rcontext is not None: parts.append(sym(substitute(rcontext,{'Hypothesis':index})))
            return trans(*parts)
        return {'BoolSplit':dict(condition=condition,**{'from':lhs,'to':rhs},
            on_false=branch(false_proof),on_true=branch(true_proof))}
    hit=found(nil,hk,hv,tail);gap=missing(nil,head);next_cut=push(hk,hv,locate(tail,key))
    overlay=lambda k,r,n:call(names['layout_row_overlay'],k,r,n)
    put=lambda r,k,n:call(names['layout_row_write'],r,k,n)
    next_proof=trans(use(apply_push,hk,hv,locate(tail,key),key,new),
        constructed(names['LayoutRows'],1,refl(hk),refl(hv),hypothesis(key,new)))
    less_proof=split_equality(lt(key,hk),apply(conditional(lt(key,hk),gap,next_cut),key,new),
        conditional(lt(key,hk),overlay(key,head,new),cons(hk,hv,put(tail,key,new))),
        apply(conditional(var('hole'),gap,next_cut),key,new),
        conditional(var('hole'),overlay(key,head,new),cons(hk,hv,put(tail,key,new))),
        next_proof,refl(overlay(key,head,new)),1)
    match_proof=split_equality(eq(hk,key),apply(locate(head,key),key,new),put(head,key,new),
        apply(conditional(var('hole'),hit,conditional(lt(key,hk),gap,next_cut)),key,new),
        conditional(var('hole'),overlay(hk,tail,new),conditional(lt(key,hk),overlay(key,head,new),cons(hk,hv,put(tail,key,new)))),
        less_proof,refl(overlay(hk,tail,new)),0)
    theorem('search_apply_is_write',[['rows',R],['key',K],['new',O]],apply(locate(rs,key),key,new),put(rs,key,new),
        generalized('rows',['key','new'],apply(locate(rs,key),key,new),put(rs,key,new),
            ([],refl(overlay(key,nil,new))),(['head_key','head_value','tail'],match_proof)))

    # A sorted tail is above its head. Transport that bound to a missing
    # search key that stops before the head, and lookup must be absent.
    sorted_tail=left(ordered(tail),above(hk,tail),{'Hypothesis':0})
    above_head_tail=right(ordered(tail),above(hk,tail),{'Hypothesis':0})
    gap_above=apply_guard(conj(lt(key,hk),above(hk,tail)),above(key,tail),
        use(names['sorted_above_transitive'],tail,key,hk),bc({'Hypothesis':2},above_head_tail))
    gap_lookup=apply_guard(above(key,tail),get(tail,key),use(names['search_above_lookup'],tail,key),gap_above,none)
    next_lookup=trans(use(value_push,hk,hv,locate(tail,key)),
        apply_guard(ordered(tail),value(locate(tail,key)),hypothesis(key),sorted_tail,get(tail,key)))
    less_lookup=split_equality(lt(key,hk),value(conditional(lt(key,hk),gap,next_cut)),get(tail,key),
        value(conditional(var('hole'),gap,next_cut)),None,next_lookup,sym(gap_lookup),2)
    match_lookup=split_equality(eq(hk,key),value(locate(head,key)),get(head,key),
        value(conditional(var('hole'),hit,conditional(lt(key,hk),gap,next_cut))),
        conditional(var('hole'),some(hv),get(tail,key)),less_lookup,refl(some(hv)),1)
    goal=conditional(ordered(rs),value(locate(rs,key)),get(rs,key))
    theorem('search_ordered_lookup',[['rows',R],['key',K]],goal,get(rs,key),
        generalized('rows',['key'],goal,get(rs,key),([],refl(none)),
            (['head_key','head_value','tail'],guarded(ordered(head),value(locate(head,key)),match_lookup,target=get(head,key)))))

    below_id=function('search_rows_below',[['rows',R],['bound',K]],'Bool',
        match(rs,([],T),(['head_key','head_value','tail'],conj(lt(hk,var('bound')),{'SelfCall':[tail,var('bound')]}))),0)
    below=lambda r,k:call(below_id,r,k)
    prefix_id=function('search_prefix_below',[['cut',C],['key',K]],'Bool',
        match(cut,(['prefix','suffix'],below(prefix,key)),
            (['prefix','found_key','found_value','suffix'],below(prefix,key))),0)
    prefix_below=lambda c,k:call(prefix_id,c,k)
    suffix_id=function('search_suffix_above',[['cut',C],['key',K]],'Bool',
        match(cut,(['prefix','suffix'],above(key,suffix)),
            (['prefix','found_key','found_value','suffix'],above(key,suffix))),0)
    suffix_above=lambda c,k:call(suffix_id,c,k)
    matching_id=function('search_found_key',[['cut',C],['key',K]],'Bool',
        match(cut,(['prefix','suffix'],T),
            (['prefix','found_key','found_value','suffix'],eq(var('found_key'),key))),0)
    found_key=lambda c,k:call(matching_id,c,k)
    prefix_push=theorem('search_prefix_prepend',[['head_key',K],['head_value',V],['cut',C],['key',K]],
        prefix_below(push(hk,hv,cut),key),conj(lt(hk,key),prefix_below(cut,key)),
        induction('cut',prefix_below(push(hk,hv,cut),key),conj(lt(hk,key),prefix_below(cut,key)),
            (['prefix','suffix'],refl(conj(lt(hk,key),below(prefix,key)))),
            (['prefix','found_key','found_value','suffix'],refl(conj(lt(hk,key),below(prefix,key))))))
    suffix_push=theorem('search_suffix_prepend',[['head_key',K],['head_value',V],['cut',C],['key',K]],
        suffix_above(push(hk,hv,cut),key),suffix_above(cut,key),
        induction('cut',suffix_above(push(hk,hv,cut),key),suffix_above(cut,key),
            (['prefix','suffix'],refl(above(key,suffix))),
            (['prefix','found_key','found_value','suffix'],refl(above(key,suffix)))))
    matching_push=theorem('search_found_prepend',[['head_key',K],['head_value',V],['cut',C],['key',K]],
        found_key(push(hk,hv,cut),key),found_key(cut,key),
        induction('cut',found_key(push(hk,hv,cut),key),found_key(cut,key),
            (['prefix','suffix'],refl(T)),
            (['prefix','found_key','found_value','suffix'],refl(eq(var('found_key'),key)))))
    forward=trans(sym(substitute(conditional(var('hole'),T,lt(hk,key)),{'Hypothesis':1})),
        sym(substitute(conditional(var('hole'),T,conditional(lt(key,hk),T,lt(hk,key))),{'Hypothesis':0})),
        use(names['sorted_key_forward'],hk,key))
    prefix_law=theorem('search_prefix_is_below',[['rows',R],['key',K]],prefix_below(locate(rs,key),key),T,
        generalized('rows',['key'],prefix_below(locate(rs,key),key),T,([],refl(T)),
            (['head_key','head_value','tail'],search_cases(lambda c:prefix_below(c,key),prefix_below(locate(head,key),key),T,
                refl(T),refl(T),trans(use(prefix_push,hk,hv,locate(tail,key),key),bc(forward,hypothesis(key)))))))
    matching_law=theorem('search_found_key_matches',[['rows',R],['key',K]],found_key(locate(rs,key),key),T,
        generalized('rows',['key'],found_key(locate(rs,key),key),T,([],refl(T)),
            (['head_key','head_value','tail'],search_cases(lambda c:found_key(c,key),found_key(locate(head,key),key),T,
                {'Hypothesis':0},refl(T),trans(use(matching_push,hk,hv,locate(tail,key),key),hypothesis(key))))))
    equal_above=trans(sym(congruence(names['sorted_rows_above'],refl(tail),matching(hk,key,{'Hypothesis':1}))),above_head_tail)
    next_above=trans(use(suffix_push,hk,hv,locate(tail,key),key),
        apply_guard(ordered(tail),suffix_above(locate(tail,key),key),hypothesis(key),sorted_tail))
    gap_above_head=bc({'Hypothesis':2},gap_above)
    goal=conditional(ordered(rs),suffix_above(locate(rs,key),key),T)
    suffix_law=theorem('search_suffix_is_above',[['rows',R],['key',K]],goal,T,
        generalized('rows',['key'],goal,T,([],refl(T)),
            (['head_key','head_value','tail'],guarded(ordered(head),suffix_above(locate(head,key),key),
                search_cases(lambda c:suffix_above(c,key),suffix_above(locate(head,key),key),T,
                    equal_above,gap_above_head,next_above,offset=1)))))
    valid_id=function('search_cut_valid',[['cut',C],['key',K]],'Bool',
        conj(prefix_below(cut,key),conj(found_key(cut,key),suffix_above(cut,key))))
    valid=lambda c,k:call(valid_id,c,k)
    theorem('search_missing_validity_definition',[['prefix',R],['suffix',R],['key',K]],
        valid(missing(prefix,suffix),key),conj(below(prefix,key),above(key,suffix)),
        bc(refl(below(prefix,key)),use(names['sorted_true_and'],above(key,suffix))))
    exact_valid=conj(below(prefix,key),conj(eq(hk,key),above(key,suffix)))
    theorem('search_found_validity_definition',[['prefix',R],['head_key',K],['head_value',V],['suffix',R],['key',K]],
        valid(found(prefix,hk,hv,suffix),key),exact_valid,refl(exact_valid))
    goal=conditional(ordered(rs),valid(locate(rs,key),key),T)
    validity=theorem('search_ordered_cut_valid',[['rows',R],['key',K]],goal,T,
        guarded(ordered(rs),valid(locate(rs,key),key),
            bc(use(prefix_law,rs,key),bc(use(matching_law,rs,key),
                apply_guard(ordered(rs),suffix_above(locate(rs,key),key),use(suffix_law,rs,key),{'Hypothesis':0})))))
    writes=var('writes');WS={'Data':names['LayoutWrites']}
    execute=lambda ws,r:call(names['layout_row_execute'],ws,r)
    final=execute(writes,rs);goal=conditional(ordered(rs),valid(locate(final,key),key),T)
    final_sorted=apply_guard(ordered(rs),ordered(final),use(names['sorted_history'],writes,rs),{'Hypothesis':0})
    theorem('search_after_history_valid',[['writes',WS],['rows',R],['key',K]],goal,T,
        guarded(ordered(rs),valid(locate(final,key),key),
            apply_guard(ordered(final),valid(locate(final,key),key),use(validity,final,key),final_sorted)))

    # Mathematical positions use the existing unbounded unary Natural sort.
    # This does not silently identify native usize/index arithmetic with it.
    N={'Data':names['Natural']};zero=construct(names['Natural'],0)
    succ=lambda n:construct(names['Natural'],1,n)
    entry_id=datatype('SearchEntry',[('None',[]),('Some',[K,V])]);E={'Data':entry_id}
    no_entry=construct(entry_id,0);entry=lambda k,v:construct(entry_id,1,k,v)
    head_id=function('search_head_entry',[['rows',R]],E,
        match(rs,([],no_entry),(['head_key','head_value','tail'],entry(hk,hv))),0)
    entry_head=lambda r:call(head_id,r)
    length_id=function('search_length',[['rows',R]],N,
        match(rs,([],zero),(['head_key','head_value','tail'],succ({'SelfCall':[tail]}))),0)
    length=lambda r:call(length_id,r)
    index=var('index');pred=var('previous')
    at_id=function('search_entry_at',[['rows',R],['index',N]],E,
        match(rs,([],no_entry),(['head_key','head_value','tail'],
            match(index,([],entry(hk,hv)),(['previous'],{'SelfCall':[tail,pred]})))),0)
    at=lambda r,n:call(at_id,r,n)
    position_id=function('search_position',[['cut',C]],N,
        match(cut,(['prefix','suffix'],length(prefix)),
            (['prefix','found_key','found_value','suffix'],length(prefix))),0)
    position=lambda c:call(position_id,c)
    hit_id=function('search_has_entry',[['cut',C]],'Bool',
        match(cut,(['prefix','suffix'],F),(['prefix','found_key','found_value','suffix'],T)),0)
    has_entry=lambda c:call(hit_id,c)
    entry_value_id=function('search_cut_entry',[['cut',C]],E,
        match(cut,(['prefix','suffix'],no_entry),
            (['prefix','found_key','found_value','suffix'],entry(var('found_key'),var('found_value')))),0)
    cut_entry=lambda c:call(entry_value_id,c)
    append_index=theorem('search_index_after_prefix',[['prefix',R],['suffix',R]],
        at(append(prefix,suffix),length(prefix)),entry_head(suffix),
        generalized('prefix',['suffix'],at(append(prefix,suffix),length(prefix)),entry_head(suffix),
            ([],induction('suffix',at(suffix,zero),entry_head(suffix),
                ([],refl(no_entry)),(['head_key','head_value','tail'],refl(entry(hk,hv))))),
            (['head_key','head_value','tail'],hypothesis(suffix))))
    goal=conditional(has_entry(cut),at(rebuild(cut),position(cut)),cut_entry(cut))
    cut_index=theorem('search_cut_index',[['cut',C]],goal,cut_entry(cut),
        induction('cut',goal,cut_entry(cut),(['prefix','suffix'],refl(no_entry)),
            (['prefix','found_key','found_value','suffix'],use(append_index,prefix,cons(var('found_key'),var('found_value'),suffix)))))
    located=locate(rs,key);goal=conditional(has_entry(located),at(rs,position(located)),cut_entry(located))
    theorem('search_found_index',[['rows',R],['key',K]],goal,cut_entry(located),
        trans(substitute(conditional(has_entry(located),var('hole'),cut_entry(located)),
                  congruence(at_id,sym(use(names['search_reconstructs'],rs,key)),refl(position(located)))),
              use(cut_index,located)))

    binding=dict(source,library=bundle)
    (out/'binding.json').write_text(json.dumps(binding,indent=2)+'\n')
    subprocess.run([str(compiler),'verify-row-model',str(args.source),str(out/'binding.json'),
                    '--maintenance',str(args.maintenance)],check=True,capture_output=True)
    (out/'bundle.json').write_text(json.dumps(bundle,indent=2)+'\n')
    (out/'lock.json').write_text(json.dumps(bundle['lock'],indent=2)+'\n')
    (out/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    (out/'model.json').write_text(json.dumps(dict(schema=1,semantics='source-bound-search-cuts-v1',
        source_description=source['description'],parent_bundle_sha256=hashlib.sha256((args.sorted/'bundle.json').read_bytes()).hexdigest(),
        compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),new_objects={n:names[n] for n in names if n not in initial},
        retained_parent_objects=len(selected),scope='Linear-search cuts over complete source rows; native binary search and effects remain unverified.'),indent=2)+'\n')
    print(f'Checked {len(names)-len(initial)} new objects; {len(names)} total.',flush=True)

if __name__=='__main__':main()
