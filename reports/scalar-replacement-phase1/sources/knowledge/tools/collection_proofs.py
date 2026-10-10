#!/usr/bin/env python3
"""Untrusted collection proposal producer. The compiler independently models/checks every definition and equality."""
import argparse, hashlib, json
from pathlib import Path
from inductive_proofs import var, call, construct, binary, refl, SEMANTICS

def num(n): return {'Num': n}
def source_var(n): return {'Var': n}
def source_bin(op, a, b): return {'Binary': [op, a, b]}
def lam(n, e): return {'Lambda': [n, e]}
def mapping(xs, n, e): return {'Method': [xs, 'map', [lam(n,e)]]}
def source_call(n, *args): return {'Call': [n,list(args)]}
def free(e, bound=frozenset()):
    k,v=next(iter(e.items()))
    if k=='Var': return {v}-bound
    if k=='Binary': return free(v[1],bound)|free(v[2],bound)
    if k=='Lambda': return free(v[1],bound|{v[0]})
    if k=='Call': return set().union(*(free(x,bound) for x in v[1]))
    if k=='Method': return free(v[0],bound)|set().union(*(free(x,bound) for x in v[2]))
    return set()
def scalar(e, env):
    k,v=next(iter(e.items()))
    if k=='Var': return env[v][1]
    if k=='Num': return {'U64':v}
    if k=='Bool': return e
    if k=='Binary': return binary(v[0],scalar(v[1],env),scalar(v[2],env))
    raise ValueError('unsupported scalar')
def render(e):
    k,v=next(iter(e.items()))
    if k=='Var': return v
    if k=='Num': return str(v)
    if k=='Bool': return str(v).lower()
    if k=='Binary': return f'({render(v[1])} {v[0]} {render(v[2])})'
    if k=='Lambda': return f'fn({v[0]}) => {render(v[1])}'
    if k=='Call': return v[0]+'('+', '.join(map(render,v[1]))+')'
    if k=='Method': return render(v[0])+'.'+v[1]+'('+', '.join(map(render,v[2]))+')'
    raise ValueError(k)
def main():
    parser=argparse.ArgumentParser(description=__doc__); parser.add_argument('directory',type=Path); args=parser.parse_args()
    db=args.directory; (db/'objects').mkdir(parents=True,exist_ok=True); names={}
    def store(name,kind,declaration,deps=()):
        data=(json.dumps(dict(schema=1,semantics=SEMANTICS,name=name,dependencies=sorted(set(deps)),declaration={kind:declaration}),separators=(',',':'))+'\n').encode()
        identity=hashlib.sha256(data).hexdigest(); path=db/'objects'/f'{identity}.json'
        if path.exists(): assert path.read_bytes()==data
        else: path.write_bytes(data)
        names[name]=identity; return identity
    lst=store('List64','Datatype',dict(constructors=[dict(name='Nil',fields=[]),dict(name='Cons',fields=['U64','SelfType'])]))
    def deps(term):
        k,v=next(iter(term.items())); out=set()
        if k=='Call': out.add(v['function']); children=v['arguments']
        elif k=='Construct': out.add(v['datatype']); children=v['arguments']
        elif k=='Binary': children=[v['left'],v['right']]
        elif k=='SelfCall': children=v
        elif k=='Match': children=[v['scrutinee']]+[b['body'] for b in v['branches']]
        else: children=[]
        for child in children: out |= deps(child)
        return out
    def model(e,env,label,ids):
        k,v=next(iter(e.items()))
        if k in ('Num','Bool','Var'): return scalar(e,env)
        if k=='Binary': return binary(v[0],model(v[1],env,label,ids),model(v[2],env,label,ids))
        method=v[1] if k=='Method' else v[0]
        xs=v[0] if k=='Method' else v[1][0]
        input_term=model(xs,env,label,ids)
        if method=='map': captures=free(v[2][0])
        elif method=='foldr': captures=free(v[1][1])|free(v[1][2])
        elif method in ('sum','count'): captures=set()
        else: raise ValueError(method)
        params=[['input',{'Data':lst}]]; local={}; arguments=[]
        for i,n in enumerate(sorted(captures)):
            s,value=env[n]; cn=f'c{i}'; params.append([cn,s]); local[n]=(s,var(cn)); arguments.append(value)
        tail={'SelfCall':[var('tail')]+[var(n) for n,_ in params[1:]]}
        if method=='map':
            n,step=v[2][0]['Lambda']; local[n]=('U64',var('head'))
            zero=construct(lst,0); body=construct(lst,1,scalar(step,local),tail); result={'Data':lst}
        elif method=='foldr':
            _,initial,outer=v[1]; n,inner=outer['Lambda']; rest,step=inner['Lambda']
            zero=scalar(initial,local); local[n]=('U64',var('head')); local[rest]=('U64',tail)
            body=scalar(step,local); result='U64'
        else:
            zero={'U64':0}; body=binary('+',var('head') if method=='sum' else {'U64':1},tail); result='U64'
        body={'Match':dict(scrutinee=var('input'),branches=[dict(bindings=[],body=zero),dict(bindings=['head','tail'],body=body)])}
        identity=store(f'{label}_{len(ids)}_{method}','Function',dict(params=params,result=result,body=body,recursive=0),deps(body)|{lst})
        ids.append(identity); return call(identity,input_term,*arguments)
    x=source_var('x'); y=source_var('y'); xs=source_var('xs'); a=source_var('scale'); b=source_var('bias')
    double_head=source_bin('+',source_bin('*',x,a),b)
    three_head=source_bin('-',double_head,b)
    shadow_head=source_bin('*',source_bin('+',x,b),a)
    specifications=[
        ('two_maps',source_call('sum',mapping(mapping(xs,'x',source_bin('*',x,a)),'y',source_bin('+',y,b))),double_head),
        ('three_maps',source_call('sum',mapping(mapping(mapping(xs,'x',source_bin('*',x,a)),'y',source_bin('+',y,b)),'z',source_bin('-',source_var('z'),b))),three_head),
        ('shadow_maps',source_call('sum',mapping(mapping(xs,'scale',source_bin('+',source_var('scale'),b)),'bias',source_bin('*',source_var('bias'),a))),shadow_head),
        ('mapped_count',source_call('count',mapping(xs,'x',source_bin('*',x,a))),num(1)),
    ]
    proposals=[]; source=['module collection_proofs;']; params=[['p0',{'Data':lst}],['p1','U64'],['p2','U64']]
    env={'xs':({'Data':lst},var('p0')),'scale':('U64',var('p1')),'bias':('U64',var('p2'))}
    for name,original,head in specifications:
        replacement=source_call('foldr',xs,num(0),lam('x',lam('rest',source_bin('+',head,source_var('rest')))))
        old_ids=[]; new_ids=[]; left=model(original,env,name+'_from',old_ids); right=model(replacement,env,name+'_to',new_ids)
        head_env=dict(env,x=('U64',var('head')))
        proof={'Induction':dict(variable='p0',**{'from':left,'to':right},cases=[dict(bindings=[],proof=refl({'U64':0})),dict(bindings=['head','tail'],proof={'Binary':dict(op='+',left=refl(scalar(head,head_env)),right={'Hypothesis':0})})])}
        theorem=store(name+'_equivalence','Theorem',dict(params=params,conditions=[],**{'from':left,'to':right},proof=proof),deps(left)|deps(right)|{lst})
        proposals.append(dict(function=name,**{'from':original,'to':replacement},datatype=lst,from_definitions=old_ids,to_definitions=new_ids,proof={'Use':dict(theorem=theorem,arguments=[var(n) for n,_ in params],premises=[])}))
        source.append(f'fn {name}(xs: List<u64>, scale: u64, bias: u64) -> u64 {{ return {render(original)}; }}')
    # All model definitions are explicit roots, never inferred from trusted labels.
    (db/'lock.json').write_text(json.dumps(dict(schema=1,semantics=SEMANTICS,objects=list(names.values())),indent=2)+'\n')
    (db/'proposal.json').write_text(json.dumps(dict(schema=1,semantics='source-collections-v1',library='lock.json',proposals=proposals),indent=2)+'\n')
    (db/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    (db/'kernels.lang').write_text('\n\n'.join(source)+'\n')
    print(f'Wrote {len(names)} immutable objects and {len(proposals)} whole-function proposals; run the independent compiler checker.')
if __name__=='__main__': main()
