"""Materialized original stages and independent wrapped classifier/channel goldens."""
import ast,json,hashlib,functools,struct
from pathlib import Path
from spec import TASKS
MASK=2**32-1;HERE=Path(__file__).resolve().parent
@functools.lru_cache(None)
def parsed(text):return ast.parse(text,mode='eval').body
def term(text,values):
    def go(n):
        if isinstance(n,ast.Name):return values[n.id]
        if isinstance(n,ast.Constant):return n.value
        if isinstance(n,ast.Compare):
            a,b=go(n.left),go(n.comparators[0]);return a<b if isinstance(n.ops[0],ast.Lt) else a>b if isinstance(n.ops[0],ast.Gt) else a==b
        if isinstance(n,ast.Call):
            if n.func.id in ['quot_or','rem_or']:
                a,b,z=map(go,n.args);return (a//b if n.func.id=='quot_or' else a%b) if b else z
            return go(n.args[1]) if go(n.args[0]) else go(n.args[2])
        a,b=go(n.left),go(n.right);return ({ast.Add:lambda:a+b,ast.Sub:lambda:a-b,ast.Mult:lambda:a*b}[type(n.op)]())&MASK
    return go(parsed(text))
def literal(t,xs,ys,seed,k):
    env=lambda x,i=0:dict(x=x,i=i&MASK,seed=seed,k=k)
    if t['output']=='list_u32':
        first=[term(t['first'],env(x,i)) for i,x in enumerate(xs)]
        return [term(t['second'],env(x,i)) for i,x in enumerate(first)]
    positive=[x for x in xs if term(t['predicate'],env(x))];mapped=[term(t['positive'],env(x)) for x in positive];a=0
    for value in mapped:a=(a+value)&MASK
    negative=[x for x in xs if not term(t['predicate'],env(x))];mapped=[term(t['negative'],env(x)) for x in negative];b=0
    for value in mapped:b=(b+value)&MASK
    return (a+b if t['operation']=='add' else a-b if t['operation']=='subtract' else a*k+b*3)&MASK

def oracle(t,xs,ys,seed,k):
    heldout=t['cohort']=='heldout'
    if t['output']=='list_u32':
        out=[]
        for index,x in enumerate(xs):
            i=index&MASK
            if t['operation']=='map_indexed':v=(x-seed if x>k else seed-x) if heldout else (x+k if x<seed else x-k)
            else:v=x+k if i%2==0 else x-seed
            v&=MASK
            if t['operation']=='indexed_map':value=(v-seed if v>k else seed-v) if heldout else (v+k if v<seed else v-k)
            else:value=v*k if i%(3 if heldout else 2)==0 else v+seed
            out.append(value&MASK)
        return out
    total=0
    for x in xs:
        selected=x>k if heldout else x<seed
        if selected:
            value=abs(x-seed)*3 if heldout else (((x+seed)&MASK)//k if k else seed)
            weight=k if t['operation']=='weighted' else 1
        else:
            value=(((x*k+seed)&MASK)//seed if seed else k) if heldout else abs(x-k)+seed
            weight=3 if t['operation']=='weighted' else -1 if t['operation']=='subtract' else 1
        total+=value*weight
    return total&MASK

def branch_profiles(t,xs,seed,k):
    heldout=t['cohort']=='heldout';env=lambda x,i=0:dict(x=x,i=i&MASK,seed=seed,k=k)
    if t['output']=='u32':
        selected=[x for x in xs if (x>k if heldout else x<seed)];other=[x for x in xs if not (x>k if heldout else x<seed)]
        return dict(predicate_true=len(selected),predicate_false=len(other),positive_mapper_true=sum(x>seed for x in selected) if heldout else None,positive_mapper_false=sum(x<=seed for x in selected) if heldout else None,negative_mapper_true=sum(x<k for x in other) if not heldout else None,negative_mapper_false=sum(x>=k for x in other) if not heldout else None,positive_divisor_zero=k==0 if not heldout else None,negative_divisor_zero=seed==0 if heldout else None)
    first=[term(t['first'],env(x,i)) for i,x in enumerate(xs)]
    first_true=sum((i&MASK)%2==0 for i in range(len(xs))) if t['first_indexed'] else sum(x>k if heldout else x<seed for x in xs)
    second_true=sum((i&MASK)%(3 if heldout else 2)==0 for i in range(len(xs))) if t['second_indexed'] else sum(x>k if heldout else x<seed for x in first)
    return dict(first_stage_true=first_true,first_stage_false=len(xs)-first_true,second_stage_true=second_true,second_stage_false=len(xs)-second_true,second_gate_values='mapped values' if not t['second_indexed'] else 'unchanged U32 positions',first_index_period=2 if t['first_indexed'] else None,second_index_period=(3 if heldout else 2) if t['second_indexed'] else None)

def observation(v):
    if not isinstance(v,list):return str(v),int(v)
    total=sum(v)&MASK;weighted=sum((i+1)*x for i,x in enumerate(v))&MASK
    return f'array:{len(v)}:{total}:{weighted}',(total+(weighted<<32)+len(v))%(2**64)
def word_sha(xs):return hashlib.sha256(b''.join(struct.pack('<I',x) for x in xs)).hexdigest()
def make_fixtures(args):
    donor=json.loads((HERE/'donor-fixtures.json').read_text());lookup={x['id']:x for x in donor['inputs']};inputs=[];cells=[];profiles=[];checks=0
    def add(t,label,xs,seed,k,timed=False,provenance=None):
        nonlocal checks
        expected=oracle(t,xs,[],seed,k)
        if literal(t,xs,[],seed,k)!=expected:raise ValueError('literal/oracle mismatch '+t['name']+'/'+label)
        checks+=len(xs);i=len(inputs);inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=[],seed=seed,factor=k,expected={t['name']:expected},input_provenance=provenance))
        if timed:
            cells.append(dict(case=t['name'],input=i));profiles.append(dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),declared_list_inputs=1,seed=seed,factor=k,output_count=len(expected) if isinstance(expected,list) else 1,output_distinct=len(set(expected)) if isinstance(expected,list) else None,**branch_profiles(t,xs,seed,k)))
    for t in TASKS:
        if t['name'] not in args.cases:continue
        edges=[('empty',[],509,7),('singleton',[MASK],1,7),('extrema',[0,1,MASK,MASK-1,2**31],2**31,2**31+1),('zero-factor',[0,1,MASK,2**31],509,0),('zero-seed',[0,1,MASK,2**31],0,7),('equal-parameters',[0,9,MASK],9,9),('all-below',[0,1,8,9],509,510),('all-above',[510,511,MASK],509,7),('index-period-boundary',[0,1,2,3,4,5,6],509,7)]
        for edge in edges:add(t,*edge)
        for distribution in ['small','full']:
            for n in args.sizes:
                row=lookup[('accepted_total' if t['cohort']=='discovery' else 'calibrated_accepted_total')+f'/{distribution}-{n}'];xs=list(row['xs']);seed=512 if distribution=='small' else 0x9e3779b9
                k=(256 if distribution=='small' else 0x60000001) if t['cohort']=='heldout' else (768 if distribution=='small' else 0xc0000001)
                provenance=dict(donor_xs=row['id'],before_xs_sha256=word_sha(row['xs']),after_xs_sha256=word_sha(xs),encoding='little-endian U32 words',modification='none; scalar thresholds preset before timing to exercise selected callback branches')
                add(t,f'{distribution}-{n}',xs,seed,k,True,provenance)
    return dict(schema=2,cases=[t['name'] for t in TASKS if t['name'] in args.cases],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,donor_fixture_sha256=hashlib.sha256((HERE/'donor-fixtures.json').read_bytes()).hexdigest(),parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),scope='Six distinct-callback complementary-partition scalar reductions and six index-preserving pipeline vector consumers. Original eager stages and independent wrapped goldens corroborate every complete output. Experts already fuse one traversal, evaluate predicates and selected callbacks once, and sink weighted scalar multipliers after two accumulations. Each indexed stage starts at0 and wraps its public index as U32. All declared input capture/output transport/consumption included in full web calls; borrowed JS/native resident views separate. Actual GPU requests/fallback/counters distinguished. Preset primary/alternate callback instantiations are not an external corpus or universal language comparison.')
