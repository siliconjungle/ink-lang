"""Both observed inputs: direct mapped-zip endpoints and exact word oracles."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'knowledge'))
from producers.web_pipeline35_laws import source_functions
MASK=(1<<32)-1
TASKS=[]
for heldout in [False,True]:
 for name,t,source in source_functions(heldout):
  if t!='u32':continue
  family=next(x for x in['left','right','both','nested']if '_'+x+'_'in name)
  TASKS.append(dict(name=name,source=source,family=family,list_inputs=2,output_kind='list_u32',secondary=heldout,left_mapped=family in['left','both','nested'],right_mapped=family in['right','both','nested'],nested=family=='nested',fresh_proof_required=True,role='observed-mapped-zip-fusion',mechanism='direct-endpoint-derived-from-prior-postmap-fusion-and-identity',callback_cost='quot/rem helper composition; noncommutative pair callback; nested shift helper'if family=='nested'else'quot/rem helper composition; noncommutative pair callback'))
def public_spec():return dict(tasks=TASKS,source_scope='Both paired values remain observed. Left/right/both/nested map contexts of direct mapped-zip fusion, a search shortcut derived from old17 postmap fusion plus identity. Mapper call grouping, wrapping arithmetic and min-length zip order preserved. No broad language ranking.')
def left_word(x,seed,k):return ((x//k if k else 0)+x+seed)&MASK
def right_word(y,seed,k):return ((y%k if k else 0)+y+k)&MASK
def post_word(x,seed,k):return ((x+k)if x<seed else(x-k))&MASK
def combine(a,b,seed,k,heldout):
 if heldout:return (((a+b)*k)if a<seed else((a-b)+seed))&MASK
 return (((a+b*k)if a<b else(a-b*k))+seed)&MASK

def staged(xs,ys,seed,k,t):
 left=[left_word(x,seed,k)for x in xs]if t['left_mapped']else list(xs)
 right=[right_word(y,seed,k)for y in ys]if t['right_mapped']else list(ys)
 if t['nested']:left=[post_word(x,seed,k)for x in left]
 return [combine(a,b,seed,k,t['secondary'])for a,b in zip(left,right)]
def independent(xs,ys,seed,k,t):
 # Directly indexed paired prefix, divmod instead of the staged quot/rem helpers,
 # unbounded ring arithmetic reduced at each observed mapper boundary.
 result=[]
 for i in range(min(len(xs),len(ys))):
  a,b=xs[i],ys[i]
  if t['left_mapped']:
   q,_=divmod(a,k)if k else(0,0);a=(q+a+seed)%(1<<32)
  if t['right_mapped']:
   _,r=divmod(b,k)if k else(0,0);b=(r+b+k)%(1<<32)
  if t['nested']:a=(a+(k if a<seed else -k))%(1<<32)
  if t['secondary']:v=(a+b)*k if a<seed else a-b+seed
  else:v=a+(b*k if a<b else -(b*k))+seed
  result.append(v%(1<<32))
 return result

def words(seed,n,small=False):
 values=[];s=seed
 for _ in range(n):
  s^=(s<<13)&MASK;s^=s>>17;s^=(s<<5)&MASK;s&=MASK;values.append(s&1023 if small else s)
 return values

def fixture(t,ident,xs,ys,seed,k,mode,timed):
 expected=staged(xs,ys,seed,k,t);assert expected==independent(xs,ys,seed,k,t);nx,ny=len(xs),len(ys);n=min(nx,ny);left_calls=int(t['left_mapped'])+int(t['nested']);right_calls=int(t['right_mapped'])
 return dict(id=ident,task=t['name'],mode=mode,xs=xs,ys=ys,seed=seed,k=k,expected=expected,timed=timed,input_shape=dict(xs=nx,ys=ny,independent_second_list=True,both_values_observed=True,donor_shared_across_recipes=True),acceptance=dict(accepted=n,observed=nx,fraction=n/nx if nx else None,meaning='zip truncation extent; no predicate compaction'),algorithmic_work=dict(input_mapper_calls_literal=left_calls*nx+right_calls*ny,input_mapper_calls_checked=(left_calls+right_calls)*n,pair_callbacks_literal=n,pair_callbacks_checked=n,mapper_grouping='nested left mapper remains left_word then post_word'),count_scope='Literal/checked mathematical callback-call counts; prior/selected core, eager loop sites, actual backend routes and counters authoritative.')

def fixtures():
 frames=[]
 for t in TASKS:
  for profile in ['low','high']:
   small=profile=='low';seed=512 if small else 0x9e3779b9;k=7
   for nx in [0,1,2,7,32,129,4096,65536]:
    ny=nx+7 if small else nx//3+1
    xs=words(2026113501+(17 if not small else 0),nx,small);ys=words(2026113501^0x6d2b79f5,ny,small)
    frames.append(fixture(t,f'{t["name"]}-{profile}-{nx}',xs,ys,seed,k,profile,nx in [32,4096,65536]))
  edges=[('both-empty',[],[],7,3),('left-empty',[],[1,MASK,7],7,3),('right-empty',[0,1,MASK],[],7,3),('word-boundaries',[0,1,MASK,0x80000000,7],[MASK,7,1,0x80000000,0,3],7,3),('zero-divisor',[0,1,MASK],[MASK,17],7,0),('equal-words',[7,7,7],[7,7,7],7,7),('long-left',[17,3,19,0,12],[MASK,1],10,7),('long-right',[MASK,0],[1,2,3,4,5],MASK,MASK)]
  for label,xs,ys,seed,k in edges:frames.append(fixture(t,t['name']+'-'+label,xs,ys,seed,k,'edge',False))
 return dict(frames=frames,scope='Four observed-value recipes x3timed sizes x2joint value/unequal-shape regimes:24cells. Low uses smallwords/ys=nx+7/seed512; high uses fullwidth/ys=nx//3+1/seed0x9e3779b9; both usek7. Untimed empty/unequal/wrapping/maxmultiply/zero-divisor/equal-word cases. Full staged mapper versus direct-indexed independent ring oracle.',seed=2026113501)
