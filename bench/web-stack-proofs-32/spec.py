"""Two paired-scan arithmetic orientations, raw/mapped input contexts."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'knowledge'))
from producers.web_pipeline32_laws import source_functions
MASK=(1<<32)-1
TASKS=[]
for heldout in [False,True]:
 for name,t,source in source_functions(heldout):
  if t!='u32':continue
  subtract='subtract'in name
  TASKS.append(dict(name=name,source=source,family='paired_scan_subtract_reconstruction_u32'if subtract else'paired_scan_add_reconstruction_u32',list_inputs=2,output_kind='list_u32',secondary=heldout,subtract=subtract,fresh_proof_required=True,role='paired-scan-linearity',mechanism='one-scan-linearity-mechanism/two-arithmetic-orientations',callback_cost='quotient+remainder mapped inputs'if heldout else'raw inputs'))
def public_spec():return dict(tasks=TASKS,source_scope='One general wrapping-word scan-linearity mechanism, addition/subtraction orientations, raw/mapped callback contexts. Independent unequal input arrays; source scans full producers before min-length zip. Checked source combines before one scan. No F32 reassociation, padding assumptions, backend change or broad language ranking.')
def left_word(x,seed,k):return ((x//k if k else 0)+seed)&MASK
def right_word(x,seed,k):return ((x%k if k else 0)+k)&MASK
def output_word(x,seed,k):return (x+k if x<seed else x-k)&MASK
def scan(xs):
 acc=0;out=[]
 for x in xs:acc=(acc+x)&MASK;out.append(acc)
 return out
def staged(xs,ys,seed,k,t):
 left=[left_word(x,seed,k)for x in xs]if t['secondary']else list(xs)
 right=[right_word(x,seed,k)for x in ys]if t['secondary']else list(ys)
 a,b=scan(left),scan(right)
 mixed=[(x-y if t['subtract']else x+y)&MASK for x,y in zip(a,b)]
 return [output_word(x,seed,k)for x in mixed]
def independent(xs,ys,seed,k,t):
 # Different mathematical computation: unbounded accumulated pair-differences
 # or pair-sums, reducing only each returned value to the word ring.
 total=0;out=[]
 for a,b in zip(xs,ys):
  if t['secondary']:a=(a//k if k else 0)+seed;b=(b%k if k else 0)+k
  total+=a-b if t['subtract']else a+b
  x=total%2**32;out.append(((x+k)if x<seed else(x-k))%2**32)
 return out
def words(seed,n,small=False):
 values=[];s=seed
 for _ in range(n):
  s^=(s<<13)&MASK;s^=s>>17;s^=(s<<5)&MASK;s&=MASK;values.append(s&1023 if small else s)
 return values
def fixture(t,ident,xs,ys,seed,k,mode,timed):
 expected=staged(xs,ys,seed,k,t);assert expected==independent(xs,ys,seed,k,t);nx,ny=len(xs),len(ys);n=min(nx,ny)
 return dict(id=ident,task=t['name'],mode=mode,xs=xs,ys=ys,seed=seed,k=k,expected=expected,timed=timed,input_shape=dict(xs=nx,ys=ny,independent_second_list=True,donor_shared_across_recipes=True),acceptance=dict(accepted=n,observed=nx,fraction=n/nx if nx else None,meaning='zip truncation extent; no predicate compaction'),algorithmic_work=dict(input_mapper_literal=nx+ny if t['secondary']else 0,input_mapper_checked=nx+ny if t['secondary']else 0,input_mapper_expert=2*n if t['secondary']else 0,scan_add_literal=nx+ny,scan_add_checked=n,pair_operation_literal=n,pair_operation_checked=n,output_mapper_literal=n,output_mapper_checked=n),count_scope='Literal/checked mathematical scalar-call counts before ordinary proof fusion/JIT/release/driver optimization; actual selected cores/stages/counters authoritative. Strong expert traverses only paired prefix; target may still materialize full mapped inputs.')
def fixtures():
 frames=[]
 for t in TASKS:
  for profile in ['low','high']:
   small=profile=='low';seed=512 if small else 0x9e3779b9;k=7
   for nx in [0,1,2,7,32,129,4096,65536]:
    ny=nx+7 if small else nx//3+1
    xs=words(2026113201+(17 if not small else 0),nx,small);ys=words(2026113201^0x6d2b79f5,ny,small)
    frames.append(fixture(t,f'{t["name"]}-{profile}-{nx}',xs,ys,seed,k,profile,nx in [32,4096,65536]))
  edges=[('both-empty',[],[],7,3),('left-empty',[],[1,MASK,7],7,3),('right-empty',[0,1,MASK],[],7,3),('word-boundaries',[0,1,MASK,0x80000000,7],[MASK,7,1,0x80000000,0,3],7,3),('zero-divisor',[0,1,MASK],[MASK,17],7,0),('equal-words',[7,7,7],[7,7,7],7,7),('long-left',[17,3,19,0,12],[MASK,1],10,7),('long-right',[MASK,0],[1,2,3,4,5],MASK,MASK)]
  for label,xs,ys,seed,k in edges:frames.append(fixture(t,t['name']+'-'+label,xs,ys,seed,k,'edge',False))
 return dict(frames=frames,scope='Four contexts x three sizes x two joint value/shape regimes (24timedcells). Low small-word independent arrays: ys=xs_length+7; high full-width: ys=floor(xs_length/3)+1. Captures seed512/0x9e3779b9,k7. No selectivity meaning. Untimed both-empty/one-empty/unequal/wrapping/zero-divisor/equal-word fixtures. Literal two complete scans versus independent unbounded combined-prefix oracle.',seed=2026113201)
