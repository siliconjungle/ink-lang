"""Independent total-function model corroboration; not universal proof authority."""
import itertools,json,random
from pathlib import Path

def check(xs,ys,f,g,side):
    # Evaluate every discarded value eagerly, retain only selected aligned values.
    mapped=[f(x) for x in xs]
    before=[g(b if side=='left' else a) for a,b in (zip(mapped,ys) if side=='left' else zip(ys,mapped))]
    after=[g(b if side=='left' else a) for a,b in (zip(xs,ys) if side=='left' else zip(ys,xs))]
    independent=[g(ys[i]) for i in range(min(len(xs),len(ys)))]
    assert before==after==independent
    return len(before)

sequences=[tuple(xs) for n in range(4) for xs in itertools.product((0,1,15),repeat=n)]
funcs=[lambda x:x,lambda x:(15-x)%16,lambda x:(x*x+3)%16,lambda x:7 if x<4 else 2*x%16]
small=0
for xs,ys,f,g,side in itertools.product(sequences,sequences,funcs,funcs,('left','right')):
    check(xs,ys,f,g,side);small+=1
r=random.Random(340034);word=0
for bits in (32,64):
    m=1<<bits
    for nx,ny in itertools.product((0,1,2,7,128),(0,1,2,7,128)):
        for _ in range(40):
            xs=[r.randrange(m) for _ in range(nx)];ys=[r.randrange(m) for _ in range(ny)];seed=r.randrange(m);k=r.randrange(m)
            f=lambda x:((x//k if k else 0)+(x%k if k else 0)+seed)%m
            g=lambda x:((x+k) if x<seed else (x-k))%m
            for side in ('left','right'):check(xs,ys,f,g,side);word+=1
# F32 is represented by complete raw words, preserving NaN payload and signed zero.
# Arbitrary total raw-value functions corroborate projection without arithmetic laws.
fwords=[0,0x80000000,0x3f800000,0x7f800000,0xff800000,0x7fc01234,0x7fa01234]
fsequences=[tuple(xs)for n in range(3)for xs in itertools.product(fwords,repeat=n)]
float_bits=0
for xs,ys,side in itertools.product(fsequences,fsequences,('left','right')):
    check(xs,ys,lambda x:x^0x80000000,lambda x:x,side);float_bits+=1
bseq=[tuple(xs)for n in range(4)for xs in itertools.product((False,True),repeat=n)]
boolcases=0
for xs,ys,side in itertools.product(bseq,bseq,('left','right')):
    check(xs,ys,lambda x:not x,lambda x:not x,side);boolcases+=1
before=[a+b for a,b in zip([x*x for x in [1,2]],[7,7])]
invalid=[a+b for a,b in zip([1,2],[7,7])]
assert before==[8,11] and invalid==[8,9]
result=dict(status='passed',modulus16_cases=small,word32_word64_cases=word,F32_raw_word_model_cases=float_bits,Bool_cases=boolcases,independent_and_unequal_lists=True,empty_and_singleton=True,all_discarded_values_eagerly_evaluated=True,negative_observed_mapper=dict(xs=[1,2],ys=[7,7],before=before,invalid_after=invalid),negative_map_only=dict(xs=[],ys=[7],correct=[],invalid_after=[7]),scope='Finite model corroboration of one total pure independent-list map-projection mechanism, not proof authority or GPU F32/U64 admission.')
Path(__file__).with_name('map-projection-oracle.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
