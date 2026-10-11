"""Captured control hoisting, ordered reductions and paired-array consumers."""
TASKS=[
 dict(name='gated_mapper_sum_u32',generic_family='gated_mapper_sum_u32',operation='gate_sum',cohort='discovery',gate='seed<k',mapper='quot_or(x+seed,k,seed)',output='u32',list_inputs=1),
 dict(name='gated_predicate_count_u32',generic_family='gated_predicate_count_u32',operation='gate_count',cohort='discovery',gate='seed<k',predicate='x<seed',output='u64',list_inputs=1),
 dict(name='gated_arbitrary_fold_u32',generic_family='gated_arbitrary_fold_u32',operation='gate_fold',cohort='discovery',gate='seed<k',reducer='(x+seed)*(a+k)',output='u32',list_inputs=1),
 dict(name='gated_arbitrary_fold_u32_heldout',generic_family='gated_arbitrary_fold_u32',operation='gate_fold',cohort='heldout',gate='seed==k',reducer='choose(x<k,a+x*seed,a-x*k)',output='u32',list_inputs=1),
 dict(name='paired_ordered_score_u32',generic_family='self_zip_arbitrary_ordered_fold_u32',operation='zip_fold',cohort='discovery',combine='choose(a<seed,a+b*k,a-b*k)',reducer='choose(acc<seed,v-acc,v+acc*k)',output='u32',list_inputs=1),
 dict(name='paired_ordered_signal_heldout_u32',generic_family='self_zip_arbitrary_ordered_fold_u32',operation='zip_fold',cohort='heldout',combine='choose(a>k,a*b+seed,a+b*k)',reducer='choose(v<seed,v+acc*k,v-acc)',output='u32',list_inputs=1),
 dict(name='paired_calibrated_u32',generic_family='independent_plain_zip_postmap_u32',operation='zip_map',cohort='discovery',combine='choose(a<seed,a+b*k,a-b*k)',postmap='choose(v>k,v-seed,v+seed)',output='list_u32',list_inputs=2),
 dict(name='paired_contrast_heldout_u32',generic_family='independent_plain_zip_postmap_u32',operation='zip_map',cohort='heldout',combine='choose(a>b,a-b,b-a)',postmap='choose(v<seed,v*k,v+seed)',output='list_u32',list_inputs=2)
]
for i,t in enumerate(TASKS):t.update(index=i,fresh_proof_required=True,gated=t['operation'].startswith('gate_'))
def source(t):
    op=t['operation']
    if op=='gate_sum':body='sum(xs.map(fn(x)=>choose('+t['gate']+','+t['mapper']+',0)))'
    elif op=='gate_count':body='count(xs.filter(fn(x)=>choose('+t['gate']+','+t['predicate']+',false)))'
    elif op=='gate_fold':body='foldr(xs,seed,fn(x)=>fn(a)=>choose('+t['gate']+','+t['reducer']+',a))'
    elif op=='zip_fold':body='foldr(xs.zip(xs,fn(a)=>fn(b)=>'+t['combine']+'),seed,fn(v)=>fn(acc)=>'+t['reducer']+')'
    else:body='xs.zip(ys,fn(a)=>fn(b)=>'+t['combine']+').map(fn(v)=>'+t['postmap']+')'
    result='List<u32>' if t['output']=='list_u32' else t['output'];params='xs:List<u32>,'+('ys:List<u32>,' if t['list_inputs']==2 else '')+'seed:u32,k:u32'
    return f'pub fn {t["name"]}({params})->{result}{{return {body};}}'
def public_spec():
    return dict(schema=1,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,output_kind=t['output'],list_inputs=['xs','ys'] if t['list_inputs']==2 else ['xs'],params=['xs','ys','seed','k'] if t['list_inputs']==2 else ['xs','seed','k'],scalar=t['output']!='list_u32',scalar_words=2 if t['output']=='u64' else 1,result_length='min(xs.length,ys.length)' if t['output']=='list_u32' else 'two scalar words' if t['output']=='u64' else 'one scalar word') for t in TASKS],scope='Four captured-gate reductions with enabled/disabled cells, two same-source ordered zip folds, and two independent-array zip/postmap consumers. Experts hoist runtime flags and fuse original semantics. Gated count is genuine U64; other arithmetic wraps U32. Ordered folds preserve right-fold order. Independent vectors truncate to the shorter input. Natural per-task ABI, matched declared input capture even when a gate disables computation. Preset callback instantiations and profiles are not an external corpus or general language ranking.')
