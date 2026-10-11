"""Independent closed expectations versus exact wrapping eager stages."""
import ast,json,random
from pathlib import Path
from spec import TASKS,MAPPERS,predicate
MASK=2**32-1

def mapped(name,x,seed,k):
    if name=='identity':return x
    if name=='calibration':return (3*x+k)&MASK
    if name=='distance':return abs(x-seed)&MASK
    if name=='distance_k':return abs(x-k)&MASK
    if name=='offset_scale':return ((x+seed)*k)&MASK
    if name=='square_offset':return (x*x+seed)&MASK
    if name=='offset_gate':return (x+k if x<seed else x-k)&MASK
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
def accepted(t,x,seed,k):return x<seed if t['predicate']=='below' else x>k if t['predicate']=='above_k' else x>seed

def evaluate(t,xs,ys,seed,k,literal=False):
    mapper=eager_map if literal else mapped
    if t['operation']=='dual_sum':
        a=sum(mapper(t['mapper'],x,seed,k) for x in xs)
        b=sum(mapper(t['second_mapper'],x,seed,k) for x in xs)
        if literal:a&=MASK;b&=MASK
        return ((a*k+b*seed) if t['combine']=='weighted' else a-b if t['combine']=='subtract' else a+b)&MASK
    if literal:
        values=list(xs)
        for stage in {'map':['map'],'filter':['filter'],'map_filter':['map','filter'],'filter_map':['filter','map']}[t['pipeline']]:
            values=[mapper(t['mapper'],x,seed,k) for x in values] if stage=='map' else [x for x in values if accepted(t,x,seed,k)]
    else:
        values=[]
        for raw in xs:
            x=mapper(t['mapper'],raw,seed,k) if t['pipeline'] in ('map','map_filter') else raw
            if 'filter' in t['pipeline'] and not accepted(t,x,seed,k):continue
            if t['pipeline']=='filter_map':x=mapper(t['mapper'],x,seed,k)
            values.append(x)
    if t['operation']=='sum':return sum(values)&MASK
    if literal:
        a=seed
        for x in reversed(values):a=(x+a*k)&MASK
        return a
    total=0;power=1
    for x in values:total=(total+x*power)&MASK;power=power*k&MASK
    return (total+seed*power)&MASK

def observation(v):return str(v),int(v)
def make_fixtures(args):
    rng=random.Random(args.seed);inputs=[];cells=[];profiles=[];checks=0
    tasks=[t for t in TASKS if t['name'] in args.cases]
    def add(t,label,xs,seed,k,timed=False,archived_expected=None):
        nonlocal checks
        expected=evaluate(t,xs,[],seed,k)
        if evaluate(t,xs,[],seed,k,True)!=expected:raise ValueError('ordered source and oracle differ '+t['name'])
        if archived_expected is not None and archived_expected!=expected:raise ValueError('round14 anchor value differs')
        checks+=max(1,len(xs));i=len(inputs)
        inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=[],seed=seed,factor=k,expected={t['name']:expected}))
        if timed:
            cells.append(dict(case=t['name'],input=i))
            tested=[mapped(t['mapper'],x,seed,k) for x in xs] if t.get('pipeline')=='map_filter' else xs
            accept=sum(accepted(t,x,seed,k) for x in tested) if 'filter' in t.get('pipeline','') else None
            profiles.append(dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),second_length=0,seed=seed,factor=k,accepted_count=accept,rejected_count=None if accept is None else len(xs)-accept,source='exact-round14-fixture' if t['cohort']=='anchor' else 'preset-round15-generator'))
    anchor_file=Path(__file__).resolve().parents[2]/'reports/web-stack-proofs-14-2026-10-10/fixtures.json'
    archived=json.loads(anchor_file.read_text())
    old_timed={archived['inputs'][c['input']]['id'] for c in archived['cells']}
    for t in tasks:
        if t['cohort']=='anchor':
            for x in archived['inputs']:
                if x['case']==t['original_name']:
                    timed=x['id'] in old_timed and len(x['xs']) in args.sizes
                    add(t,x['id'].split('/',1)[1],x['xs'],x['seed'],x['factor'],timed,x['expected'][t['original_name']])
            continue
        for label,xs,seed,k in [('empty',[],MASK,MASK),('words',[0,1,MASK,MASK-1,2**31],MASK-1,2**31+1),('singleton',[MASK],1,7),('zero-factor',[0,1,MASK],0,0),('unit-factor',[1,2,3],2,1),('none',[0,1,2],0,MASK),('all',[1,2,3],MASK,0)]:add(t,label,xs,seed,k)
        for distribution in ['small','full']:
            for n in args.sizes:
                xs=[rng.randrange(1024) if distribution=='small' else rng.getrandbits(32) for _ in range(n)]
                seed=(1536 if t.get('pipeline')=='map_filter' and t['mapper']=='calibration' else 512) if distribution=='small' else 0x9e3779b9
                k=7 if distribution=='small' else MASK-2
                if t.get('predicate')=='above_k':k=384 if distribution=='small' else 0x60000001
                add(t,f'{distribution}-{n}',xs,seed,k,True)
    return dict(schema=2,cases=[t['name'] for t in tasks],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),scope='Twelve wrappingU32 predicated/multi-consumer recipes and six archived ABI-regression anchors. Six discovery and six preset held-out callback instantiations are not an external corpus. Anchors copy exact round14 arrays/scalars/results. Same external cost model applies to prior/current candidates. Full calls include one input snapshot, Wasm copy/result conversion, await and checksum. Borrowed checked/expertJS excludes snapshots equally and is reported separately. Original controls retain eager source stages; expert controls fuse traversal with independent accumulators when appropriate. Native Rust uses identical source; resident/snapshot kernels separately timed. ActualGPU counters cover uploads/dispatches/readback; fallbacks never timed asGPU. No synthetic repetitions, F32 reassociation, native memory measurement or general language superiority claim.')
