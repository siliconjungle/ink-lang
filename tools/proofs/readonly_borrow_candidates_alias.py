"""Untrusted selective lexical-loan proposals; the physical checker admits sites.

Only rank arguments observed through read operations. Exclude values forwarded
into mutable working storage, where borrowing would force a later deep copy.
This changes no primitive, source equation, ownership rule or trust boundary.
"""
from ink_knowledge import identity
from producers.planning_recipes import lexical_reads, row


def readonly_parameters(program):
    functions={f['name']:f for f in program['functions']}
    records=program.get('records',{})

    def owned(ty,seen=frozenset()):
        if not isinstance(ty,dict):return False
        if set(ty)&{'Buffer','Map'}:return True
        if 'Named'in ty:
            name=ty['Named']
            return name not in seen and any(owned(t,seen|{name})for _,t in records.get(name,[]))
        return any(owned(t,seen)for v in ty.values()for t in (v if isinstance(v,list)else[v]))

    def place(node,root,ty):
        if node=={'Var':root}:return ty
        if isinstance(node,dict)and 'Field'in node:
            receiver,field=node['Field'];parent=place(receiver,root,ty)
            if isinstance(parent,dict)and 'Named'in parent:return dict(records.get(parent['Named'],[])).get(field)
        return None

    def occurs(node,root):
        if isinstance(node,dict):
            if node.get('Var')==root:return True
            if 'Let'in node:
                name,_,value,body=node['Let']
                return occurs(value,root)or(name!=root and occurs(body,root))
            if 'Lambda'in node:
                name,body=node['Lambda'];return name!=root and occurs(body,root)
            return any(occurs(v,root)for v in node.values())
        return isinstance(node,list)and any(occurs(v,root)for v in node)

    known=set()
    def observes(node,root,ty):
        if not occurs(node,root):return True
        current=place(node,root,ty)
        if current is not None:
            # Reading scalar fields is cheap; transferring an aggregate is not.
            return isinstance(current,str)and current not in {'String','Int'}
        if isinstance(node,list):return all(observes(v,root,ty)for v in node)
        if not isinstance(node,dict):return True
        if 'Let'in node:
            name,_,value,body=node['Let']
            aliased=place(value,root,ty)
            if aliased is not None and isinstance(aliased,dict) and set(aliased)&{'Named','List'}:
                # A lexical alias is a read only when all uses of the alias
                # and all remaining uses of its original owner are reads.
                return observes(body,name,aliased)and(name==root or observes(body,root,ty))
            return observes(value,root,ty)and(name==root or observes(body,root,ty))
        if 'Lambda'in node:
            name,body=node['Lambda'];return name==root or observes(body,root,ty)
        if 'Method'in node:
            receiver,method,args=node['Method']
            if place(receiver,root,ty)is not None:
                return method in {'len','at_or','get','contains','map','filter'}and all(observes(v,root,ty)for v in args)
        if 'Call'in node:
            name,args=node['Call']
            for i,arg in enumerate(args):
                current=place(arg,root,ty)
                if current is not None:
                    # Passing a copied numeric field does not transfer its
                    # containing record into a callee. Aggregate arguments do.
                    if current in ['U32','U64','I32','F32','Bool','Unit']:continue
                    traversal=i==0 and name in {'length','count','foldl','foldr','fold_until'}
                    if traversal and name in {'foldl','foldr','fold_until'}:
                        # Borrowing the list would also borrow its elements.
                        # Keep an owning traversal when a callback transfers
                        # an aggregate element (or one of its collections).
                        if not isinstance(current,dict)or 'List'not in current:return False
                        for callback in args[2:]:
                            if isinstance(callback,dict)and 'Lambda'in callback:
                                item,body=callback['Lambda']
                                if not observes(body,item,current['List']):return False
                            elif isinstance(callback,dict)and 'Var'in callback:
                                if(callback['Var'],0)not in known:return False
                            else:return False
                    if not traversal and(name,i)not in known:return False
                elif not observes(arg,root,ty):return False
            return True
        return all(observes(v,root,ty)for v in node.values())

    # Least fixed point: unknown callees and recursive forwarding stay owning.
    for _ in range(len(functions)+1):
        before=len(known)
        for f in functions.values():
            for i,(name,ty)in enumerate(f['params']):
                if isinstance(ty,dict)and set(ty)&{'Named','List'}and not owned(ty)and occurs(f['body'],name)and observes(f['body'],name,ty):known.add((f['name'],i))
        if len(known)==before:break
    return known


def candidates(context):
    if context.get('representation')or context.get('emit_target','rust')not in {'rust','rust-wasm'}:return
    program=context['core']['program'];known=readonly_parameters(program);allowed=lexical_reads(program)
    groups={'all':set(),'records':set(),'lists':set()}
    def walk(node,root,out):
        if isinstance(node,dict):
            if set(node)&{'Var','Field'}:
                base=node
                while isinstance(base,dict)and 'Field'in base:base=base['Field'][0]
                if base=={'Var':root}and identity(node)in allowed:out.add(identity(node))
            if 'Let'in node:
                name,_,value,body=node['Let'];walk(value,root,out)
                if name!=root:walk(body,root,out)
                return
            if 'Lambda'in node:
                name,body=node['Lambda']
                if name!=root:walk(body,root,out)
                return
            for value in node.values():walk(value,root,out)
        elif isinstance(node,list):
            for value in node:walk(value,root,out)
    for f in program['functions']:
        for i,(name,ty)in enumerate(f['params']):
            if(f['name'],i)in known:
                group='records'if 'Named'in ty else'lists'
                walk(f['body'],name,groups[group]);groups[group].add(identity({'Var':name}))
    groups['all']=groups['records']|groups['lists'];seen=set()
    for label,sites in groups.items():
        sites=sorted(sites&allowed)
        if not sites or tuple(sites)in seen:continue
        seen.add(tuple(sites))
        package=dict(schema=1,semantics='ink-physical-plan-v1',input_core_sha256=context['source'],tables='ordered',buffers='direct',definitions='shared',borrow_reads=sites,borrow_rows=[],packed_datatypes=[],memo_functions=[],columns=[])
        yield row('physical',package,'selective-readonly-borrow/'+label+'/'+identity(package))


def scoped_candidates(context,strategies=()):
    """Independent parameter loans, without global variable-name collisions."""
    if context.get('representation')or context.get('emit_target','rust')not in {'rust','rust-wasm'}:return
    program=context['core']['program'];known=readonly_parameters(program)
    groups={'all':set(),'records':set(),'lists':set(),'aggregate':set()}
    def aggregate(ty,seen=frozenset()):
        if isinstance(ty,str):return ty in {'String','Int'}
        if not isinstance(ty,dict):return False
        if set(ty)&{'List','Buffer','Map'}:return True
        if 'Named'in ty:
            name=ty['Named']
            return name in seen or any(aggregate(t,seen|{name})for _,t in program.get('records',{}).get(name,[]))
        return any(aggregate(t,seen)for value in ty.values()for t in(value if isinstance(value,list)else[value]))
    for f in program['functions']:
        for i,(name,ty)in enumerate(f['params']):
            if(f['name'],i)in known:
                key=identity({'capability':'ink-parameter-read-v1','function':f['name'],'parameter':name})
                groups['records'if 'Named'in ty else'lists'].add(key)
                if aggregate(ty):groups['aggregate'].add(key)
    groups['all']=groups['records']|groups['lists'];seen=set()
    # Field observations can borrow without making the containing parameter
    # borrowed. Final owning projections still move, as checked by lowering.
    allowed=lexical_reads(program);fields=set()
    def field_sites(node):
        if isinstance(node,dict):
            if 'Field'in node and identity(node)in allowed:fields.add(identity(node))
            for child in node.values():field_sites(child)
        elif isinstance(node,list):
            for child in node:field_sites(child)
    field_sites(program)
    groups.update({'aggregate-fields':groups['aggregate']|fields,'all-fields':groups['all']|fields,'fields':fields})
    observations=set()
    def observed(function,node,local_reads):
        if isinstance(node,dict):
            if set(node)&{'Var','Field'}and identity(node)in local_reads:
                observations.add(identity({'capability':'ink-function-read-v1','function':function,'expression':identity(node)}))
            for child in node.values():observed(function,child,local_reads)
        elif isinstance(node,list):
            for child in node:observed(function,child,local_reads)
    for f in program['functions']:observed(f['name'],f['body'],lexical_reads(program,only_function=f['name']))
    groups.update({'aggregate-observations':groups['aggregate']|observations,'all-observations':groups['all']|observations,'observations':observations})
    for label,sites in groups.items():
        if strategies and label not in strategies:continue
        sites=sorted(sites)
        if not sites or tuple(sites)in seen:continue
        seen.add(tuple(sites))
        package=dict(schema=1,semantics='ink-physical-plan-v1',input_core_sha256=context['source'],tables='ordered',buffers='direct',definitions='shared',borrow_reads=sites,borrow_rows=[],packed_datatypes=[],memo_functions=[],columns=[])
        yield row('physical',package,'scoped-readonly-borrow/'+label+'/'+identity(package))
