#!/usr/bin/env python3
"""Untrusted exact-integer definition/proof producer for the generic kernel.

Integers are canonical Zero/Positive(n)/Negative(n), denoting 0/(n+1)/-(n+1).
No Int primitive, ring axiom, solver or aggregate rule is added to the compiler.
This is a mathematical model; source/transaction correspondence is separate.
"""
import argparse, hashlib, json, subprocess
from pathlib import Path
from inductive_proofs import SEMANTICS, var, call, construct, refl

ROOT=Path(__file__).resolve().parents[1]
def match(term,*branches):return {'Match':dict(scrutinee=term,branches=[dict(bindings=names,body=body) for names,body in branches])}
def induction(variable,left,right,*cases):return {'Induction':dict(variable=variable,**{'from':left,'to':right},cases=[dict(bindings=names,proof=proof) for names,proof in cases])}
def congruence(function,*proofs):return {'Call':dict(function=function,arguments=list(proofs))}
def use(theorem,*arguments):return {'Use':dict(theorem=theorem,arguments=list(arguments),premises=[])}
def sym(proof):return {'Sym':proof}
def trans(*proofs):
    if len(proofs)==1:return proofs[0]
    return {'Trans':[proofs[0],trans(*proofs[1:])]}

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('directory',type=Path)
    parser.add_argument('--compiler',type=Path,default=ROOT/'target/release/ink');args=parser.parse_args()
    directory=args.directory.resolve();(directory/'objects').mkdir(parents=True,exist_ok=True);names={}
    def references(value):
        if isinstance(value,list):return set().union(*(references(v) for v in value))
        if not isinstance(value,dict):return set()
        out=set()
        for key,val in value.items():
            if key in ('datatype','function','theorem') and isinstance(val,str):out.add(val)
            if key=='Data':out.add(val)
            out |= references(val)
        return out
    def store(name,kind,declaration):
        deps=sorted(references(declaration))
        if kind=='Theorem':
            # Nested induction over an Integer's Natural field needs that sort
            # as an explicit direct import, not just a hidden type dependency.
            deps=sorted(set(deps)|{names['Natural'],names['Integer']})
        data=(json.dumps(dict(schema=1,semantics=SEMANTICS,name=name,dependencies=deps,declaration={kind:declaration}),separators=(',',':'))+'\n').encode()
        identity=hashlib.sha256(data).hexdigest();path=directory/'objects'/f'{identity}.json'
        if path.exists():assert path.read_bytes()==data
        else:path.write_bytes(data)
        names[name]=identity
        # Check each new root immediately, so the producer never mistakes its
        # proposed derivation for accepted mathematical evidence.
        check=directory/'checking.json';check.write_text(json.dumps(dict(schema=1,semantics=SEMANTICS,objects=[identity])))
        r=subprocess.run([str(args.compiler.resolve()),'verify-library',str(check)],capture_output=True,text=True)
        if r.returncode:raise ValueError(f'{name}: {r.stderr.strip()}')
        print(name,': checked',flush=True);return identity
    def function(name,params,result,body,recursive=None):return store(name,'Function',dict(params=params,result=result,body=body,recursive=recursive))
    def theorem(name,params,left,right,proof):return store(name,'Theorem',dict(params=params,conditions=[],**{'from':left,'to':right},proof=proof))

    nat=store('Natural','Datatype',dict(constructors=[dict(name='Zero',fields=[]),dict(name='Successor',fields=['SelfType'])]))
    integer=store('Integer','Datatype',dict(constructors=[dict(name='Zero',fields=[]),dict(name='Positive',fields=[{'Data':nat}]),dict(name='Negative',fields=[{'Data':nat}])]))
    N={'Data':nat};I={'Data':integer};zero=construct(nat,0);Z=construct(integer,0)
    S=lambda n:construct(nat,1,n);P=lambda n:construct(integer,1,n);M=lambda n:construct(integer,2,n)
    x,n,t=var('x'),var('n'),var('t')
    successor=function('successor',[['x',I]],I,match(x,([],P(zero)),(['n'],P(S(n))),(['n'],match(n,([],Z),(['t'],M(t))))),0)
    predecessor=function('predecessor',[['x',I]],I,match(x,([],M(zero)),(['n'],match(n,([],Z),(['t'],P(t)))),(['n'],M(S(n)))),0)
    negation=function('negation',[['x',I]],I,match(x,([],Z),(['n'],M(n)),(['n'],P(n))),0)
    succ=lambda z:call(successor,z);pred=lambda z:call(predecessor,z)
    repeat_succ=function('repeat_successor',[['n',N],['x',I]],I,match(n,([],x),(['t'],succ({'SelfCall':[t,x]}))),0)
    repeat_pred=function('repeat_predecessor',[['n',N],['x',I]],I,match(n,([],x),(['t'],pred({'SelfCall':[t,x]}))),0)
    rs=lambda a,b:call(repeat_succ,a,b);rp=lambda a,b:call(repeat_pred,a,b)
    addition=function('addition',[['x',I],['y',I]],I,match(var('y'),([],x),(['n'],rs(S(n),x)),(['n'],rp(S(n),x))),1)
    subtraction=function('subtraction',[['x',I],['y',I]],I,call(addition,x,call(negation,var('y'))),1)
    add=lambda a,b:call(addition,a,b);sub=lambda a,b:call(subtraction,a,b)

    # Successor/predecessor are mutual inverses, including crossing zero.
    left=pred(succ(x));right=x
    inner_left=pred(succ(M(n)));inner_right=M(n)
    proof=induction('x',left,right,([],refl(Z)),(['n'],refl(P(n))),(['n'],induction('n',inner_left,inner_right,([],refl(M(zero))),(['t'],refl(M(S(t)))))))
    pred_succ=theorem('predecessor_successor',[['x',I]],left,right,proof)
    left=succ(pred(x));right=x
    inner_left=succ(pred(P(n)));inner_right=P(n)
    proof=induction('x',left,right,([],refl(Z)),(['n'],induction('n',inner_left,inner_right,([],refl(P(zero))),(['t'],refl(P(S(t)))))),(['n'],refl(M(n))))
    succ_pred=theorem('successor_predecessor',[['x',I]],left,right,proof)

    # Move a successor through repeated predecessors and vice versa, by
    # induction over the arbitrary number of steps. Reuse the inverse laws.
    left=rp(n,succ(x));right=succ(rp(n,x));tail=rp(t,x)
    step=trans(congruence(predecessor,{'Hypothesis':0}),use(pred_succ,tail),sym(use(succ_pred,tail)))
    move_succ=theorem('repeat_predecessor_successor',[['n',N],['x',I]],left,right,induction('n',left,right,([],refl(succ(x))),(['t'],step)))
    left=rs(n,pred(x));right=pred(rs(n,x));tail=rs(t,x)
    step=trans(congruence(successor,{'Hypothesis':0}),use(succ_pred,tail),sym(use(pred_succ,tail)))
    move_pred=theorem('repeat_successor_predecessor',[['n',N],['x',I]],left,right,induction('n',left,right,([],refl(pred(x))),(['t'],step)))

    left=rp(n,rs(n,x));right=x;inner=rs(t,x)
    step=trans(congruence(predecessor,use(move_succ,t,inner)),use(pred_succ,rp(t,inner)),{'Hypothesis':0})
    cancel_rp_rs=theorem('cancel_repeated_successor',[['n',N],['x',I]],left,right,induction('n',left,right,([],refl(x)),(['t'],step)))
    left=rs(n,rp(n,x));right=x;inner=rp(t,x)
    step=trans(congruence(successor,use(move_pred,t,inner)),use(succ_pred,rs(t,inner)),{'Hypothesis':0})
    cancel_rs_rp=theorem('cancel_repeated_predecessor',[['n',N],['x',I]],left,right,induction('n',left,right,([],refl(x)),(['t'],step)))

    # Cancellation holds for every integer, including arbitrary negative old
    # values. It does not assume a table size, machine width or observed bound.
    y=var('y');left=sub(add(x,y),y);right=x
    cancel=theorem('cancel_addition',[['x',I],['y',I]],left,right,induction('y',left,right,([],refl(x)),(['n'],use(cancel_rp_rs,S(n),x)),(['n'],use(cancel_rs_rp,S(n),x))))
    rest,old,new=var('rest'),var('old'),var('new')
    left=add(sub(add(rest,old),old),new);right=add(rest,new)
    replace=theorem('replacement_arithmetic',[['rest',I],['old',I],['new',I]],left,right,congruence(addition,use(cancel,rest,old),refl(new)))
    remove=theorem('removal_arithmetic',[['rest',I],['old',I]],sub(add(rest,old),old),rest,use(cancel,rest,old))

    # Group laws needed to move an arbitrary table row through a finite sum.
    # These too are ordinary induction/congruence proofs, not ring axioms.
    left=rs(n,succ(x));right=succ(rs(n,x))
    move_same_succ=theorem('repeat_successor_successor',[['n',N],['x',I]],left,right,induction('n',left,right,([],refl(succ(x))),(['t'],congruence(successor,{'Hypothesis':0}))))
    left=rp(n,pred(x));right=pred(rp(n,x))
    move_same_pred=theorem('repeat_predecessor_predecessor',[['n',N],['x',I]],left,right,induction('n',left,right,([],refl(pred(x))),(['t'],congruence(predecessor,{'Hypothesis':0}))))
    left=add(succ(x),y);right=succ(add(x,y))
    first_succ=theorem('addition_successor_first',[['x',I],['y',I]],left,right,induction('y',left,right,([],refl(succ(x))),(['n'],use(move_same_succ,S(n),x)),(['n'],use(move_succ,S(n),x))))
    left=add(pred(x),y);right=pred(add(x,y))
    first_pred=theorem('addition_predecessor_first',[['x',I],['y',I]],left,right,induction('y',left,right,([],refl(pred(x))),(['n'],use(move_pred,S(n),x)),(['n'],use(move_same_pred,S(n),x))))

    left=add(x,succ(y));right=succ(add(x,y))
    inner_left=add(x,succ(M(n)));inner_right=succ(add(x,M(n)))
    negative=induction('n',inner_left,inner_right,([],sym(use(succ_pred,x))),(['t'],sym(use(succ_pred,rp(S(t),x)))))
    second_succ=theorem('addition_successor_second',[['x',I],['y',I]],left,right,induction('y',left,right,([],refl(succ(x))),(['n'],refl(succ(rs(S(n),x)))),(['n'],negative)))
    left=add(x,pred(y));right=pred(add(x,y))
    inner_left=add(x,pred(P(n)));inner_right=pred(add(x,P(n)))
    positive=induction('n',inner_left,inner_right,([],sym(use(pred_succ,x))),(['t'],sym(use(pred_succ,rs(S(t),x)))))
    second_pred=theorem('addition_predecessor_second',[['x',I],['y',I]],left,right,induction('y',left,right,([],refl(pred(x))),(['n'],positive),(['n'],refl(pred(rp(S(n),x))))))

    left=add(Z,y);right=y
    positive=induction('n',add(Z,P(n)),P(n),([],refl(P(zero))),(['t'],congruence(successor,{'Hypothesis':0})))
    negative=induction('n',add(Z,M(n)),M(n),([],refl(M(zero))),(['t'],congruence(predecessor,{'Hypothesis':0})))
    zero_left=theorem('addition_zero_left',[['y',I]],left,right,induction('y',left,right,([],refl(Z)),(['n'],positive),(['n'],negative)))

    left=add(x,y);right=add(y,x)
    positive_base=trans(congruence(successor,sym(use(zero_left,x))),sym(use(first_succ,Z,x)))
    positive_step=trans(congruence(successor,{'Hypothesis':0}),sym(use(first_succ,P(t),x)))
    positive=induction('n',add(x,P(n)),add(P(n),x),([],positive_base),(['t'],positive_step))
    negative_base=trans(congruence(predecessor,sym(use(zero_left,x))),sym(use(first_pred,Z,x)))
    negative_step=trans(congruence(predecessor,{'Hypothesis':0}),sym(use(first_pred,M(t),x)))
    negative=induction('n',add(x,M(n)),add(M(n),x),([],negative_base),(['t'],negative_step))
    commute=theorem('addition_commutes',[['x',I],['y',I]],left,right,induction('y',left,right,([],sym(use(zero_left,x))),(['n'],positive),(['n'],negative)))

    z=var('z');left=add(add(x,y),z);right=add(x,add(y,z))
    positive_base=sym(use(second_succ,x,y))
    positive_step=trans(congruence(successor,{'Hypothesis':0}),sym(use(second_succ,x,add(y,P(t)))))
    positive=induction('n',add(add(x,y),P(n)),add(x,add(y,P(n))),([],positive_base),(['t'],positive_step))
    negative_base=sym(use(second_pred,x,y))
    negative_step=trans(congruence(predecessor,{'Hypothesis':0}),sym(use(second_pred,x,add(y,M(t)))))
    negative=induction('n',add(add(x,y),M(n)),add(x,add(y,M(n))),([],negative_base),(['t'],negative_step))
    associate=theorem('addition_associates',[['x',I],['y',I],['z',I]],left,right,induction('z',left,right,([],refl(add(x,y))),(['n'],positive),(['n'],negative)))

    # Finite sums and arbitrary-position changes. Prefix/suffix decomposition
    # identifies exactly one changed element, with no sampling or size bound.
    integers=store('IntegerList','Datatype',dict(constructors=[dict(name='Nil',fields=[]),dict(name='Cons',fields=[I,'SelfType'])]))
    L={'Data':integers};nil=construct(integers,0);cons=lambda h,t:construct(integers,1,h,t)
    xs,ys,h,tail=var('xs'),var('ys'),var('head'),var('tail')
    summation=function('sum_integers',[['xs',L]],I,match(xs,([],Z),(['head','tail'],add({'SelfCall':[tail]},h))),0)
    append=function('append',[['xs',L],['ys',L]],L,match(xs,([],ys),(['head','tail'],cons(h,{'SelfCall':[tail,ys]}))),0)
    total=lambda rows:call(summation,rows);joined=lambda a,b:call(append,a,b)
    left=total(joined(xs,ys));right=add(total(ys),total(xs))
    step=trans(congruence(addition,{'Hypothesis':0},refl(h)),use(associate,total(ys),total(tail),h))
    sum_append=theorem('sum_append',[['xs',L],['ys',L]],left,right,induction('xs',left,right,([],refl(total(ys))),(['head','tail'],step)))
    prefix,suffix,value=var('prefix'),var('suffix'),var('value')
    rest_total=add(total(suffix),total(prefix))
    left=total(joined(prefix,cons(value,suffix)));right=add(rest_total,value)
    proof=trans(use(sum_append,prefix,cons(value,suffix)),use(associate,total(suffix),value,total(prefix)),congruence(addition,refl(total(suffix)),use(commute,value,total(prefix))),sym(use(associate,total(suffix),total(prefix),value)))
    decompose=theorem('sum_row_decomposition',[['prefix',L],['suffix',L],['value',I]],left,right,proof)
    old_rows=joined(prefix,cons(old,suffix));new_rows=joined(prefix,cons(new,suffix))
    old_sum=total(old_rows);new_sum=total(new_rows)
    arithmetic=trans(congruence(subtraction,use(decompose,prefix,suffix,old),refl(old)),use(cancel,rest_total,old))
    proof=trans(congruence(addition,arithmetic,refl(new)),sym(use(decompose,prefix,suffix,new)))
    replacement_sum=theorem('sum_replace',[['prefix',L],['suffix',L],['old',I],['new',I]],add(sub(old_sum,old),new),new_sum,proof)
    proof=trans(arithmetic,sym(use(sum_append,prefix,suffix)))
    removal_sum=theorem('sum_remove',[['prefix',L],['suffix',L],['old',I]],sub(old_sum,old),total(joined(prefix,suffix)),proof)
    proof=trans(congruence(addition,use(sum_append,prefix,suffix),refl(new)),sym(use(decompose,prefix,suffix,new)))
    insertion_sum=theorem('sum_insert',[['prefix',L],['suffix',L],['new',I]],add(total(joined(prefix,suffix)),new),new_sum,proof)
    (directory/'lock.json').write_text(json.dumps(dict(schema=1,semantics=SEMANTICS,objects=list(names.values())),indent=2)+'\n')
    (directory/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    subprocess.run([str(args.compiler.resolve()),'verify-library',str(directory/'lock.json')],check=True,capture_output=True)
    # Remove only this producer's temporary check root; immutable objects remain.
    (directory/'checking.json').unlink()
    print(f'Checked {len(names)} definitions/theorems with the unchanged generic kernel. Source/state correspondence remains separate.',flush=True)

if __name__=='__main__':main()
