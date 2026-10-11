"""Ordered scalar reductions: eager staged versus recursive suffix oracle."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'knowledge'))
from producers.web_pipeline36_laws import source_functions
MASK=(1<<32)-1
TASKS=[]
for composed in [False,True]:
 for name,t,source in source_functions(composed):
  if t!='u32':continue
  family=next(x for x in ['plain','nested','filtered','concat']if '_'+x+'_'in name)
  TASKS.append(dict(name=name,source=source,family=family,list_inputs=2,output_kind='scalar_u32',secondary=composed,ys_used=family=='concat',fresh_proof_required=True,role='helper-bound-ordered-fold-deployment',mechanism='existing-general-laws-with-source-helper-context',callback_cost='quot/rem and accumulator-dependent choose; exact descending order'))
def public_spec():return dict(tasks=TASKS,result_kind='scalar_u32',source_scope='Four source deployment certificates for existing admitted arbitrary ordered folds; no new generic mathematics. Plain/nested/filter-before-map/differently-mapped concat contexts. Last-to-first accumulator order, original filter predicate and concat suffix-before-prefix preserved. Composition probes are not statistical holdouts.')
def left_word(x,seed,k):return ((x//k if k else 0)+seed)&MASK
def right_word(x,seed,k):return ((x%k if k else 0)+k)&MASK
def post_word(x,seed,k):return (x+k if x<seed else x-k)&MASK
def accept(x,seed,k):return (x%k if k else 0)<seed
def reduce_word(x,acc,seed,k):return (x+acc*k if acc<seed else x-acc)&MASK
def sequence(xs,ys,seed,k,t):
 selected=[x for x in xs if accept(x,seed,k)]if t['family']=='filtered'else list(xs)
 values=[left_word(x,seed,k)for x in selected]
 if t['family']=='nested':values=[post_word(x,seed,k)for x in values]
 if t['family']=='concat':values += [right_word(y,seed,k)for y in ys]
 return values

def staged(xs,ys,seed,k,t):
 acc=seed
 for value in reversed(sequence(xs,ys,seed,k,t)):acc=reduce_word(value,acc,seed,k)
 return acc

def independent(xs,ys,seed,k,t):
 # Balanced recursive suffix evaluation has logarithmic stack depth. It indexes
 # original inputs, computes maps with divmod and unbounded arithmetic, and
 # visits the right half before the left without constructing mapped lists.
 length=len(xs)+(len(ys)if t['family']=='concat'else 0)
 def suffix(begin,end,acc):
  if begin==end:return acc
  if end-begin>1:
   mid=(begin+end)//2;return suffix(begin,mid,suffix(mid,end,acc))
  if begin<len(xs):
   x=xs[begin];q,r=divmod(x,k)if k else (0,0)
   if t['family']=='filtered' and not r<seed:return acc
   value=(q+seed)%(1<<32)
   if t['family']=='nested':value=(value+(k if value<seed else -k))%(1<<32)
  else:
   _,r=divmod(ys[begin-len(xs)],k)if k else (0,0);value=(r+k)%(1<<32)
  return (value+(acc*k if acc<seed else -acc))%(1<<32)
 return suffix(0,length,seed)

def forward_wrong(xs,ys,seed,k,t):
 acc=seed
 for value in sequence(xs,ys,seed,k,t):acc=reduce_word(value,acc,seed,k)
 return acc

def words(seed,n,small=False):
 values=[];s=seed
 for _ in range(n):
  s^=(s<<13)&MASK;s^=s>>17;s^=(s<<5)&MASK;s&=MASK;values.append(s&1023 if small else s)
 return values

def fixture(t,ident,xs,ys,seed,k,mode,timed):
 expected=staged(xs,ys,seed,k,t);assert expected==independent(xs,ys,seed,k,t);nx,ny=len(xs),len(ys);accepted=sum(accept(x,seed,k)for x in xs)if t['family']=='filtered'else nx+(ny if t['family']=='concat'else 0);observed=nx+(ny if t['family']=='concat'else 0)
 return dict(id=ident,task=t['name'],mode=mode,xs=xs,ys=ys,seed=seed,k=k,expected=expected,timed=timed,result_kind='scalar_u32',input_shape=dict(xs=nx,ys=ny,ys_observed=t['ys_used'],unused_ys_transport_retained=True,concat_order='ys descending then xs descending'if t['ys_used']else None),acceptance=dict(accepted=accepted,observed=observed,fraction=accepted/observed if observed else None,meaning='original-input predicate acceptance'if t['family']=='filtered'else'ordered reducer element count'),algorithmic_work=dict(mapper_calls_literal=2*nx if t['family']=='nested'else accepted,mapper_calls_strong_expert=2*nx if t['family']=='nested'else accepted,predicate_calls=nx if t['family']=='filtered'else 0,reducer_calls=accepted,fold_direction='last-to-first'),count_scope='Source mathematical callback counts; checked expression grouping, emitted routes and physical device counters authoritative.')

def fixtures():
 frames=[]
 for t in TASKS:
  for profile in ['low','high']:
   small=profile=='low';seed=(2 if small else 6)if t['family']=='filtered'else(512 if small else 0x9e3779b9);k=7
   for nx in [0,1,2,7,32,129,4096,65536]:
    ny=nx+7 if small else nx//3+1;xs=words(2026113601+(17 if not small else 0),nx,small);ys=words(2026113601^0x6d2b79f5,ny,small)
    frames.append(fixture(t,f'{t["name"]}-{profile}-{nx}',xs,ys,seed,k,profile,nx in [32,4096,65536]))
  edges=[('both-empty',[],[],7,3),('left-empty',[],[1,MASK,7],7,3),('right-empty',[0,1,MASK],[],7,3),('word-boundaries',[0,1,MASK,0x80000000,7],[MASK,7,1,0x80000000,0,3],7,3),('zero-divisor',[0,1,MASK],[MASK,17],7,0),('all-rejected',[7,7,7],[7,7,7],0,7),('long-left',[17,3,19,0,12],[MASK,1],10,7),('long-right',[MASK,0],[1,2,3,4,5],MASK,MASK)]
  for label,xs,ys,seed,k in edges:frames.append(fixture(t,t['name']+'-'+label,xs,ys,seed,k,'edge',False))
 negative=[]
 for t in TASKS:
  f=next(f for f in frames if f['task']==t['name'] and forward_wrong(f['xs'],f['ys'],f['seed'],f['k'],t)!=f['expected']);negative.append(dict(task=t['name'],frame=f['id'],correct=f['expected'],incorrect_forward=forward_wrong(f['xs'],f['ys'],f['seed'],f['k'],t),forward_order_rejected=True))
 return dict(frames=frames,negative_order_controls=negative,scope='4recipes×3sizes×2joint word/shape/seed regimes=24timedcells;96complete scalar fixtures. Filter seed2/6 withk7 gives different acceptance regimes; other seeds512/0x9e3779b9. Not independently crossed selectivity. Staged descending loop agrees with recursive suffix oracle; forward-order controls disagree. ABI retains both lists even when ys unobserved.',seed=2026113601)
