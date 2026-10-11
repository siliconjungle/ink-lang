"""Original materialized stages versus independent work-skipping goldens."""
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
 op=t['operation'];env=lambda x:dict(x=x,seed=seed,k=k)
 if op=='invariant_fold':
  a=seed
  for x in reversed(xs):a=term('choose('+t['gate']+','+t['yes']+','+t['no']+')',dict(env(x),a=a))
  return a
 if op=='modular_mix':
  values=[]
  for x in xs:
   v=(x+seed)&MASK
   for j in range(16):v=(((v*((k+2*j+1)&MASK))&MASK)+x)&MASK;v=v%4294967291
   values.append(v)
  return values
 if op in ['zip_map','zip_fold']:
  paired=[term(t['combine'],dict(a=x,b=y,seed=seed,k=k)) for x,y in zip(xs,ys if op=='zip_map' else xs)]
  if op=='zip_map':return [term(t['postmap'],dict(v=v,seed=seed,k=k)) for v in paired]
  acc=seed
  for v in reversed(paired):acc=term(t['reducer'],dict(v=v,acc=acc,seed=seed,k=k))
  return acc

 if op=='count':return str(len(xs))
 if op=='indexed':return [term(t['mapper'],dict(env(x),i=i& MASK)) for i,x in enumerate(xs)]
 if op=='first_accepted':
  accepted=[x for x in xs if term(t['predicate'],env(x))];return accepted[0] if accepted else seed
 if op in ['repair','repair_fold','repair_sum']:
  accepted=[x for x in xs if term(t['predicate'],env(x))]
  mapped=[term('choose('+t['predicate']+','+t['mapper']+','+t['rejected_mapper']+')',env(x)) for x in accepted]
  if op=='repair':return mapped
  if op=='repair_sum':return sum(mapped)&MASK
  a=seed
  for x in reversed(mapped):a=term(t['reducer'],dict(env(x),a=a))
  return a
 accepted=[x for x in xs if term(t['predicate'],env(x))] if op=='filtered_mapped_head' else list(xs)
 mapped=[term(t['mapper'],env(x)) for x in accepted]
 z=term(t['mapper'],env(seed))
 return mapped[0] if mapped else z
def oracle(t,xs,ys,seed,k):
 op=t['operation'];held=t['cohort']=='heldout'
 if op=='invariant_fold':
  a=seed;on=seed<k
  for x in reversed(xs):
   if not held:a=(x+a*k if a<seed else x-a) if on else (a-x*seed if a>k else a+x)
   else:a=(a*k+x if x<seed else a-x) if on else (x*k+a if a<k else x-a*seed)
   a &= MASK
  return a
 if op=='modular_mix':
  out=[];multipliers=[(k+2*j+1)&MASK for j in range(16)]
  for x in xs:
   v=(x+seed)&MASK
   for multiplier in multipliers:
    u=(v*multiplier+x)&MASK;v=u-4294967291 if u>=4294967291 else u
   out.append(v)
  return out
 if op=='zip_map':
  out=[]
  for x,y in zip(xs,ys):
   w=y*k;v=(x+w if x<seed else x-w)&MASK;out.append((v-seed if v>k else v+seed)&MASK)
  return out
 if op=='zip_fold':
  acc=seed
  for x in reversed(xs):
   v=(x+x*k if x<seed else x-x*k)&MASK;acc=(v-acc if acc<seed else v+acc*k)&MASK
  return acc

 if op=='count':return str(len(xs))
 if op=='indexed':return [((x+k) if i%2==0 else x-seed)&MASK for i,x in enumerate(xs)]
 if op in ['repair','repair_fold','repair_sum']:
  selected=[]
  for x in xs:
   distance=seed-x if x<seed else x-seed
   p=((distance%k if k else 0)<(k//2 if k else 0)) if held else ((x%seed if seed else 0)<k)
   if p:selected.append(((x*k-seed) if x>k else seed+x)&MASK if held else ((seed-x) if x<seed else x+seed)&MASK)
  if op=='repair':return selected
  if op=='repair_sum':return sum(selected)&MASK
  a=seed
  for x in reversed(selected):a=(x+a*k if a<seed else x-a)&MASK
  return a
 if op=='mapped_head':x=xs[0] if xs else seed
 else:x=next((x for x in xs if (x<k if held else x>seed)),seed)
 if op=='first_accepted':return x
 if held:
  return ((x*x+seed) if x<k else ((x-seed)&MASK)*((x+k)&MASK))&MASK
 return ((x*k+seed) if x>k else seed-x)&MASK

def branch_profiles(t,xs,seed,k):
 op=t['operation'];held=t['cohort']=='heldout'
 if op=='invariant_fold':
  a=seed;yes=no=0;on=seed<k
  for x in reversed(xs):
   selected=t['yes'] if on else t['no'];condition=selected[7:selected.index(',')]
   if term(condition,dict(x=x,a=a,seed=seed,k=k)):yes+=1
   else:no+=1
   a=term(selected,dict(x=x,a=a,seed=seed,k=k))
  return dict(invariant_gate_enabled=on,original_invariant_tests=len(xs),expert_invariant_tests=1,selected_inner_true=yes,selected_inner_false=no,both_live_branches_traverse=True,fold_order='right')
 if op=='zip_map':return dict(min_length=None,scope='Two independent lists truncate to min length; paired branches profiled separately.')
 if op=='zip_fold':return dict(fold_order='right',source_zip_words=len(xs),scope='Original self zip materializes, expert computes paired contribution in reverse traversal.')
 if op=='modular_mix':return dict(stages=16,per_element_stage_operations=64,initial_additions=1,expert_invariant_additions=16,scope='Fixed dependent modular mix, no cryptographic claim. Expert hoists invariant multipliers; same wrapped operations.')

 if op in ['repair','repair_fold','repair_sum']:
  selected=[x for x in xs if term(t['predicate'],dict(x=x,seed=seed,k=k))]
  mapped=[term(t['mapper'],dict(x=x,seed=seed,k=k)) for x in selected];a=seed;left=right=0
  for x in reversed(mapped):
   if a<seed:left+=1
   else:right+=1
   a=(x+a*k if a<seed else x-a)&MASK
  return dict(predicate_true=len(selected),predicate_false=len(xs)-len(selected),source_predicate_visits=len(xs)+len(selected),source_mapper_evaluations=len(selected),expert_predicate_visits=len(xs),expert_mapper_evaluations=len(selected),source_fold_order='right accepted order' if op=='repair_fold' else None,fold_accumulator_lt_seed=left if op=='repair_fold' else None,fold_accumulator_ge_seed=right if op=='repair_fold' else None,scope='Counts describe original eager stages and strong fused controls; selected-core shape independently audited.')
 if op in ['first_accepted','filtered_mapped_head']:
  matches=[i for i,x in enumerate(xs) if (x<k if held else x>seed)];first=matches[0] if matches else None
  return dict(predicate_true=len(matches),predicate_false=len(xs)-len(matches),first_match_index=first,source_predicate_visits=len(xs),source_mapper_evaluations=len(matches)+1 if op=='filtered_mapped_head' else 0,expert_predicate_visits=(first+1) if first is not None else len(xs),expert_mapper_evaluations=1 if op=='filtered_mapped_head' else 0,scope='Selected-core visit counts depend on proof/backend; inspect actual emission, not an assumed all-input/early-exit target.')
 if op=='mapped_head':return dict(source_mapper_evaluations=len(xs)+1,expert_mapper_evaluations=1,expert_visited_words=min(1,len(xs)))
 if op=='count':return dict(source_visited_words=0,expert_visited_words=0,scalar_u64=True)
 return dict(index_even=(len(xs)+1)//2,index_odd=len(xs)//2,expert_visited_words=len(xs))
def observation(v):
 if not isinstance(v,list):return str(v),int(v)
 total=sum(v)&MASK;weighted=sum((i+1)*x for i,x in enumerate(v))&MASK
 return f'array:{len(v)}:{total}:{weighted}',(total+(weighted<<32)+len(v))%(2**64)
def word_sha(xs):return hashlib.sha256(b''.join(struct.pack('<I',x) for x in xs)).hexdigest()
def location_words(xs,t,seed,k,location):
 xs=list(xs);limit=0 if location=='first' else len(xs)//2 if location=='interior' else len(xs)-1 if location=='last' else len(xs)
 held=t['cohort']=='heldout'
 for j in range(limit):xs[j]=k+xs[j]%(MASK-k+1) if held else xs[j]%(seed+1)
 if location!='absent':xs[limit]=xs[limit]%k if held else seed+1+xs[limit]%(MASK-seed)
 return xs

def make_fixtures(args):
 donor=json.loads((HERE/'donor-fixtures.json').read_text());lookup={x['id']:x for x in donor['inputs']};inputs=[];cells=[];profiles=[];checks=0
 def add(t,label,xs,ys,seed,k,timed=False,provenance=None,location=None):
  nonlocal checks
  xs=list(xs);ys=list(ys) if t['list_inputs']==2 else [];expected=oracle(t,xs,ys,seed,k)
  if literal(t,xs,ys,seed,k)!=expected:raise ValueError('literal/oracle mismatch '+t['name']+'/'+label)
  checks+=len(xs)+len(ys);i=len(inputs);inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=ys,seed=seed,factor=k,expected={t['name']:expected},input_provenance=provenance,match_location=location))
  profile=dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),second_length=len(ys),timed=timed,declared_list_inputs=t['list_inputs'],seed=seed,factor=k,match_location=location,output_count=len(expected) if isinstance(expected,list) else 1,**branch_profiles(t,xs,seed,k))
  if t['operation']=='zip_map':profile.update(min_length=min(len(xs),len(ys)),combine_lt_seed=sum(x<seed for x in xs[:len(ys)]),combine_ge_seed=sum(x>=seed for x in xs[:len(ys)]))
  if location is not None:assert profile['first_match_index']==(0 if location=='first' else len(xs)//2 if location=='interior' else len(xs)-1 if location=='last' else None)
  profiles.append(profile)
  if timed:cells.append(dict(case=t['name'],input=i))
 for t in TASKS:
  if t['name'] not in args.cases:continue
  edges=[('empty',[],[],509,7),('singleton-default',[509],[1],509,7),('singleton',[MASK],[MASK],1,7),('extrema',[0,1,MASK,MASK-1,2**31],[MASK,0,2**31],2**31,2**31+1),('zero-factor',[0,1,MASK,2**31],[1,2],509,0),('zero-seed',[0,1,MASK,2**31],[MASK,0,3],0,7),('equal-parameters',[0,9,MASK],[0,9,MASK],9,9),('all-below',[0,1,8,9],[7,6,5,4],509,510),('all-above',[510,511,MASK],[2,3,4],509,7),('wrapping',[MASK,1,2,3,4,5,6],[MASK,1,5,0],509,7),('repeated-default',[509,509,509],[7,7,7],509,7)]
  if t['list_inputs']==2:edges += [('left-empty',[],[1,2,3],509,7),('right-empty',[1,2,3],[],509,7),('left-longer',[1,2,3,4,5],[MASK],509,7),('right-longer',[MASK],[1,2,3,4,5],509,7)]
  for edge in edges:add(t,*edge)
  for distribution in ['small','full']:
   for n in sorted(set(args.sizes)|{4096}):
    row=lookup['accepted_total'+f'/{distribution}-{n}'];seed=512 if distribution=='small' else 0x9e3779b9
    k=(256 if distribution=='small' else 0x60000001) if t['operation'] in ['repair','repair_fold'] else (768 if distribution=='small' else 0xc0000001)
    modes=['enabled','disabled'] if t['operation']=='invariant_fold' else ['first','interior','last','absent'] if t['operation']=='first_accepted' else [None]
    for mode in modes:
     kk=(768 if distribution=='small' else 0xc0000001) if mode=='enabled' else (256 if distribution=='small' else 0x60000001) if mode=='disabled' else k
     loc=mode if t['operation']=='first_accepted' else None
     xs=location_words(row['xs'],t,seed,kk,loc) if loc is not None else list(row['xs'])
     second=lookup['dual_sum_weighted'+f'/{distribution}-{n}'];ys=second['xs'][:3*n//4] if t['list_inputs']==2 else []
     if ys:assert word_sha(xs)!=word_sha(ys)
     provenance=dict(donor_xs=row['id'],donor_ys=second['id'] if ys else None,before_xs_sha256=word_sha(row['xs']),after_xs_sha256=word_sha(xs),after_ys_sha256=word_sha(ys),encoding='little-endian U32 words',modification='Preset match location' if loc else 'ys independent donor truncated to3N/4' if ys else 'none')
     add(t,f'{distribution}-{n}'+('/'+mode if mode else ''),xs,ys,seed,kk,n in args.sizes,provenance,loc)
 return dict(schema=3,cases=[t['name'] for t in TASKS if t['name'] in args.cases],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,donor_fixture_sha256=hashlib.sha256((HERE/'donor-fixtures.json').read_bytes()).hexdigest(),parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes,correctness_only_sizes=[4096]),scope='Nine natural recipes; two fresh two-live-branch folds and seven references.56 matched cells, fixed32/65536 sizes,4096 correctness only. Both invariant outcomes per distribution traverse; first-match reference covers four match positions. Independent zip ys comes from a distinct donor and has3N/4 words; empty/unequal/extrema cases validate complete outputs. Every declared list is captured fairly by full controls. Fold order and primitive wrapping are exact; expert hoists invariant controls/multipliers. No performance-informed tuning or broad language ranking.')
