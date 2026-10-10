"""Independent integer and binary32 oracles; does not execute the Ink evaluator."""
import argparse, json, random, struct
from pathlib import Path

def i32(n): return ((n + 2**31) % 2**32) - 2**31

def f32(n): return struct.unpack('<f',struct.pack('<f',n))[0]

def add(a,b): return f32(f32(a)+f32(b))

def mul(a,b): return f32(f32(a)*f32(b))

def particle_plan(n,iterations):
    p=[[float(i%17),float(i%13),float(i%7)] for i in range(n)]
    v=[[float(i%5)/8,2.0,float(i%3)/16] for i in range(n)]
    dt=1/64;g=[0,-9.75,0]
    plan={'inputs':{'positions':p,'velocities':v},'steps':[{'id':'velocity','call':'kick','args':[{'input':'velocities'},dt,g]},{'id':'position','call':'drift','args':[{'input':'positions'},{'step':'velocity'},dt]}],'iterations':iterations,'feedback':{'positions':'position','velocities':'velocity'},'outputs':['position','velocity']}
    for _ in range(iterations):
        v=[[add(x,mul(a,dt)) for x,a in zip(row,g)] for row in v]
        p=[[add(x,mul(y,dt)) for x,y in zip(a,b)] for a,b in zip(p,v)]
    return {'pipeline':plan,'expected':{'position':p,'velocity':v},'eligible':True}

def fixtures():
    rng=random.Random(90210);out=[]
    def call(name,args,value,eligible=True):out.append({'call':name,'args':args,'expected':value,'eligible':eligible})
    for n in [0,1,2,63,64,65,127,129,257,513]:
        xs=[rng.randrange(-2**31,2**31) for _ in range(n)]
        if n>1:xs[:2]=[-2**31,2**31-1]
        call('indexed',[xs],[i32(x*-2) if i%2==0 else i32(x+7) for i,x in enumerate(xs)])
        acc=xs[:]
        for _ in range(8):acc=[i32(x*3+1)for x in acc]
        call('iterate',[xs],acc)
        indices=[0,1,max(0,n-1),n,2**32-1]
        call('gather',[xs,indices],[xs[i]if i<n else -99 for i in indices])
        p=[[float(i%17),float(i%13),float(i%7)]for i in range(n)]
        v=[[float(i%5)/8,2.0,float(i%3)/16]for i in range(max(0,n-1))]
        g=[0,-2,0];dt=.5
        call('kick',[p,dt,g],[[add(x,mul(a,dt))for x,a in zip(row,g)]for row in p])
        call('drift',[p,v,dt],[[add(x,mul(y,dt))for x,y in zip(a,b)]for a,b in zip(p,v)])
        particles=[{'position':pos,'velocity':[1,-2,.5],'mass':float(i%3+1)}for i,pos in enumerate(p)]
        call('particles',[particles,dt],[dict(x,position=[add(a,mul(b,dt))for a,b in zip(x['position'],x['velocity'])])for x in particles])
        prefix=[];acc=0
        for x in xs:acc=i32(acc+x);prefix.append(acc)
        call('prefix',[xs],prefix,False);call('ordered',[xs],sorted(xs),False)
        call('negative_words',[[0,1,4294967295]],[0,4294967295,1])
        for divisor in [0,-1,2]:
            call('division',[xs,divisor],[-99 if divisor==0 or x==-2**31 and divisor==-1 else int(x/divisor)for x in xs])
        call('mask',[xs],[x<0 for x in xs])
        call('helper',[xs],[i32(i32(x*3)+(1 if i32(x*3)<0 else -1))for x in xs])
    a=list(range(16));b=[float(i%5)for i in range(16)]
    expected=[]
    for i in range(16):
        s=0.0
        for k in range(4):s=add(s,mul(a[i//4*4+k],b[k*4+i%4]))
        expected.append(s)
    call('matrix4',[a,b],expected)
    call('ordered_sum',[[16777216.,1.,-16777216.]],0.,False)
    call('locals',[-2147483648],1,False)
    call('kick',[[[{'F32Bits':2139095040},2.0,3.0]],.5,[0,-2,0]],[[{'F32Bits':2139095040},1.0,3.0]],False)
    out.extend(particle_plan(257,k)for k in [1,2,3,120])
    out.append(particle_plan(0,3))
    return out

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('output');a=p.parse_args();Path(a.output).parent.mkdir(parents=True,exist_ok=True);Path(a.output).write_text(json.dumps(fixtures(),separators=(',',':'))+'\n')
