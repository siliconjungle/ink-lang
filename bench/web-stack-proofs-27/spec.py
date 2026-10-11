"""Two independent nested-zip proofs and six named-helper backend references."""
TASKS=[]
for side in ['left','right']:
 TASKS.append(dict(name='aligned_'+side+'_pair_u32',operation='nested_zip',side=side,generic_family='aligned_'+side+'_nested_zip_u32',cohort='discovery',combine='choose(a<seed,a+b*k,a-b)',outer='choose(v<seed,v+x*k,v-x)',output='list_u32',list_inputs=2,fresh_proof_required=True,proof_role='new arbitrary independent nested-zip fusion; preserves min lengths and callback order'))
TASKS.extend([
 dict(name='helper_calibrated_map_u32',operation='helper_map',list_inputs=1,output='list_u32'),
 dict(name='helper_indexed_calibration_u32',operation='helper_indexed',list_inputs=1,output='list_u32'),
 dict(name='helper_ordered_checksum_u32',operation='helper_fold',list_inputs=1,output='u32'),
 dict(name='helper_accepted_projection_u32',operation='helper_filter_map',list_inputs=1,output='list_u32'),
 dict(name='helper_independent_pair_u32',operation='helper_zip',list_inputs=2,output='list_u32'),
 dict(name='reference_modular_mix_u32',operation='modular_mix',list_inputs=1,output='list_u32',stages=16,modulus=4294967291)])
for i,t in enumerate(TASKS):
 t.update(index=i,fresh_proof_required=t.get('fresh_proof_required',False),cohort=t.get('cohort','reference'),generic_family=t.get('generic_family'),proof_role=t.get('proof_role','named-helper backend reference; no fresh law requirement'))
CAL='choose(x<seed,(x+7)*k,x-seed)'
NORM='choose(x>k,x-k,x+seed)'
PRED='rem_or(x,seed,0)<k'
STEP='choose(a<seed,x+a*k,x-a)'
PAIR='choose(a<b,a+b*k,a-b*k)'
def helpers():
 return '\n'.join([
 'fn helper_calibrate_word(x:u32,seed:u32,k:u32)->u32{return '+CAL+';}',
 'fn helper_normalize_word(x:u32,seed:u32,k:u32)->u32{return '+NORM+';}',
 'fn helper_eligible_word(x:u32,seed:u32,k:u32)->Bool{return '+PRED+';}',
 'fn helper_step_word(x:u32,a:u32,seed:u32,k:u32)->u32{return '+STEP+';}',
 'fn helper_pair_word(a:u32,b:u32,seed:u32,k:u32)->u32{let left:u32=helper_calibrate_word(a,seed,k);let right:u32=helper_normalize_word(b,seed,k);return choose(left<right,left+right*k,left-right*k);}',
 'fn helper_accept_list(xs:List<u32>,seed:u32,k:u32)->List<u32>{return xs.filter(fn(x)=>helper_eligible_word(x,seed,k));}'])
def source(t):
 op=t['operation']
 if op=='nested_zip':body='xs.zip(ys,fn(a)=>fn(b)=>'+t['combine']+').zip('+('xs' if t['side']=='left' else 'ys')+',fn(v)=>fn(x)=>'+t['outer']+')'
 elif op=='helper_map':body='xs.map(fn(x)=>helper_calibrate_word(x,seed,k))'
 elif op=='helper_indexed':body='xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,2,0)==0,helper_normalize_word(helper_calibrate_word(x,seed,k),seed,k),helper_calibrate_word(x,seed,k)))'
 elif op=='helper_fold':body='foldr(xs,seed,fn(x)=>fn(a)=>helper_step_word(helper_calibrate_word(x,seed,k),a,seed,k))'
 elif op=='helper_filter_map':body='accepted.map(fn(x)=>helper_normalize_word(helper_calibrate_word(x,seed,k),seed,k))'
 elif op=='helper_zip':body='xs.zip(ys,fn(a)=>fn(b)=>helper_pair_word(a,b,seed,k))'
 else:body='xs.map(fn(x)=>modular_mix_word(x,seed,k))'
 params='xs:List<u32>,'+('ys:List<u32>,' if t['list_inputs']==2 else '')+'seed:u32,k:u32'
 definition=f'pub fn {t["name"]}({params})->'+('List<u32>' if t['output']=='list_u32' else 'u32')+'{'+('let accepted:List<u32> =helper_accept_list(xs,seed,k);' if op=='helper_filter_map' else '')+'return '+body+';}'
 if op.startswith('helper'):definition+='\n'+helpers()
 if op=='modular_mix':
  helper='fn modular_mix_word(x:u32,seed:u32,k:u32)->u32{let v0:u32=x+seed;'
  for j in range(16):helper+=f'let v{j+1}:u32=rem_or(v{j}*(k+{2*j+1})+x,4294967291,seed);'
  definition+='\n'+helper+'return v16;}'
 return definition
def kernel_source():
 # Module-level shared helpers are emitted once; per-task source retains its closure.
 rows=[]
 for t in TASKS:
  text=source(t);rows.append(text.split('\n',1)[0] if t['operation'].startswith('helper') else text)
 return 'module WebProof27;\n'+'\n'.join(rows)+'\n'+helpers()+'\n'
def public_spec():
 return dict(schema=3,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,output_kind=t['output'],list_inputs=['xs','ys'] if t['list_inputs']==2 else ['xs'],params=['xs','ys','seed','k'] if t['list_inputs']==2 else ['xs','seed','k'],scalar=t['output']!='list_u32',scalar_words=1,result_length='accepted predicate count' if t['operation']=='helper_filter_map' else 'min(xs.length,ys.length)' if t['list_inputs']==2 else 'xs.length' if t['output']=='list_u32' else 'one scalar word') for t in TASKS],matrix=dict(backends=['old','new'],proof_states=['prior','checked'],bundle_pattern='{backend}/{proof_state}/{task}',frozen_core='one prior/current selection per task recompiled unchanged by both backends'),scope='Eight bounded U32 recipes: two fresh independent nested-zip fusions and six named-helper/backend references spanning map, indexed output, ordered checksum, filtered projection, independent pair and immutable26 modular mix.32 matched cells;32/65536 timed and4096 correctness only. Three natural two-list ABIs, others single-list. Fixed captured parameters across sizes, original staged controls validation-only, strong experts inline/hoist/fuse all valid work. Full captured and synchronous borrowed calls are separate; native resident/snapshot separate. No broad application corpus or universal superiority claim.')
