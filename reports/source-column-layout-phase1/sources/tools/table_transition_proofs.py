#!/usr/bin/env python3
"""Untrusted producer: exact keyed-table/cache transitions and finite histories."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from inductive_proofs import var, call, construct, refl, binary
from integer_proofs import match, induction, congruence, use, sym, trans

ROOT=Path(__file__).resolve().parents[1]
def conditional(b,t,f):return {'If':dict(condition=b,on_true=t,on_false=f)}
def constructed(identity,index,*proofs):return {'Construct':dict(datatype=identity,constructor=index,arguments=list(proofs))}
def generalized(variable,parameters,left,right,*cases):return {'GeneralizedInduction':dict(variable=variable,generalize=parameters,**{'from':left,'to':right},cases=[dict(bindings=names,proof=proof) for names,proof in cases])}
def hypothesis(*args,index=0):return {'GeneralizedHypothesis':dict(index=index,arguments=list(args))}
def substitute(context,proof):return {'Substitute':dict(variable='hole',context=context,equality=proof)}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('directory',type=Path)
    parser.add_argument('--compiler',type=Path,default=ROOT/'target/debug/lang');args=parser.parse_args()
    out=args.directory.resolve();(out/'objects').mkdir(parents=True,exist_ok=True)
    evidence=json.loads((ROOT/'knowledge/reversible-maintenance/reversible.evidence.json').read_text())
    bundle=evidence['library'];names=json.loads((ROOT/'knowledge/reversible-maintenance/names.json').read_text())
    original=set(names)
    for identity,raw in bundle['objects'].items():(out/'objects'/f'{identity}.json').write_text(raw)
    def references(value):
        if isinstance(value,list):return set().union(*(references(v) for v in value))
        if not isinstance(value,dict):return set()
        found=set()
        for key,val in value.items():
            if key in ('datatype','function','theorem') and isinstance(val,str):found.add(val)
            if key=='Data':found.add(val)
            found|=references(val)
        return found
    def store(name,kind,declaration):
        deps=references(declaration)
        if kind=='Theorem':deps|={names['Natural'],names['Integer']}
        raw=json.dumps(dict(schema=1,semantics=bundle['lock']['semantics'],name=name,dependencies=sorted(deps),declaration={kind:declaration}),separators=(',',':'))+'\n'
        identity=hashlib.sha256(raw.encode()).hexdigest();names[name]=identity
        bundle['objects'][identity]=raw;bundle['lock']['objects'].append(identity)
        (out/'objects'/f'{identity}.json').write_text(raw)
        (out/'lock.json').write_text(json.dumps(bundle['lock'],indent=2)+'\n')
        r=subprocess.run([str(args.compiler.resolve()),'verify-library',str(out/'lock.json')],text=True,capture_output=True)
        if r.returncode:raise ValueError(name+': '+r.stderr)
        print(name+': checked',flush=True);return identity
    def datatype(name,constructors):return store(name,'Datatype',dict(constructors=[dict(name=n,fields=fields) for n,fields in constructors]))
    def function(name,params,result,body,recursive=None):return store(name,'Function',dict(params=params,result=result,body=body,recursive=recursive))
    def theorem(name,params,left,right,proof):return store(name,'Theorem',dict(params=params,conditions=[],**{'from':left,'to':right},proof=proof))
    I={'Data':names['Integer']};Z=construct(names['Integer'],0)
    add=lambda x,y:call(names['addition'],x,y);sub=lambda x,y:call(names['subtraction'],x,y)
    x,y,z=map(var,('x','y','z'))
    exchange=theorem('addition_exchange',[['x',I],['y',I],['z',I]],add(add(x,y),z),add(add(x,z),y),
        trans(use(names['addition_associates'],x,y,z),congruence(names['addition'],refl(x),use(names['addition_commutes'],y,z)),sym(use(names['addition_associates'],x,z,y))))
    minus_exchange=theorem('subtraction_exchange',[['x',I],['y',I],['z',I]],sub(add(x,y),z),add(sub(x,z),y),
        trans(use(names['subtraction_as_addition'],add(x,y),z),use(exchange,x,y,call(names['negation'],z)),
              congruence(names['addition'],sym(use(names['subtraction_as_addition'],x,z)),refl(y))))
    optional=datatype('OptionalInteger',[('None',[]),('Some',[I])]);O={'Data':optional}
    none=construct(optional,0);some=lambda v:construct(optional,1,v)
    key_type=datatype('TableKey128',[('Key',['U64','U64'])]);K={'Data':key_type}
    key_comparison=binary('&&',binary('==',var('ahi'),var('bhi')),binary('==',var('alo'),var('blo')))
    equal=function('table_key_equal',[['a',K],['b',K]],'Bool',
        match(var('a'),(['ahi','alo'],match(var('b'),(['bhi','blo'],key_comparison)))),0)
    rows=datatype('ContributionRows',[('Nil',[]),('Cons',[K,I,'SelfType'])]);R={'Data':rows}
    nil=construct(rows,0);cons=lambda k,v,t:construct(rows,1,k,v,t)
    rs,key,new=map(var,('rows','key','new'));hk,hv,tail=map(var,('head_key','head_value','tail'))
    condition=call(equal,hk,key)
    lookup=function('lookup_contribution',[['rows',R],['key',K]],O,
        match(rs,([],none),(['head_key','head_value','tail'],conditional(condition,some(hv),{'SelfCall':[tail,key]}))),0)
    matching=function('write_matching_contribution',[['head_key',K],['tail',R],['new',O]],R,
        match(new,([],tail),(['value'],cons(hk,var('value'),tail))),2)
    matched=lambda k,t,n:call(matching,k,t,n)
    write=function('write_contribution',[['rows',R],['key',K],['new',O]],R,
        match(rs,([],matched(key,nil,new)),
             (['head_key','head_value','tail'],conditional(condition,
                 matched(hk,tail,new),
                 cons(hk,hv,{'SelfCall':[tail,key,new]})))),0)
    summation=function('sum_contributions',[['rows',R]],I,
        match(rs,([],Z),(['head_key','head_value','tail'],add({'SelfCall':[tail]},hv))),0)
    total,old=var('total'),var('old')
    update=function('update_contribution_total',[['total',I],['old',O],['new',O]],I,
        match(old,
            ([],match(new,([],total),(['new_value'],add(total,var('new_value'))))),
            (['old_value'],match(new,([],sub(total,var('old_value'))),(['new_value'],add(total,sub(var('new_value'),var('old_value'))))))),1)
    get=lambda r,k:call(lookup,r,k);put=lambda r,k,n:call(write,r,k,n);sumrows=lambda r:call(summation,r)
    maintain=lambda t,o,n:call(update,t,o,n)
    head=var('head');ov,nv=var('old_value'),var('new_value')
    left=maintain(add(total,head),old,new);right=add(maintain(total,old,new),head)
    for_none=induction('new',maintain(add(total,head),none,new),add(maintain(total,none,new),head),
        ([],refl(add(total,head))),(['new_value'],use(exchange,total,head,nv)))
    for_some=induction('new',maintain(add(total,head),some(ov),new),add(maintain(total,some(ov),new),head),
        ([],use(minus_exchange,total,head,ov)),(['new_value'],use(exchange,total,head,sub(nv,ov))))
    transport=theorem('update_through_unchanged_row',[['total',I],['head',I],['old',O],['new',O]],left,right,
        induction('old',left,right,([],for_none),(['old_value'],for_some)))
    left=maintain(sumrows(rs),get(rs,key),new);right=sumrows(put(rs,key,new))
    # The guard is introduced by actual lookup/write; branch-local rewriting
    # closes it before the universal statement is returned.
    before=add(sumrows(tail),hv)
    left_context=maintain(before,conditional(var('hole'),some(hv),get(tail,key)),new)
    right_context=sumrows(conditional(var('hole'),matched(hk,tail,new),cons(hk,hv,put(tail,key,new))))
    guard={'Hypothesis':0}
    no_match=trans(use(transport,sumrows(tail),hv,get(tail,key),new),congruence(names['addition'],hypothesis(key,new),refl(hv)))
    yes_none=use(names['cancel_addition'],sumrows(tail),hv)
    yes_some=trans(use(names['addition_delta_first'],before,var('value'),hv),use(names['replacement_arithmetic'],sumrows(tail),hv,var('value')))
    yes=induction('new',maintain(before,some(hv),new),sumrows(matched(hk,tail,new)),
                  ([],yes_none),(['value'],yes_some))
    close=lambda proof:trans(substitute(left_context,guard),proof,sym(substitute(right_context,guard)))
    step_left=maintain(sumrows(cons(hk,hv,tail)),get(cons(hk,hv,tail),key),new)
    step_right=sumrows(put(cons(hk,hv,tail),key,new))
    split={'BoolSplit':dict(condition=condition,**{'from':step_left,'to':step_right},on_false=close(no_match),on_true=close(yes))}
    empty=induction('new',maintain(Z,none,new),sumrows(put(nil,key,new)),
                    ([],refl(Z)),(['value'],refl(add(Z,var('value')))))
    update_exact=theorem('keyed_update_exact',[['rows',R],['key',K],['new',O]],left,right,
        generalized('rows',['key','new'],left,right,([],empty),(['head_key','head_value','tail'],split)))
    command=datatype('TableCommand',[('Write',[K,O])]);C={'Data':command}
    state=datatype('CachedContributionState',[('State',[R,I])]);S={'Data':state}
    stateof=lambda r,t:construct(state,0,r,t)
    cmd,physical=var('command'),var('state')
    reference_step=function('reference_table_step',[['rows',R],['command',C]],R,
        match(cmd,(['key','new'],put(rs,key,new))),1)
    cached_step=function('cached_table_step',[['state',S],['command',C]],S,
        match(physical,(['rows','total'],match(cmd,(['key','new'],stateof(put(rs,key,new),maintain(total,get(rs,key),new)))))),1)
    initialise=function('initialise_contribution_state',[['rows',R]],S,stateof(rs,sumrows(rs)))
    init=lambda r:call(initialise,r);refstep=lambda r,c:call(reference_step,r,c);faststep=lambda s,c:call(cached_step,s,c)
    left=faststep(init(rs),cmd);right=init(refstep(rs,cmd))
    command_term=construct(command,0,key,new)
    one=theorem('cached_table_step_exact',[['rows',R],['command',C]],left,right,
        induction('command',left,right,(['key','new'],constructed(state,0,refl(put(rs,key,new)),use(update_exact,rs,key,new)))))
    commands=datatype('TableCommands',[('Nil',[]),('Cons',[C,'SelfType'])]);CS={'Data':commands}
    trace=datatype('ContributionTrace',[('Nil',[]),('Cons',[S,'SelfType'])]);T={'Data':trace}
    cs,ct=var('commands'),var('command_tail')
    reftrace=function('reference_table_trace',[['commands',CS],['rows',R]],T,
        match(cs,([],construct(trace,0)),(['command','command_tail'],
            construct(trace,1,init(refstep(rs,cmd)),{'SelfCall':[ct,refstep(rs,cmd)]}))),0)
    fasttrace=function('cached_table_trace',[['commands',CS],['state',S]],T,
        match(cs,([],construct(trace,0)),(['command','command_tail'],
            construct(trace,1,faststep(physical,cmd),{'SelfCall':[ct,faststep(physical,cmd)]}))),0)
    left=call(fasttrace,cs,init(rs));right=call(reftrace,cs,rs)
    nextrow=refstep(rs,cmd)
    tailproof=trans(congruence(fasttrace,refl(ct),use(one,rs,cmd)),hypothesis(nextrow))
    history=theorem('cached_table_trace_exact',[['commands',CS],['rows',R]],left,right,
        generalized('commands',['rows'],left,right,([],refl(construct(trace,0))),(['command','command_tail'],constructed(trace,1,use(one,rs,cmd),tailproof))))
    roles={n:names[n] for n in ['OptionalInteger','TableKey128','table_key_equal','ContributionRows','lookup_contribution','write_matching_contribution','write_contribution','sum_contributions','update_contribution_total','TableCommand','CachedContributionState','reference_table_step','cached_table_step','initialise_contribution_state','TableCommands','ContributionTrace','reference_table_trace','cached_table_trace']}
    (out/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    (out/'model.json').write_text(json.dumps(dict(roles=roles,step=one,history=history),indent=2)+'\n')
    snapshot=json.loads((ROOT/'knowledge/reversible-maintenance/snapshot.evidence.json').read_text())['journal']
    for name,journal in [('table',evidence['journal']),('table-snapshot',snapshot)]:
        path=out/f'{name}.evidence.json'
        path.write_text(json.dumps(dict(evidence,library=bundle,journal=journal,table=dict(model=roles,step=use(one,rs,cmd),history=use(history,cs,rs))),indent=2)+'\n')
        source=out/f'{name}.ink';source.write_text((ROOT/'knowledge/reversible-maintenance/reversible.ink').read_text())
        subprocess.run([str(args.compiler.resolve()),'prove-maintenance',str(source),'--evidence',str(path),'-o',str(out/f'{name}.json')],check=True)
        subprocess.run([str(args.compiler.resolve()),'verify-maintenance',str(out/f'{name}.json')],check=True)
    print(f'Checked {len(names)-len(original)} new objects; {len(names)} total. Keyed contribution/table model; source projection and full transaction refinement remain separate.',flush=True)

if __name__=='__main__':main()
