#!/usr/bin/env python3
"""Untrusted whole-action equality proposal over checked source projections.

Individual definitions/theorems go into a content-addressed database snapshot.
This initial producer proposes remove idempotence; the compiler knows neither
that rule nor this producer and rechecks the complete transition equations.
"""
import argparse,copy,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,identity
from ink_knowledge.store import entry,read
MATH='first-order-inductive-equality-v1'
def var(n):return {'Var':n}
def call(f,xs):return {'Call':dict(function=f,arguments=xs)}
def cons(d,i,xs):return {'Construct':dict(datatype=d,constructor=i,arguments=xs)}
def convert(a,b):return {'Convert':{'from':a,'to':b}}
def trans(*proofs):
    out=proofs[0]
    for p in proofs[1:]:out={'Trans':[out,p]}
    return out

def theorem(table):
    d=table['datatype'];remove=table['remove'];row_sort=table['value_sort']
    rem=lambda rows:call(remove,[rows,var('key')])
    lhs=lambda rows:rem(rem(rows))
    nil=cons(d,0,[]);tail=var('tail');head=cons(d,1,[var('head'),var('value'),tail])
    ih_a,ih_z=lhs(tail),rem(tail)
    head_a,head_z=lhs(head),rem(head)
    ctor_a=cons(d,1,[var('head'),var('value'),ih_a]);ctor_z=cons(d,1,[var('head'),var('value'),ih_z])
    guard={'Binary':dict(op='==',left=var('key'),right=var('head'))}
    def conditional(flag,a,z):return {'If':dict(condition=flag,on_true=a,on_false=z)}
    def rhead(flag):return conditional(flag,ih_z,cons(d,1,[var('head'),var('value'),ih_z]))
    def rewrite(context):return {'Substitute':dict(variable='decision',context=context,equality={'Hypothesis':1})}
    left_context=rem(rhead(var('decision')))
    right_context=rhead(var('decision'))
    first=rewrite(left_context)
    last={'Sym':rewrite(right_context)}
    true_case=trans(convert(head_a,rem(rhead(guard))),first,{'Hypothesis':0},last,convert(rhead(guard),head_z))
    second=rewrite(conditional(var('decision'),ih_a,ctor_a))
    middle={'Construct':dict(datatype=d,constructor=1,arguments=[{'Refl':var('head')},{'Refl':var('value')},{'Hypothesis':0}])}
    false_case=trans(convert(head_a,rem(rhead(guard))),first,second,middle,last,convert(rhead(guard),head_z))
    case={'BoolSplit':dict(condition=guard,**{'from':head_a,'to':head_z},on_true=true_case,on_false=false_case)}
    declaration={'Theorem':dict(params=[['rows',{'Data':d}],['key','U64']],conditions=[],
        **{'from':lhs(var('rows')),'to':rem(var('rows'))},
        proof={'Induction':dict(variable='rows',**{'from':lhs(var('rows')),'to':rem(var('rows'))},cases=[dict(bindings=[],proof=convert(lhs(nil),rem(nil))),dict(bindings=['head','value','tail'],proof=case)])})}
    return entry('theorem',MATH,{'declaration':declaration},[d,remove,row_sort] if isinstance(row_sort,str) else [d,remove],parameters=dict(declaration['Theorem']['params']))

def general_law():
    """Stable entries, proved once over an abstract row sort. No program induction."""
    row=entry('definition',MATH,{'declaration':{'AbstractSort':dict(name='StateRow')}})
    element=identity(row)
    rows=entry('definition',MATH,{'declaration':{'Datatype':dict(constructors=[dict(name='Nil',fields=[]),dict(name='Cons',fields=['U64',{'Data':element},'SelfType'])])}},[element])
    datatype=identity(rows)
    recursive={'SelfCall':[var('tail'),var('key')]}
    body={'Match':dict(scrutinee=var('rows'),branches=[dict(bindings=[],body=cons(datatype,0,[])),dict(bindings=['head','value','tail'],body={'If':dict(condition={'Binary':dict(op='==',left=var('key'),right=var('head'))},on_true=recursive,on_false=cons(datatype,1,[var('head'),var('value'),recursive]))})])}
    remove=entry('definition',MATH,{'declaration':{'Function':dict(params=[['rows',{'Data':datatype}],['key','U64']],result={'Data':datatype},body=body,recursive=0)}},[element,datatype],parameters={'rows':{'Data':datatype},'key':'U64'},result={'Data':datatype})
    function=identity(remove)
    law=theorem(dict(datatype=datatype,remove=function,value_sort=element))
    objects={identity(x):x for x in [row,rows,remove,law]}
    return objects,dict(StateRow=element,WordRows=datatype,remove=function,remove_idempotence=identity(law))

def produce(before,after,selected,directory,knowledge_root=None,snapshot=None):
    if before['semantics']!='ink-action-transition-v1' or after['semantics']!=before['semantics']:raise ValueError('incompatible projection')
    if before['state']!=after['state'] or before['events']!=after['events']:raise ValueError('transition representation changed')
    objects={**before['objects'],**after['objects']};proofs={};laws={}
    database=Store(Path(knowledge_root) if knowledge_root else Path(__file__).resolve().parents[1],snapshot)
    names=read(database.data/'names.json')
    roles={n:names['action-laws/'+n] for n in ['StateRow','WordRows','remove','remove_idempotence']}
    # Retrieve pinned database bytes. Authoring the four-entry induction library
    # is a separate command; proposals instantiate it rather than regenerate it.
    general=database.bundle(sorted(roles.values()))['objects'];objects.update(general)
    for t in before['tables']:
        ty=json.dumps(t['value_type'],sort_keys=True,separators=(',',':'));sort=before['types'][ty]
        laws[t['remove']]=dict(theorem=roles['remove_idempotence'],sorts={roles['StateRow']:sort},functions={},
            definitions={roles['WordRows']:t['datatype'],roles['remove']:t['remove']},assumptions={})
    for name,a in before['actions'].items():
        z=after['actions'][name];old=a['case']['call'];new=z['case']['call']
        if a['function']==z['function']:
            proofs[name]={'Refl':call(a['function'],[var(n) for n,_ in a['params']])};continue
        start=a['case']['normal'];end=z['case']['normal'];current=copy.deepcopy(start);steps=[]
        # Bounded deterministic traversal. Equality is lifted through its exact
        # surrounding term; intervening reads/events cannot be silently dropped.
        def find(t):
            if isinstance(t,dict) and 'Call' in t:
                f=t['Call']['function'];args=t['Call']['arguments']
                if f in laws and len(args)==2 and isinstance(args[0],dict) and args[0].get('Call',{}).get('function')==f:
                    inner=args[0]['Call']['arguments']
                    if len(inner)==2 and inner[1]==args[1]:return t,call(f,[inner[0],args[1]]),laws[f],[inner[0],args[1]]
            if isinstance(t,dict):
                for key in sorted(t):
                    r=find(t[key])
                    if r:return r
            if isinstance(t,list):
                for x in t:
                    r=find(x)
                    if r:return r
            return None
        def replace(t,target,value):
            if t==target:return copy.deepcopy(value)
            if isinstance(t,dict):return {k:replace(v,target,value) for k,v in t.items()}
            if isinstance(t,list):return [replace(v,target,value) for v in t]
            return t
        for _ in range(64):
            found=find(current)
            if not found:break
            original,replacement,law,args=found
            context=replace(current,original,var('replacement_rows'))
            steps.append({'Substitute':dict(variable='replacement_rows',context=context,equality={'Instance':dict(**law,arguments=args,premises=[])})})
            current=replace(current,original,replacement)
        if current!=end:raise ValueError('bounded producer cannot prove complete action '+name)
        case=trans(convert(old,start),*steps,convert(current,new)) if steps else convert(old,new)
        args=[var(n) for n,_ in a['params']]
        proofs[name]={'Induction':dict(variable='initial',**{'from':call(a['function'],args),'to':call(z['function'],args)},cases=[dict(bindings=a['case']['bindings'],proof=case)])}
    roots=sorted({a['function'] for a in before['actions'].values()}|{a['function'] for a in after['actions'].values()}|{law['theorem'] for law in laws.values()})
    store=Store.publish(directory,list(objects.values()))
    return dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=before['source'],knowledge=store.bundle(roots),applications=[],action_replacement=dict(selected=selected,proofs=proofs))

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('before');p.add_argument('after');p.add_argument('selected');p.add_argument('-o','--output',required=True);p.add_argument('--knowledge',type=Path);p.add_argument('--snapshot',type=Path)
    a=p.parse_args();out=Path(a.output);out.parent.mkdir(parents=True,exist_ok=True)
    result=produce(read(Path(a.before)),read(Path(a.after)),read(Path(a.selected)),out.parent/'database',a.knowledge,a.snapshot)
    out.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(status='proposed',authority='requires compiler checking')))
if __name__=='__main__':main()
