"""Independent finite oracle for selected batch33 projection laws."""
import itertools,json,random
from pathlib import Path

def scan(xs,z,m):
    out=[]
    for x in xs:
        z=(z+x)%m;out.append(z)
    return out

def projection(xs,ys,g,m,left):
    pairs=zip(xs,ys)if left else zip(ys,xs)
    return [g(b if left else a)%m for a,b in pairs]

def check(xs,ys,z,m,g,left):
    before=projection(scan(xs,z,m),ys,g,m,left)
    after=projection(xs,ys,g,m,left)
    independent=[g(ys[i])%m for i in range(min(len(xs),len(ys)))]
    assert before==after==independent
    assert len(after)==min(len(xs),len(ys))

callbacks=[lambda x:x,lambda x:15-x,lambda x:x*x+3,lambda x:7 if x<4 else 2*x]
sequences=[tuple(xs)for n in range(4)for xs in itertools.product((0,1,15),repeat=n)]
small=0
for xs,ys,z,g,left in itertools.product(sequences,sequences,range(16),callbacks,(True,False)):
    check(xs,ys,z,16,g,left);small+=1
r=random.Random(330133);wordcases=0
for bits in (32,64):
    m=1<<bits
    for n,q in itertools.product((0,1,2,3,7,128),(0,1,2,3,7,128)):
        for _ in range(20):
            xs=[r.randrange(m)for i in range(n)];ys=[r.randrange(m)for i in range(q)];z=r.randrange(m);seed=r.randrange(m);k=r.randrange(m)
            gs=[lambda x:x,lambda x:seed-x,lambda x:x*k+seed,lambda x:seed if x<k else x+k]
            for g,left in itertools.product(gs,(True,False)):
                check(xs,ys,z,m,g,left);wordcases+=1
assert [a+b for a,b in zip(scan([1,2],0,16),[7,7])]==[8,10]
assert [a+b for a,b in zip([1,2],[7,7])]==[8,9]
result=dict(schema=1,status='passed',modulus16_cases=small,word32_word64_cases=wordcases,signed32_coverage='modulo2^32 bit identity; callback selection still total pure',same_and_independent_lengths=True,empty_and_singleton=True,arbitrary_initial=True,callback_observes_prefix_negative=dict(xs=[1,2],ys=[7,7],before=[8,10],invalid_after=[8,9]),map_only_length_negative=dict(xs=[],ys=[7],correct=[],invalid_map_only=[7]),scope='Finite corroboration independent of producer/proof/selector; kernel admission supplies universal correctness.')
Path(__file__).with_name('projection-oracle.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
