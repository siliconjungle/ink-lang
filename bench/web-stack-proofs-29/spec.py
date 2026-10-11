"""Exact frozen recipes; independently built finite staged/full-value oracle."""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'knowledge'))
from producers.web_pipeline29_laws import source_functions
MASK=(1<<32)-1
TASKS=[]
for name,t,source in source_functions():
 if t!='u32':continue
 family=name.split('_')[1];TASKS.append(dict(name=name,source=source,family=family,list_inputs=2 if family=='merged' else 1,output_kind='list_u32' if family=='merged' else 'u64',fresh_proof_required=family!='merged',role='existing-mathematics-reference' if family=='merged' else 'new-cardinality-work-erasure'))
def public_spec():return dict(tasks=TASKS,source_scope='Two new cardinality mechanisms and one existing concat-map fusion reference; helpers retain exact source module context')
def passes(x,seed,k):return x<k if x<seed else x>k
def calibration(x,seed,k):return ((x*k+seed) if x<seed else x-k)&MASK
def staged(xs,ys,seed,k,family):
 if family=='merged':return [calibration(x,seed,k) for x in xs]+[calibration(x,seed,k) for x in ys]
 accepted=[x for x in xs if passes(x,seed,k)]
 if family=='scan':
  result=[];acc=0
  for x in accepted:acc=(acc+x)&MASK;result.append(acc)
 else:
  result=[]
  for i,x in enumerate(accepted):result.append(((x*k+seed) if i%3==0 else (seed-x if x<seed else x+k))&MASK)
 return str(len(result))
def independent(xs,ys,seed,k,family):
 if family=='merged':
  result=[]
  for x in xs+ys:result.append((x*k+seed)%2**32 if x<seed else (x-k)%2**32)
  return result
 return str(sum(1 for x in xs if ((x<seed and x<k) or (x>=seed and x>k))))
def words(seed,n,small):
 values=[];s=seed
 for _ in range(n):
  s^=(s<<13)&MASK;s^=s>>17;s^=(s<<5)&MASK;s&=MASK;values.append(s%1024 if small else s)
 return values
def fixtures():
 frames=[]
 for ti,t in enumerate(TASKS):
  for mode in ['small','full']:
   seed,k=(512,768) if mode=='small' else (0x80000001,0xc0000001)
   for n in [0,1,2,7,32,129,4096,65536]:
    xs=words(2026112901+ti*1009,n,mode=='small');yn=0 if t['list_inputs']==1 else n*3//4;ys=words(2026112933+ti*2003,yn,mode=='small')
    edge=[0,1,seed-1,seed,k-1,k,k+1,MASK,0x80000000];xs[:min(n,len(edge))]=edge[:min(n,len(edge))]
    expected=staged(xs,ys,seed,k,t['family']);assert expected==independent(xs,ys,seed,k,t['family'])
    frames.append(dict(id=f'{t["name"]}-{mode}-{n}',task=t['name'],mode=mode,xs=xs,ys=ys,seed=seed,k=k,expected=expected,timed=n in [32,4096,65536]))
  # Independent validation fixtures cover exact empty/unequal lists, all/none
  # acceptance and wrap boundaries. None of these extra profiles are timed.
  for label,xs,ys,seed,k in [('edge-all',[0,1,MASK,0x80000000],[9,0,MASK],7,3),('edge-none',[0,1,MASK],[1,2,3,4],0,MASK),('empty-left',[],[0,1,MASK],7,3),('empty-right',[0,MASK,8],[],7,3),('independent-unequal',[17,3,19,0,12],[MASK],10,7)]:
   ys=ys if t['list_inputs']==2 else [];expected=staged(xs,ys,seed,k,t['family']);assert expected==independent(xs,ys,seed,k,t['family']);frames.append(dict(id=t['name']+'-'+label,task=t['name'],mode='edge',xs=xs,ys=ys,seed=seed,k=k,expected=expected,timed=False))
 return dict(frames=frames,scope='Independent xorshift streams per recipe/list; preset small/full parameters; unequal independent second arrays; original eager stages and independently classified count/mathematical mapper agree',seed=2026112901)
