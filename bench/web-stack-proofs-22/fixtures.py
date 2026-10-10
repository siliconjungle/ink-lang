"""Materialized original stages and independent wrapped guard/indexed-pair goldens."""
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
        left=[term(t['left'],env(x,i)) for i,x in enumerate(xs)] if t['left_indexed'] else list(xs)
        right=[term(t['right'],env(x,i)) for i,x in enumerate(xs)] if t['right_indexed'] else list(xs)
        return [term(t['combine'],dict(a=a,b=b,seed=seed,k=k)) for a,b in zip(left,right)]
    mapped=[]
    for x in xs:
        v=env(x);c=term(t['guard'],v);f=term(t['positive'],v) if c else 0 if t['operation']!='same_choice' else term(t['negative'],v)
        c_again=term(t['guard'],v)
        if t['operation']=='same_choice':other=term(t['extra_positive'],v) if c_again else term(t['extra_negative'],v)
        else:other=0 if c_again else term(t['negative'],v)
        mapped.append((f-other if t['operation']=='subtract' else f+other)&MASK)
    total=0
    for value in mapped:total=(total+value)&MASK
    return total

def oracle(t,xs,ys,seed,k):
    held=t['cohort']=='heldout';out=[];total=0
    def div(a,b,z):return a//b if b else z
    for index,x in enumerate(xs):
        if t['output']=='list_u32':
            i=index&MASK
            if held:
                a=(x if x>k else seed) if i%3==0 else (x+k)&MASK
                b=(seed-x)&MASK if i%2==0 else (x*3)&MASK
            else:
                a=(x+k)&MASK if i%2==0 else (x-seed)&MASK
                b=(x*3+k)&MASK if i%3==0 else (x+seed)&MASK
            if not t['left_indexed']:a=x
            if not t['right_indexed']:b=x
            out.append((a*b+seed if a>b else a+b*k)&MASK if held else (a+b*k if a<b else a-b*k)&MASK)
        else:
            if held:
                enabled=div((x*k+seed)&MASK,seed,k)>k
                f=abs(x-seed)*3
                g=div((x+seed)&MASK,k,seed)
                d=div((x*k)&MASK,k,seed);e=(x+k)&MASK
            else:
                enabled=div((x+seed)&MASK,k,k)<seed
                f=div((x*k+seed)&MASK,seed,k)
                g=abs(x-k)+seed
                d=(x+seed)&MASK;e=div((x+seed)&MASK,k,seed)
            value=(f+d if enabled else g+e) if t['operation']=='same_choice' else f if enabled else -g if t['operation']=='subtract' else g
            total+=value
    return out if t['output']=='list_u32' else total&MASK

def branch_profiles(t,xs,seed,k):
    held=t['cohort']=='heldout';env=lambda x,i=0:dict(x=x,i=i&MASK,seed=seed,k=k)
    if t['output']=='u32':
        selected=[x for x in xs if term(t['guard'],env(x))];other=[x for x in xs if not term(t['guard'],env(x))]
        return dict(guard_true=len(selected),guard_false=len(other),selected_positive_mapper_true=sum(x>seed for x in selected) if held else None,selected_positive_mapper_false=sum(x<=seed for x in selected) if held else None,selected_negative_mapper_true=sum(x<k for x in other) if not held else None,selected_negative_mapper_false=sum(x>=k for x in other) if not held else None,guard_divisor_zero=seed==0 if held else k==0,positive_divisor_zero=seed==0 if not held else None,negative_divisor_zero=k==0 if held else None)
    left=[term(t['left'],env(x,i)) for i,x in enumerate(xs)] if t['left_indexed'] else xs
    right=[term(t['right'],env(x,i)) for i,x in enumerate(xs)] if t['right_indexed'] else xs
    gate=sum(a>b if held else a<b for a,b in zip(left,right))
    period_left=3 if held else 2;period_right=2 if held else 3
    return dict(left_index_true=sum((i&MASK)%period_left==0 for i in range(len(xs))) if t['left_indexed'] else None,left_index_false=sum((i&MASK)%period_left!=0 for i in range(len(xs))) if t['left_indexed'] else None,right_index_true=sum((i&MASK)%period_right==0 for i in range(len(xs))) if t['right_indexed'] else None,right_index_false=sum((i&MASK)%period_right!=0 for i in range(len(xs))) if t['right_indexed'] else None,left_value_true=sum(x>k and (i&MASK)%3==0 for i,x in enumerate(xs)) if held and t['left_indexed'] else None,left_value_false=sum(x<=k and (i&MASK)%3==0 for i,x in enumerate(xs)) if held and t['left_indexed'] else None,mapped_combine_true=gate,mapped_combine_false=len(xs)-gate,combine_uses='mapped operands, or original x for the untransformed side',left_index_period=period_left if t['left_indexed'] else None,right_index_period=period_right if t['right_indexed'] else None)

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
                if t['output']=='u32':
                    slot=[32,4096,65536].index(n);k=[2,3,5][slot];seed=([512,256,128] if distribution=='small' else [0x40000001,0x20000001,0x10000001])[slot]
                provenance=dict(donor_xs=row['id'],before_xs_sha256=word_sha(row['xs']),after_xs_sha256=word_sha(xs),encoding='little-endian U32 words',modification='none; scalar divisor/cutoff presets vary by size to exercise quotient guard branches; vectors retain21 parameter presets')
                add(t,f'{distribution}-{n}',xs,seed,k,True,provenance)
    return dict(schema=2,cases=[t['name'] for t in TASKS if t['name'] in args.cases],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,donor_fixture_sha256=hashlib.sha256((HERE/'donor-fixtures.json').read_bytes()).hexdigest(),parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),scope='Six pointwise guard-merger scalars and six indexed mapped self-zip vectors. Source stages and independently expressed word goldens corroborate all complete outputs. Strong experts fuse one traversal, compute repeated scalar guards once, reuse a valid common quotient, and evaluate each mapped operand once. Indexed operators start at0 with wrapping U32 indices. Guard divisors2/3/5 and corresponding cutoffs vary with size by pre-timing preset: no size-only scaling inference. Top-level guard coverage is recorded; inner callback and mapped-combine gates may be one-sided. Full single-list captures/output consumption/transfers are timed; borrowed JS/native resident separate. Eligibility and fallback are actual manifest/evidence facts. Preset instantiations are not an external corpus or general language ranking.')
