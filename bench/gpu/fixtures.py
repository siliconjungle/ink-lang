#!/usr/bin/env python3
"""Independent Python arithmetic oracle for examples/gpu.ink."""
import json, random, sys
from pathlib import Path
MASK=(1<<32)-1

def expected(name,args):
    xs=args[0]
    if name=='heavy':
        total=0
        for value in xs:
            for _ in range(64): value=(value*value+17)&MASK
            total=(total+value)&MASK
        return total
    if name=='total': return sum((x*args[1])&MASK for x in xs)&MASK
    if name in ('filtered','double_filter'): return sum((x*x)&MASK for x in xs if x<args[1] and (name=='filtered' or x>0))&MASK
    if name=='selected': return sum(x<args[1] for x in xs)
    if name=='conditional': return sum(((x*x+17)&MASK) if args[1] else x for x in xs)&MASK
    if name=='intermediate_wide': return 0
    if name=='count_constants': return len(xs)
    if name=='constant': return len(xs)&MASK
    if name=='shadow': return sum((((x+1)&MASK)+args[1])&MASK for x in xs)&MASK
    if name=='ordered':
        result=0
        for x in reversed(xs):result=(x-result)&MASK
        return result
    if name=='wide': return sum((x+1)&((1<<64)-1) for x in xs)&((1<<64)-1)
    if name=='lazy': return sum(xs)&MASK if args[1] else 7
    raise ValueError(name)

def fixtures():
    rng=random.Random(39027);cases=[]
    for n in [0,1,2,3,255,256,257,511,512,513,4097]:
        datasets=[[rng.getrandbits(32) for _ in range(n)],[0]*n,[MASK]*n,[i%997 for i in range(n)]]
        for xs in datasets:
            for name,arg in [('total',0),('total',MASK),('filtered',0),('filtered',MASK),('selected',0),('selected',MASK),('double_filter',500),('conditional',True),('conditional',False),('constant',None),('shadow',MASK),('ordered',None),('lazy',False),('intermediate_wide',None),('count_constants',None)]:
                args=[xs] if arg is None else [xs,arg]
                cases.append({'call':name,'args':args,'expected':expected(name,args),'gpu_eligible':name not in ('ordered','lazy','intermediate_wide','count_constants')})
    for xs in [[],[0,1,MASK],[rng.getrandbits(32) for _ in range(257)]]:
        cases.append({'call':'heavy','args':[xs],'expected':expected('heavy',[xs]),'gpu_eligible':True})
    for xs in [[],[0,1,(1<<64)-1],[(1<<63),9007199254740993]]:
        cases.append({'call':'wide','args':[xs],'expected':expected('wide',[xs]),'gpu_eligible':False})
    return cases
if __name__=='__main__':
    out=Path(sys.argv[1]);cases=fixtures()
    for case in cases:
        if case['call']=='wide':case['args']=[[str(x) for x in case['args'][0]]];case['expected']=str(case['expected'])
    out.write_text(json.dumps(cases))
