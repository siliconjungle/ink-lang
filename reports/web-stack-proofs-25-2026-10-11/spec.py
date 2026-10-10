"""Repair pipelines and independently labelled backend regression references."""
import re
TASKS=[]
for held in [False,True]:
 p='choose(x<seed,rem_or(seed-x,k,0),rem_or(x-seed,k,0))<quot_or(k,2,0)' if held else 'rem_or(x,seed,0)<k'
 f='choose(x>k,x*k-seed,seed+x)' if held else 'choose(x<seed,seed-x,x+seed)'
 g='choose(x<k,x+seed,x-k)' if held else 'choose(x>seed,x-seed,x*k)'
 for scalar in [False,True]:
  TASKS.append(dict(name=('accepted_checksum' if scalar else 'accepted_repair')+('_heldout' if held else '')+'_u32',generic_family='accepted_branch_map_u32',cohort='heldout' if held else 'discovery',operation='repair_fold' if scalar else 'repair',predicate=p,mapper=f,rejected_mapper=g,reducer='choose(a<seed,x+a*k,x-a)',output='u32' if scalar else 'list_u32',fresh_proof_required=True,proof_role='new accepted-branch simplification, deployment through existing ordered folds if selected'))
for held in [False,True]:
 TASKS.append(dict(name='skip_first_accepted_u32'+('_heldout' if held else ''),generic_family='skip_first_accepted_u32',cohort='heldout' if held else 'reference',operation='first_accepted',predicate='x<k' if held else 'x>seed',output='u32',fresh_proof_required=False,proof_role='existing23 first-match law; legacy-emitter backend reference'))
TASKS.append(dict(name='demand_filtered_mapped_head_u32',generic_family='demand_filtered_mapped_head_u32',cohort='reference',operation='filtered_mapped_head',mapper='choose(x>k,x*k+seed,seed-x)',predicate='x>seed',output='u32',fresh_proof_required=False,proof_role='existing24 demand proof; compute scalar bridge regression reference'))
TASKS.append(dict(name='reference_indexed_u32',generic_family=None,cohort='reference',operation='indexed',mapper='choose(rem_or(i,2,0)==0,x+k,x-seed)',output='list_u32',fresh_proof_required=False,proof_role='unchanged indexed/GPU and U32 borrowed-ingress reference'))
TASKS.append(dict(name='accepted_total_u32',generic_family='accepted_branch_sum_u32',cohort='discovery',operation='repair_sum',predicate='rem_or(x,seed,0)<k',mapper='choose(x<seed,seed-x,x+seed)',rejected_mapper='choose(x>seed,x-seed,x*k)',output='u32',fresh_proof_required=True,proof_role='checked accepted-map plus existing predicated mapped-sum composition; actual GPU manifest determines scope'))
for i,t in enumerate(TASKS):t.update(index=i,list_inputs=1)
def fallback(t):return re.sub(r'\bx\b','seed',t['mapper'])
def source(t):
 op=t['operation']
 if op in ['repair','repair_fold','repair_sum']:
  pipeline='xs.filter(fn(x)=>'+t['predicate']+').map(fn(x)=>choose('+t['predicate']+','+t['mapper']+','+t['rejected_mapper']+'))'
  body='foldr('+pipeline+',seed,fn(x)=>fn(a)=>'+t['reducer']+')' if op=='repair_fold' else 'sum('+pipeline+')' if op=='repair_sum' else pipeline
 elif op=='first_accepted':body='xs.filter(fn(x)=>'+t['predicate']+').at_or(0,seed)'
 elif op=='filtered_mapped_head':body='xs.filter(fn(x)=>'+t['predicate']+').map(fn(x)=>'+t['mapper']+').at_or(0,'+fallback(t)+')'
 else:body='xs.map_indexed(fn(i)=>fn(x)=>'+t['mapper']+')'
 result='List<u32>' if t['output']=='list_u32' else t['output']
 return f'pub fn {t["name"]}(xs:List<u32>,seed:u32,k:u32)->{result}{{return {body};}}'
def public_spec():
 return dict(schema=3,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,output_kind=t['output'],list_inputs=['xs'],params=['xs','seed','k'],scalar=t['output']!='list_u32',scalar_words=1,result_length='accepted predicate count' if t['operation']=='repair' else 'xs.length' if t['operation']=='indexed' else 'one scalar word') for t in TASKS],matrix=dict(backends=['old','new'],proof_states=['prior','checked'],bundle_pattern='{backend}/{proof_state}/{task}',frozen_core='one prior/current selection per task, recompiled unchanged by both backend/host bundles'),scope='Five accepted repair/ordered-checksum/total recipes plus four backend/GPU references. Backend includes emitter, Wasm exports and CPU bridge refinements, not just C code. All single-list trusted ABI. Fixed per-distribution parameters across32/65536 timings;4096 correctness only. Three lookup references cover first/interior/last/absent. Variable vector repair length is validated completely. Experts fuse filter/map; ordered checksum retains exact reverse accepted order and accumulator-dependent branch. Original staged JS/Rust validate only. Full captured calls and synchronous borrowed JS/native resident are separate boundaries. U32 compute borrowing already exists; Bool borrowing has separate author evidence. Actual GPU coverage and dedup are manifest-derived; no general superiority claim.')
