"""Literal materialized stages corroborated by independently stated word oracles."""
import ast,json,hashlib,functools
from pathlib import Path
from spec import TASKS
MASK=2**32-1
HERE=Path(__file__).resolve().parent
@functools.lru_cache(None)
def parsed(text):return ast.parse(text,mode='eval').body
def term(text,values):
    def go(n):
        if isinstance(n,ast.Name):return values[n.id]
        if isinstance(n,ast.Constant):return n.value
        if isinstance(n,ast.Compare):
            a,b=go(n.left),go(n.comparators[0]);return a<b if isinstance(n.ops[0],ast.Lt) else a>b if isinstance(n.ops[0],ast.Gt) else a==b
        if isinstance(n,ast.Call):return go(n.args[1]) if go(n.args[0]) else go(n.args[2])
        a,b=go(n.left),go(n.right)
        return ({ast.Add:lambda:a+b,ast.Sub:lambda:a-b,ast.Mult:lambda:a*b}[type(n.op)]())&MASK
    return go(parsed(text))
def literal(t,xs,ys,seed,k):
    env=lambda x:dict(x=x,seed=seed,k=k)
    if t['operation']=='paired':
        left=[term(t['left'],env(x)) for x in xs];right=[term(t['right'],env(x)) for x in xs]
        return [term(t['combine'],dict(a=a,b=b,seed=seed,k=k)) for a,b in zip(left,right)]
    positive=[x for x in xs if term(t['predicate'],env(x))];mapped=[term(t['mapper'],env(x)) for x in positive];a=0
    for x in mapped:a=(a+x)&MASK
    negative=[x for x in xs if not term(t['predicate'],env(x))];mapped=[term(t['mapper'],env(x)) for x in negative];b=0
    for x in mapped:b=(b+x)&MASK
    return (a+b if t['operation']=='recombine' else a-b if t['operation']=='contrast' else a*k+3*b)&MASK
def oracle(t,xs,ys,seed,k):
    alternate=t['cohort']=='heldout'
    if t['operation']=='paired':
        out=[]
        for x in xs:
            if not alternate:
                a,b=(x,k) if x<seed else (k,x)
                value=a+b*k if a<b else a-b*k
            else:
                a,b=(x,seed) if x>k else (seed,x)
                value=a*b+seed if a>b else a+b*k
            out.append(value&MASK)
        return out
    total=0
    for x in xs:
        f=(abs(x-k)+seed) if alternate else (x+7)*(x+seed)
        p=x>seed if alternate else x<seed
        weight=1 if t['operation']=='recombine' else (1 if p else -1) if t['operation']=='contrast' else k if p else 3
        total+=f*weight
    return total&MASK
def branches(t,xs,seed,k):
    alternate=t['cohort']=='heldout'
    if t['operation']=='paired':
        true=sum(x>k if alternate else x<seed for x in xs)
        pairs=[((x,seed) if x>k else (seed,x)) if alternate else ((x,k) if x<seed else (k,x)) for x in xs]
        combine=sum(a>b if alternate else a<b for a,b in pairs)
        return dict(mapper_true=true,mapper_false=len(xs)-true,combiner_true=combine,combiner_false=len(xs)-combine)
    true=sum(x>seed if alternate else x<seed for x in xs)
    return dict(predicate_true=true,predicate_false=len(xs)-true,mapper_true=sum(x<k for x in xs) if alternate else None,mapper_false=sum(x>=k for x in xs) if alternate else None)
def observation(v):
    if not isinstance(v,list):return str(v),int(v)
    total=sum(v)&MASK;weighted=sum((i+1)*x for i,x in enumerate(v))&MASK
    return f'array:{len(v)}:{total}:{weighted}',(total+(weighted<<32)+len(v))%(2**64)
def word_sha(xs):
    import struct
    return hashlib.sha256(b''.join(struct.pack('<I',x) for x in xs)).hexdigest()
def make_fixtures(args):
    donor=json.loads((HERE/'donor-fixtures.json').read_text());lookup={x['id']:x for x in donor['inputs']};inputs=[];cells=[];profiles=[];checks=0
    def add(t,label,xs,ys,seed,k,timed=False,provenance=None):
        nonlocal checks
        expected=oracle(t,xs,ys,seed,k)
        if literal(t,xs,ys,seed,k)!=expected:raise ValueError('literal/oracle mismatch '+t['name']+'/'+label)
        checks+=len(xs);i=len(inputs)
        inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=ys,seed=seed,factor=k,expected={t['name']:expected},input_provenance=provenance))
        if timed:
            cells.append(dict(case=t['name'],input=i));profiles.append(dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),declared_list_inputs=1,seed=seed,factor=k,output_count=len(expected) if isinstance(expected,list) else 1,output_distinct=len(set(expected)) if isinstance(expected,list) else None,**branches(t,xs,seed,k)))
    for t in TASKS:
        if t['name'] not in args.cases:continue
        edges=[('empty',[],[],509,7),('singleton',[MASK],[],1,7),('extrema',[0,1,MASK,MASK-1,2**31],[],2**31,2**31+1),('zero-factor',[0,1,MASK],[],0,0),('equal-parameters',[0,9,MASK],[],9,9),('all-below',[0,1,8,9],[],509,509),('all-above',[510,511,MASK],[],509,509)]
        for edge in edges:add(t,*edge)
        for distribution in ['small','full']:
            for n in args.sizes:
                row=lookup[('accepted_total' if t['cohort']=='discovery' else 'calibrated_accepted_total')+f'/{distribution}-{n}'];xs=list(row['xs'])
                seed=512 if distribution=='small' else 0x9e3779b9;k=7 if distribution=='small' else MASK-2
                # Balance raw gates for paired recipes while retaining distinct mapper/combiner scalar operands.
                if t['operation']=='paired':k=seed//2
                provenance=dict(donor_xs=row['id'],before_xs_sha256=word_sha(row['xs']),after_xs_sha256=word_sha(xs),encoding='little-endian u32 words',modification='none; paired scalar factor preset separately')
                add(t,f'{distribution}-{n}',xs,[],seed,k,True,provenance)
    return dict(schema=2,cases=[t['name'] for t in TASKS if t['name'] in args.cases],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,donor_fixture_sha256=hashlib.sha256((HERE/'donor-fixtures.json').read_bytes()).hexdigest(),parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),scope='Eight U32 traversal-fusion recipes, natural one-list ABI; six complementary partition reductions and two paired-value maps. Primary/alternate callback instantiations frozen before timing, not external corpus. Donor arrays unchanged; paired scalar factor independently preset to exercise both mapper and mapped-combiner branches. Full calls include capture and Wasm/GPU transport/readback; borrowed JS/native resident comparisons separate. Strong weighted expert uses two accumulators and one final weighting. Every complete output checked, actual GPU and fallback recorded distinctly; no broad language ranking.')
