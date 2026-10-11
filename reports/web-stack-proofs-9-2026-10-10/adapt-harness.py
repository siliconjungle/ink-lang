from pathlib import Path
p=Path(__file__).resolve().parent;root=p.parents[1];a=root/'bench/web-stack-proofs-9';h=root/'bench/web-stack-proofs-9.py'
s=h.read_text();old="['centered_fourth_moment', 'centered_sixth_moment', 'centered_eighth_moment', 'projected_right', 'projected_left', 'complemented_total']";new="['bernstein_cubic_constant', 'bernstein_quintic_constant', 'bernstein_septic_constant', 'mapped_difference', 'paired_complement', 'padded_prefix']";s=s.replace(old,new)
start=s.index('MOMENTS=');end=s.index('\ndef observation',start)
s=s[:start]+'''BERNSTEIN={'bernstein_cubic_constant':3,'bernstein_quintic_constant':5,'bernstein_septic_constant':7}

def literal(name,xs,seed,k):
    add=lambda a,b:(a+b)&MASK
    sub=lambda a,b:(a-b)&MASK
    mul=lambda a,b:(a*b)&MASK
    if name in BERNSTEIN:
        n=BERNSTEIN[name];out=[]
        for x in xs:
            terms=[]
            for j in range(n+1):
                coefficient=math.comb(n,j)
                factors=([coefficient] if coefficient!=1 else [])+[seed]+[x]*j+[sub(1,x)]*(n-j)
                term=factors[0]
                for factor in factors[1:]:term=mul(term,factor)
                terms.append(term)
            acc=terms[0]
            for term in terms[1:]:acc=add(acc,term)
            out.append(acc)
        return out
    if name=='mapped_difference':
        left=[add(mul(x,x),seed) for x in xs]
        right=[add(mul(x,x),seed) for x in xs]
        zipped=[sub(x,y) for x,y in zip(left,right)]
        return [add(mul(x,k),seed) for x in zipped]
    if name=='paired_complement':
        left=[mul(x,k) for x in xs]
        right=[sub(seed,mul(x,k)) for x in xs]
        zipped=[add(x,y) for x,y in zip(left,right)]
        return [add(mul(x,k),seed) for x in zipped]
    if name=='padded_prefix':
        padded=xs+xs
        zipped=[add(x,y) for x,y in zip(padded,xs)]
        return [add(mul(x,k),seed) for x in zipped]
    raise ValueError(name)

def oracle(name,xs,seed,k):
    # Independent closed forms; all arithmetic interpreted in the wrapping ring.
    if name in BERNSTEIN or name=='mapped_difference':return [seed for _ in xs]
    if name=='paired_complement':return [seed*(k+1)&MASK for _ in xs]
    if name=='padded_prefix':return [(2*x*k+seed)&MASK for x in xs]
    raise ValueError(name)
''' +s[end:]
s=s.replace('Python unbounded modular powers and collection closed forms','Python independent constant/linear closed forms').replace('left-associated expanded moment polynomials','left-associated expanded Bernstein polynomials').replace('distinct map/zip/postmap collection stages','distinct map/zip/concat/postmap collection stages').replace('Timed centers are odd (509 for small words and 0x9e3779b9 for full-width words) to avoid zeroing higher cross terms with powers of two.','Basis words cover arbitrary U32 values; constant controls are 509 and 0x9e3779b9. This is wrapping-ring polynomial algebra, with no probability or floating-point claim.')
h.write_text(s);s=(a/'runner.mjs').read_text().replace(old,new);(a/'runner.mjs').write_text(s)
