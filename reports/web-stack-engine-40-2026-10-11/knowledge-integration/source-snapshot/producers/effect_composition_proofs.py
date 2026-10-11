#!/usr/bin/env python3
"""Effect-prefix algebra, not action analysis or a journal optimisation.

Definitions and equality proofs use the unchanged general first-order kernel.
"""
import argparse,hashlib,json
from pathlib import Path
from inductive_proofs import SEMANTICS,var,call,construct

def build(directory):
    objects=directory/'objects';objects.mkdir(parents=True,exist_ok=True);names={}
    def refs(v):
        if isinstance(v,list):return set().union(*(refs(x) for x in v)) if v else set()
        if not isinstance(v,dict):return set()
        r=set()
        for k,x in v.items():
            if k in ('datatype','function','theorem','Data'):r.add(x)
            r|=refs(x)
        return r
    def store(name,kind,v):
        deps=refs(v)
        if kind in ('Function','Theorem'):deps|={names[n] for n in ['ValueShape','BodyExit','EffectPath','prefix_or','follow_effect_path'] if n in names}
        obj=dict(schema=1,semantics=SEMANTICS,name=name,dependencies=sorted(deps),declaration={kind:v})
        data=(json.dumps(obj,separators=(',',':'))+'\n').encode();i=hashlib.sha256(data).hexdigest();p=objects/f'{i}.json'
        if p.exists():assert p.read_bytes()==data
        else:p.write_bytes(data)
        names[name]=i;return i
    def data(name,constructors):return store(name,'Datatype',dict(constructors=[dict(name=n,fields=t) for n,t in constructors]))
    shape=data('ValueShape',[(n,[]) for n in ['Other','False','True','None','Some','Ok','Err']])
    exit=data('BodyExit',[(n,[]) for n in ['Next','Return','Abort','Host']])
    path=data('EffectPath',[('Path',['Bool','Bool',{'Data':exit},{'Data':shape}])])
    def match(value,branches):return {'Match':dict(scrutinee=value,branches=[dict(bindings=b,body=t) for b,t in branches])}
    def or_(a,b):return {'If':dict(condition=a,on_true={'Bool':True},on_false=b)}
    prefix_or=store('prefix_or','Function',dict(params=[['a','Bool'],['b','Bool']],result='Bool',recursive=None,body=or_(var('a'),var('b'))))
    suffix=match(var('right'),[(['bw','be','bx','bv'],construct(path,0,call(prefix_or,var('aw'),var('bw')),call(prefix_or,var('ae'),var('be')),var('bx'),var('bv')))])
    body=match(var('left'),[(['aw','ae','ax','av'],match(var('ax'),[([],suffix)]+[([],var('left')) for _ in range(3)]))])
    follow=store('follow_effect_path','Function',dict(params=[['left',{'Data':path}],['right',{'Data':path}]],result={'Data':path},recursive=None,body=body))
    def convert(a,b):return {'Convert':dict(**{'from':a,'to':b})}
    def theorem(name,params,a,b,proof):return store(name,'Theorem',dict(params=params,conditions=[],**{'from':a,'to':b},proof=proof))
    for index,name in [(1,'return_suppresses_suffix'),(2,'abort_suppresses_suffix'),(3,'host_failure_suppresses_suffix')]:
        prefix=construct(path,0,var('written'),var('emitted'),construct(exit,index),var('value'))
        a=call(follow,prefix,var('suffix'))
        theorem(name,[['written','Bool'],['emitted','Bool'],['value',{'Data':shape}],['suffix',{'Data':path}]],a,prefix,convert(a,prefix))
    def substitute(t,n,v):
        if isinstance(t,dict):
            if t==var(n):return v
            return {k:substitute(x,n,v) for k,x in t.items()}
        if isinstance(t,list):return [substitute(x,n,v) for x in t]
        return t
    def induct(n,a,b,datatype,cases):
        return {'Induction':dict(variable=n,**{'from':a,'to':b},cases=[dict(bindings=bindings,proof=f(substitute(a,n,construct(datatype,i,*(var(x) for x in bindings))),substitute(b,n,construct(datatype,i,*(var(x) for x in bindings))))) for i,(bindings,f) in enumerate(cases)])}
    unit=construct(path,0,{'Bool':False},{'Bool':False},construct(exit,0),construct(shape,0))
    a=call(follow,unit,var('right'));b=var('right')
    theorem('empty_prefix_identity',[['right',{'Data':path}]],a,b,induct('right',a,b,path,[(['bw','be','bx','bv'],convert)]))
    def bool_cases(n,a,b,next_):
        return {'BoolCases':dict(variable=n,**{'from':a,'to':b},on_false=next_(substitute(a,n,{'Bool':False}),substitute(b,n,{'Bool':False})),on_true=next_(substitute(a,n,{'Bool':True}),substitute(b,n,{'Bool':True})))}
    a=call(prefix_or,call(prefix_or,var('a'),var('b')),var('c'));b=call(prefix_or,var('a'),call(prefix_or,var('b'),var('c')))
    or_assoc=theorem('prefix_or_associative',[[n,'Bool'] for n in ['a','b','c']],a,b,bool_cases('a',a,b,convert))
    a=call(follow,call(follow,var('left'),var('right')),var('third'))
    b=call(follow,var('left'),call(follow,var('right'),var('third')))
    def terminal(a,b):return convert(a,b)
    def combine(a,b):
        def use(x,y,z):return {'Use':dict(theorem=or_assoc,arguments=[var(x),var(y),var(z)],premises=[])}
        return {'Construct':dict(datatype=path,constructor=0,arguments=[use('aw','bw','cw'),use('ae','be','ce'),{'Refl':var('cx')},{'Refl':var('cv')}])}
    def next_b(a,b):return induct('third',a,b,path,[(['cw','ce','cx','cv'],combine)])
    def next_a(a,b):return induct('right',a,b,path,[(['bw','be','bx','bv'],lambda a,b:induct('bx',a,b,exit,[([],next_b)]+[([],terminal) for _ in range(3)]))])
    proof=induct('left',a,b,path,[(['aw','ae','ax','av'],lambda a,b:induct('ax',a,b,exit,[([],next_a)]+[([],terminal) for _ in range(3)]))])
    theorem('effect_sequencing_associative',[[n,{'Data':path}] for n in ['left','right','third']],a,b,proof)
    (directory/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    (directory/'lock.json').write_text(json.dumps(dict(schema=1,semantics=SEMANTICS,objects=list(names.values())),indent=2)+'\n')
    return names
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory',type=Path);args=p.parse_args();print(json.dumps(build(args.directory)))
