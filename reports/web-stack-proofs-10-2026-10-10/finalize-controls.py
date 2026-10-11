from pathlib import Path
root=Path(__file__).resolve().parents[2];p=Path(__file__).resolve().parent;assets=root/'bench/web-stack-proofs-10'
g=p/'generate-controls.py';s=g.read_text();start=s.index("jscollect='''");end=s.index("(assets/'literal.mjs')",start)
s=s[:start]+"jscollect=''' nested_left_route:(xs,seed,k)=>zip(zip(xs,xs,(a,b)=>add(a,mul(b,k))),xs,(a,b)=>sub(a,mul(b,seed))).map(x=>add(x,seed)),\n nested_right_route:(xs,seed,k)=>zip(xs,zip(xs,xs,(a,b)=>add(a,mul(b,k))),(a,b)=>sub(mul(a,seed),b)).map(x=>x<seed?mul(x,k):add(x,seed)),\n multiplicative_pair:(xs,seed,k)=>zip(Array.from(xs,x=>add(mul(x,k),seed)),Array.from(xs,x=>sub(mul(x,k),seed)),(a,b)=>mul(a,b)).map(x=>add(x,seed))'''\n"+s[end:]
start=s.index("rustcollect='''");end=s.index("(assets/'literal.rs')",start)
s=s[:start]+"rustcollect='''  3=>{let inner:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|a.wrapping_add(b.wrapping_mul(k))).collect();let outer:Vec<u32>=inner.iter().zip(xs.iter()).map(|(&a,&b)|a.wrapping_sub(b.wrapping_mul(seed))).collect();for(j,&x)in outer.iter().enumerate(){*out.add(j)=x.wrapping_add(seed);}len},\n  4=>{let inner:Vec<u32>=xs.iter().zip(xs.iter()).map(|(&a,&b)|a.wrapping_add(b.wrapping_mul(k))).collect();let outer:Vec<u32>=xs.iter().zip(inner.iter()).map(|(&a,&b)|a.wrapping_mul(seed).wrapping_sub(b)).collect();for(j,&x)in outer.iter().enumerate(){*out.add(j)=if x<seed{x.wrapping_mul(k)}else{x.wrapping_add(seed)};}len},\n  5=>{let left:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k).wrapping_add(seed)).collect();let right:Vec<u32>=xs.iter().map(|&x|x.wrapping_mul(k).wrapping_sub(seed)).collect();let zipped:Vec<u32>=left.iter().zip(right.iter()).map(|(&a,&b)|a.wrapping_mul(b)).collect();for(j,&x)in zipped.iter().enumerate(){*out.add(j)=x.wrapping_add(seed);}len},\n'''\n"+s[end:];g.write_text(s)
h=root/'bench/web-stack-proofs-10.py';s=h.read_text();start=s.index("    if name=='mapped_difference':");end=s.index('\ndef observation',start)
s=s[:start]+'''    if name=='nested_left_route':
        inner=[add(a,mul(b,k)) for a,b in zip(xs,xs)]
        outer=[sub(a,mul(b,seed)) for a,b in zip(inner,xs)]
        return [add(x,seed) for x in outer]
    if name=='nested_right_route':
        inner=[add(a,mul(b,k)) for a,b in zip(xs,xs)]
        outer=[sub(mul(a,seed),b) for a,b in zip(xs,inner)]
        return [mul(x,k) if x<seed else add(x,seed) for x in outer]
    if name=='multiplicative_pair':
        left=[add(mul(x,k),seed) for x in xs]
        right=[sub(mul(x,k),seed) for x in xs]
        zipped=[mul(a,b) for a,b in zip(left,right)]
        return [add(x,seed) for x in zipped]
    raise ValueError(name)

def oracle(name,xs,seed,k):
    # Independent unbounded even-binomial expansion and algebraic closed forms.
    if name in STENCILS:
        n=STENCILS[name]
        return [(seed+sum(2*math.comb(n,j)*x**(n-j)*k**j for j in range(2,n+1,2)))&MASK for x in xs]
    if name=='nested_left_route':return [(x*(1+k-seed)+seed)&MASK for x in xs]
    if name=='nested_right_route':
        routed=[x*(seed-1-k)&MASK for x in xs]
        return [(r*k if r<seed else r+seed)&MASK for r in routed]
    if name=='multiplicative_pair':return [(x*x*k*k-seed*seed+seed)&MASK for x in xs]
    raise ValueError(name)
''' +s[end:]
s=s.replace("'mapped_difference', 'paired_complement', 'padded_prefix'","'nested_left_route', 'nested_right_route', 'multiplicative_pair'").replace('map/zip/concat/postmap collection stages','nested zip/map/postmap collection stages');h.write_text(s)
p=assets/'runner.mjs';s=p.read_text().replace("'mapped_difference', 'paired_complement', 'padded_prefix'","'nested_left_route', 'nested_right_route', 'multiplicative_pair'");p.write_text(s)
