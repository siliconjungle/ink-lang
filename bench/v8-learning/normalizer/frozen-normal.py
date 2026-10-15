def normal(t,objects,depth=0,opaque=(),*,blocked=(),eager=()):
    """Authoring computation only. Every proposed reduction is checked by Convert."""
    if depth>96:raise ValueError('point delta producer depth budget')
    recur=lambda t:normal(t,objects,depth+1,opaque,blocked=blocked,eager=eager)
    if not isinstance(t,dict):return t
    if 'Call' in t:
        x=t['Call'];args=[recur(a) for a in x['arguments']];decl=objects[x['function']]['payload']['declaration']
        if x['function'] in opaque or 'AbstractFunction' in decl:return call(x['function'],args)
        if x['function'] in blocked and not (x['function']in eager and any('Construct'in a for a in args)):return call(x['function'],args)
        f=decl['Function']
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
        branches=[]
        for b in x['branches']:
            bindings=list(b['bindings']);used=free_variables(b['body']);occupied=variables(b['body'])|binding_names(b['body'])
            for i,name in enumerate(bindings):
                if name in used:continue
                serial=0
                while True:
                    fresh='unused_binding_'+str(i)+'_'+str(serial);serial+=1
                    if fresh not in occupied:break
                bindings[i]=fresh;occupied.add(fresh)
            branches.append((bindings,b['body']))
        return match(scrutinee,branches)
    if 'Binary' in t:
        x=t['Binary'];a,z=recur(x['left']),recur(x['right'])
        if 'U64' in a and 'U64' in z:
            av,zv=a['U64'],z['U64'];op=x['op'];return {'Bool':{'==':av==zv,'!=':av!=zv,'<':av<zv,'<=':av<=zv,'>':av>zv,'>=':av>=zv}[op]} if op in ['==','!=','<','<=','>','>='] else {'U64':{'+':av+zv,'-':av-zv,'*':av*zv,'&':av&zv}[op]%(1<<64)}
        if 'Bool'in a and 'Bool'in z:
            av,zv=a['Bool'],z['Bool'];op=x['op']
            return {'Bool':{'&&':av and zv,'||':av or zv,'==':av==zv,'!=':av!=zv}[op]}
        return binary(x['op'],a,z)
    return t
