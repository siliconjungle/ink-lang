"""Untrusted filtered word aggregates, universal update laws and proof tactics.

No pattern is correctness authority. The general kernel checks every equation,
including arbitrary table constructors (not just ordered, unique host tables).
"""
import json,os,subprocess,tempfile
from pathlib import Path
from action_replacement import var,call,cons,convert,trans
from point_delta import normal,sub,replace,binary,choice,match,lift
from cache_maintenance import leaves,variables

def setup(model,cache,add,objects):
    original_add=add
    carriers=[i for i,obj in model['objects'].items()if 'Datatype'in obj['payload'].get('declaration',{})]
    def add(declaration):return original_add(declaration,carriers if 'Theorem'in declaration else ())
    if len(model['tables'])!=1:raise ValueError('aggregate tactic supports one table')
    table=model['tables'][0];d=table['datatype'];row_sort=objects[table['replace']]['payload']['declaration']['Function']['params'][2][1]
    query=cache['case']['normal']['Construct']['arguments'][0];binding=cache['case']['bindings'][0]
    if variables(query)!={binding}:raise ValueError('aggregate query must depend on one table')
    def q(rows):return sub(query,{binding:rows})
    nil=cons(d,0,[]);rows=var('aggregate_rows');tail=var('aggregate_tail');key=var('aggregate_key');value=var('aggregate_value');target=var('aggregate_target');new=var('aggregate_new')
    bound=cons(d,1,[key,value,tail]);guard=binary('==',target,key)
    contribution=add({'Function':dict(params=[['aggregate_value',row_sort]],result='U64',body=q(cons(d,1,[{'U64':0},value,nil])),recursive=None)})
    contrib=lambda v:call(contribution,[v])
    fold=add({'Function':dict(params=[['aggregate_rows',{'Data':d}]],result='U64',body=match(rows,[([],{'U64':0}),(['aggregate_key','aggregate_value','aggregate_tail'],binary('+',contrib(value),{'SelfCall':[tail]}))]),recursive=0)})
    total=lambda r:call(fold,[r])
    compiler=Path(os.environ.get('INK_COMPILER','target/debug/ink')).resolve()
    arithmetic_cache={}
    from word_ring import Tactic
    ring=Tactic(add,compiler)
    def arithmetic(a,z):
        opaque=[]
        def abstract(t):
            if 'U64'in t:return t
            if 'Binary'in t and t['Binary']['op']in ['+','-','*']:
                x=t['Binary'];return binary(x['op'],abstract(x['left']),abstract(x['right']))
            if t not in opaque:opaque.append(t)
            return var('word_'+str(opaque.index(t)))
        aa,zz=abstract(a),abstract(z);identity=json.dumps([aa,zz],sort_keys=True)
        if identity not in arithmetic_cache:
            proof=ring.prove(aa,zz)
            params=[['word_'+str(i),'U64']for i in range(len(opaque))]
            goal=dict(params=params,conditions=[],**{'from':aa,'to':zz})
            arithmetic_cache[identity]=add({'Theorem':dict(**goal,proof=proof)})
        return {'Use':dict(theorem=arithmetic_cache[identity],arguments=opaque,premises=[])}
    def canonical(t,env=None,depth=0):
        env=env or {}
        if isinstance(t,list):return [canonical(x,env,depth)for x in t]
        if not isinstance(t,dict):return t
        if set(t)=={'Var'}:return var(env.get(t['Var'],t['Var']))
        if 'Match'in t:
            x=t['Match'];branches=[]
            for branch in x['branches']:
                names=['aggregate_bound_'+str(depth)+'_'+str(i)for i in range(len(branch['bindings']))]
                branches.append((names,canonical(branch['body'],{**env,**dict(zip(branch['bindings'],names))},depth+1)))
            return match(canonical(x['scrutinee'],env,depth),branches)
        return {k:canonical(x,env,depth)for k,x in t.items()}
    def norm(t):return canonical(normal(t,objects))
    def conditions(t):
        if isinstance(t,dict):
            if 'If'in t:yield t['If']['condition']
            for x in t.values():yield from conditions(x)
        elif isinstance(t,list):
            for x in t:yield from conditions(x)
    def equality(a,z,hyp=(),facts=(),depth=0):
        if depth>12:raise ValueError('aggregate tactic case budget '+str(facts[-2:]))
        def simplify(t):
            current=norm(t);proof=convert(t,current)
            for left,right,index in [*facts,*hyp,*facts]:
                updated=replace(current,norm(left),norm(right))
                if updated!=current:
                    proof=trans(proof,lift({'Hypothesis':index},replace(current,norm(left),var('delta_hole'))),convert(updated,norm(updated)))
                    current=norm(updated)
            return current,proof
        na,pa=simplify(a);nz,pz=simplify(z)
        if na==nz:return trans(pa,convert(na,nz),{'Sym':pz})
        guard0=next((x for x in conditions([na,nz]) if not any(conditions(x))),None)
        if guard0 is not None:
            index=len(hyp)+len(facts);branches={}
            for flag in [False,True]:branches['on_true'if flag else'on_false']=equality(a,z,hyp,(*facts,(guard0,{'Bool':flag},index)),depth+1)
            return {'BoolSplit':dict(condition=guard0,**{'from':a,'to':z},**branches)}
        return trans(pa,arithmetic(na,nz),{'Sym':pz})
    fusion=add({'Theorem':dict(params=[['aggregate_rows',{'Data':d}]],conditions=[],**{'from':q(rows),'to':total(rows)},proof={'Induction':dict(variable='aggregate_rows',**{'from':q(rows),'to':total(rows)},cases=[dict(bindings=[],proof=equality(q(nil),total(nil))),dict(bindings=['aggregate_key','aggregate_value','aggregate_tail'],proof=equality(q(bound),total(bound),[(q(tail),total(tail),0)]))])})})
    updates={};delta_functions={}
    for name in ['insert','remove','replace']:
        params=[['aggregate_rows',{'Data':d}],['aggregate_target','U64']]+([['aggregate_new',row_sort]]if name!='remove'else[])
        if name!='insert':
            difference=binary('-',contrib(new)if name=='replace'else{'U64':0},contrib(value))
            recur={'SelfCall':[tail,target]+([new]if name=='replace'else[])}
            change_body=match(rows,[([],{'U64':0}),(['aggregate_key','aggregate_value','aggregate_tail'],binary('+',choice(guard,difference,{'U64':0}),recur))])
            delta_functions[name]=add({'Function':dict(params=params,result='U64',body=change_body,recursive=0)})
        op=lambda r:call(table[name],[r,target]+([new]if name!='remove'else[]))
        delta=lambda r:contrib(new)if name=='insert'else call(delta_functions[name],[r,target]+([new]if name=='replace'else[]))
        lhs=lambda r:total(op(r));rhs=lambda r:binary('+',total(r),delta(r))
        foldlaw=add({'Theorem':dict(params=params,conditions=[],**{'from':lhs(rows),'to':rhs(rows)},proof={'Induction':dict(variable='aggregate_rows',**{'from':lhs(rows),'to':rhs(rows)},cases=[dict(bindings=[],proof=equality(lhs(nil),rhs(nil))),dict(bindings=['aggregate_key','aggregate_value','aggregate_tail'],proof=equality(lhs(bound),rhs(bound),[(lhs(tail),rhs(tail),0)]))])})})
        use_fusion=lambda r:{'Use':dict(theorem=fusion,arguments=[r],premises=[])}
        updates[name]=add({'Theorem':dict(params=params,conditions=[],**{'from':q(op(rows)),'to':binary('+',q(rows),delta(rows))},proof=trans(use_fusion(op(rows)),{'Use':dict(theorem=foldlaw,arguments=[rows,target]+([new]if name!='remove'else[]),premises=[])},{'Binary':dict(op='+',left={'Sym':use_fusion(rows)},right={'Refl':delta(rows)})}))})
    def recipe(root,old,bindings):
        if root==var(bindings[0]):return old
        x=root.get('Call',{});args=x.get('arguments',[]);name=next((n for n in updates if table[n]==x.get('function')),None)
        if name is None:raise ValueError('unsupported aggregate update')
        prior=recipe(args[0],old,bindings)
        delta=contrib(args[2])if name=='insert'else call(delta_functions[name],args)
        return binary('+',prior,delta)
    def action(sa):
        roots=[o['arguments'][3]['Construct']['arguments'][0]for o in leaves(sa['case']['normal'])if o['constructor']==0 and o['arguments'][1]=={'Bool':True}]
        if not roots or any(r!=roots[0]for r in roots):return None
        try:return recipe(roots[0],var('cached_reply'),sa['case']['bindings'])
        except(ValueError,KeyError):return None
    def query_equality(root,bindings):
        if root==var(bindings[0]):return {'Refl':q(root)}
        x=root['Call'];args=x['arguments'];name=next(n for n in updates if table[n]==x['function'])
        use={'Use':dict(theorem=updates[name],arguments=args,premises=[])}
        delta=contrib(args[2])if name=='insert'else call(delta_functions[name],args)
        return trans(use,lift(query_equality(args[0],bindings),binary('+',var('delta_hole'),delta)))
    return dict(action=action,recipe=recipe,equality=query_equality,index=0)
