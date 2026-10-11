#!/usr/bin/env python3
"""Untrusted scalar-storage fixtures for source modules without state roots."""
import argparse,json
from pathlib import Path
from representations import refs,match,REP,MATH
from action_replacement import var,call,cons,convert
from ink_knowledge import Store,identity
from ink_knowledge.store import entry,read

def generate(model,directory,sort):
    objects=dict(model['objects']); logical={'Data':model['state']}
    constructors=objects[model['state']]['payload']['declaration']['Datatype']['constructors']
    if len(constructors)!=1 or constructors[0]['fields']:
        raise ValueError('scalar fixture requires no source state roots')
    value={'Bool':False} if sort=='Bool' else {'U64':0}
    unit=cons(model['state'],0,[])
    def add(decl):
        body=next(iter(decl.values())); payload={'declaration':decl}
        obj=entry('definition',MATH,payload,refs(payload),parameters=dict(body.get('params',[])),result=body.get('result'))
        key=identity(obj);objects[key]=obj;return key
    def fun(params,result,body):return add({'Function':dict(params=params,result=result,recursive=None,body=body)})
    encode=fun([['logical',logical]],sort,value)
    decode=fun([['physical',sort]],logical,unit)
    left=fun([['physical',sort],['logical',logical]],sort,var('physical'))
    right=fun([['physical',sort],['logical',logical]],sort,value)
    def cases(a,z):
        return {'Induction':dict(variable='logical',**{'from':a,'to':z},cases=[dict(bindings=[],proof=convert(a,unit if z==var('logical') else substitute(z)))])}
    def substitute(term):
        if term==var('logical'):return unit
        if isinstance(term,dict):return {k:substitute(v)for k,v in term.items()}
        if isinstance(term,list):return [substitute(v)for v in term]
        return term
    actions={}
    for name,action in model['actions'].items():
        rest=action['params'][1:];args=[var(n)for n,_ in rest];result=action['result']
        execute=fun([['physical',sort]]+rest,result,call(action['function'],[unit]+args))
        observe=fun([['result',result]],result,var('result'))
        next_state=fun([['result',result]],sort,value)
        observed=call(observe,[call(execute,[var('physical')]+args)])
        original=call(action['function'],[var('logical')]+args)
        post=match(original,[(['post_reply','post_committed','post_version','post_rows','post_events'],var('post_rows')),(['post_host','post_version','post_rows'],var('post_rows'))])
        a=call(left,[call(next_state,[call(execute,[var('physical')]+args)]),post])
        z=call(right,[call(next_state,[call(execute,[var('physical')]+args)]),post])
        actions[name]=dict(execute=execute,result=result,next=next_state,observe=observe,preservation=[convert(a,z)],observation=cases(observed,original))
    plan=dict(source_objects=sorted(model['objects']),logical_state=logical,physical_state=sort,encode=encode,decode=decode,relations=[dict(left=left,right=right)],initialisation=[convert(call(left,[call(encode,[var('logical')]),var('logical')]),call(right,[call(encode,[var('logical')]),var('logical')]))],snapshot=cases(call(decode,[var('physical')]),var('logical')),actions=actions)
    obj=entry('representation',REP,plan,refs(plan),parameters={'logical':logical},result=sort,effects=['source-transitions']);obj['interface']['operations']=sorted(actions)
    key=identity(obj);objects[key]=obj;store=Store.publish(directory,list(objects.values()),{'representations/scalar':key})
    return dict(schema=1,semantics=REP,input_core_sha256=model['source'],knowledge=store.bundle([key]),representation=key)
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('model',type=Path);p.add_argument('--sort',choices=['Bool','U64'],required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args();a.o.parent.mkdir(parents=True,exist_ok=True);a.o.write_text(json.dumps(generate(read(a.model),a.o.parent/'database',a.sort))+'\n')
