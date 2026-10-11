"""Frozen four vector recipes, two acceptance cohorts and independent lists.
Stage/callback counts are algorithmic models, not allocation measurements.
"""
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'knowledge'))
from producers.web_pipeline30_laws import source_functions
MASK=(1<<32)-1
TASKS=[]
for secondary in [False,True]:
 for name,t,source in source_functions(secondary):
  if t!='u32':continue
  merged='merged' in name;family='concat_filter_transport_u32' if merged else 'map_filter_map_transport_u32'
  TASKS.append(dict(name=name,source=source,family=family,list_inputs=2 if merged else 1,output_kind='list_u32',secondary=secondary,fresh_proof_required=True,role='candidate-stage-transport',callback_cost='quotient/remainder' if secondary else 'comparison/piecewise-add'))
def public_spec():return dict(tasks=TASKS,source_scope='Two universal pure ordered vector transport laws; primary and independent secondary callback instantiations. Every cohort is frozen before performance; model-declined candidates are explicit unchanged controls.')
def predicate(x,seed,k,secondary):return (x%k if k else 0)<seed if secondary else x<seed
def mapper(x,seed,k,secondary):return (x+(x//k if k else 0))&MASK if secondary else ((x+k) if x<seed else (x-k))&MASK
def repair(x,seed,k,secondary):return ((k-x) if x<k else x*k+1)&MASK if secondary else ((seed-x) if x<seed else x+seed)&MASK
def staged(xs,ys,seed,k,t):
 secondary=t['secondary']
 if t['list_inputs']==2:
  left=[x for x in xs if predicate(x,seed,k,secondary)];right=[x for x in ys if predicate(x,seed,k,secondary)];return left+right
 calibrated=[mapper(x,seed,k,secondary) for x in xs];accepted=[x for x in calibrated if x<seed];return [repair(x,seed,k,secondary) for x in accepted]
def independent(xs,ys,seed,k,t):
 out=[]
 if t['list_inputs']==2:
  for values in (xs,ys):
   for x in values:
    accepted=((x-(x//k)*k) if k else 0)<seed if t['secondary'] else x<seed
    if accepted:out.append(x)
 else:
  for x in xs:
   y=(x+(0 if k==0 else divmod(x,k)[0]))%2**32 if t['secondary'] else (x+(k if x<seed else -k))%2**32
   if y<seed:
    z=(k-y if y<k else y*k+1) if t['secondary'] else (seed-y if y<seed else y+seed)
    out.append(z%2**32)
 return out
def words(seed,n):
 values=[];s=seed
 for _ in range(n):
  s^=(s<<13)&MASK;s^=s>>17;s^=(s<<5)&MASK;s&=MASK;values.append(s)
 return values
def fixture(t,ident,xs,ys,seed,k,mode,timed):
 expected=staged(xs,ys,seed,k,t);assert expected==independent(xs,ys,seed,k,t)
 n=len(xs)+len(ys) if t['list_inputs']==2 else len(xs);a=len(expected)
 return dict(id=ident,task=t['name'],mode=mode,xs=xs,ys=ys,seed=seed,k=k,expected=expected,timed=timed,input_shape=dict(xs=len(xs),ys=len(ys),independent_second_list=t['list_inputs']==2),acceptance=dict(accepted=a,observed=n,fraction=a/n if n else None),algorithmic_work=dict(predicate_original=n,predicate_selected=n,mapper_original=len(xs) if t['list_inputs']==1 else 0,mapper_transport_candidate=len(xs)+a if t['list_inputs']==1 else 0,concat_copied_source=a if t['list_inputs']==2 else 0,concat_copied_transport_candidate=n if t['list_inputs']==2 else 0),count_scope='Literal/transport mathematical operation counts before ordinary JIT/release/driver optimization; not measured allocation bytes')
def fixtures():
 frames=[]
 for ti,t in enumerate(TASKS):
  for profile in ['low','high']:
   if t['list_inputs']==2 and t['secondary']:seed,k=(10 if profile=='low' else 80),97
   else:seed,k=(0x20000001 if profile=='low' else 0xe0000001),7
   for n in [0,1,2,7,32,129,4096,65536]:
    xs=words(2026113001+ti*1009+(17 if profile=='high' else 0),n);yn=n*3//4 if t['list_inputs']==2 else 0;ys=words(2026113033+ti*2003+(31 if profile=='high' else 0),yn)
    # Timed donors remain independent full-width streams, with no branch injection.
    frames.append(fixture(t,f'{t["name"]}-{profile}-{n}',xs,ys,seed,k,profile,n in [32,4096,65536]))
  for label,xs,ys,seed,k in [('word-boundaries',[0,1,MASK,0x80000000,6,7,8],[9,0,MASK],7,3),('zero-divisor',[0,1,MASK],[1,2,3,4],7,0),('none-cutoff',[0,1,MASK],[4,2],0,7),('empty-left',[],[0,1,MASK],7,3),('empty-right',[0,MASK,8],[],7,3),('independent-unequal',[17,3,19,0,12],[MASK],10,7),('wrap-cutoff',[0,1,MASK,0xfffffffe],[7,8],MASK,MASK),('small-range',list(range(37)),list(range(11,29)),16,7)]:
   frames.append(fixture(t,t['name']+'-'+label,xs,ys if t['list_inputs']==2 else [],seed,k,'edge',False))
 return dict(frames=frames,scope='Four source recipes × two full-width low/high acceptance cohorts × sizes32/4096/65536. Independent xs/ys xorshift streams and fixed3:4 length ratio; empty/imbalanced/divisor-zero/wrapping/small-range edge fixtures. Original eager stages agree with independently fused integer oracle.',seed=2026113001)
