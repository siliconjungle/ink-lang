#!/usr/bin/env python3
"""Produce conditional laws; assumptions are explicit and must be discharged at use."""
import argparse
import hashlib
import json
from pathlib import Path
from boolean_proofs import SEMANTICS, prove

def var(name): return {'Var':name}
def binary(op,a,b): return {'Binary':[op,a,b]}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('database',type=Path)
    args=parser.parse_args()
    objects=args.database/'objects';objects.mkdir(parents=True,exist_ok=True)
    names={}; selected=[]
    def store(obj):
        data=(json.dumps(dict(schema=1,semantics=SEMANTICS,**obj),separators=(',',':'))+'\n').encode()
        identity=hashlib.sha256(data).hexdigest();target=objects/f'{identity}.json'
        if target.exists(): assert target.read_bytes()==data
        else:
            with target.open('xb') as out: out.write(data)
        names[obj['name']]=identity
        return identity
    a,b=var('a'),var('b')
    for op,value,label in [('&&',True,'and_when_true'),('||',False,'or_when_false')]:
        literal={'Bool':value}
        expression=binary(op,literal,b)
        identity=store(dict(name=f'{label}_base',params=[['b','Bool']],
                            **{'from':expression,'to':b},proof=prove(expression,b,['b'])))
        rule=store(dict(name=label,params=[['a','Bool'],['b','Bool']],
                        **{'from':binary(op,a,b),'to':b},conditions=[{'from':a,'to':literal}],
                        dependencies=[identity],proof={'Trans':[
                            {'Binary':{'op':op,'left':{'Hypothesis':0},'right':{'Refl':b}}},
                            {'Use':{'theorem':identity,'arguments':[b]}}
                        ]}))
        selected.append(rule)
    (args.database/'lock.json').write_text(json.dumps(dict(schema=1,semantics=SEMANTICS,objects=selected),indent=2)+'\n')
    (args.database/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    print('Wrote four candidates, two selected conditional laws; run lang verify-database.')

if __name__=='__main__': main()
