"""Untrusted incremental point-query proposals and ordinary induction proofs.

Recognises fixed-key remove/replace histories; unsupported changes use refresh.
The core knows no query/update pattern and rechecks all future-state obligations.
"""
from action_replacement import var,call,cons,convert,trans
from cache_maintenance import leaves,variables

def choice(c,t,f):return {'If':dict(condition=c,on_true=t,on_false=f)}
def binary(n,a,b):return {'Binary':dict(op=n,left=a,right=b)}
def match(t,branches):return {'Match':dict(scrutinee=t,branches=[dict(bindings=ns,body=b) for ns,b in branches])}
def sub(t,m):
    if isinstance(t,list):return [sub(x,m) for x in t]
    if not isinstance(t,dict):return t
    if set(t)=={'Var'}:return m.get(t['Var'],t)
    # Producer-generated binders are fresh; never substitute captured names.
    if 'Match' in t:
        x=t['Match'];return match(sub(x['scrutinee'],m),[(b['bindings'],sub(b['body'],{k:v for k,v in m.items() if k not in b['bindings']})) for b in x['branches']])
    return {k:sub(v,m) for k,v in t.items()}
def replace(t,a,z):
    if t==a:return z
    if isinstance(t,list):return [replace(x,a,z) for x in t]
    if isinstance(t,dict):return {k:replace(x,a,z) for k,x in t.items()}
    return t

def normal(t,objects,depth=0):
    """Authoring computation only. Every proposed reduction is checked by Convert."""
    if depth>96:raise ValueError('point delta producer depth budget')
    recur=lambda t:normal(t,objects,depth+1)
    if not isinstance(t,dict):return t
    if 'Call' in t:
        x=t['Call'];args=[recur(a) for a in x['arguments']];f=objects[x['function']]['payload']['declaration']['Function']
        if f['recursive'] is not None and 'Construct' not in args[f['recursive']]:return call(x['function'],args)
        body=f['body']
        def selfcalls(x):
            if isinstance(x,dict):
                if 'SelfCall' in x:return call(t['Call']['function'],[selfcalls(a) for a in x['SelfCall']])
                return {k:selfcalls(v) for k,v in x.items()}
            if isinstance(x,list):return [selfcalls(v) for v in x]
            return x
        return recur(sub(selfcalls(body),dict(zip([n for n,_ in f['params']],args))))
    if 'If' in t:
        x=t['If'];c=recur(x['condition'])
        if 'Bool' in c:return recur(x['on_true' if c['Bool'] else 'on_false'])
        return choice(c,recur(x['on_true']),recur(x['on_false']))
    if 'Construct' in t:
        x=t['Construct'];return cons(x['datatype'],x['constructor'],[recur(a) for a in x['arguments']])
    if 'Match' in t:
        x=t['Match'];scrutinee=recur(x['scrutinee'])
        if 'Construct' in scrutinee:
            c=scrutinee['Construct'];b=x['branches'][c['constructor']];return recur(sub(b['body'],dict(zip(b['bindings'],c['arguments']))))
        return match(scrutinee,[(b['bindings'],b['body']) for b in x['branches']])
    if 'Binary' in t:
        x=t['Binary'];a,z=recur(x['left']),recur(x['right'])
        if 'U64' in a and 'U64' in z:
            av,zv=a['U64'],z['U64'];op=x['op'];return {'Bool':{'==':av==zv,'!=':av!=zv,'<':av<zv,'<=':av<=zv,'>':av>zv,'>=':av>=zv}[op]} if op in ['==','!=','<','<=','>','>='] else {'U64':{'+':av+zv,'-':av-zv,'*':av*zv}[op]%(1<<64)}
        return binary(x['op'],a,z)
    return t

def lift(eq,context):return {'Substitute':dict(variable='delta_hole',context=context,equality=eq)}
def equality(a,z,objects,hyp=None,facts=()):
    def simplify(t):
        current=normal(t,objects);proof=convert(t,current)
        for _ in range(16):
            changed=False
            for left,right,index in facts:
                rewritten=replace(current,left,right)
                if rewritten!=current:
                    context=replace(current,left,var('delta_hole'))
                    following=normal(rewritten,objects)
                    proof=trans(proof,lift({'Hypothesis':index},context),convert(rewritten,following))
                    current=following;changed=True
            if not changed:return current,proof
        raise ValueError('point delta tactic rewrite budget')
    na,pa=simplify(a);nz,pz=simplify(z)
    if na==nz:return trans(pa,convert(na,nz),{'Sym':pz})
    if hyp:
        ha,hz,index=hyp;ha,hz=normal(ha,objects),normal(hz,objects)
        context=replace(na,ha,var('delta_hole'));rewritten=replace(na,ha,hz)
        if normal(rewritten,objects)==nz:return trans(pa,lift({'Hypothesis':index},context),convert(rewritten,nz),{'Sym':pz})
    raise ValueError('point delta proof tactic cannot establish this equation: '+str((na,nz)))

def setup(model,cache,add,objects):
    reply=cache['case']['normal']['Construct']['arguments'][0]
    if 'Call' not in reply:raise ValueError('--delta-query needs a fixed-key get query')
    f=reply['Call'];tables=[t for t in model['tables'] if t['get']==f['function']]
    if len(tables)!=1 or len(f['arguments'])!=2 or 'U64' not in f['arguments'][1]:raise ValueError('--delta-query needs a fixed-u64-key table get')
    table=tables[0];root=f['arguments'][0];q=f['arguments'][1]
    if 'Var' not in root or root['Var'] not in cache['case']['bindings']:raise ValueError('unsupported point-query root')
    index=cache['case']['bindings'].index(root['Var']);d=table['datatype'];get=table['get'];option=objects[get]['payload']['declaration']['Function']['result']['Data']
    none=cons(option,0,[]);some=lambda x:cons(option,1,[x]);getof=lambda r:call(get,[r,q]);params=[['rows',{'Data':d}]]
    rows=var('rows');tail=var('delta_tail');head=var('delta_key');value=var('delta_value');new=var('delta_new')
    bound=cons(d,1,[head,value,tail]);guard=binary('==',q,head)
    updates={}
    for name in ['remove','replace']:
        change=lambda r:call(table[name],[r,q]+([new] if name=='replace' else []))
        result=lambda r:none if name=='remove' else match(getof(r),[([],none),(['delta_old'],some(new))])
        lhs=lambda r:getof(change(r));rhs=result
        a,z=lhs(bound),rhs(bound);na,nz=normal(a,objects),normal(z,objects);branches={}
        for flag in [False,True]:
            context_a=replace(na,guard,var('delta_hole'));context_z=replace(nz,guard,var('delta_hole'))
            ca=replace(na,guard,{'Bool':flag});cz=replace(nz,guard,{'Bool':flag})
            branches['on_true' if flag else 'on_false']=trans(convert(a,na),lift({'Hypothesis':1},context_a),equality(ca,cz,objects,(lhs(tail),rhs(tail),0),[(guard,{'Bool':flag},1)]),{'Sym':lift({'Hypothesis':1},context_z)},convert(nz,z))
        proof={'Induction':dict(variable='rows',**{'from':lhs(rows),'to':rhs(rows)},cases=[dict(bindings=[],proof=convert(lhs(cons(d,0,[])),rhs(cons(d,0,[])))),dict(bindings=['delta_key','delta_value','delta_tail'],proof={'BoolSplit':dict(condition=guard,**{'from':a,'to':z},**branches)})])}
        decl={'Theorem':dict(params=params+([['delta_new',objects[table['replace']]['payload']['declaration']['Function']['params'][2][1]]] if name=='replace' else []),conditions=[],**{'from':lhs(rows),'to':rhs(rows)},proof=proof)}
        updates[name]=add(decl,[d,option])
    def recipe(t,old,bindings):
        if t==var(bindings[index]):return old
        c=t.get('Call',{});args=c.get('arguments',[])
        if len(args)<2 or args[1]!=q:raise ValueError('unsupported update key')
        if c['function']==table['remove']:
            recipe(args[0],old,bindings);return none
        if c['function']==table['replace']:
            prior=recipe(args[0],old,bindings);return match(prior,[([],none),(['delta_old'],some(args[2]))])
        raise ValueError('unsupported point delta operation')
    def action(sa):
        roots=[]
        for o in leaves(sa['case']['normal']):
            if o['constructor']==0 and o['arguments'][1]=={'Bool':True}:
                roots.append(o['arguments'][3]['Construct']['arguments'][index])
        if not roots or any(r!=roots[0] for r in roots):return None
        try:predicted=recipe(roots[0],var('cached_reply'),sa['case']['bindings'])
        except (ValueError,KeyError):return None
        if variables(predicted)-{'cached_reply',*[n for n,_ in sa['params'][2:]]}:return None
        return predicted
    def query_equality(root,bindings):
        """get(updated roots) = candidate cache; exact universal update laws."""
        if root==var(bindings[index]):return {'Refl':getof(root)}
        c=root['Call'];args=c['arguments'];name='remove' if c['function']==table['remove'] else 'replace'
        use={'Use':dict(theorem=updates[name],arguments=[args[0]]+([args[2]] if name=='replace' else []),premises=[])}
        if name=='remove':return use
        context=match(var('delta_hole'),[([],none),(['delta_old'],some(args[2]))])
        return trans(use,lift(query_equality(args[0],bindings),context))
    return dict(action=action,recipe=recipe,equality=query_equality,index=index,get=get,q=q,option=option)
