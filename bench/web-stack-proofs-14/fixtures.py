"""Independent expectation and eager-stage corroboration; no timing data inputs."""
import ast, random
from spec import TASKS, MAPPERS
MASK=2**32-1

def mapped(name,x,seed,k):
    # Independently stated mathematical recipes; wrapping gates retain word values.
    if name=='identity':return x
    if name=='maximum':return max(x,seed)
    if name=='minimum':return min(x,k)
    if name=='calibration':return (3*x+k)&MASK
    if name=='distance':return abs(x-seed)&MASK
    if name=='offset_gate':return (x+k if x<seed else x-k)&MASK
    if name=='head_piecewise':return (x*k if x<seed else x+seed)&MASK
    if name=='head_clamp':return max(x,seed)*k&MASK
    raise ValueError(name)

def eager_map(name,x,seed,k):
    def go(n):
        if isinstance(n,ast.Name):return dict(x=x,seed=seed,k=k)[n.id]
        if isinstance(n,ast.Constant):return n.value
        if isinstance(n,ast.Compare):
            a,b=go(n.left),go(n.comparators[0]);return a<b if isinstance(n.ops[0],ast.Lt) else a>b
        if isinstance(n,ast.Call):return go(n.args[1]) if go(n.args[0]) else go(n.args[2])
        a,b=go(n.left),go(n.right)
        return ({ast.Add:lambda:a+b,ast.Sub:lambda:a-b,ast.Mult:lambda:a*b}[type(n.op)]())&MASK
    return go(ast.parse(MAPPERS[name],mode='eval').body)

def evaluate(t,xs,ys,seed,k,literal=False):
    op=t['operation'];mapper=eager_map if literal else mapped
    if op=='head':
        value=mapper(t['mapper'],xs[0],seed,k) if xs else (seed if t['fallback']=='seed' else k)
        return (value*k if t['offset']=='*k' else value-seed)&MASK
    if op=='concat_head':
        values=xs+ys if literal else None
        first=(values[0] if values else (seed if t['fallback']=='seed' else k)) if literal else (xs[0] if xs else ys[0] if ys else seed if t['fallback']=='seed' else k)
        return (first+(k if t['offset']=='+k' else -seed))&MASK
    if op=='zip_count':
        if literal:
            values=[((a*k+b if a<seed else b-seed) if t['combiner']=='piecewise' else (a*k-seed if a==b else b+seed))&MASK for a,b in zip(xs,xs)]
            return str(len(values))
        return str(len(xs))
    values=[mapper(t.get('mapper','identity'),x,seed,k) for x in xs] if 'map' in t['pipeline'] else list(xs)
    if 'filter' in t['pipeline']:values=[x for x in values if (x<seed if t['predicate']=='below' else x>seed)]
    if op=='vector':return values
    if op=='sum':return sum(values)&MASK
    if literal:
        a=seed
        for x in reversed(values):a=(x+a*k)&MASK
        return a
    # Forward positional polynomial differs from source reverse recurrence.
    total=0;power=1
    for x in values:total=(total+x*power)&MASK;power=power*k&MASK
    return (total+seed*power)&MASK

def observation(v):
    if not isinstance(v,list):return str(v),int(v)
    total=sum(v)&MASK;weighted=sum((i+1)*x for i,x in enumerate(v))&MASK
    return f'array:{len(v)}:{total}:{weighted}',(total+(weighted<<32)+len(v))%(2**64)

def make_fixtures(args):
    rng=random.Random(args.seed);inputs=[];cells=[];checks=0;profiles=[]
    tasks=[t for t in TASKS if t['name'] in args.cases]
    def add(t,label,xs,ys,seed,k,timed=False):
        nonlocal checks
        if t['list_inputs']==1:ys=[]
        expected=evaluate(t,xs,ys,seed,k)
        if evaluate(t,xs,ys,seed,k,True)!=expected:raise ValueError('literal expectation differs '+t['name'])
        checks+=max(1,len(xs))
        i=len(inputs);inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=ys,seed=seed,factor=k,expected={t['name']:expected}))
        if timed:
            cells.append(dict(case=t['name'],input=i))
            mapped_values=[mapped(t.get('mapper','identity'),x,seed,k) for x in xs]
            below=sum(x<seed for x in mapped_values)
            profiles.append(dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),second_length=len(ys),seed=seed,factor=k,mapped_below=below,mapped_above=sum(x>seed for x in mapped_values),raw_below=sum(x<seed for x in xs),raw_above_k=sum(x>k for x in xs),raw_below_k=sum(x<k for x in xs),expected_distinct=len(set(expected)) if isinstance(expected,list) else None))
    for t in tasks:
        for label,xs,ys,seed,k in [('empty',[],[],MASK,MASK),('tail-only',[],[MASK,1],509,7),('words',[0,1,MASK,MASK-1,2**31],[7,0,2**31],MASK-1,2**31+1),('singleton',[MASK],[1],1,7),('zero-factor',[0,1,MASK],[],0,0),('unit-factor',[1,2,3],[4],2,1),('none-all',[0,1,2],[],MASK,7)]:add(t,label,xs,ys,seed,k)
        for distribution in ['small','full']:
            for n in args.sizes:
                xs=[rng.randrange(1024) if distribution=='small' else rng.getrandbits(32) for _ in range(n)]
                ys=[rng.randrange(2048) if distribution=='small' else rng.getrandbits(32) for _ in range(max(1,n//2+3))]
                # Cutoff and offset are separate captures; fixed map gain3 has median1536.
                seed=(1536 if t.get('mapper')=='calibration' and 'filter' in t.get('pipeline','') else 512) if distribution=='small' else 0x9e3779b9
                k=7 if distribution=='small' else MASK-2
                if t.get('mapper')=='minimum':k=384 if distribution=='small' else 0x60000001
                add(t,f'{distribution}-{n}',xs,ys,seed,k,True)
        if t['list_inputs']==2:
            for n in args.sizes:
                ys=[rng.getrandbits(32) for _ in range(n)]
                add(t,f'tail-{n}',[],ys,0x9e3779b9,MASK-2,True)
    return dict(schema=2,cases=[t['name'] for t in tasks],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,
        parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),
        scope='Twelve scalar pipeline/head/cardinality recipes and two existing-law vector anchors; six discovery and six held-out callback instantiations, not an external held-out corpus. Full calls include one snapshot per used list, Wasm input copies/result conversion, await and checksum consumption; original and expert controls pay identical capture. Direct borrowed JS kernels omit input snapshots for both Ink and expert, with the same async driver/checksum; reported separately. Rust original keeps materialized stages with normal release optimizations; expert is a fused/skipping implementation using preallocated output. Vector expert JS reuses output scratch; all outputs consumed before reuse. Native Rust uses the identical source, compared separately as resident-input kernels with output consumption/arena reset, not as web boundary latency. Scalar u64 count preserves low/high output lanes. Every scalar/vector result is checked exactly against independent forward weighted totals/mathematical recipes and eager source stages. Only actual eligible shaders count as GPU timings, with full upload/dispatch/readback; saved schema1 scalar device counters are instrumented identically across variants and original bytes archived. No artificial repeats, numerical accuracy or broad language-ranking claim.')
