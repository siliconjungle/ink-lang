"""Two filtered-zip cleanup recipes and two uniform-prefix stream recipes."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'knowledge'))
from producers.web_pipeline31_laws import source_functions
MASK=(1<<32)-1
NAMES=['pipeline31_left_projection_u32','pipeline31_right_projection_heldout_u32','pipeline31_uniform_prefix_u32','pipeline31_uniform_prefix_heldout_u32']
SOURCES={name:(t,source)for heldout in [False,True]for name,t,source in source_functions(heldout)}
TASKS=[]
for name in NAMES:
 t,source=SOURCES[name];assert t=='u32';stream='uniform_prefix'in name;secondary='heldout'in name;side=None if stream else('left'if'_left_'in name else'right')
 TASKS.append(dict(name=name,source=source,family='constant_scan_indexed_u32'if stream else'filtered_'+side+'_projection_erasure_u32',list_inputs=1,output_kind='list_u32',secondary=secondary,orientation=side,stream=stream,fresh_proof_required=True,role='uniform-stream-prefix'if stream else'residual-filtered-zip-cleanup',callback_cost=('scalar-quotient'if secondary else'scalar-add')if stream else('quotient+remainder'if secondary else'piecewise-add'),mechanism='constant-stream-scan/indexed-map'if stream else'one-projection-erasure-mechanism/two-orientations'))
def public_spec():return dict(tasks=TASKS,source_scope='Filtered projection recipes have the strongest old-only mapper-erasure composition in both catalogues: fresh effect is residual zip to map. Uniform-prefix recipes remove an unobserved constant map and serial scan through wrapping U32 indexed values. Two projection orientations are one mechanism, and two prefix callbacks are one mechanism. Original stages remain literal; no independent-list alignment or universal backend gain is assumed.')
def discarded(x,seed,k,secondary):return ((x//k+x%k)if k else 0)&MASK if secondary else ((x+k)if x<seed else x-k)&MASK
def selected(x,k):return (k-x if x<k else x+k)&MASK
def step(seed,k,secondary):return ((seed//k if k else 0)+1 if secondary else seed+k)&MASK
def staged(xs,ys,seed,k,t):
 if t['stream']:
  mapped=[step(seed,k,t['secondary'])for _ in xs];out=[];acc=0
  for x in mapped:acc=(acc+x)&MASK;out.append(acc)
  return out
 if t['orientation']=='left':mapped=[discarded(x,seed,k,t['secondary'])for x in xs];accepted=[x for x in xs if x<seed]
 else:accepted=[x for x in xs if x<seed];mapped=[discarded(x,seed,k,t['secondary'])for x in xs]
 return [selected(accepted[i],k)for i in range(min(len(mapped),len(accepted)))]
def independent(xs,ys,seed,k,t):
 if t['stream']:
  c=(((seed//k if k else 0)+1)if t['secondary']else seed+k)%2**32
  return [((i+1)*c)%2**32 for i in range(len(xs))]
 return [((k-x)if x<k else(x+k))%2**32 for x in xs if x<seed]
def words(seed,n):
 values=[];s=seed
 for _ in range(n):
  s^=(s<<13)&MASK;s^=s>>17;s^=(s<<5)&MASK;s&=MASK;values.append(s)
 return values
def fixture(t,ident,xs,seed,k,mode,timed):
 expected=staged(xs,[],seed,k,t);assert expected==independent(xs,[],seed,k,t);n=len(xs);a=len(expected)
 work=dict(uniform_mapper_literal=n,scan_add_literal=n,indexed_mapper_checked=n,uniform_step_literal=n,uniform_step_checked=n)if t['stream']else dict(predicate_literal=n,predicate_fair_prior=n,predicate_checked=n,discarded_mapper_literal=n,discarded_mapper_fair_prior=0,discarded_mapper_checked=0,output_mapper_literal=a,output_mapper_fair_prior=a,output_mapper_checked=a,zip_literal=a,zip_fair_prior=a,zip_checked=0)
 return dict(id=ident,task=t['name'],mode=mode,xs=xs,ys=[],seed=seed,k=k,expected=expected,timed=timed,input_shape=dict(xs=n,ys=0,independent_second_list=False,donor_shared_across_recipes=True),acceptance=dict(accepted=a,observed=n,fraction=a/n if n else None,meaning='full-length uniform stream; low/high are constant regimes'if t['stream']else'filtered output density'),algorithmic_work=work,uniform_step=step(seed,k,t['secondary'])if t['stream']else None,count_scope='Mathematical literal/fair-prior/checked call counts before ordinary JIT/release/driver optimization; emitted manifests and operational counters are authoritative for physical work. Scalar uniform-step recomputation may be optimized by target tools; not an allocation estimate.')
def fixtures():
 frames=[]
 for t in TASKS:
  for profile in ['low','high']:
   if t['stream']:seed,k=(17,7)if profile=='low'else(0x9e3779b9,7)
   else:seed,k=(0x20000001 if profile=='low'else 0xe0000001),7
   for n in [0,1,2,7,32,129,4096,65536]:
    xs=words(2026113101+(17 if profile=='high'else 0),n)
    frames.append(fixture(t,f'{t["name"]}-{profile}-{n}',xs,seed,k,profile,n in [32,4096,65536]))
  edges=[('word-boundaries',[0,1,MASK,0x80000000,6,7,8],7,3),('zero-divisor',[0,1,MASK],7,0),('none-cutoff',[0,1,MASK],0,7),('empty',[],7,3),('all-accepted',[0,1,2,3,10],MASK,7),('nonaligned-subsequence',[17,3,19,0,12],10,7),('wrap-cutoff',[0,1,MASK,0xfffffffe],MASK,MASK),('small-range',list(range(37)),16,7)]
  for label,xs,seed,k in edges:frames.append(fixture(t,t['name']+'-'+label,xs,seed,k,'edge',False))
 return dict(frames=frames,scope='Four recipes x two regimes x sizes32/4096/65536 (24 timed cells). Projection low/high means acceptance; uniform-prefix low/high means small/wrapping scalar constants with full-length output. Deterministic full-width donors shared across recipes. Untimed empty, wrapping, zero-divisor, and nonaligned-subsequence edges. Literal staged Python and independently formulated indexed/filtered oracles agree completely.',seed=2026113101)
