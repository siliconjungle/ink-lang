"""Ordered eager literal stages and separately expressed compact mathematical goldens."""
import ast,json,hashlib,functools,struct
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
        if isinstance(n,ast.Call):
            if n.func.id=='quot_or':
                a,b,z=map(go,n.args);return a//b if b else z
            return go(n.args[1]) if go(n.args[0]) else go(n.args[2])
        a,b=go(n.left),go(n.right)
        return ({ast.Add:lambda:a+b,ast.Sub:lambda:a-b,ast.Mult:lambda:a*b}[type(n.op)]())&MASK
    return go(parsed(text))
def literal(t,xs,ys,seed,k):
    op=t['operation'];env=dict(seed=seed,k=k)
    if op=='gate_sum':
        mapped=[term(t['mapper'],dict(env,x=x)) if term(t['gate'],env) else 0 for x in xs];a=0
        for x in mapped:a=(a+x)&MASK
        return a
    if op=='gate_count':return str(len([x for x in xs if term(t['gate'],env) and term(t['predicate'],dict(env,x=x))]))
    if op=='gate_fold':
        a=seed
        for x in reversed(xs):
            if term(t['gate'],env):a=term(t['reducer'],dict(env,x=x,a=a))
        return a
    zipped=[term(t['combine'],dict(env,a=a,b=b)) for a,b in zip(xs,xs if op=='zip_fold' else ys)]
    if op=='zip_map':return [term(t['postmap'],dict(env,v=v)) for v in zipped]
    acc=seed
    for v in reversed(zipped):acc=term(t['reducer'],dict(env,v=v,acc=acc))
    return acc

def oracle(t,xs,ys,seed,k):
    op=t['operation'];alternate=t['cohort']=='heldout'
    enabled=seed==k if alternate else seed<k
    if op=='gate_sum':return (sum((((x+seed)&MASK)//k if k else seed) for x in xs)&MASK) if enabled else 0
    if op=='gate_count':return str(sum(x<seed for x in xs) if enabled else 0)
    if op=='gate_fold':
        a=seed
        if enabled:
            for x in reversed(xs):a=((a+x*seed if x<k else a-x*k) if alternate else ((x+seed)&MASK)*((a+k)&MASK))&MASK
        return a
    if op=='zip_map':
        out=[]
        for a,b in zip(xs,ys):
            if not alternate:
                v=(a+b*k if a<seed else a-b*k)&MASK;out.append((v-seed if v>k else v+seed)&MASK)
            else:
                v=abs(a-b);out.append((v*k if v<seed else v+seed)&MASK)
        return out
    acc=seed
    for x in reversed(xs):
        if not alternate:
            v=(x+x*k if x<seed else x-x*k)&MASK;acc=(v-acc if acc<seed else v+acc*k)&MASK
        else:
            v=(x*x+seed if x>k else x+x*k)&MASK;acc=(v+acc*k if v<seed else v-acc)&MASK
    return acc

def branches(t,xs,ys,seed,k):
    op=t['operation'];env=dict(seed=seed,k=k);r={}
    if t['gated']:r['feature_enabled']=bool(term(t['gate'],env))
    if op=='gate_count':r.update(predicate_true=sum(x<seed for x in xs),predicate_false=sum(x>=seed for x in xs))
    if op=='gate_fold' and t['cohort']=='heldout':r.update(element_gate_true=sum(x<k for x in xs),element_gate_false=sum(x>=k for x in xs))
    if op in ['zip_fold','zip_map']:
        paired=list(zip(xs,xs if op=='zip_fold' else ys));key='a>b' if t['cohort']=='heldout' and op=='zip_map' else 'a>k' if t['cohort']=='heldout' else 'a<seed'
        true=sum(term(key,dict(env,a=a,b=b)) for a,b in paired);r.update(combiner_true=true,combiner_false=len(paired)-true)
        if op=='zip_map':
            values=[term(t['combine'],dict(env,a=a,b=b)) for a,b in paired];true=sum(term('v<seed' if t['cohort']=='heldout' else 'v>k',dict(env,v=v)) for v in values)
            r.update(postmap_true=true,postmap_false=len(values)-true)
        else:
            acc=seed;true=0
            for a,b in reversed(paired):
                v=term(t['combine'],dict(env,a=a,b=b));true+=term('v<seed' if t['cohort']=='heldout' else 'acc<seed',dict(env,v=v,acc=acc));acc=term(t['reducer'],dict(env,v=v,acc=acc))
            r.update(ordered_reducer_true=true,ordered_reducer_false=len(paired)-true)
    return r

def observation(v):
    if not isinstance(v,list):return str(v),int(v)
    total=sum(v)&MASK;weighted=sum((i+1)*x for i,x in enumerate(v))&MASK
    return f'array:{len(v)}:{total}:{weighted}',(total+(weighted<<32)+len(v))%(2**64)
def word_sha(xs):return hashlib.sha256(b''.join(struct.pack('<I',x) for x in xs)).hexdigest()
def make_fixtures(args):
    donor=json.loads((HERE/'donor-fixtures.json').read_text());lookup={x['id']:x for x in donor['inputs']};inputs=[];cells=[];profiles=[];checks=0
    def add(t,label,xs,ys,seed,k,timed=False,provenance=None):
        nonlocal checks
        expected=oracle(t,xs,ys,seed,k)
        if literal(t,xs,ys,seed,k)!=expected:raise ValueError('literal/oracle mismatch '+t['name']+'/'+label)
        checks+=len(xs)+(len(ys) if t['list_inputs']==2 else 0);i=len(inputs)
        inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=ys,seed=seed,factor=k,expected={t['name']:expected},input_provenance=provenance,feature_enabled=bool(term(t['gate'],dict(seed=seed,k=k))) if t['gated'] else None))
        if timed:
            cells.append(dict(case=t['name'],input=i));profiles.append(dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),second_length=len(ys),declared_list_inputs=t['list_inputs'],seed=seed,factor=k,output_count=len(expected) if isinstance(expected,list) else 1,output_words=len(expected) if isinstance(expected,list) else 2 if t['output']=='u64' else 1,output_distinct=len(set(expected)) if isinstance(expected,list) else None,**branches(t,xs,ys,seed,k)))
    for t in TASKS:
        if t['name'] not in args.cases:continue
        edges=[('empty',[],[],509,7),('singleton',[MASK],[0],1,7),('extrema',[0,1,MASK,MASK-1,2**31],[MASK,1,0,2**31,MASK-1],2**31,2**31+1),('zero-factor',[0,1,MASK],[1,MASK,0],0,0),('equal-parameters',[0,9,MASK],[9,0,MASK],9,9),('all-below',[0,1,8,9],[9,8,1,0],509,510),('all-above',[510,511,MASK],[MASK,511,510],509,7)]
        if t['list_inputs']==2:edges[4:]=[('empty-left',[],[0,9,MASK],9,9),('empty-right',[0,9,MASK],[],509,7),('unequal-lengths',[0,9,MASK,2**31],[MASK,1],509,7)]
        for edge in edges:add(t,*edge)
        for distribution in ['small','full']:
            for n in args.sizes:
                row=lookup['accepted_total'+f'/{distribution}-{n}'];xs=list(row['xs']);other=lookup['calibrated_accepted_total'+f'/{distribution}-{n}'];ys=list(other['xs'][:n-(max(1,n//8) if distribution=='full' else 0)]) if t['list_inputs']==2 else []
                seed=512 if distribution=='small' else 0x9e3779b9
                modes=[True,False] if t['gated'] else [None]
                for enabled in modes:
                    k=(seed if enabled else seed+1) if t.get('gate')=='seed==k' else ((seed+1) if enabled else (7 if distribution=='small' else seed-1)) if t['gated'] else (seed//2 if t['operation'] in ['zip_fold','zip_map'] else 7)
                    # Shorter, independent full-width ys is preset before any performance observations.
                    provenance=dict(donor_xs=row['id'],before_xs_sha256=word_sha(row['xs']),after_xs_sha256=word_sha(xs),donor_ys=other['id'] if ys else None,before_ys_sha256=word_sha(other['xs']) if ys else None,after_ys_sha256=word_sha(ys),encoding='little-endian u32 words',modification='xs unchanged; independent ys full distribution truncated by floor(N/8), small distribution unchanged; enabled/disabled scalar presets')
                    label=('enabled-' if enabled else 'disabled-') if enabled is not None else ''
                    add(t,label+f'{distribution}-{n}',xs,ys,seed,k,True,provenance)
    return dict(schema=2,cases=[t['name'] for t in TASKS if t['name'] in args.cases],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,donor_fixture_sha256=hashlib.sha256((HERE/'donor-fixtures.json').read_bytes()).hexdigest(),parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),scope='Four captured-control reductions each with enabled/disabled cells in both distributions; two same-source ordered zip folds; two independent-array zip/postmap consumers with unequal full-width lengths. Original stages preserve per-element captured gates, materialized zip/maps, and right-fold order. Experts already unswitch/fuse and reuse vector scratch; current flags never excuse declared input capture. Exact U64 count output, U32 wrapping arithmetic, complete output consumption, actual GPU vs fallback separated. Preset callback instantiations are not an external corpus or general language ranking.')
