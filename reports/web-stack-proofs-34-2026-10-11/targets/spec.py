"""Independent-list demand erasure; full staged and direct mathematical oracles."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'knowledge'))
from producers.web_pipeline34_laws import source_functions
MASK=(1<<32)-1
TASKS=[]
for heldout in [False,True]:
 for name,t,source in source_functions(heldout):
  if t!='u32':continue
  erased_left='left' in name
  TASKS.append(dict(name=name,source=source,family='zip_map_unused_producer_u32',list_inputs=2,output_kind='list_u32',secondary=heldout,erased_left=erased_left,fresh_proof_required=True,role='zip-map-demand-erasure',mechanism='unused-producer-shape-preservation',callback_cost='quotient/remainder selected helper'if heldout else'conditional selected helper'))
def public_spec():return dict(tasks=TASKS,source_scope='A direct database endpoint derived from prior identity-map and mapped-zip/postmap laws. Two ignored-producer orientations, raw helper composition and exact old33 map/two-scan heldouts. Prior ordinary scan proofs remove scans; fresh endpoints additionally erase maps. Min-length zip shape remains observable. No F32 arithmetic reassociation or broad language ranking.')
def selected_word(x,seed,k,secondary):
 if secondary:return (((x//k if k else 0)+seed)if x<seed else((x%k if k else 0)+k))&MASK
 return ((x+k)if x<seed else(x-k))&MASK

def scan(xs):
 acc=0;out=[]
 for x in xs:acc=(acc+x)&MASK;out.append(acc)
 return out

def staged(xs,ys,seed,k,t):
 # Source maps the complete discarded producer through total quot/rem helpers.
 # Exact old33 heldouts additionally scan twice; values never escape the zip's
 # unused argument, but the full producer work and its shape remain explicit.
 discarded=xs if t['erased_left']else ys
 selected=ys if t['erased_left']else xs
 discarded=[((x//k if k else 0)+(x%k if k else 0)+seed)&MASK for x in discarded]
 if t['secondary']:discarded=scan(scan(discarded))
 return [selected_word(y,seed,k,t['secondary'])for _,y in zip(discarded,selected)]
def independent(xs,ys,seed,k,t):
 n=min(len(xs),len(ys));selected=ys if t['erased_left']else xs
 out=[]
 for i in range(n):
  x=selected[i]
  if t['secondary']:
   # Python divmod is independent of generated quotient/remainder evaluation.
   q,r=divmod(x,k)if k else(0,0);v=q+seed if x<seed else r+k
  else:v=x+k if x<seed else x-k
  out.append(v%(1<<32))
 return out

def words(seed,n,small=False):
 values=[];s=seed
 for _ in range(n):
  s^=(s<<13)&MASK;s^=s>>17;s^=(s<<5)&MASK;s&=MASK;values.append(s&1023 if small else s)
 return values

def fixture(t,ident,xs,ys,seed,k,mode,timed):
 expected=staged(xs,ys,seed,k,t);assert expected==independent(xs,ys,seed,k,t);nx,ny=len(xs),len(ys);n=min(nx,ny);discarded=nx if t['erased_left']else ny
 return dict(id=ident,task=t['name'],mode=mode,xs=xs,ys=ys,seed=seed,k=k,expected=expected,timed=timed,input_shape=dict(xs=nx,ys=ny,independent_second_list=True,donor_shared_across_recipes=True),acceptance=dict(accepted=n,observed=nx,fraction=n/nx if nx else None,meaning='zip truncation extent; no predicate compaction'),algorithmic_work=dict(discarded_mapper_literal=discarded,discarded_mapper_prior=discarded,discarded_mapper_checked=0,discarded_scans_literal=2*discarded if t['secondary']else 0,discarded_scans_prior=0,discarded_scans_checked=0,selected_mapper=n),count_scope='Mathematical producer-call counts before prior/current proof fusion and backend optimization; selected cores, stages and measured device counters authoritative.')

def fixtures():
 frames=[]
 for t in TASKS:
  for profile in ['low','high']:
   small=profile=='low';seed=512 if small else 0x9e3779b9;k=7
   for nx in [0,1,2,7,32,129,4096,65536]:
    ny=nx+7 if small else nx//3+1
    xs=words(2026113401+(17 if not small else 0),nx,small);ys=words(2026113401^0x6d2b79f5,ny,small)
    frames.append(fixture(t,f'{t["name"]}-{profile}-{nx}',xs,ys,seed,k,profile,nx in [32,4096,65536]))
  edges=[('both-empty',[],[],7,3),('left-empty',[],[1,MASK,7],7,3),('right-empty',[0,1,MASK],[],7,3),('word-boundaries',[0,1,MASK,0x80000000,7],[MASK,7,1,0x80000000,0,3],7,3),('zero-divisor',[0,1,MASK],[MASK,17],7,0),('equal-words',[7,7,7],[7,7,7],7,7),('long-left',[17,3,19,0,12],[MASK,1],10,7),('long-right',[MASK,0],[1,2,3,4,5],MASK,MASK)]
  for label,xs,ys,seed,k in edges:frames.append(fixture(t,t['name']+'-'+label,xs,ys,seed,k,'edge',False))
 return dict(frames=frames,scope='Four recipes, three timed sizes and two value/unequal-shape regimes:24 cells. Complete untimed empty/unequal/wrapping/zero-divisor/equal-word correctness. Independent directly indexed output oracle and explicit full discarded-producer traversal.',seed=2026113401)
