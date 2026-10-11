"""Two fresh invariant folds and seven independently labelled backend references."""
TASKS=[]
for held in [False,True]:
 TASKS.append(dict(name='invariant_fold'+('_heldout' if held else '')+'_u32',generic_family='invariant_two_branch_fold_u32',cohort='heldout' if held else 'discovery',operation='invariant_fold',gate='seed<k',yes='choose(x<seed,a*k+x,a-x)' if held else 'choose(a<seed,x+a*k,x-a)',no='choose(a<k,x*k+a,x-a*seed)' if held else 'choose(a>k,a-x*seed,a+x)',output='u32',fresh_proof_required=True,proof_role='new two-live-branch invariant control hoisting; both branches still traverse',list_inputs=1))
for scalar in [False,True]:
 TASKS.append(dict(name='accepted_checksum_u32' if scalar else 'accepted_repair_u32',generic_family=None,cohort='reference',operation='repair_fold' if scalar else 'repair',predicate='rem_or(x,seed,0)<k',mapper='choose(x<seed,seed-x,x+seed)',rejected_mapper='choose(x>seed,x-seed,x*k)',reducer='choose(a<seed,x+a*k,x-a)',output='u32' if scalar else 'list_u32',fresh_proof_required=False,proof_role='unchanged25 filtered repair/ordered checksum backend reference',list_inputs=1))
TASKS.extend([
 dict(name='paired_calibrated_u32',generic_family=None,cohort='reference',operation='zip_map',combine='choose(a<seed,a+b*k,a-b*k)',postmap='choose(v>k,v-seed,v+seed)',output='list_u32',list_inputs=2,proof_role='existing20 independent min-length zip/postmap deployment'),
 dict(name='skip_first_accepted_u32',generic_family=None,cohort='reference',operation='first_accepted',predicate='x>seed',output='u32',list_inputs=1,proof_role='existing23 first-match backend reference; four match positions'),
 dict(name='paired_ordered_score_u32',generic_family=None,cohort='reference',operation='zip_fold',combine='choose(a<seed,a+b*k,a-b*k)',reducer='choose(acc<seed,v-acc,v+acc*k)',output='u32',list_inputs=1,proof_role='existing20 ordered self-zip/fold backend reference'),
 dict(name='reference_indexed_u32',generic_family=None,cohort='reference',operation='indexed',mapper='choose(rem_or(i,2,0)==0,x+k,x-seed)',output='list_u32',list_inputs=1,proof_role='unchanged indexed/GPU reference'),
 dict(name='reference_modular_mix_u32',generic_family=None,cohort='reference',operation='modular_mix',stages=16,modulus=4294967291,output='list_u32',list_inputs=1,proof_role='fixed64-operation dependent modular-mix map; not a new proof or cryptographic claim')])
for i,t in enumerate(TASKS):t.update(index=i,fresh_proof_required=t.get('fresh_proof_required',False))
def mix_expression():
 v='x+seed'
 for j in range(16):v=f'rem_or(({v})*(k+{2*j+1})+x,4294967291,seed)'
 return v
def source(t):
 op=t['operation']
 if op=='invariant_fold':body='foldr(xs,seed,fn(x)=>fn(a)=>choose('+t['gate']+','+t['yes']+','+t['no']+'))'
 elif op in ['repair','repair_fold']:
  pipeline='xs.filter(fn(x)=>'+t['predicate']+').map(fn(x)=>choose('+t['predicate']+','+t['mapper']+','+t['rejected_mapper']+'))'
  body='foldr('+pipeline+',seed,fn(x)=>fn(a)=>'+t['reducer']+')' if op=='repair_fold' else pipeline
 elif op=='first_accepted':body='xs.filter(fn(x)=>'+t['predicate']+').at_or(0,seed)'
 elif op=='zip_map':body='xs.zip(ys,fn(a)=>fn(b)=>'+t['combine']+').map(fn(v)=>'+t['postmap']+')'
 elif op=='zip_fold':body='foldr(xs.zip(xs,fn(a)=>fn(b)=>'+t['combine']+'),seed,fn(v)=>fn(acc)=>'+t['reducer']+')'
 elif op=='modular_mix':body='xs.map(fn(x)=>modular_mix_word(x,seed,k))'
 else:body='xs.map_indexed(fn(i)=>fn(x)=>'+t['mapper']+')'
 params='xs:List<u32>,'+('ys:List<u32>,' if t['list_inputs']==2 else '')+'seed:u32,k:u32'
 definition=f'pub fn {t["name"]}({params})->'+('List<u32>' if t['output']=='list_u32' else t['output'])+'{return '+body+';}'
 if op=='modular_mix':
  helper='fn modular_mix_word(x:u32,seed:u32,k:u32)->u32{let v0:u32=x+seed;'
  for j in range(16):helper+=f'let v{j+1}:u32=rem_or(v{j}*(k+{2*j+1})+x,4294967291,seed);'
  definition+='\n'+helper+'return v16;}'
 return definition
def public_spec():
 return dict(schema=3,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,output_kind=t['output'],list_inputs=['xs','ys'] if t['list_inputs']==2 else ['xs'],params=['xs','ys','seed','k'] if t['list_inputs']==2 else ['xs','seed','k'],scalar=t['output']!='list_u32',scalar_words=1,result_length='accepted predicate count' if t['operation']=='repair' else 'min(xs.length,ys.length)' if t['operation']=='zip_map' else 'xs.length' if t['output']=='list_u32' else 'one scalar word') for t in TASKS],matrix=dict(backends=['old','new'],proof_states=['prior','checked'],bundle_pattern='{backend}/{proof_state}/{task}',frozen_core='one prior/current selection per task, recompiled unchanged by both backend bundles'),scope='Two fresh invariant folds with two live ordered branches, seven unchanged backend references: filtered repair, ordered checksum/selfzip, independent min-length zip, first-match, indexed and dependent modular mix.56 matched cells;32/65536 timing and4096 correctness only. Invariant profiles exercise both scalar flag outcomes; both traverse. One two-list natural ABI, others single-list. Full snapshots and synchronous borrowed boundaries separate. Strong experts hoist gates/invariant multipliers and fuse only valid original semantics. Original staged controls validation-only. Fixed recipes and callback instances are not a broad application corpus or universal language ranking; actual GPU/fallback attribution manifest-derived.')

def fallback(t):
 import re
 return re.sub(r'\bx\b','seed',t['mapper'])
