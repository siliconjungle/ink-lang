"""Independent finite corroboration; not kernel proof authority."""
import itertools, json, random, struct
from pathlib import Path

def scan(xs, z, modulus):
    result=[]
    for x in xs:
        z=(z+x)%modulus
        result.append(z)
    return result

def check(xs,k,z,modulus):
    scaled=scan([x*k%modulus for x in xs],z*k%modulus,modulus)
    reference=[p*k%modulus for p in scan(xs,z,modulus)]
    assert scaled==reference
    zero_left=[(p*k-q)%modulus for p,q in zip(scan(xs,z,modulus),scaled)]
    zero_right=[(q-p*k)%modulus for p,q in zip(scan(xs,z,modulus),scaled)]
    assert zero_left==zero_right==[0]*len(xs)

count=0
for n in range(4):
    for xs in itertools.product(range(16),repeat=n):
        for k in range(16):
            for z in range(16):
                check(xs,k,z,16);count+=1
r=random.Random(330033)
word_cases=0
for bits in (32,64):
    modulus=1<<bits
    extrema=[0,1,2,modulus//2-1,modulus//2,modulus-2,modulus-1]
    for n in (0,1,2,3,7,128):
        for k in extrema:
            for z in extrema:
                xs=[extrema[i%len(extrema)] for i in range(n)]
                check(xs,k,z,modulus);word_cases+=1
        for _ in range(500):
            check([r.randrange(modulus) for _ in range(n)],r.randrange(modulus),r.randrange(modulus),modulus);word_cases+=1
f32=lambda x:struct.unpack('<f',struct.pack('<f',x))[0]
fscan=lambda xs:scan_float(xs)
def scan_float(xs):
    z=f32(0);out=[]
    for x in xs:z=f32(z+x);out.append(z)
    return out
float_counterexample=None
for xs in itertools.product((f32(1),f32(2**24),f32(-2**24),f32(.1),f32(3)),repeat=3):
    for k in (f32(.1),f32(3),f32(1.5)):
        left=scan_float([f32(x*k) for x in xs]);right=[f32(p*k) for p in scan_float(xs)]
        if left!=right:float_counterexample=dict(xs=xs,k=k,scan_after_scale=left,scale_after_scan=right);break
    if float_counterexample:break
assert float_counterexample is not None
result=dict(schema=1,status='finite_corrobation_passed',modulus16_generalized_cases=count,word32_word64_cases=word_cases,signed32_coverage='same modulo2^32 bit identities',empty_singleton_and_nonzero_initial=True,float_counterexample=float_counterexample,authority='finite oracle only; does not replace locally checked induction proof',invalid_unscaled_start_counterexample=dict(xs=[1],k=2,z=3,left_unscaled_start=5,right_scaled_start=8))
Path(__file__).with_name('scout-oracle.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
