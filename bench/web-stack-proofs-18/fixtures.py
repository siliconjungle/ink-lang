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


def projection_literal(t,a,seed,k):
    alt=t['cohort']=='heldout';name=t['name']
    if name.startswith('lower_'):
        bound=k if alt else seed
        return bound if a<bound else a
    if name.startswith('upper_'):
        bound=seed if alt else k
        return bound if a>bound else a
    key=k if alt else seed;replacement=seed if alt else k
    return replacement if a==key else a

def literal(t,xs,ys,seed,k):
    if t['operation']=='sort_reduce':
        mapped=[term(t['expression'],dict(x=x,seed=seed,k=k)) for x in sorted(xs)]
        a=0
        for x in mapped:a=(a+x)&MASK
        return a
    out=[]
    for x in xs:
        a=x
        for _ in range(t['iterations']):a=projection_literal(t,a,seed,k)
        out.append(a)
    return out

def oracle(t,xs,ys,seed,k):
    alt=t['cohort']=='heldout';name=t['name']
    if t['operation']=='sort_reduce':
        if name.startswith('sorted_calibrated_'):values=[((x*k if x<seed else x+k) if alt else 3*x+k) for x in xs]
        elif name.startswith('sorted_squared_'):values=[((x-seed)**2 if alt else x*x+k) for x in xs]
        else:values=[(min(x,seed) if alt else abs(x-seed)) for x in xs]
        return sum(values)&MASK
    if name.startswith('lower_'):return [max(x,k if alt else seed) for x in xs]
    if name.startswith('upper_'):return [min(x,seed if alt else k) for x in xs]
    key=k if alt else seed;replacement=seed if alt else k
    # Mathematical pointwise replacement; replacement is a fixed point evenwhenkey==replacement.
    return [replacement if x==key else x for x in xs]

def branches(t,xs,ys,seed,k):
    alt=t['cohort']=='heldout';name=t['name'];true=false=None
    if t['operation']=='projection':
        if name.startswith('lower_'):true=sum(x<(k if alt else seed) for x in xs)
        elif name.startswith('upper_'):true=sum(x>(seed if alt else k) for x in xs)
        else:true=sum(x==(k if alt else seed) for x in xs)
        false=len(xs)-true
    return dict(callback_true=true,callback_false=false,raw_below_seed=sum(x<seed for x in xs),raw_below_factor=sum(x<k for x in xs),distinct_input=len(set(xs)))

def observation(v):
    if not isinstance(v,list):return str(v),int(v)
    total=sum(v)&MASK;weighted=sum((i+1)*x for i,x in enumerate(v))&MASK
    return f'array:{len(v)}:{total}:{weighted}',(total+(weighted<<32)+len(v))%(2**64)


def word_sha(xs):
    import struct
    return hashlib.sha256(b''.join(struct.pack('<I',x) for x in xs)).hexdigest()
def make_fixtures(args):
    donor=json.loads((HERE/'donor-fixtures.json').read_text());lookup={x['id']:x for x in donor['inputs']};inputs=[];cells=[];profiles=[];checks=0
    tasks=[t for t in TASKS if t['name'] in args.cases]
    def add(t,label,xs,ys,seed,k,timed=False,provenance=None):
        nonlocal checks
        expected=oracle(t,xs,ys,seed,k)
        if literal(t,xs,ys,seed,k)!=expected:raise ValueError('literal/oracle mismatch '+t['name']+'/'+label)
        checks+=len(xs)+len(ys);i=len(inputs)
        inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=ys,seed=seed,factor=k,expected={t['name']:expected},input_provenance=provenance))
        if timed:cells.append(dict(case=t['name'],input=i));profiles.append(dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),second_length=len(ys),declared_list_inputs=t['list_inputs'],seed=seed,factor=k,output_count=len(expected) if isinstance(expected,list) else 1,output_distinct=len(set(expected)) if isinstance(expected,list) else None,iterations=t.get('iterations'),**branches(t,xs,ys,seed,k)))
    for t in tasks:
        edges=[('empty',[],[MASK,0],MASK,MASK),('singleton',[MASK],[],1,7),('extrema',[0,1,MASK,MASK-1,2**31],[7,MASK],2**31,2**31+1),('zero-factor',[0,1,MASK],[MASK,0,7],0,0),('equal-parameters',[0,9,MASK],[1],9,9)]
        if t['operation']=='projection':
            key=7 if t['cohort']=='heldout' else 509
            edges += [('all-key',[key]*5,[MASK],509,7),('no-key',[0,1,8,MASK],[],509,7)]
        else:edges += [('ascending',[0,1,9,509,MASK],[],509,7),('descending',[MASK,509,9,1,0],[],509,7)]
        for edge in edges:add(t,*edge)
        for distribution in ['small','full']:
            for n in args.sizes:
                a=lookup[f'accepted_total/{distribution}-{n}'];b=lookup[f'calibrated_accepted_total/{distribution}-{n}'];raw=a['xs'] if t['cohort']=='discovery' else b['xs'];ys=b['xs'] if t['cohort']=='discovery' else a['xs'];xs=list(raw)
                seed=512 if distribution=='small' else 0x9e3779b9;k=7 if distribution=='small' else MASK-2
                if t['operation']=='projection':
                    if (t['name'].startswith('upper_') and t['cohort']=='discovery') or (t['name'].startswith('lower_') and t['cohort']=='heldout'):k=seed
                    if t['name'].startswith('keyed_'):
                        key=k if t['cohort']=='heldout' else seed
                        for j in range(0,n,16):xs[j]=key
                provenance=dict(donor_xs=a['id'] if t['cohort']=='discovery' else b['id'],donor_ys=b['id'] if t['cohort']=='discovery' else a['id'],before_xs_sha256=word_sha(raw),after_xs_sha256=word_sha(xs),ys_sha256=word_sha(ys),encoding='little-endian u32 words',modification='Every 16th xs word replaced with actual key before timing' if t['name'].startswith('keyed_') else 'none')
                add(t,f'{distribution}-{n}',xs,ys,seed,k,True,provenance)
    return dict(schema=2,cases=[t['name'] for t in tasks],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,donor_fixture_sha256=hashlib.sha256((HERE/'donor-fixtures.json').read_bytes()).hexdigest(),parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),scope='Order-independent unsorted score totals versus original sort/map/sum; repeated idempotent projections versus already-skipping experts. Twelve U32 preset recipes, six primary/six alternate; Natural sort three-argument ABI snapshots xs; projection four-argument ABI snapshots xs/ys including unused ys. All implementations copy only declared list inputs. Fixture ys metadata remains present for the common control adapter. Full calls include Wasm/GPU transport; borrowed JS/native boundaries separate. Counts 8/32/64 frozen; keyed profiles inject one key per16 words with donor before/after hashes. Every complete output checked; actual GPU requests/counters recorded and fallbacks excluded. No broad language or SIMD ranking.')
