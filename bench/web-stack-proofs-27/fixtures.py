"""Original materialized stages versus independent work-skipping goldens."""
import ast,json,hashlib,functools,struct
from pathlib import Path
from spec import TASKS,CAL,NORM,PRED,STEP
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
 op=t['operation'];env=lambda x:dict(x=x,seed=seed,k=k)
 cal=lambda x:term(CAL,env(x));norm=lambda x:term(NORM,env(x))
 if op=='nested_zip':
  paired=[term(t['combine'],dict(a=a,b=b,seed=seed,k=k)) for a,b in zip(xs,ys)]
  return [term(t['outer'],dict(v=v,x=x,seed=seed,k=k)) for v,x in zip(paired,xs if t['side']=='left' else ys)]
 if op=='helper_map':return [cal(x) for x in xs]
 if op=='helper_indexed':return [norm(cal(x)) if i%2==0 else cal(x) for i,x in enumerate(xs)]
 if op=='helper_filter_map':
  accepted=[x for x in xs if term(PRED,env(x))];return [norm(cal(x)) for x in accepted]
 if op=='helper_fold':
  a=seed
  for x in reversed(xs):a=term(STEP,dict(x=cal(x),a=a,seed=seed,k=k))
  return a
 if op=='helper_zip':return [term('choose(a<b,a+b*k,a-b*k)',dict(a=cal(a),b=norm(b),seed=seed,k=k)) for a,b in zip(xs,ys)]
 out=[]
 for x in xs:
  v=(x+seed)&MASK
  for j in range(16):v=(((v*((k+2*j+1)&MASK))&MASK)+x)&MASK;v=v%4294967291
  out.append(v)
 return out
def oracle(t,xs,ys,seed,k):
 op=t['operation']
 def c(x):return ((x+7)*k if x<seed else x-seed)&MASK
 def n(x):return (x-k if x>k else x+seed)&MASK
 if op=='nested_zip':
  out=[]
  for a,b in zip(xs,ys):
   v=(a+b*k if a<seed else a-b)&MASK;x=a if t['side']=='left' else b
   out.append((v+x*k if v<seed else v-x)&MASK)
  return out
 if op=='helper_map':return [c(x) for x in xs]
 if op=='helper_indexed':return [n(c(x)) if i%2==0 else c(x) for i,x in enumerate(xs)]
 if op=='helper_filter_map':return [n(c(x)) for x in xs if (x%seed if seed else 0)<k]
 if op=='helper_fold':
  a=seed
  for raw in reversed(xs):
   x=c(raw);a=(x+a*k if a<seed else x-a)&MASK
  return a
 if op=='helper_zip':
  out=[]
  for raw,b in zip(xs,ys):
   a=c(raw);b=n(b);out.append((a+b*k if a<b else a-b*k)&MASK)
  return out
 out=[];multipliers=[(k+2*j+1)&MASK for j in range(16)]
 for x in xs:
  v=(x+seed)&MASK
  for multiplier in multipliers:
   u=(v*multiplier+x)&MASK;v=u-4294967291 if u>=4294967291 else u
  out.append(v)
 return out
def branch_profiles(t,xs,ys,seed,k):
 op=t['operation'];n=min(len(xs),len(ys));profile={}
 if op=='nested_zip':
  paired=[term(t['combine'],dict(a=a,b=b,seed=seed,k=k)) for a,b in zip(xs,ys)]
  profile=dict(min_length=n,inner_true=sum(x<seed for x in xs[:n]),inner_false=sum(x>=seed for x in xs[:n]),outer_true=sum(v<seed for v in paired),outer_false=sum(v>=seed for v in paired),original_list_stages=2,expert_list_stages=1)
 elif op.startswith('helper'):
  profile=dict(calibration_true=sum(x<seed for x in xs),calibration_false=sum(x>=seed for x in xs),scope='Named source calls bind captures; experts inline and legally hoist/fuse. Actual emitter shape audited separately.')
  if op=='helper_filter_map':
   accepted=[x for x in xs if (x%seed if seed else 0)<k];profile.update(predicate_true=len(accepted),predicate_false=len(xs)-len(accepted),original_list_stages=2,expert_list_stages=1)
  if op=='helper_indexed':profile.update(index_even=(len(xs)+1)//2,index_odd=len(xs)//2)
  if op=='helper_zip':
   a=[term(CAL,dict(x=x,seed=seed,k=k)) for x in xs[:n]];b=[term(NORM,dict(x=y,seed=seed,k=k)) for y in ys[:n]];profile.update(min_length=n,combine_true=sum(x<y for x,y in zip(a,b)),combine_false=sum(x>=y for x,y in zip(a,b)))
  if op=='helper_fold':
   a=seed;yes=no=0
   for raw in reversed(xs):
    x=term(CAL,dict(x=raw,seed=seed,k=k));yes+=a<seed;no+=a>=seed;a=(x+a*k if a<seed else x-a)&MASK
   profile.update(fold_order='right',accumulator_true=yes,accumulator_false=no)
 else:profile=dict(stages=16,stage_primitives=64,initial_additions=1,expert_invariant_additions=16,scope='Exact immutable26 source; expert conditional subtraction and invariant multipliers already optimized.')
 return profile
def observation(v):
 if not isinstance(v,list):return str(v),int(v)
 total=sum(v)&MASK;weighted=sum((i+1)*x for i,x in enumerate(v))&MASK
 return f'array:{len(v)}:{total}:{weighted}',(total+(weighted<<32)+len(v))%(2**64)
def word_sha(xs):return hashlib.sha256(b''.join(struct.pack('<I',x) for x in xs)).hexdigest()
def make_fixtures(args):
 donor=json.loads((HERE/'donor-fixtures.json').read_text());lookup={x['id']:x for x in donor['inputs']};inputs=[];cells=[];profiles=[];checks=0
 def add(t,label,xs,ys,seed,k,timed=False,provenance=None):
  nonlocal checks
  xs=list(xs);ys=list(ys) if t['list_inputs']==2 else [];expected=oracle(t,xs,ys,seed,k)
  if literal(t,xs,ys,seed,k)!=expected:raise ValueError('literal/oracle mismatch '+t['name']+'/'+label)
  checks+=len(xs)+len(ys);i=len(inputs);inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=ys,seed=seed,factor=k,expected={t['name']:expected},input_provenance=provenance))
  profiles.append(dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),second_length=len(ys),timed=timed,declared_list_inputs=t['list_inputs'],seed=seed,factor=k,output_count=len(expected) if isinstance(expected,list) else 1,**branch_profiles(t,xs,ys,seed,k)))
  if timed:cells.append(dict(case=t['name'],input=i))
 for t in TASKS:
  if t['name'] not in args.cases:continue
  edges=[('empty',[],[],509,7),('singleton-default',[509],[1],509,7),('singleton',[MASK],[MASK],1,7),('extrema',[0,1,MASK,MASK-1,2**31],[MASK,0,2**31],2**31,2**31+1),('zero-factor',[0,1,MASK,2**31],[1,2],509,0),('zero-seed',[0,1,MASK,2**31],[MASK,0,3],0,7),('equal-parameters',[0,9,MASK],[0,9,MASK],9,9),('all-below',[0,1,8,9],[7,6,5,4],509,7),('all-above',[510,511,MASK],[2,3,4],509,7),('wrapping',[MASK,1,2,3,4,5,6],[MASK,1,5,0],509,7),('repeated-default',[509,509,509],[7,7,7],509,7)]
  if t['list_inputs']==2:edges += [('left-empty',[],[1,2,3],509,7),('right-empty',[1,2,3],[],509,7),('left-longer',[1,2,3,4,5],[MASK],509,7),('right-longer',[MASK],[1,2,3,4,5],509,7)]
  for edge in edges:add(t,*edge)
  for distribution in ['small','full']:
   for n in sorted(set(args.sizes)|{4096}):
    row=lookup['accepted_total'+f'/{distribution}-{n}'];second=lookup['dual_sum_weighted'+f'/{distribution}-{n}'];xs=list(row['xs']);ys=second['xs'][:3*n//4] if t['list_inputs']==2 else []
    seed=512 if distribution=='small' else 0x9e3779b9
    k=(768 if distribution=='small' else 0xc0000001) if t['operation']=='modular_mix' else (256 if distribution=='small' else 0x60000001)
    provenance=dict(donor_xs=row['id'],donor_ys=second['id'] if ys else None,before_xs_sha256=word_sha(row['xs']),after_xs_sha256=word_sha(xs),after_ys_sha256=word_sha(ys),encoding='little-endian U32 words',modification='ys independent donor truncated to3N/4' if ys else 'none')
    add(t,f'{distribution}-{n}',xs,ys,seed,k,n in args.sizes,provenance)
 return dict(schema=3,cases=[t['name'] for t in TASKS if t['name'] in args.cases],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,donor_fixture_sha256=hashlib.sha256((HERE/'donor-fixtures.json').read_bytes()).hexdigest(),parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes,correctness_only_sizes=[4096]),scope='Two fresh independent nested-zip and six helper/backend references;32 matched cells. Fixed32/65536 timed and4096 correctness, fixed seed/k across sizes per distribution. Three independent two-list recipes use3N/4 ys; empty/unequal/wrapping/zero divisors validate complete outputs. No timing-informed tuning. Original eager stages retained, expert already fused/inline/hoisted; full captures apply equally, borrowed synchronous calls separate.')
