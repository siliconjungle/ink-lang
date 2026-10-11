"""Observed indexed pairs with irrelevant padded suffix; exact ring oracles."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'knowledge'))
from producers.web_pipeline38_laws import source_functions
MASK=(1<<32)-1
TASKS=[]
for secondary in [False,True]:
 for name,t,source in source_functions(secondary):
  if t!='u32':continue
  side='left'if '_left_'in name else'right'
  TASKS.append(dict(name=name,source=source,family=side,list_inputs=2,output_kind='list_u32',secondary=secondary,padded_side=side,retained_input='xs',suffix_input='ys',both_values_observed=True,fresh_proof_required=True,role='same-origin-observed-padded-indexed-zip-fusion',mechanism='indexed-pair-fusion-and-padded-suffix-demand-erasure',callback_cost='two-level divmod/index/conditional pair helpers'if secondary else'index-dependent mapper choices and noncommutative observed pair helper'))
def public_spec():return dict(tasks=TASKS,result_kind='list_u32',source_scope='Both indexed mapper outputs are observed in pair order. Same original xs supplies both mapped prefixes; ys is only an irrelevant padded suffix. Output extent xs.length independent of ys. Plain and scalar-helper composition probes are not statistical holdouts. Wrapping/grouping and input/output ownership retained.')
def left_word(i,x,seed,k,t):
 if t['secondary']:return ((x//k if k else 0)+(i%k if k else 0)+seed)&MASK
 return ((x+k)if i<seed else(x-seed))&MASK
def right_word(i,x,seed,k,t):
 if t['secondary']:return ((x+k)if i<seed else(x*3))&MASK
 return ((x*k)if i%3==0 else(x+seed))&MASK
def pair_word(a,b,seed,k,t):
 if t['secondary']:return (((a//k if k else 0)+b)if a<b else((b%k if k else 0)+a))&MASK
 return ((a+b*k)if a<b else(a-b+seed))&MASK

def staged(xs,ys,seed,k,t):
 left=[left_word(i,x,seed,k,t)for i,x in enumerate(xs)];right=[right_word(i,x,seed,k,t)for i,x in enumerate(xs)]
 if t['padded_side']=='left':left=left+list(ys)
 else:right=right+list(ys)
 return [pair_word(a,b,seed,k,t)for a,b in zip(left,right)]
def independent(xs,ys,seed,k,t):
 # Direct original-input index loop; independent divmod and unbounded integers
 # reduced at observed mapper boundaries before comparison/pair reduction.
 result=[]
 for i,x in enumerate(xs):
  if t['secondary']:
   q,_=divmod(x,k)if k else(0,0);_,r=divmod(i,k)if k else(0,0);a=(q+r+seed)%(1<<32);b=(x+(k if i<seed else 2*x))%(1<<32)
   qa,_=divmod(a,k)if k else(0,0);_,rb=divmod(b,k)if k else(0,0);v=qa+b if a<b else rb+a
  else:
   a=(x+(k if i<seed else -seed))%(1<<32);b=(x*k if divmod(i,3)[1]==0 else x+seed)%(1<<32);v=a+b*k if a<b else a-b+seed
  result.append(v%(1<<32))
 return result

def words(seed,n,small=False):
 values=[];s=seed
 for _ in range(n):
  s^=(s<<13)&MASK;s^=s>>17;s^=(s<<5)&MASK;s&=MASK;values.append(s&1023 if small else s)
 return values

def fixture(t,ident,xs,ys,seed,k,mode,timed):
 expected=staged(xs,ys,seed,k,t);assert expected==independent(xs,ys,seed,k,t);nx,ny=len(xs),len(ys);assert len(expected)==nx
 if nx<=129 and ny<=129:assert expected==staged(xs,[y^MASK for y in ys]+[MASK,0,7],seed,k,t)
 return dict(id=ident,task=t['name'],mode=mode,xs=xs,ys=ys,seed=seed,k=k,expected=expected,timed=timed,web_consumption_code=(len(expected)+sum((i+1)*v for i,v in enumerate(expected)))%2**32,input_shape=dict(xs=nx,ys=ny,same_origin_mapped_prefixes=True,both_values_observed=True,padded_side=t['padded_side'],suffix_values_and_length_unobserved=True,suffix_extent_relation='shorter'if ny<nx else'longer'if ny>nx else'equal',donor_shared_across_recipes=True),acceptance=dict(accepted=nx,observed=nx,fraction=1 if nx else None,meaning='complete xs extent; padded ys suffix is never paired'),algorithmic_work=dict(left_mapper_calls_literal=nx,left_mapper_calls_checked=nx,right_mapper_calls_literal=nx,right_mapper_calls_checked=nx,pair_calls_literal=nx,pair_calls_checked=nx,literal_padded_concat_output_elements=nx+ny,checked_padded_concat_output_elements=0,observed_helper_grouping='left_word then right_word then pair_word on wrapped mapper values'),count_scope='Literal/checked mathematical work; prior/selected cores, emitted loops and actual backend routes/counters authoritative. Active graph may become legacy single shader, with different transfer formula.')

def fixtures():
 frames=[]
 for t in TASKS:
  for profile in ['low','high']:
   small=profile=='low';seed=512 if small else 0x9e3779b9;k=7
   for nx in [0,1,2,7,32,129,4096,65536]:
    ny=nx+7 if small else nx//3+1
    xs=words(2026113801+(17 if not small else 0),nx,small);ys=words(2026113801^0x6d2b79f5,ny,small)
    frames.append(fixture(t,f'{t["name"]}-{profile}-{nx}',xs,ys,seed,k,profile,nx in[32,4096,65536]))
  edges=[('both-empty',[],[],7,3),('xs-empty',[],[1,MASK,7],7,3),('suffix-empty',[0,1,MASK],[],7,3),('word-boundaries',[0,1,MASK,0x80000000,7],[MASK,7,1,0x80000000,0,3],7,3),('zero-divisor',[0,1,MASK],[MASK,17],7,0),('index-branch-boundary',[7,7,7,7,7],[1,2],2,7),('long-prefix',[17,3,19,0,12],[MASK,1],10,7),('long-suffix',[MASK,0],[1,2,3,4,5],MASK,MASK)]
  for label,xs,ys,seed,k in edges:frames.append(fixture(t,t['name']+'-'+label,xs,ys,seed,k,'edge',False))
 return dict(frames=frames,scope='Four observed padded indexed-pair recipes x3timed sizes x2joint value/suffix-shape regimes:24cells. Low smallwords/ys=nx+7/seed512; high fullwidth/ys=nx//3+1/seed0x9e3779b9, k7. Output always nx; suffix shape and values do not influence mathematical result. Empty/unequal/wrapping/index/zero-divisor edges; staged maps+concat+zip agrees with direct indexed ring oracle. Small-frame suffix-value/length perturbations preserve output.',seed=2026113801)
