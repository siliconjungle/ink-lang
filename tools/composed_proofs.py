#!/usr/bin/env python3
"""External producer demonstrating definitions and theorem reuse; all output is untrusted."""
import argparse
import hashlib
import json
from pathlib import Path
from boolean_proofs import SEMANTICS, prove

def var(name): return {'Var':name}
def binary(op,a,b): return {'Binary':[op,a,b]}
def call(identity,*args): return {'Call':[identity,list(args)]}
def use(identity,*args): return {'Use':{'theorem':identity,'arguments':list(args)}}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database',type=Path)
    args=parser.parse_args()
    directory=args.database/'objects';directory.mkdir(parents=True,exist_ok=True)
    names={}
    def store(obj):
        data=(json.dumps(dict(schema=1,semantics=SEMANTICS,**obj),separators=(',',':'))+'\n').encode()
        identity=hashlib.sha256(data).hexdigest()
        target=directory/f'{identity}.json'
        if target.exists(): assert target.read_bytes()==data
        else:
            with target.open('xb') as out: out.write(data)
        names[obj['name']]=identity
        return identity
    boolean=[['a','Bool'],['b','Bool']]
    a,b=var('a'),var('b')
    expression=binary('&&',a,binary('||',a,b))
    decision=store(dict(kind='definition',name='decision',params=boolean,result='Bool',body=expression))
    twice=store(dict(kind='definition',name='twice',params=boolean,result='Bool',
                     body=binary('&&',call(decision,a,b),call(decision,a,b)),dependencies=[decision]))
    absorption=store(dict(name='absorption',params=boolean,**{'from':expression,'to':a},proof=prove(expression,a,['a','b'])))
    duplicate=store(dict(name='duplicate',params=[['a','Bool']],**{'from':binary('&&',a,a),'to':a},proof=prove(binary('&&',a,a),a,['a'])))
    composition=store(dict(name='combined_decision',params=boolean,
                          **{'from':call(twice,a,b),'to':a},dependencies=[twice,absorption,duplicate],
                          proof={'Trans':[{'Binary':{'op':'&&','left':use(absorption,a,b),'right':use(absorption,a,b)}},use(duplicate,a)]}))
    x,limit,fallback=var('x'),var('limit'),var('fallback')
    less=store(dict(kind='definition',name='less',params=[['x','U64'],['limit','U64']],result='Bool',body=binary('<',x,limit)))
    predicate=call(less,x,limit)
    specialised=store(dict(name='combined_comparison',params=[['x','U64'],['limit','U64'],['fallback','Bool']],
                           **{'from':call(twice,predicate,fallback),'to':predicate},
                           dependencies=[twice,less,composition],proof=use(composition,predicate,fallback)))
    (args.database/'lock.json').write_text(json.dumps(dict(schema=1,semantics=SEMANTICS,objects=[specialised]),indent=2)+'\n')
    (args.database/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    print(f'Wrote {len(names)} candidate objects with one selected rewrite; run lang verify-database.')

if __name__=='__main__': main()
