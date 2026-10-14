#!/usr/bin/env python3
"""Author a checked source observer frame for an arbitrary word-counted loop.

The transition, observer and generic theorem are untrusted inputs. The kernel
checks the complete dependency closure and every actual source definition.
"""
import argparse,json,subprocess,sys,tempfile
from pathlib import Path
sys.path[:0]=[str(Path(__file__).resolve().parents[1]/'knowledge'),str(Path(__file__).resolve().parent)]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definition_context28 import bind
from producers.semantic_laws import value,var,op,law,bound,lam,arrow
from source_field_preservation import author as field_author
from source_field_preservation import substitute as beta

def author(core,subject,function,state_parameter,fields,generic,generic_id,step_evidence=None):
    f=next(f for f in core['program']['functions']if f['name']==function)
    params=dict(f['params']);state=params[state_parameter];state_sort=value(state)
    if f['result']!=state:raise ValueError('transition must return its state type')
    step_obj,step_id=step_evidence or field_author(core,subject,function,state_parameter,fields)
    ty=state
    def observe(t):
        at=state
        for name in fields:
            if not isinstance(at,dict)or 'Named'not in at:raise ValueError('declared record path required')
            at=dict(core['program']['records'][at['Named']])[name];t=op(value(at),'field:'+name,t)
        return t
    result=observe(var(state_sort,state_parameter))['sort']
    if not isinstance(state,dict)or 'Named'not in state:raise ValueError('record state required')
    used=set(params)
    def fresh(name):
        while name in used:name+='_'
        used.add(name);return name
    count_name=fresh('loop_count');stop_name=fresh('loop_stop')
    ps={n:value(t)for n,t in f['params']};ps[count_name]=value('U32');ps[stop_name]=arrow(state_sort,value('Bool'))
    args={n:var(value(t),n)for n,t in f['params']};initial=args[state_parameter]
    def transition(current):return op(state_sort,'call:'+function,*(current if n==state_parameter else args[n]for n,t in f['params']))
    step=lam(value('U32'),lam(state_sort,transition(bound(state_sort,0))))
    observer=lam(state_sort,observe(bound(state_sort,0)))
    count=var(value('U32'),count_name);stop=var(ps[stop_name],stop_name)
    loop=op(state_sort,'call:repeat_until',count,initial,stop,step)
    middle=op(result,'apply',observer,loop)
    current_name='__assumed_current'
    while current_name in ps:current_name+='_'
    current=var(state_sort,current_name);changed=transition(current)
    source_from=observe(changed);source_to=observe(current)
    source_args={n:current if n==state_parameter else args[n]for n,t in f['params']}
    item_name='__assumed_item'
    while item_name in ps:item_name+='_'
    item=var(value('U32'),item_name)
    inner=op(step['sort']['Arrow'][1],'apply',step,item)
    first=beta(step['node']['Lambda'],item)
    applied=op(state_sort,'apply',first,current)
    raw_step=op(state_sort,'apply',inner,current)
    observed_raw=beta(observer['node']['Lambda'],raw_step)
    transition_proof={'Trans':dict(middle=applied,left={'Congruence':['Unfold','Normalize']},right='Unfold')}
    projection_proof=transition_proof
    for _ in fields:projection_proof={'Congruence':[projection_proof]}
    to_source={'Trans':dict(middle=observed_raw,left='Unfold',right=projection_proof)}
    assumption={'Trans':dict(middle=source_from,left=to_source,right={'Trans':dict(middle=source_to,
        left={'Use':dict(law=step_id,arguments=source_args,premises=[])},right={'Sym':'Unfold'})})}
    use={'Use':dict(law=generic_id,arguments=dict(count=count,state=initial,stop=stop,step=step,observe=observer),
        types=dict(State=state,View=result['Value']),premises=[],assumptions=[assumption])}
    target=op(result,'apply',observer,initial)
    proof={'Trans':dict(middle=middle,left={'Sym':'Unfold'},right={'Trans':dict(middle=target,left=use,right='Unfold')})}
    theorem=law(ps,observe(loop),observe(initial),proof,dependencies=[generic_id,step_id]);theorem['semantics']='ink-general-laws-v1'
    from producers.definition_context28 import calls
    roots=calls(theorem,{f['name']for f in core['program']['functions']})
    roots.update(step_obj['payload'].get('definition_context',{}).get('definitions',{}))
    obj=semantic_entry(bind(theorem,core,subject,roots=roots));return [step_obj,obj],identity(obj)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['compiler','core','generic-store']:p.add_argument('--'+name,type=Path,required=True)
    for name in ['function','state-parameter','field','generic-law']:p.add_argument('--'+name,required=True)
    p.add_argument('-o',type=Path,required=True);a=p.parse_args()
    compiler=a.compiler.resolve();source=a.core.resolve();base=Store(a.generic_store)
    generic=base.object(a.generic_law);dependencies=[base.object(i)for i in base.members()]
    def run(*args):
        r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=180)
        if r.returncode:raise ValueError(r.stderr[-3000:])
        return r
    with tempfile.TemporaryDirectory(prefix='ink-source-word-frame-')as directory:
        d=Path(directory);subject=d/'subject.json';run(compiler,'emit-semantic',source,'--core','-o',subject)
        entries,lid=author(json.loads(source.read_bytes()),json.loads(subject.read_bytes()),a.function,a.state_parameter,a.field.split('.'),generic,a.generic_law)
        objects=[*dependencies,*entries];staged=Store.publish(d/'stage',objects);view=d/'view.json';view.write_bytes(canonical(staged.bundle([lid])))
        result=run(compiler,'knowledge-check',source,view)
        if a.o.exists():raise ValueError('refusing to replace existing proof output')
        store=Store.publish(a.o,objects,{'source/repeat_until_observer':lid})
        (a.o/'checked-source.json').write_bytes(source.read_bytes());(a.o/'subject.json').write_bytes(subject.read_bytes());(a.o/'admission.json').write_text(result.stdout)
        (a.o/'scope.json').write_text(json.dumps(dict(function=a.function,observer=a.field,law=lid,scope='observer preservation only; loop result and maintained invariants require separate proofs'))+'\n')
        print(json.dumps(dict(status='checked',law=lid,snapshot=store.snapshot['root'])))

if __name__=='__main__':main()
