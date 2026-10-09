#!/usr/bin/env python3
"""External producer: whole-row lookup and exact-cache rollback over finite histories.

The abstract map is an override log; equality is observed at arbitrary 128-bit
keys. Payloads are arbitrary word lists, separate from their contribution. This
is not yet a proof of native maps, source codecs or ordered values enumeration.
"""
import argparse, hashlib, json, subprocess
from pathlib import Path
from inductive_proofs import var, call, construct, refl, binary
from integer_proofs import match, induction, congruence, use, sym, trans
from table_transition_proofs import conditional, constructed, generalized, hypothesis, substitute
from bitvector_proofs import certificate
ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory',type=Path)
    parser.add_argument('--compiler',type=Path,default=ROOT/'target/release/lang')
    parser.add_argument('--variant',choices=['reversible','snapshot'],default='reversible')
    args=parser.parse_args();out=args.directory.resolve();(out/'objects').mkdir(parents=True,exist_ok=True)
    compiler=args.compiler.resolve();compiler_hash=hashlib.sha256(compiler.read_bytes()).hexdigest()
    parent=ROOT/'knowledge/table-maintenance'/('table.evidence.json' if args.variant=='reversible' else 'table-snapshot.evidence.json')
    evidence=json.loads(parent.read_text());bundle=evidence['library'];names=json.loads((ROOT/'knowledge/table-maintenance/names.json').read_text());initial=set(names)
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
        # Branch fields and generalized hypotheses have types supplied by the
        # constructors, even when those types are not in the statement's AST.
        deps|={identity for identity,body in bundle['objects'].items()
               if 'Datatype' in json.loads(body)['declaration']}
        raw=json.dumps(dict(schema=1,semantics=bundle['lock']['semantics'],name=name,dependencies=sorted(deps),declaration={kind:declaration}),separators=(',',':'))+'\n'
        identity=hashlib.sha256(raw.encode()).hexdigest();names[name]=identity;bundle['objects'][identity]=raw;bundle['lock']['objects'].append(identity)
        (out/'objects'/f'{identity}.json').write_text(raw);(out/'lock.json').write_text(json.dumps(bundle['lock'],indent=2)+'\n')
        check=out/'checking.json';check.write_text(json.dumps(dict(bundle['lock'],objects=[identity])))
        r=subprocess.run([str(compiler),'verify-library',str(check)],capture_output=True,text=True)
        if r.returncode:raise ValueError(name+': '+r.stderr)
        print(name+': checked',flush=True);return identity
    def datatype(name,fields):return store(name,'Datatype',dict(constructors=[dict(name=n,fields=fs) for n,fs in fields]))
    def function(name,params,result,body,recursive=None):return store(name,'Function',dict(params=params,result=result,body=body,recursive=recursive))
    def theorem(name,params,left,right,proof):return store(name,'Theorem',dict(params=params,conditions=[],**{'from':left,'to':right},proof=proof))
    def scalar_proof(name,params,left,right,conditions=(),selected=()):
        goal=out/(name+'.goal.json');cnf=out/(name+'.cnf.json')
        goal.write_text(json.dumps(dict(params=params,conditions=list(conditions),**{'from':left,'to':right})))
        subprocess.run([str(compiler),'bitvector-obligation',str(goal),'-o',str(cnf)],check=True,capture_output=True)
        problem=json.loads(cnf.read_text());proof=certificate(problem,seconds=30)
        return {'BitVector':dict(**{'from':left,'to':right},hypotheses=list(selected),certificate=proof)}
    I={'Data':names['Integer']};K={'Data':names['TableKey128']};OI={'Data':names['OptionalInteger']}
    Z=construct(names['Integer'],0);INone=construct(names['OptionalInteger'],0);ISome=lambda v:construct(names['OptionalInteger'],1,v)
    eq=lambda a,b:call(names['table_key_equal'],a,b)
    k,q=var('key'),var('query');a,b=var('a'),var('b');T={'Bool':True};F={'Bool':False}
    ka=construct(names['TableKey128'],0,var('ahi'),var('alo'));kb=construct(names['TableKey128'],0,var('bhi'),var('blo'))
    guard=binary('&&',binary('==',var('ahi'),var('bhi')),binary('==',var('alo'),var('blo')))
    word_params=[[n,'U64'] for n in ['ahi','alo','bhi','blo']];conditions=[dict(**{'from':guard,'to':T})]
    hi=scalar_proof('matching_key_high',word_params,var('ahi'),var('bhi'),conditions,[0])
    lo=scalar_proof('matching_key_low',word_params,var('alo'),var('blo'),conditions,[0])
    left=conditional(eq(a,b),a,b);right=b
    inner_left=conditional(eq(ka,kb),ka,kb);ctx=conditional(var('hole'),ka,kb)
    true_case=trans(substitute(ctx,{'Hypothesis':0}),constructed(names['TableKey128'],0,hi,lo))
    false_case=substitute(ctx,{'Hypothesis':0})
    split={'BoolSplit':dict(condition=eq(ka,kb),**{'from':inner_left,'to':kb},on_false=false_case,on_true=true_case)}
    key_choice=theorem('matching_key_choice',[['a',K],['b',K]],left,right,
        induction('a',left,right,(['ahi','alo'],induction('b',conditional(eq(ka,b),ka,b),b,(['bhi','blo'],split)))))
    self_guard=binary('&&',binary('==',var('hi'),var('hi')),binary('==',var('lo'),var('lo')))
    key_refl=theorem('key_equal_reflexive',[['key',K]],eq(k,k),T,
        induction('key',eq(k,k),T,(['hi','lo'],scalar_proof('key_reflexive',[['hi','U64'],['lo','U64']],self_guard,T))))
    words=datatype('RowPayloadWords',[('Nil',[]),('Cons',['U64','SelfType'])]);D={'Data':words}
    row=datatype('StoredRow',[('Row',[D,I])]);V={'Data':row}
    option=datatype('OptionalStoredRow',[('None',[]),('Some',[V])]);O={'Data':option}
    none=construct(option,0);some=lambda r:construct(option,1,r)
    rows=datatype('OverrideRows',[('Empty',[]),('Write',[K,O,'SelfType'])]);R={'Data':rows}
    rs,old,new,total=map(var,['rows','old','new','total'])
    put=lambda r,k,v:construct(rows,1,k,v,r)
    lookup=function('lookup_stored_row',[['rows',R],['query',K]],O,
        match(rs,([],none),(['head_key','head_row','tail'],conditional(eq(var('head_key'),q),var('head_row'),{'SelfCall':[var('tail'),q]}))),0)
    get=lambda r,k:call(lookup,r,k)
    row_part=function('stored_row_part',[['row',V]],I,match(var('row'),(['payload','part'],var('part'))),0)
    optional_part=function('optional_stored_part',[['row',O]],OI,match(var('row'),([],INone),(['value'],ISome(call(row_part,var('value'))))),0)
    part=lambda v:call(optional_part,v)
    # Undo restores every bit of the stored row, not merely its contribution.
    double=put(put(rs,k,new),k,get(rs,k));cond=eq(k,q)
    left=get(double,q);right=get(rs,q)
    expanded=conditional(var('hole'),get(rs,k),conditional(var('hole'),new,get(rs,q)))
    key_ctx=get(rs,conditional(var('hole'),k,q))
    choose_to_query=substitute(get(rs,var('hole')),use(key_choice,k,q))
    true_case=trans(substitute(expanded,{'Hypothesis':0}),sym(substitute(key_ctx,{'Hypothesis':0})),choose_to_query)
    false_case=substitute(expanded,{'Hypothesis':0})
    lookup_inverse=theorem('stored_lookup_undo',[['rows',R],['key',K],['new',O],['query',K]],left,right,
        {'BoolSplit':dict(condition=cond,**{'from':left,'to':right},on_false=false_case,on_true=true_case)})
    cache_frame=datatype('ExactCacheUndo',[('Unchanged',[]),('Insert',[I]),('Replace',[I]),('Remove',[I])]);CF={'Data':cache_frame}
    entry=datatype('ExactCacheEntry',[('Entry',[I,CF])]);E={'Data':entry}
    entryof=lambda t,f:construct(entry,0,t,f)
    def expression(expr,env):
        if 'Var' in expr:return env[expr['Var']]
        if 'Binary' in expr:
            op,x,y=expr['Binary'];return call(names['addition' if op=='+' else 'subtraction'],expression(x,env),expression(y,env)) if op in ['+','-'] else (_ for _ in ()).throw(ValueError('unsupported cache operator'))
        raise ValueError('unsupported journal expression')
    def action(kind,index,ov=None,nv=None):
        env=dict(total=total)
        if ov is not None:env['old']=ov
        if nv is not None:env['new']=nv
        saved=expression(evidence['journal'][kind]['save'],env);env['saved']=saved
        return entryof(expression(evidence['journal'][kind]['apply'],env),construct(cache_frame,index,saved))
    ov,nv=var('old_value'),var('new_value')
    make=function('make_exact_cache_entry',[['total',I],['old',OI],['new',OI]],E,
        match(old,([],match(new,([],entryof(total,construct(cache_frame,0))),(['new_value'],action('insert',1,nv=nv)))),
              (['old_value'],match(new,([],action('remove',3,ov=ov)),(['new_value'],action('replace',2,ov,nv))))),1)
    restore=function('restore_exact_cache',[['frame',CF],['total',I]],I,
        match(var('frame'),([],total),* [(['saved'],expression(evidence['journal'][kind]['restore'],dict(total=total,saved=var('saved')))) for kind in ['insert','replace','remove']]),0)
    entry_total=function('entry_total',[['entry',E]],I,match(var('entry'),(['next','frame'],var('next'))),0)
    entry_frame=function('entry_frame',[['entry',E]],CF,match(var('entry'),(['next','frame'],var('frame'))),0)
    makeentry=lambda t,o,n:call(make,t,o,n)
    nextof=lambda e:call(entry_total,e);savedof=lambda e:call(entry_frame,e);restoreof=lambda f,t:call(restore,f,t)
    def rename(value,mapping):
        if isinstance(value,list):return [rename(v,mapping) for v in value]
        if not isinstance(value,dict):return value
        if set(value)=={'Var'}:return mapping.get(value['Var'],value)
        return {k:rename(v,mapping) for k,v in value.items()}
    undoentry=lambda t,o,n:restoreof(savedof(makeentry(t,o,n)),nextof(makeentry(t,o,n)))
    left=undoentry(total,old,new)
    inverse=theorem('exact_cache_entry_undo',[['total',I],['old',OI],['new',OI]],left,total,
        induction('old',left,total,
            ([],induction('new',undoentry(total,INone,new),total,
                ([],refl(total)),(['new_value'],rename(evidence['journal']['insert']['inverse'],{'new':nv})))),
            (['old_value'],induction('new',undoentry(total,ISome(ov),new),total,
                ([],rename(evidence['journal']['remove']['inverse'],{'old':ov})),
                (['new_value'],rename(evidence['journal']['replace']['inverse'],{'old':ov,'new':nv}))))))
    frame=datatype('StoredRowUndo',[('Undo',[K,O,CF])]);FR={'Data':frame}
    frames=datatype('StoredRowUndos',[('Nil',[]),('Cons',[FR,'SelfType'])]);FS={'Data':frames}
    machine=datatype('RowJournalMachine',[('Machine',[R,I,FS])]);M={'Data':machine}
    view=datatype('RowCacheView',[('View',[R,I])]);VW={'Data':view}
    observation=datatype('RowCacheObservation',[('Observation',[O,I])]);OBS={'Data':observation}
    obs=lambda o,t:construct(observation,0,o,t);viewof=lambda r,t:construct(view,0,r,t)
    fs,f,tail=var('frames'),var('frame'),var('tail')
    rb=function('rollback_stored_frames',[['frames',FS],['rows',R],['total',I]],VW,
        match(fs,([],viewof(rs,total)),(['frame','tail'],match(f,(['key','old','cache_frame'],
            {'SelfCall':[tail,put(rs,k,old),restoreof(var('cache_frame'),total)]})))),0)
    rollback=lambda fs,r,t:call(rb,fs,r,t)
    observe=function('observe_stored_view',[['view',VW],['query',K]],OBS,
        match(var('view'),(['rows','total'],obs(get(rs,q),total))),0)
    observeof=lambda s,q:call(observe,s,q)
    observer_step={'SelfCall':[tail,obs(conditional(eq(k,q),old,var('row')),restoreof(var('cache_frame'),total)),q]}
    observer_value=match(var('value'),(['row','total'],observer_step))
    observer_frame=match(f,(['key','old','cache_frame'],observer_value))
    rb_observer=function('rollback_row_observation',[['frames',FS],['value',OBS],['query',K]],OBS,
        match(fs,([],var('value')),(['frame','tail'],observer_frame)),0)
    rbobs=lambda fs,o,q:call(rb_observer,fs,o,q)
    left=observeof(rollback(fs,rs,total),q);right=rbobs(fs,obs(get(rs,q),total),q)
    frame_value=construct(frame,0,k,old,var('cache_frame'))
    step_left=observeof(rollback(construct(frames,1,frame_value,tail),rs,total),q)
    step_right=rbobs(construct(frames,1,frame_value,tail),obs(get(rs,q),total),q)
    observation_bridge=theorem('rollback_observation_correspondence',[['frames',FS],['rows',R],['total',I],['query',K]],left,right,
        generalized('frames',['rows','total','query'],left,right,
            ([],refl(obs(get(rs,q),total))),
            (['frame','tail'],induction('frame',observeof(rollback(construct(frames,1,f,tail),rs,total),q),
                rbobs(construct(frames,1,f,tail),obs(get(rs,q),total),q),
                (['key','old','cache_frame'],hypothesis(put(rs,k,old),restoreof(var('cache_frame'),total),q))))))
    rowcommand=datatype('StoredRowWrite',[('Write',[K,O])]);C={'Data':rowcommand}
    machineof=lambda r,t,fs:construct(machine,0,r,t,fs)
    command=var('command');m=var('machine')
    e=makeentry(total,part(get(rs,k)),part(new))
    updated=machineof(put(rs,k,new),nextof(e),construct(frames,1,construct(frame,0,k,get(rs,k),savedof(e)),fs))
    step=function('step_row_journal',[['machine',M],['command',C]],M,
        match(m,(['rows','total','frames'],match(command,(['key','new'],updated)))),1)
    stepof=lambda m,c:call(step,m,c)
    rbmachine=function('rollback_row_journal',[['machine',M]],VW,
        match(m,(['rows','total','frames'],rollback(fs,rs,total))),0)
    rbm=lambda m:call(rbmachine,m)
    left=observeof(rbm(stepof(m,command)),q);right=observeof(rbm(m),q)
    # First pop restores the observed row and exact total. The remaining stack
    # sees the same observation, so induction may continue through any history.
    frame_cache_restored=restoreof(savedof(e),nextof(e))
    oneproof=trans(use(observation_bridge,fs,put(put(rs,k,new),k,get(rs,k)),frame_cache_restored,q),
        congruence(rb_observer,refl(fs),constructed(observation,0,use(lookup_inverse,rs,k,new,q),use(inverse,total,part(get(rs,k)),part(new))),refl(q)),
        sym(use(observation_bridge,fs,rs,total,q)))
    one=theorem('rollback_row_step_exact',[['machine',M],['command',C],['query',K]],left,right,
        induction('machine',left,right,(['rows','total','frames'],induction('command',
            observeof(rbm(stepof(machineof(rs,total,fs),command)),q),observeof(rbm(machineof(rs,total,fs)),q),(['key','new'],oneproof)))))
    commands=datatype('StoredRowWrites',[('Nil',[]),('Cons',[C,'SelfType'])]);CS={'Data':commands}
    cs=var('commands');ct=var('command_tail')
    execute=function('execute_row_writes',[['commands',CS],['machine',M]],M,
        match(cs,([],m),(['command','command_tail'],{'SelfCall':[ct,stepof(m,command)]})),0)
    run=lambda cs,m:call(execute,cs,m)
    left=observeof(rbm(run(cs,m)),q);right=observeof(rbm(m),q)
    history=theorem('rollback_row_history_exact',[['commands',CS],['machine',M],['query',K]],left,right,
        generalized('commands',['machine','query'],left,right,
            ([],refl(observeof(rbm(m),q))),(['command','command_tail'],trans(hypothesis(stepof(m,command),q),use(one,m,command,q)))))
    (out/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    added={n:names[n] for n in names if n not in initial}
    (out/'model.json').write_text(json.dumps(dict(semantics='full-row-keyed-undo-observation-v1',variant=args.variant,roles=added,
        roots=dict(row_lookup=lookup_inverse,cache_inverse=inverse,step=one,history=history),parent_evidence_sha256=hashlib.sha256(parent.read_bytes()).hexdigest(),
        scope='Arbitrary row payloads and exact caches at every 128-bit lookup after reverse undo. Native map/codec/projection, ordered enumeration, effects and durability remain separate.'),indent=2)+'\n')
    (out/'bundle.json').write_text(json.dumps(bundle,indent=2)+'\n')
    assert hashlib.sha256(compiler.read_bytes()).hexdigest()==compiler_hash
    print(json.dumps(dict(status='passed',objects=len(bundle['objects']),new_objects=len(added),compiler_sha256=compiler_hash),indent=2))
if __name__=='__main__':main()
