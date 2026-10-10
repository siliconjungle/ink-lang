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
 if op=='count':return str(len(xs))
 if op=='indexed':return [term(t['mapper'],dict(env(x),i=i& MASK)) for i,x in enumerate(xs)]
 if op=='first_accepted':
  accepted=[x for x in xs if term(t['predicate'],env(x))];return accepted[0] if accepted else seed
 accepted=[x for x in xs if term(t['predicate'],env(x))] if op=='filtered_mapped_head' else list(xs)
 mapped=[term(t['mapper'],env(x)) for x in accepted]
 z=term(t['mapper'],env(seed))
 return mapped[0] if mapped else z
def oracle(t,xs,ys,seed,k):
 op=t['operation'];held=t['cohort']=='heldout'
 if op=='count':return str(len(xs))
 if op=='indexed':return [((x+k) if i%2==0 else x-seed)&MASK for i,x in enumerate(xs)]
 if op=='mapped_head':x=xs[0] if xs else seed
 else:x=next((x for x in xs if (x<k if held else x>seed)),seed)
 if op=='first_accepted':return x
 if held:
  return ((x*x+seed) if x<k else ((x-seed)&MASK)*((x+k)&MASK))&MASK
 return ((x*k+seed) if x>k else seed-x)&MASK

def branch_profiles(t,xs,seed,k):
 op=t['operation'];held=t['cohort']=='heldout'
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
 def add(t,label,xs,seed,k,timed=False,provenance=None,location=None):
  nonlocal checks
  expected=oracle(t,xs,[],seed,k)
  if literal(t,xs,[],seed,k)!=expected:raise ValueError('literal/oracle mismatch '+t['name']+'/'+label)
  checks+=len(xs);i=len(inputs);inputs.append(dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=[],seed=seed,factor=k,expected={t['name']:expected},input_provenance=provenance,match_location=location))
  profile=dict(case=t['name'],input=inputs[-1]['id'],length=len(xs),timed=timed,declared_list_inputs=1,seed=seed,factor=k,match_location=location,output_count=len(expected) if isinstance(expected,list) else 1,**branch_profiles(t,xs,seed,k))
  if location is not None:assert profile['first_match_index']==(0 if location=='first' else len(xs)//2 if location=='interior' else len(xs)-1 if location=='last' else None)
  profiles.append(profile)
  if timed:cells.append(dict(case=t['name'],input=i))
 for t in TASKS:
  if t['name'] not in args.cases:continue
  edges=[('empty',[],509,7),('singleton-default',[509],509,7),('singleton',[MASK],1,7),('extrema',[0,1,MASK,MASK-1,2**31],2**31,2**31+1),('zero-factor',[0,1,MASK,2**31],509,0),('zero-seed',[0,1,MASK,2**31],0,7),('equal-parameters',[0,9,MASK],9,9),('all-below',[0,1,8,9],509,510),('all-above',[510,511,MASK],509,7),('wrapping',[MASK,1,2,3,4,5,6],509,7),('repeated-default',[509,509,509],509,7)]
  for edge in edges:add(t,*edge)
  for distribution in ['small','full']:
   for n in sorted(set(args.sizes)|{4096}):
    row=lookup[('accepted_total' if t['cohort']!='heldout' else 'calibrated_accepted_total')+f'/{distribution}-{n}'];seed=512 if distribution=='small' else 0x9e3779b9;k=768 if distribution=='small' else 0xc0000001
    locations=['first','interior','last','absent'] if t['operation'] in ['first_accepted','filtered_mapped_head'] else [None]
    for loc in locations:
     xs=location_words(row['xs'],t,seed,k,loc) if loc is not None else list(row['xs'])
     provenance=dict(donor_xs=row['id'],before_xs_sha256=word_sha(row['xs']),after_xs_sha256=word_sha(xs),encoding='little-endian U32 words',modification='none' if loc is None else 'Preset first/interior/last/absent: remap earlier words into rejected domain, set chosen word accepted, retain later donor words; absent remaps entire list.')
     add(t,f'{distribution}-{n}'+('/'+loc if loc is not None else ''),xs,seed,k,n in args.sizes,provenance,loc)
 return dict(schema=3,cases=[t['name'] for t in TASKS if t['name'] in args.cases],inputs=inputs,cells=cells,profiles=profiles,python_literal_checks=checks,donor_fixture_sha256=hashlib.sha256((HERE/'donor-fixtures.json').read_bytes()).hexdigest(),parameters=dict(repeats=args.repeats,warmup=args.warmup,seconds=args.seconds,seed=args.seed,sizes=args.sizes,correctness_only_sizes=[4096]),scope='Eight natural single-list recipes, exact old/new backend by prior/current proof-core factorial.32/65536 timed;4096 correctness-only. Four lookup tasks use preset first/interior/last/absent matches at both distributions; other four tasks have ordinary distribution cells. Same seed/k per distribution across sizes. Staged controls fully materialize original arrays and transformed fallback; expert early-exits and maps once. Full calls retain input copies/result transport/consumption; synchronous borrowed JS and native resident are separate. GPU representatives are deduplicated byte-bound references, never fresh GPU emitter evidence; no broad language superiority.')
