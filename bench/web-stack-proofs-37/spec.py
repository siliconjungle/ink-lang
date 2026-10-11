"""Independent indexed-producer projection: staged and direct word oracles."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'knowledge'))
from producers.web_pipeline37_laws import source_functions
MASK=(1<<32)-1
TASKS=[]
for heldout in [False,True]:
 for name,t,source in source_functions(heldout):
  if t!='u32':continue
  side='left'if '_left_'in name else'right'
  TASKS.append(dict(name=name,source=source,family=side,list_inputs=2,output_kind='list_u32',secondary=heldout,unused_side=side,selected_side='right'if side=='left'else'left',fresh_proof_required=True,role='independent-unused-indexed-producer-erasure',mechanism='checked-independent-list-indexedmap-zip-projection',callback_cost='two-level discarded divmod/index helper and selected divmod repair helper'if heldout else'index-dependent discarded choose and selected word repair'))
def public_spec():return dict(tasks=TASKS,result_kind='list_u32',source_scope='Erase unobserved indexed producer values while retaining independent zip min extent. Plain and two-level scalar-helper composition probes, not statistical holdouts. Selected mapper exact wrapping/grouping retained. No broad language ranking.')
def discarded(i,x,seed,k,t):
 if t['secondary']:return ((x//k if k else 0)+(i%k if k else 0)+seed)&MASK
 return (((x+k)+i)if i<seed else(x-seed))&MASK
def selected(y,seed,k,t):
 if t['secondary']:return (((y//k if k else 0)+seed)if y<seed else((y%k if k else 0)+k))&MASK
 return ((y+k)if y<seed else(y-k))&MASK

def staged(xs,ys,seed,k,t):
 if t['unused_side']=='left':
  left=[discarded(i,x,seed,k,t)for i,x in enumerate(xs)];right=list(ys)
  return [selected(y,seed,k,t)for unused,y in zip(left,right)]
 left=list(xs);right=[discarded(i,y,seed,k,t)for i,y in enumerate(ys)]
 return [selected(x,seed,k,t)for x,unused in zip(left,right)]
def independent(xs,ys,seed,k,t):
 # Index only retained input through exact paired extent; use divmod and an
 # unbounded ring independently of staged eager ignored-producer evaluation.
 values=ys if t['unused_side']=='left'else xs;result=[]
 for i in range(min(len(xs),len(ys))):
  y=values[i]
  if t['secondary']:
   q,r=divmod(y,k)if k else(0,0);v=q+seed if y<seed else r+k
  else:v=y+(k if y<seed else -k)
  result.append(v%(1<<32))
 return result

def words(seed,n,small=False):
 values=[];s=seed
 for _ in range(n):
  s^=(s<<13)&MASK;s^=s>>17;s^=(s<<5)&MASK;s&=MASK;values.append(s&1023 if small else s)
 return values

def fixture(t,ident,xs,ys,seed,k,mode,timed):
 expected=staged(xs,ys,seed,k,t);assert expected==independent(xs,ys,seed,k,t);nx,ny=len(xs),len(ys);n=min(nx,ny);ignored=nx if t['unused_side']=='left'else ny;retained=ny if t['unused_side']=='left'else nx
 if nx<=129 and ny<=129:
  changed=[x^MASK for x in(xs if t['unused_side']=='left'else ys)]
  assert expected==staged(changed if t['unused_side']=='left'else xs,changed if t['unused_side']=='right'else ys,seed,k,t)
 return dict(id=ident,task=t['name'],mode=mode,xs=xs,ys=ys,seed=seed,k=k,expected=expected,timed=timed,web_consumption_code=(len(expected)+sum((i+1)*v for i,v in enumerate(expected)))%2**32,input_shape=dict(xs=nx,ys=ny,independent_second_list=True,unused_side=t['unused_side'],selected_side=t['selected_side'],unused_extent=ignored,selected_extent=retained,unused_extent_relation='shorter'if ignored<retained else'longer'if ignored>retained else'equal',donor_shared_across_recipes=True),acceptance=dict(accepted=n,observed=retained,fraction=n/retained if retained else None,meaning='zip truncation extent; no predicate compaction'),algorithmic_work=dict(discarded_index_mapper_calls_literal=ignored,discarded_index_mapper_calls_checked=0,selected_mapper_calls_literal=n,selected_mapper_calls_checked=n,pair_callbacks_literal=n,pair_callbacks_checked=n),count_scope='Literal/checked mathematical callback calls; prior/selected cores, emitted eager loops, actual backend routes and counters authoritative. Legacy shader compiler may already erase discarded arithmetic.')

def fixtures():
 frames=[]
 for t in TASKS:
  for profile in ['low','high']:
   small=profile=='low';seed=512 if small else 0x9e3779b9;k=7
   for nx in [0,1,2,7,32,129,4096,65536]:
    ny=nx+7 if small else nx//3+1
    xs=words(2026113701+(17 if not small else 0),nx,small);ys=words(2026113701^0x6d2b79f5,ny,small)
    frames.append(fixture(t,f'{t["name"]}-{profile}-{nx}',xs,ys,seed,k,profile,nx in[32,4096,65536]))
  edges=[('both-empty',[],[],7,3),('left-empty',[],[1,MASK,7],7,3),('right-empty',[0,1,MASK],[],7,3),('word-boundaries',[0,1,MASK,0x80000000,7],[MASK,7,1,0x80000000,0,3],7,3),('zero-divisor',[0,1,MASK],[MASK,17],7,0),('equal-words',[7,7,7],[7,7,7],7,7),('long-left',[17,3,19,0,12],[MASK,1],10,7),('long-right',[MASK,0],[1,2,3,4,5],MASK,MASK)]
  for label,xs,ys,seed,k in edges:frames.append(fixture(t,t['name']+'-'+label,xs,ys,seed,k,'edge',False))
 return dict(frames=frames,scope='Four indexed projection recipes x3timed sizes x2joint value/unequal-shape regimes:24cells. Both discarded-shorter and discarded-longer extents perorientation. Low smallwords/ys=nx+7/seed512; high fullwidth/ys=nx//3+1/seed0x9e3779b9, k7. Empty/unequal/wrapping/index-dependent/zero-divisor edges; staged eager indexed producer versus retained-input ring oracle. Ignored-value perturbation checks preserve outputs.',seed=2026113701)
