"""Backend/proof factorial demand consumers; single-list trusted ABI."""
import re
TASKS=[]
for filtered in [False,True]:
 for held in [False,True]:
  family='demand_filtered_mapped_head' if filtered else 'demand_mapped_head'
  mapper='choose(x<k,x*x+seed,(x-seed)*(x+k))' if held else 'choose(x>k,x*k+seed,seed-x)'
  TASKS.append(dict(name=family+('_heldout' if held else '')+'_u32',generic_family=family+'_u32',cohort='heldout' if held else 'discovery',operation='filtered_mapped_head' if filtered else 'mapped_head',mapper=mapper,predicate='x<k' if held else 'x>seed',output='u32',fresh_proof_required=True,proof_role='pending fair-prior source derivation'))
for held in [False,True]:
 TASKS.append(dict(name='skip_first_accepted_u32'+('_heldout' if held else ''),generic_family='skip_first_accepted_u32',cohort='heldout' if held else 'discovery',operation='first_accepted',predicate='x<k' if held else 'x>seed',output='u32',fresh_proof_required=False,proof_role='existing23 law; backend attribution reference'))
TASKS.append(dict(name='reference_count_u32',generic_family=None,cohort='reference',operation='count',output='u64',fresh_proof_required=False,proof_role='unchanged O(1) cardinality reference'))
TASKS.append(dict(name='reference_indexed_u32',generic_family=None,cohort='reference',operation='indexed',mapper='choose(rem_or(i,2,0)==0,x+k,x-seed)',output='list_u32',fresh_proof_required=False,proof_role='unchanged direct indexed vector/GPU reference'))
for i,t in enumerate(TASKS):t.update(index=i,list_inputs=1)
def fallback(t):return re.sub(r'\bx\b','seed',t['mapper'])
def source(t):
 op=t['operation']
 if op in ['mapped_head','filtered_mapped_head']:
  body='xs'+('.filter(fn(x)=>'+t['predicate']+')' if op=='filtered_mapped_head' else '')+'.map(fn(x)=>'+t['mapper']+').at_or(0,'+fallback(t)+')'
 elif op=='first_accepted':body='xs.filter(fn(x)=>'+t['predicate']+').at_or(0,seed)'
 elif op=='count':body='count(xs)'
 else:body='xs.map_indexed(fn(i)=>fn(x)=>'+t['mapper']+')'
 result='List<u32>' if t['output']=='list_u32' else t['output']
 return f'pub fn {t["name"]}(xs:List<u32>,seed:u32,k:u32)->{result}{{return {body};}}'
def public_spec():
 return dict(schema=3,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,output_kind=t['output'],list_inputs=['xs'],params=['xs','seed','k'],scalar=t['output']!='list_u32',scalar_words=2 if t['output']=='u64' else 1,result_length='xs.length' if t['output']=='list_u32' else 'two scalar words' if t['output']=='u64' else 'one scalar word') for t in TASKS],matrix=dict(backends=['old','new'],proof_states=['prior','checked'],bundle_pattern='{backend}/{proof_state}/{task}',frozen_core='one prior/current selection per task, recompiled unchanged by both backends'),scope='Eight single-list recipes: four new transformed-fallback head transports, two existing first-accepted backend attribution controls, unchanged U64 count and direct indexed reference. Timed lookup first/interior/last/absent at32/65536 andsmall/full;4096 correctness only. Exact prior/current cores are shared across old/new compilers; full capture and separately synchronous borrowed JS are different boundaries. Strong expert first lookup uses forward early exit and mapper once after selection. Staged algorithms validate only. GPU byte-distinct reference representatives are measured with complete transfers and counters; no fresh GPU emitter claim or general language superiority.')
