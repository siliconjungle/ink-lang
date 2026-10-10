"""Ordered literal corroboration and separately stated modular mathematical oracles."""
import ast,json,hashlib,functools
from pathlib import Path
from spec import TASKS,expressions
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
    e=expressions(t);v=dict(seed=seed,k=k)
    if t['operation']=='zip':
        left=[term(e['left'],dict(v,x=x)) for x in xs] if t['mapped_side'] in ['left','both'] else xs
        right=[term(e['right'],dict(v,y=y)) for y in ys] if t['mapped_side'] in ['right','both'] else ys
        values=[term(e['combine'],dict(v,a=a,b=b)) for a,b in zip(left,right)]
        return [term(e['post'],dict(v,z=z)) for z in values]
    prefix=[term(e['mapper'],dict(v,x=x)) for x in xs]
    suffix=[] if t['pipeline']=='map' else [term(e['mapper'],dict(v,x=x)) for x in ys] if t['pipeline']=='both_map_concat' else list(ys)
    values=prefix+suffix;a=seed
    for x in reversed(values):a=term(e['reducer'],dict(v,x=x,a=a))
    return a

def oracle(t,xs,ys,seed,k):
    alternate=t['cohort']=='heldout'
    if t['operation']=='zip':
        out=[]
        for x,y in zip(xs,ys):
            a=((abs(x-seed) if alternate else 3*x+seed)&MASK) if t['mapped_side'] in ['left','both'] else x
            b=((y*y+k if alternate else y+k)&MASK) if t['mapped_side'] in ['right','both'] else y
            z=((a+b*k if a<seed else a-b) if alternate else a-b*k)&MASK
            out.append((z*k+seed if alternate else z+seed)&MASK)
        return out
    mapping=lambda x:(abs(x-seed) if alternate else 3*x+k)&MASK
    values=[mapping(x) for x in xs]
    if t['pipeline']!='map':values+=([mapping(x) for x in ys] if t['pipeline']=='both_map_concat' else list(ys))
    if alternate:
        a=seed
        for x in reversed(values):a=((x-a) if a<seed else (x+a))&MASK
        return a
    # Independently compose affine steps in forward sequence order. No reassociation
    # premise is used for the accumulator-dependent alternate reducer.
    total=0;power=1
    for x in values:total=(total+power*x)&MASK;power=(power*(k if x<seed else -1))&MASK
    return (total+power*seed)&MASK

def branches(t,xs,ys,seed,k):
    alternate=t['cohort']=='heldout'
    if t['operation']=='zip':
        paired=list(zip(xs,ys));aa=[(abs(x-seed)&MASK if alternate else (3*x+seed)&MASK) if t['mapped_side'] in ['left','both'] else x for x,y in paired]
        bb=[((y*y+k if alternate else y+k)&MASK) if t['mapped_side'] in ['right','both'] else y for x,y in paired]
        return dict(left_raw_below_seed=sum(x<seed for x,y in paired),right_raw_below_seed=sum(y<seed for x,y in paired),left_transformed_below_seed=sum(a<seed for a in aa),right_transformed_below_seed=sum(b<seed for b in bb),gate_true=sum(a<seed for a in aa) if alternate else None,gate_false=sum(a>=seed for a in aa) if alternate else None)
    mapping=lambda x:(abs(x-seed) if alternate else 3*x+k)&MASK
    values=[mapping(x) for x in xs]
    if t['pipeline']!='map':values+=([mapping(x) for x in ys] if t['pipeline']=='both_map_concat' else list(ys))
    a=seed;true=false=0
    for x in reversed(values):
        yes=a<seed if alternate else x<seed;true+=yes;false+=not yes
        a=((x-a if yes else x+a) if alternate else (x+a*k if yes else x-a))&MASK
    return dict(reducer_true=true,reducer_false=false,folded_length=len(values),mapped_prefix_below_seed=sum(mapping(x)<seed for x in xs),suffix_raw_below_seed=sum(x<seed for x in ys),suffix_mapped_below_seed=sum(mapping(x)<seed for x in ys) if t['pipeline']=='both_map_concat' else None)

def observation(v):
    if not isinstance(v,list):return str(v),int(v)
    total=sum(v)&MASK;weighted=sum((i+1)*x for i,x in enumerate(v))&MASK
    return f'array:{len(v)}:{total}:{weighted}',(total+(weighted<<32)+len(v))%(2**64)

def make_fixtures(args):
    donor=json.loads((HERE/'donor-fixtures.json').read_text());lookup={x['id']:x for x in donor['inputs']};inputs=[];cells=[];profiles=[];checks=0
    tasks=[t for t in TASKS if t['name'] in args.cases]
    def add(t,label,xs,ys,seed,k,timed=False,provenance=None):
        nonlocal checks
        expected=oracle(t,xs,ys,seed,k)
        if literal(t,xs,ys,seed,k)!=expected:raise ValueError('literal/oracle mismatch '+t['name']+'/'+label)
        checks+=len(xs)+len(ys);i=len(inputs)
        inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=ys,seed=seed,factor=k,expected={t['name']:expected},input_provenance=provenance))
        if timed:
            cells.append(dict(case=t['name'],input=i));profiles.append(dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),second_length=len(ys),seed=seed,factor=k,output_count=len(expected) if isinstance(expected,list) else 1,output_distinct=len(set(expected)) if isinstance(expected,list) else None,**branches(t,xs,ys,seed,k)))
    edges=[('both-empty',[],[],MASK,MASK),('left-empty',[],[MASK,1,9],509,7),('right-empty',[0,MASK,2**31],[],509,7),('singleton',[MASK],[1],1,7),('shorter-left',[0,1,MASK],[7,0,2**31,MASK,1],MASK-1,MASK-2),('shorter-right',[0,1,MASK,MASK-1,2**31],[MASK,7],2**31,2**31+1),('zero-factor',[0,1,MASK],[MASK,0,7,9],0,0)]
    for t in tasks:
        for edge in edges:add(t,*edge)
        for distribution in ['small','full']:
            for n in args.sizes:
                a=lookup[f'accepted_total/{distribution}-{n}'];b=lookup[f'calibrated_accepted_total/{distribution}-{n}'];xs=a['xs'];ys=b['xs']
                if t['cohort']=='heldout':xs,ys=ys,xs
                seed=(256 if distribution=='small' else 0x40000001) if t['operation']=='zip' and t['cohort']=='heldout' else (512 if distribution=='small' else 0x9e3779b9)
                add(t,f'{distribution}-{n}',xs,ys,seed,7 if distribution=='small' else MASK-2,True,dict(donor_xs=b['id'] if t['cohort']=='heldout' else a['id'],donor_ys=a['id'] if t['cohort']=='heldout' else b['id'],source='Exact independent archived round15 raw arrays; scalar profiles preset separately.'))
    return dict(schema=2,cases=[t['name'] for t in tasks],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,donor_fixture_sha256=hashlib.sha256((HERE/'donor-fixtures.json').read_bytes()).hexdigest(),parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),scope='Independent paired-list vectors and ordered concatenated folds; discovery and alternate callback instantiations, not an external corpus. Exact archived donor arrays reused with preset scalar thresholds. Full snapshot of both ABI lists, Wasm ingress, result conversion and output consumption. Original eager stages and strong fused experts, reusable expert vector scratch. Borrowed JS and native resident/snapshot remain separate. Every complete output checked; all GPU fixture requests record actual/fallback and counters, only actual eligible GPU timed. No broad language or SIMD ranking.')
