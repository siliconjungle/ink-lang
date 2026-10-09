#!/usr/bin/env python3
"""Untrusted producer: collection definitions and induction proofs are database data."""
import argparse,hashlib,json
from pathlib import Path
SEMANTICS='first-order-inductive-equality-v1'
def var(name):return {'Var':name}
def call(identity,*arguments):return {'Call':dict(function=identity,arguments=list(arguments))}
def construct(identity,index,*arguments):return {'Construct':dict(datatype=identity,constructor=index,arguments=list(arguments))}
def binary(op,left,right):return {'Binary':dict(op=op,left=left,right=right)}
def refl(term):return {'Refl':term}
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('database',type=Path);args=parser.parse_args()
    directory=args.database/'objects';directory.mkdir(parents=True,exist_ok=True);names={}
    def store(name,kind,definition,dependencies=()):
        obj=dict(schema=1,semantics=SEMANTICS,name=name,dependencies=list(dependencies),declaration={kind:definition})
        data=(json.dumps(obj,separators=(',',':'))+'\n').encode();identity=hashlib.sha256(data).hexdigest();target=directory/f'{identity}.json'
        if target.exists():assert target.read_bytes()==data
        else:
            with target.open('xb') as out:out.write(data)
        names[name]=identity;return identity
    def function(name,params,result,body,dependencies=(),recursive=None):return store(name,'Function',dict(params=params,result=result,body=body,recursive=recursive),dependencies)
    def theorem(name,params,left,right,proof,dependencies):return store(name,'Theorem',dict(params=params,conditions=[],**{'from':left,'to':right},proof=proof),dependencies)
    lst=store('List64','Datatype',dict(constructors=[dict(name='Nil',fields=[]),dict(name='Cons',fields=['U64','SelfType'])]))
    double=function('double',[['x','U64']],'U64',binary('*',var('x'),{'U64':2}))
    inc=function('inc',[['x','U64']],'U64',binary('+',var('x'),{'U64':1}))
    composed=function('composed',[['x','U64']],'U64',call(inc,call(double,var('x'))),[double,inc])
    def mapping(name,scalar):
        body={'Match':dict(scrutinee=var('xs'),branches=[dict(bindings=[],body=construct(lst,0)),dict(bindings=['head','tail'],body=construct(lst,1,call(scalar,var('head')),{'SelfCall':[var('tail')]}))])}
        return function(name,[['xs',{'Data':lst}]],{'Data':lst},body,[lst,scalar],0)
    md=mapping('map_double',double);mi=mapping('map_inc',inc);mc=mapping('map_composed',composed)
    left=call(mi,call(md,var('xs')));right=call(mc,var('xs'))
    proof={'Induction':dict(variable='xs',**{'from':left,'to':right},cases=[dict(bindings=[],proof=refl(construct(lst,0))),dict(bindings=['head','tail'],proof={'Construct':dict(datatype=lst,constructor=1,arguments=[refl(call(composed,var('head'))),{'Hypothesis':0}])})])}
    fusion=theorem('map_composition',[['xs',{'Data':lst}]],left,right,proof,[lst,md,mi,mc,composed])
    sample=construct(lst,1,{'U64':2**64-1},construct(lst,1,{'U64':2**63},construct(lst,0)))
    instantiated=theorem('map_boundary_instance',[],call(mi,call(md,sample)),call(mc,sample),{'Use':dict(theorem=fusion,arguments=[sample],premises=[])},[lst,md,mi,mc,fusion])
    tree=store('Tree64','Datatype',dict(constructors=[dict(name='Leaf',fields=['U64']),dict(name='Fork',fields=['SelfType','SelfType'])]))
    copy=function('copy_tree',[['tree',{'Data':tree}]],{'Data':tree},{'Match':dict(scrutinee=var('tree'),branches=[dict(bindings=['value'],body=construct(tree,0,var('value'))),dict(bindings=['left','right'],body=construct(tree,1,{'SelfCall':[var('left')]},{'SelfCall':[var('right')]}))])},[tree],0)
    left=call(copy,var('tree'));right=var('tree')
    proof={'Induction':dict(variable='tree',**{'from':left,'to':right},cases=[dict(bindings=['value'],proof=refl(construct(tree,0,var('value')))),dict(bindings=['left','right'],proof={'Construct':dict(datatype=tree,constructor=1,arguments=[{'Hypothesis':0},{'Hypothesis':1}])})])}
    tree_identity=theorem('tree_copy_identity',[['tree',{'Data':tree}]],left,right,proof,[tree,copy])
    (args.database/'lock.json').write_text(json.dumps(dict(schema=1,semantics=SEMANTICS,objects=[lst,md,mi,mc,composed,tree,copy,fusion,instantiated,tree_identity]),indent=2)+'\n')
    (args.database/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    print(f'Wrote {len(names)} objects; run lang verify-library. Mathematical proofs only; source compilation bridge remains pending.')
if __name__=='__main__':main()
