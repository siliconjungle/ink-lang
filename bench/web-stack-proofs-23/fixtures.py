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
 if op.startswith('skip_'):
  accepted=[x for x in xs if term(t['predicate'],env(x))]
  if op=='skip_partition_count':return str(len(accepted)+len([x for x in xs if not term(t['predicate'],env(x))]))
  if op=='skip_mapped_first_accepted':accepted=[term(t['mapper'],env(x)) for x in accepted]
  return accepted[0] if accepted else seed
 a=0;prefix=[]
 for x in xs:a=(a+x)&MASK;prefix.append(a)
 if op=='scan_first_value':return term(t['post'],dict(first=prefix[0] if prefix else seed,seed=seed,k=k))
 pairs=zip(prefix,xs) if op=='scan_left_project' else zip(xs,prefix)
 return [term(t['mapper'],env(b if op=='scan_left_project' else a)) for a,b in pairs]
def oracle(t,xs,ys,seed,k):
 held=t['cohort']=='heldout';op=t['operation']
 if op=='skip_partition_count':return str(len(xs))
 if op.startswith('skip_'):
  candidates=(x for x in xs if x<k) if held else (x for x in xs if x>seed)
  x=next(candidates,None)
  if x is None:return seed
  if op=='skip_first_accepted':return x
  return ((x+k if x<seed else x-seed) if held else (x-k if x>k else x+k))&MASK
 if op=='scan_first_value':
  first=xs[0] if xs else seed
  return (first*k+seed if held else first+k)&MASK
 return [((x*k+seed if x>k else seed-x) if held else (x+k if x<seed else x-seed))&MASK for x in xs]
def branch_profiles(t,xs,seed,k):
 held=t['cohort']=='heldout';op=t['operation']
 if op.startswith('skip_'):
  matches=[i for i,x in enumerate(xs) if x<k] if held else [i for i,x in enumerate(xs) if x>seed]
  first=matches[0] if matches else None
  count=op=='skip_partition_count';mapped=op=='skip_mapped_first_accepted'
  return dict(predicate_true=len(matches),predicate_false=len(xs)-len(matches),first_match_index=first,source_predicate_count=2*len(xs) if count else len(xs),selected_predicate_count=0 if count else len(xs),selected_mapper_count=len(matches) if mapped else 0,expert_mapper_count=int(first is not None and mapped),expert_visited_words=0 if count else first+1 if first is not None else len(xs),selected_fold_visits='length-only; zero predicate/mapper visits' if count else 'all input words; mapped-first evaluates every accepted mapper in reverse fold order',selected_first_mapper_branch=(xs[first]<seed if held else xs[first]>k) if first is not None and mapped else None)

 if op=='scan_first_value':return dict(first_from_input=bool(xs),expert_visited_words=min(1,len(xs)),source_scan_words=len(xs))
 n=sum(x>k if held else x<seed for x in xs)
 return dict(mapper_true=n,mapper_false=len(xs)-n,discarded_prefix_words=len(xs),mapper_uses='original element, never prefix state')
def observation(v):
 if not isinstance(v,list):return str(v),int(v)
 total=sum(v)&MASK;weighted=sum((i+1)*x for i,x in enumerate(v))&MASK
 return f'array:{len(v)}:{total}:{weighted}',(total+(weighted<<32)+len(v))%(2**64)
def word_sha(xs):return hashlib.sha256(b''.join(struct.pack('<I',x) for x in xs)).hexdigest()
def location_words(xs,t,seed,k,location):
 xs=list(xs);limit=0 if location=='first' else len(xs)//2 if location=='interior' else len(xs)
 held=t['cohort']=='heldout'
 for j in range(limit):xs[j]=k+xs[j]%(MASK-k+1) if held else xs[j]%(seed+1)
 if location!='absent':xs[limit]=xs[limit]%k if held else seed+1+xs[limit]%(MASK-seed)
 return xs

def make_fixtures(args):
 donor=json.loads((HERE/'donor-fixtures.json').read_text());lookup={x['id']:x for x in donor['inputs']};inputs=[];cells=[];profiles=[];checks=0
 def add(t,label,xs,seed,k,timed=False,provenance=None,location=None):
  nonlocal checks
  expected=oracle(t,xs,[],seed,k)
  if literal(t,xs,[],seed,k)!=expected:raise ValueError('literal/oracle mismatch '+t['name']+'/'+label)
  checks+=len(xs);i=len(inputs);inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=[],seed=seed,factor=k,expected={t['name']:expected},input_provenance=provenance))
  if timed:
   profile=dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),declared_list_inputs=1,seed=seed,factor=k,match_location=location,output_count=len(expected) if isinstance(expected,list) else 1,output_distinct=len(set(expected)) if isinstance(expected,list) else None,**branch_profiles(t,xs,seed,k))
   if location is not None:assert profile['first_match_index']==(0 if location=='first' else len(xs)//2 if location=='interior' else None)
   cells.append(dict(case=t['name'],input=i));profiles.append(profile)
 for t in TASKS:
  if t['name'] not in args.cases:continue
  edges=[('empty',[],509,7),('singleton',[MASK],1,7),('extrema',[0,1,MASK,MASK-1,2**31],2**31,2**31+1),('zero-factor',[0,1,MASK,2**31],509,0),('zero-seed',[0,1,MASK,2**31],0,7),('equal-parameters',[0,9,MASK],9,9),('all-below',[0,1,8,9],509,510),('all-above',[510,511,MASK],509,7),('overflow-prefix',[MASK,1,2,3,4,5,6],509,7)]
  for edge in edges:add(t,*edge)
  for distribution in ['small','full']:
   for n in args.sizes:
    row=lookup[('accepted_total' if t['cohort']=='discovery' else 'calibrated_accepted_total')+f'/{distribution}-{n}'];seed=512 if distribution=='small' else 0x9e3779b9;k=768 if distribution=='small' else 0xc0000001
    locations=['first','interior','absent'] if t['operation'] in ['skip_first_accepted','skip_mapped_first_accepted'] else [None]
    for loc in locations:
     xs=location_words(row['xs'],t,seed,k,loc) if loc is not None else list(row['xs'])
     provenance=dict(donor_xs=row['id'],before_xs_sha256=word_sha(row['xs']),after_xs_sha256=word_sha(xs),encoding='little-endian U32 words',modification='none' if loc is None else 'Preset first/interior/absent: remap every earlier word into rejected predicate domain; make selected word accepted; leave later donor words unchanged. Absent remaps entire list. These are synthetic match-location distributions, not unchanged donor arrays.')
     add(t,f'{distribution}-{n}'+('/'+loc if loc is not None else ''),xs,seed,k,True,provenance,loc)
 return dict(schema=2,cases=[t['name'] for t in TASKS if t['name'] in args.cases],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,donor_fixture_sha256=hashlib.sha256((HERE/'donor-fixtures.json').read_bytes()).hexdigest(),parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes),scope='Twelve work-skipping recipes: six partition-cardinality/first-match scalars; four scan-projection vectors; two scan-first scalars. Lookup first/interior/absent profiles frozen at all three lengths and both distributions. Same seed/k per distribution across sizes; preset match-domain remapping recorded by before/after word hashes. Original controls retain eager stages; experts count length, forward early-exit or omit scan/zip. Selected lookup folds still visit all words, unlike early-exit experts. Full single-list input capture and output consumption/transfers included; borrowed JS/native resident separate. Pure-total finite wrapping semantics, actual manifest GPU/fallback evidence, no production-corpus or general language superiority claim.')
