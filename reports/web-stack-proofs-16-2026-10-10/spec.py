"""Exact round15 cohort plus frozen independent word/reducer instantiations."""
import importlib.util
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
p=ROOT/'bench/web-stack-proofs-15/spec.py'
s=importlib.util.spec_from_file_location('round15_spec',p);base=importlib.util.module_from_spec(s);s.loader.exec_module(base)
TASKS=[dict(t,primary=True,generic_family="") for t in base.TASKS]
MAPPERS=dict(base.MAPPERS)
for heldout in [False,True]:
 suffix='_heldout' if heldout else ''
 f='x*x+seed' if heldout else 'choose(x<seed,seed-x,x-seed)'
 p='x>k' if heldout else 'x<seed'
 for family,combine,masked in [('shared_contribution_add','add',False),('shared_contribution_subtract','subtract',False),('masked_contribution_add','add',True)]:
  name=family+'_u32'+suffix
  contribution=f'({f})*k'+('-' if combine=='subtract' else '+')+f'({f})*seed'
  if masked:contribution=f'choose({p},{contribution},0)'
  body=f'sum(xs.map(fn(x)=>{contribution}))'
  TASKS.append(dict(name=name,primary=False,extension='weight',cohort='heldout' if heldout else 'discovery',family=family,generic_family=family+'_u32',mapper_expression=f,predicate_expression=p,combine=combine,masked=masked,contribution=contribution,body=body,output='u32',list_inputs=1,donor='accepted_total_heldout' if heldout else 'accepted_total'))
for heldout in [False,True]:
 suffix='_heldout' if heldout else ''
 mapper='choose(x<seed,seed-x,x-seed)' if heldout else 'x*3+k'
 pred='x>k' if heldout else 'x<seed'
 reducer='choose(a<seed,x-a,x+a)' if heldout else 'choose(x<quot_or(seed,2,0),x+a*k,x-a)'
 for family,pipeline in [('filtered_arbitrary_fold','filter'),('mapped_filtered_arbitrary_fold','map_filter'),('filtered_mapped_arbitrary_fold','filter_map')]:
  name=family+'_u32'+suffix;sequence='xs'
  for stage in {'filter':['filter'],'map_filter':['map','filter'],'filter_map':['filter','map']}[pipeline]:sequence+=f'.map(fn(x)=>{mapper})' if stage=='map' else f'.filter(fn(x)=>{pred})'
  TASKS.append(dict(name=name,primary=False,extension='ordered',cohort='heldout' if heldout else 'discovery',family=family,generic_family=family+'_u32',mapper_expression=mapper,predicate_expression=pred,reducer_expression=reducer,pipeline=pipeline,body=f'foldr({sequence},seed,fn(x)=>fn(a)=>{reducer})',output='u32',list_inputs=1,donor='accepted_total_heldout' if heldout else ('calibrated_accepted_total' if pipeline=='map_filter' else 'accepted_total')))
def predicate(t):return base.predicate(t)
def source(t):
 if t['primary']:return base.source(t)
 return f'pub fn {t["name"]}(xs:List<u32>,seed:u32,k:u32)->u32{{return {t["body"]};}}'
def public_spec():
 return dict(schema=1,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,index=i,output_kind='u32',list_inputs=['xs'],params=['xs','seed','k'],scalar=True,scalar_words=1,fresh_proof_required=not t['primary']) for i,t in enumerate(TASKS)],scope='Exact18-task round15 cohort plus6shared-weight and6ordered-reducer instances. Primary234fixture bytes/IDs retained; extensions reuse archived input arrays with new expectations. Pure total callbacks; timedU32 only. SameCPU cost model prior/current; CPU and GPU use separate same-store checked selections under their respective frozen models. No general language ranking.')
