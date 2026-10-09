#!/usr/bin/env python3
"""External order/uniqueness invariant proofs for source-bound layout models.

Uses the existing inductive/bitvector kernel. Native binary search, Vec and
transaction/effect correspondence remain separate obligations.
"""
import argparse, hashlib, json, subprocess
from pathlib import Path
from inductive_proofs import var, call, construct, refl, binary
from integer_proofs import match, induction, congruence, use, sym, trans
from table_transition_proofs import conditional, generalized, hypothesis, substitute
from bitvector_proofs import certificate
ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory',type=Path)
    parser.add_argument('--layout',type=Path,required=True)
    parser.add_argument('--source-model',type=Path,required=True)
    parser.add_argument('--source',type=Path,required=True)
    parser.add_argument('--compiler',type=Path,default=ROOT/'build/source-row-original/lang')
    parser.add_argument('--maintenance',type=Path,default=ROOT/'knowledge/table-maintenance/table.json')
    args=parser.parse_args(); out=args.directory.resolve();(out/'objects').mkdir(parents=True,exist_ok=True)
    compiler=args.compiler.resolve(); parent=json.loads((args.layout/'bundle.json').read_text())
    original_names=json.loads((args.layout/'names.json').read_text()); source=json.loads(args.source_model.read_text())
    # Select the original source authority and the future enumeration theorem's
    # real closure; unrelated layout/maintenance theorems consume no new budget.
    roots=set(source['library']['objects'])|{original_names['layout_future_enumeration'],
        original_names['layout_row_lookup'],original_names['layout_encoded_alignment']}
    selected=set()
    def visit(identity):
        if identity in selected:return
        selected.add(identity)
        for dependency in json.loads(parent['objects'][identity])['dependencies']:visit(dependency)
    for identity in roots:visit(identity)
    bundle=dict(lock=dict(parent['lock'],objects=[i for i in parent['lock']['objects'] if i in selected]),
                objects={i:raw for i,raw in parent['objects'].items() if i in selected})
    names={n:i for n,i in original_names.items() if i in selected}; initial=set(names)
    for i,raw in bundle['objects'].items():(out/'objects'/f'{i}.json').write_text(raw)
    def references(value):
        if isinstance(value,list):return set().union(*(references(v) for v in value))
        if not isinstance(value,dict):return set()
        found=set()
        for key,value in value.items():
            if key in ('datatype','function','theorem','Data') and isinstance(value,str):found.add(value)
            found|=references(value)
        return found
    def store(name,kind,declaration):
        deps=references(declaration)|{i for i,raw in bundle['objects'].items() if 'Datatype' in json.loads(raw)['declaration']}
        raw=json.dumps(dict(schema=1,semantics=bundle['lock']['semantics'],name=name,
            dependencies=sorted(deps),declaration={kind:declaration}),separators=(',',':'))+'\n'
        identity=hashlib.sha256(raw.encode()).hexdigest();names[name]=identity
        bundle['objects'][identity]=raw;bundle['lock']['objects'].append(identity)
        (out/'objects'/f'{identity}.json').write_text(raw)
        check=out/'checking.json';check.write_text(json.dumps(dict(bundle['lock'],objects=[identity])))
        result=subprocess.run([str(compiler),'verify-library',str(check)],capture_output=True,text=True)
        if result.returncode:raise ValueError(name+': '+result.stderr)
        print(name+': checked',flush=True);return identity
    def function(name,params,result,body,recursive=None):
        return store(name,'Function',dict(params=params,result=result,body=body,recursive=recursive))
    def theorem(name,params,left,right,proof,conditions=()):
        return store(name,'Theorem',dict(params=params,conditions=list(conditions),**{'from':left,'to':right},proof=proof))
    def scalar(name,params,left,right,conditions=(),selected=()):
        goal=out/(name+'.goal.json');cnf=out/(name+'.cnf.json')
        goal.write_text(json.dumps(dict(params=params,conditions=list(conditions),**{'from':left,'to':right})))
        subprocess.run([str(compiler),'bitvector-obligation',str(goal),'-o',str(cnf)],check=True,capture_output=True)
        problem=json.loads(cnf.read_text());cached=out/(name+'.certificate.json')
        proof=json.loads(cached.read_text()) if cached.exists() else None
        if not proof or proof['problem_sha256']!=problem['sha256']:
            proof=certificate(problem,seconds=60)
            cached.write_text(json.dumps(proof,indent=2)+'\n')
        return {'BitVector':dict(**{'from':left,'to':right},hypotheses=list(selected),certificate=proof)}
    T={'Bool':True};F={'Bool':False}
    conj=lambda a,b:binary('&&',a,b)
    bc=lambda a,b:dict(Binary=dict(op='&&',left=a,right=b))
    K={'Data':names['TableKey128']};R={'Data':names['LayoutRows']};O={'Data':names['LayoutOptionalRow']}
    W={'Data':names['LayoutWrite']};WS={'Data':names['LayoutWrites']}
    rs,key,new,hk,hv,tail,bound,middle=map(var,['rows','key','new','head_key','head_value','tail','bound','middle'])
    eq=lambda a,b:call(names['table_key_equal'],a,b)
    lt=lambda a,b:call(names['layout_key_less'],a,b)
    cons=lambda k,v,t:construct(names['LayoutRows'],1,k,v,t)
    nil=construct(names['LayoutRows'],0)
    put=lambda r,k,n:call(names['layout_row_write'],r,k,n)
    overlay=lambda k,r,n:call(names['layout_row_overlay'],k,r,n)
    a,b=var('a'),var('b');condition=dict(**{'from':conj(a,b),'to':T})
    left_rule=theorem('sorted_conjunction_left',[['a','Bool'],['b','Bool']],a,T,
        scalar('conjunction_left',[['a','Bool'],['b','Bool']],a,T,[condition],[0]),[condition])
    right_rule=theorem('sorted_conjunction_right',[['a','Bool'],['b','Bool']],b,T,
        scalar('conjunction_right',[['a','Bool'],['b','Bool']],b,T,[condition],[0]),[condition])
    def given(identity,args,*premises):return {'Use':dict(theorem=identity,arguments=list(args),premises=list(premises))}
    def left(a,b,p):return given(left_rule,[a,b],p)
    def right(a,b,p):return given(right_rule,[a,b],p)
    # Close a universal guarded statement. Induction happens outside these
    # branch assumptions, so fixed premises never leak into a quantified IH.
    def guarded(condition,value,true_proof,index=0):
        ctx=conditional(var('hole'),value,T); goal=conditional(condition,value,T)
        return {'BoolSplit':dict(condition=condition,**{'from':goal,'to':T},
            on_false=substitute(ctx,{'Hypothesis':index}),
            on_true=trans(substitute(ctx,{'Hypothesis':index}),true_proof))}
    def apply_guard(condition,value,equality,premise):
        return trans(sym(substitute(conditional(var('hole'),value,T),premise)),equality)
    # The three key laws are proved for all six/four 64-bit words by an
    # external SAT solver; only its bounded RUP certificates enter the kernel.
    ka=construct(names['TableKey128'],0,var('ahi'),var('alo'))
    kb=construct(names['TableKey128'],0,var('bhi'),var('blo'))
    kc=construct(names['TableKey128'],0,var('chi'),var('clo'))
    def words_less(x,y):
        return binary('||',binary('<',var(x+'hi'),var(y+'hi')),
            conj(binary('==',var(x+'hi'),var(y+'hi')),binary('<',var(x+'lo'),var(y+'lo'))))
    def words_equal(x,y):return conj(binary('==',var(x+'hi'),var(y+'hi')),binary('==',var(x+'lo'),var(y+'lo')))
    ab,ba,ac,bc_term=words_less('a','b'),words_less('b','a'),words_less('a','c'),words_less('b','c')
    word_params=[[x+s,'U64'] for x in 'abc' for s in ['hi','lo']]
    c=var('c');g=conj(lt(a,b),lt(b,c));value=lt(a,c);goal=conditional(g,value,T)
    key_transitive=theorem('sorted_key_transitive',[['a',K],['b',K],['c',K]],goal,T,
        induction('a',goal,T,(['ahi','alo'],induction('b',conditional(conj(lt(ka,b),lt(b,c)),lt(ka,c),T),T,
            (['bhi','blo'],induction('c',conditional(conj(lt(ka,kb),lt(kb,c)),lt(ka,c),T),T,
                (['chi','clo'],scalar('key_transitive',word_params,conditional(conj(ab,bc_term),ac,T),T))))))))
    goal=conditional(eq(a,b),T,conditional(lt(b,a),T,lt(a,b)))
    key_forward=theorem('sorted_key_forward',[['a',K],['b',K]],goal,T,
        induction('a',goal,T,(['ahi','alo'],induction('b',conditional(eq(ka,b),T,conditional(lt(b,ka),T,lt(ka,b))),T,
            (['bhi','blo'],scalar('key_forward',word_params[:4],conditional(words_equal('a','b'),T,conditional(ba,T,ab)),T))))))
    goal=conditional(lt(a,b),eq(b,a),F)
    key_not_equal=theorem('sorted_key_not_equal',[['a',K],['b',K]],goal,F,
        induction('a',goal,F,(['ahi','alo'],induction('b',conditional(lt(ka,b),eq(b,ka),F),F,
            (['bhi','blo'],scalar('key_not_equal',word_params[:4],conditional(ab,words_equal('b','a'),F),F))))))
    above_id=function('sorted_rows_above',[['rows',R],['bound',K]],'Bool',
        match(rs,([],T),(['head_key','head_value','tail'],conj(lt(bound,hk),{'SelfCall':[tail,bound]}))),0)
    above=lambda b,r:call(above_id,r,b)
    sorted_id=function('sorted_rows',[['rows',R]],'Bool',
        match(rs,([],T),(['head_key','head_value','tail'],conj({'SelfCall':[tail]},above(hk,tail)))),0)
    ordered=lambda r:call(sorted_id,r)
    # An optional prepend preserves a lower bound and sortedness under exact
    # premises; removal does not have to invent a payload or key.
    g=conj(above(bound,rs),lt(bound,key));value=above(bound,overlay(key,rs,new));goal=conditional(g,value,T)
    none=construct(names['LayoutOptionalRow'],0);some=construct(names['LayoutOptionalRow'],1,var('value'))
    above_overlay=theorem('sorted_above_overlay',[['rows',R],['bound',K],['key',K],['new',O]],goal,T,
        induction('new',goal,T,
            ([],guarded(g,above(bound,rs),left(above(bound,rs),lt(bound,key),{'Hypothesis':0}))),
            (['value'],guarded(g,above(bound,overlay(key,rs,some)),
                bc(right(above(bound,rs),lt(bound,key),{'Hypothesis':0}),left(above(bound,rs),lt(bound,key),{'Hypothesis':0}))))))
    g=conj(ordered(rs),above(key,rs));value=ordered(overlay(key,rs,new));goal=conditional(g,value,T)
    sorted_overlay=theorem('sorted_overlay',[['rows',R],['key',K],['new',O]],goal,T,
        induction('new',goal,T,
            ([],guarded(g,ordered(rs),left(ordered(rs),above(key,rs),{'Hypothesis':0}))),
            (['value'],guarded(g,ordered(overlay(key,rs,some)),{'Hypothesis':0}))))
    g=conj(lt(bound,middle),above(middle,rs));value=above(bound,rs);goal=conditional(g,value,T)
    head=cons(hk,hv,tail)
    p={'Hypothesis':0}; mid_above_head=conj(lt(middle,hk),above(middle,tail))
    p_bound_mid=left(lt(bound,middle),mid_above_head,p)
    p_mid_above=right(lt(bound,middle),mid_above_head,p)
    p_mid_head=left(lt(middle,hk),above(middle,tail),p_mid_above)
    p_mid_tail=right(lt(middle,hk),above(middle,tail),p_mid_above)
    p_bound_head=apply_guard(conj(lt(bound,middle),lt(middle,hk)),lt(bound,hk),
        use(key_transitive,bound,middle,hk),bc(p_bound_mid,p_mid_head))
    p_bound_tail=apply_guard(conj(lt(bound,middle),above(middle,tail)),above(bound,tail),
        hypothesis(bound,middle),bc(p_bound_mid,p_mid_tail))
    above_transitive=theorem('sorted_above_transitive',[['rows',R],['bound',K],['middle',K]],goal,T,
        generalized('rows',['bound','middle'],goal,T,
            ([],guarded(conj(lt(bound,middle),T),T,refl(T))),
            (['head_key','head_value','tail'],guarded(conj(lt(bound,middle),above(middle,head)),above(bound,head),bc(p_bound_head,p_bound_tail)))))
    def decide(condition,value,ctx,on_false,on_true,index):
        return {'BoolSplit':dict(condition=condition,**{'from':value,'to':T},
            on_false=trans(substitute(ctx,{'Hypothesis':index}),on_false),
            on_true=trans(substitute(ctx,{'Hypothesis':index}),on_true))}
    # Above-bound preservation under every insert/replace/remove decision.
    g=conj(above(bound,rs),lt(bound,key));value=above(bound,put(rs,key,new));goal=conditional(g,value,T)
    p={'Hypothesis':0};head_above=conj(lt(bound,hk),above(bound,tail))
    p_head_above=left(head_above,lt(bound,key),p);p_bound_key=right(head_above,lt(bound,key),p)
    p_bound_head=left(lt(bound,hk),above(bound,tail),p_head_above)
    p_bound_tail=right(lt(bound,hk),above(bound,tail),p_head_above)
    matching=apply_guard(conj(above(bound,tail),lt(bound,hk)),above(bound,overlay(hk,tail,new)),
        use(above_overlay,tail,bound,hk,new),bc(p_bound_tail,p_bound_head))
    before=apply_guard(conj(above(bound,head),lt(bound,key)),above(bound,overlay(key,head,new)),
        use(above_overlay,head,bound,key,new),p)
    after=bc(p_bound_head,apply_guard(conj(above(bound,tail),lt(bound,key)),above(bound,put(tail,key,new)),
        hypothesis(bound,key,new),bc(p_bound_tail,p_bound_key)))
    less_case=decide(lt(key,hk),above(bound,conditional(lt(key,hk),overlay(key,head,new),cons(hk,hv,put(tail,key,new)))),
        above(bound,conditional(var('hole'),overlay(key,head,new),cons(hk,hv,put(tail,key,new)))),after,before,2)
    equal_case=decide(eq(hk,key),above(bound,put(head,key,new)),
        above(bound,conditional(var('hole'),overlay(hk,tail,new),conditional(lt(key,hk),overlay(key,head,new),cons(hk,hv,put(tail,key,new))))),
        less_case,matching,1)
    above_write=theorem('sorted_above_write',[['rows',R],['bound',K],['key',K],['new',O]],goal,T,
        generalized('rows',['bound','key','new'],goal,T,
            ([],use(above_overlay,nil,bound,key,new)),
            (['head_key','head_value','tail'],guarded(conj(above(bound,head),lt(bound,key)),above(bound,put(head,key,new)),equal_case))))
    # Sortedness uses all-tail bounds, not an unproved adjacent-only shortcut.
    g=ordered(rs);value=ordered(put(rs,key,new));goal=conditional(g,value,T)
    p={'Hypothesis':0};p_sorted_tail=left(ordered(tail),above(hk,tail),p)
    p_above_tail=right(ordered(tail),above(hk,tail),p)
    matching=apply_guard(ordered(head),ordered(overlay(hk,tail,new)),use(sorted_overlay,tail,hk,new),p)
    p_key_above_tail=apply_guard(conj(lt(key,hk),above(hk,tail)),above(key,tail),
        use(above_transitive,tail,key,hk),bc({'Hypothesis':2},p_above_tail))
    p_key_above_head=bc({'Hypothesis':2},p_key_above_tail)
    before=apply_guard(conj(ordered(head),above(key,head)),ordered(overlay(key,head,new)),
        use(sorted_overlay,head,key,new),bc(p,p_key_above_head))
    # In the final branch, neither equality nor reverse ordering held.
    inner=conditional(lt(key,hk),T,lt(hk,key))
    forward=trans(sym(trans(substitute(conditional(var('hole'),T,inner),{'Hypothesis':1}),
        substitute(conditional(var('hole'),T,lt(hk,key)),{'Hypothesis':2}))),use(key_forward,hk,key))
    sorted_tail_next=apply_guard(ordered(tail),ordered(put(tail,key,new)),hypothesis(key,new),p_sorted_tail)
    above_tail_next=apply_guard(conj(above(hk,tail),lt(hk,key)),above(hk,put(tail,key,new)),
        use(above_write,tail,hk,key,new),bc(p_above_tail,forward))
    after=bc(sorted_tail_next,above_tail_next)
    less_case=decide(lt(key,hk),ordered(conditional(lt(key,hk),overlay(key,head,new),cons(hk,hv,put(tail,key,new)))),
        ordered(conditional(var('hole'),overlay(key,head,new),cons(hk,hv,put(tail,key,new)))),after,before,2)
    equal_case=decide(eq(hk,key),ordered(put(head,key,new)),
        ordered(conditional(var('hole'),overlay(hk,tail,new),conditional(lt(key,hk),overlay(key,head,new),cons(hk,hv,put(tail,key,new))))),
        less_case,matching,1)
    empty=induction('new',conditional(ordered(nil),ordered(put(nil,key,new)),T),T,
        ([],refl(T)),(['value'],refl(T)))
    sorted_write=theorem('sorted_write',[['rows',R],['key',K],['new',O]],goal,T,
        generalized('rows',['key','new'],goal,T,([],empty),
            (['head_key','head_value','tail'],guarded(ordered(head),ordered(put(head,key,new)),equal_case))))
    write,writes,rest=map(var,['write','writes','rest'])
    step=lambda r,w:call(names['layout_row_step'],r,w)
    execute=lambda ws,r:call(names['layout_row_execute'],ws,r)
    goal=conditional(ordered(rs),ordered(step(rs,write)),T)
    sorted_step=theorem('sorted_step',[['rows',R],['write',W]],goal,T,
        induction('write',goal,T,(['key','new'],use(sorted_write,rs,key,new))))
    goal=conditional(ordered(rs),ordered(execute(writes,rs)),T)
    p_next=apply_guard(ordered(rs),ordered(step(rs,write)),use(sorted_step,rs,write),{'Hypothesis':0})
    tail_history=apply_guard(ordered(step(rs,write)),ordered(execute(rest,step(rs,write))),hypothesis(step(rs,write)),p_next)
    sorted_history=theorem('sorted_history',[['writes',WS],['rows',R]],goal,T,
        generalized('writes',['rows'],goal,T,
            ([],guarded(ordered(rs),ordered(rs),{'Hypothesis':0})),
            (['write','rest'],guarded(ordered(rs),ordered(execute(rest,step(rs,write))),tail_history))))
    decode=lambda c:call(names['layout_decode'],c)
    encode=lambda r:call(names['layout_encode'],r)
    cexecute=lambda ws,c:call(names['layout_column_execute'],ws,c)
    C={'Data':names['LayoutColumns']}
    column_sorted_id=function('sorted_columns',[['columns',C]],'Bool',
        conj(call(names['layout_column_aligned'],var('columns')),ordered(decode(var('columns')))),0)
    column_sorted=lambda c:call(column_sorted_id,c)
    flag=var('flag');from_true=conj(T,flag)
    true_and=theorem('sorted_true_and',[['flag','Bool']],from_true,flag,
        {'BoolCases':dict(variable='flag',**{'from':from_true,'to':flag},on_false=refl(F),on_true=refl(T))})
    encoded_sorted=theorem('sorted_encoded_columns',[['rows',R]],column_sorted(encode(rs)),ordered(rs),
        trans(bc(use(names['layout_encoded_alignment'],rs),congruence(sorted_id,use(names['layout_roundtrip'],rs))),
              use(true_and,ordered(rs))))
    goal=conditional(ordered(rs),column_sorted(cexecute(writes,encode(rs))),T)
    theorem('sorted_column_history',[['writes',WS],['rows',R]],goal,T,
        trans(substitute(conditional(ordered(rs),var('hole'),T),
                  congruence(column_sorted_id,use(names['layout_history_exact'],writes,rs))),
              substitute(conditional(ordered(rs),var('hole'),T),use(encoded_sorted,execute(writes,rs))),
              use(sorted_history,writes,rs)))
    excludes_id=function('sorted_excludes',[['rows',R],['key',K]],'Bool',
        match(rs,([],T),(['head_key','head_value','tail'],conditional(eq(hk,key),F,{'SelfCall':[tail,key]}))),0)
    excludes=lambda r,k:call(excludes_id,r,k)
    unique_id=function('sorted_unique',[['rows',R]],'Bool',
        match(rs,([],T),(['head_key','head_value','tail'],conj({'SelfCall':[tail]},excludes(tail,hk)))),0)
    unique=lambda r:call(unique_id,r)
    goal=conditional(above(bound,rs),excludes(rs,bound),T)
    p_lt=left(lt(bound,hk),above(bound,tail),{'Hypothesis':0})
    p_above=right(lt(bound,hk),above(bound,tail),{'Hypothesis':0})
    non_equal=trans(sym(substitute(conditional(var('hole'),eq(hk,bound),F),p_lt)),use(key_not_equal,bound,hk))
    excludes_tail=apply_guard(above(bound,tail),excludes(tail,bound),hypothesis(bound),p_above)
    excludes_head=trans(substitute(conditional(var('hole'),F,excludes(tail,bound)),non_equal),excludes_tail)
    above_excludes=theorem('sorted_above_excludes',[['rows',R],['bound',K]],goal,T,
        generalized('rows',['bound'],goal,T,([],refl(T)),
            (['head_key','head_value','tail'],guarded(above(bound,head),excludes(head,bound),excludes_head))))
    goal=conditional(ordered(rs),unique(rs),T)
    p_sorted_tail=left(ordered(tail),above(hk,tail),{'Hypothesis':0})
    p_above_tail=right(ordered(tail),above(hk,tail),{'Hypothesis':0})
    p_unique_tail=apply_guard(ordered(tail),unique(tail),hypothesis(),p_sorted_tail)
    p_excludes=apply_guard(above(hk,tail),excludes(tail,hk),use(above_excludes,tail,hk),p_above_tail)
    theorem('sorted_implies_unique',[['rows',R]],goal,T,
        generalized('rows',[],goal,T,([],refl(T)),
            (['head_key','head_value','tail'],guarded(ordered(head),unique(head),bc(p_unique_tail,p_excludes)))))
    binding=dict(source,library=bundle)
    (out/'binding.json').write_text(json.dumps(binding,indent=2)+'\n')
    subprocess.run([str(compiler),'verify-row-model',str(args.source),str(out/'binding.json'),
                    '--maintenance',str(args.maintenance)],check=True,capture_output=True)
    (out/'bundle.json').write_text(json.dumps(bundle,indent=2)+'\n')
    (out/'lock.json').write_text(json.dumps(bundle['lock'],indent=2)+'\n')
    (out/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    (out/'model.json').write_text(json.dumps(dict(schema=1,semantics='source-bound-sorted-layout-v1',
        source_description=source['description'],parent_bundle_sha256=hashlib.sha256((args.layout/'bundle.json').read_bytes()).hexdigest(),
        compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),new_objects={n:names[n] for n in names if n not in initial},
        retained_parent_objects=len(selected),scope='Sorted/unique source row/column histories; native binary search and effects remain unverified.'),indent=2)+'\n')
    print(f'Checked {len(names)-len(initial)} new objects; {len(names)} total.',flush=True)

if __name__=='__main__':main()
