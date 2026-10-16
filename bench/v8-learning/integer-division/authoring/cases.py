"""Untrusted source proposals. Every fixed-word equation needs ordinary RUP."""
from producers.semantic_laws import value,var,bound,word,term,op,lam


def bindings(sorts,arguments,build):
    """Retain every specified strict evaluation, including unused arguments."""
    body=build([bound(sort,len(sorts)-1-i)for i,sort in enumerate(sorts)])
    for sort in reversed(sorts):body=lam(sort,body)
    for argument in arguments:body=op(body['sort']['Arrow'][1],'apply',body,argument)
    return body


def templates(all_powers=True):
    rows=[];boolean=value('Bool')
    def add(name,params,left,right):rows.append(dict(name=name,goal=dict(params=params,conditions=[],**{'from':left,'to':right})))
    def compare(name,x,y):return op(boolean,'binary:'+name,x,y)
    def choose(c,t,f):return op(t['sort'],'call:choose',c,t,f)
    for carrier in ['U32','U64','I32']:
        sort=value(carrier);x=var(sort,'x');y=var(sort,'y');default=var(sort,'default')
        constant=lambda n:word(carrier,n&((1<<(64 if carrier=='U64'else 32))-1))
        call=lambda name,*args:op(sort,'call:'+name,*args)
        arithmetic=lambda name,a,b:op(sort,'binary:'+name,a,b)
        neg=lambda a:op(sort,'neg',a)
        prefix=carrier.lower()+'_'
        for operation in ['quot_or','rem_or']:
            quotient=operation=='quot_or'
            add(prefix+operation+'_zero_divisor',{'x':sort,'default':sort},call(operation,x,constant(0),default),bindings([sort],[x],lambda a:default))
            add(prefix+operation+'_one',{'x':sort,'default':sort},call(operation,x,constant(1),default),x if quotient else bindings([sort],[x],lambda a:constant(0)))
            add(prefix+operation+'_zero_numerator',{'y':sort,'default':sort},call(operation,constant(0),y,default),choose(compare('==',y,constant(0)),default,constant(0)))
            add(prefix+operation+'_self',{'x':sort,'default':sort},call(operation,x,x,default),bindings([sort,sort],[x,x],lambda a:choose(compare('==',a[0],constant(0)),default,constant(1 if quotient else 0))))
        if carrier=='I32':
            add(prefix+'double_negation',{'x':sort},neg(neg(x)),x)
            add(prefix+'sign_fill',{'x':sort},call('wrapping_shr',x,word('U32',31)),choose(compare('<',x,constant(0)),constant(-1),constant(0)))
            add(prefix+'multiply_two',{'x':sort},arithmetic('*',x,constant(2)),call('wrapping_shl',x,word('U32',1)))
            add(prefix+'or_sign_negative',{'x':sort},compare('<',call('word_or',x,constant(1<<31)),constant(0)),bindings([sort],[x],lambda a:term(boolean,{'Bool':True})))
            for operation in ['quot_or','rem_or']:
                quotient=operation=='quot_or'
                add(prefix+operation+'_minus_one',{'x':sort,'default':sort},call(operation,x,constant(-1),default),bindings([sort],[x],lambda a:choose(compare('==',a[0],constant(1<<31)),default,neg(a[0])if quotient else constant(0))))
                add(prefix+operation+'_minimum_divisor',{'x':sort,'default':sort},call(operation,x,constant(1<<31),default),bindings([sort],[x],lambda a:choose(compare('==',a[0],constant(1<<31)),constant(1 if quotient else 0),constant(0)if quotient else a[0])))
        max_power=63 if carrier=='U64'else 30 if carrier=='I32'else 31
        powers=range(1,max_power+1)if all_powers else sorted({1,3,max_power})
        for k in powers:
            for sign in ([1,-1]if carrier=='I32'else[1]):
                divisor=sign*(1<<k);tag=('negative_'if sign<0 else'')+str(k)
                for operation in ['quot_or','rem_or']:
                    quotient=operation=='quot_or'
                    def result(a):
                        if carrier!='I32':return call('wrapping_shr',a,word('U32',k))if quotient else call('word_and',a,constant((1<<k)-1))
                        if quotient:
                            bias=call('word_and',call('wrapping_shr',a,word('U32',31)),constant((1<<k)-1))
                            result=call('wrapping_shr',arithmetic('+',a,bias),word('U32',k))
                            return neg(result)if sign<0 else result
                        return choose(compare('<',a,constant(0)),neg(call('word_and',neg(a),constant((1<<k)-1))),call('word_and',a,constant((1<<k)-1)))
                    target=bindings([sort],[x],lambda a:result(a[0]))if carrier=='I32'else result(x)
                    add(prefix+operation+'_power_'+tag,{'x':sort,'default':sort},call(operation,x,constant(divisor),default),target)
    return rows
