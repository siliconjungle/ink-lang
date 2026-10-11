"""Complementary partitions and same-source paired calibration, preset before timing."""
TASKS=[]
for cohort in ['discovery','heldout']:
    for family,operation in [('partition_recombine','recombine'),('partition_contrast','contrast'),('partition_weighted','weighted')]:
        TASKS.append(dict(name=family+'_u32'+('_heldout' if cohort=='heldout' else ''),generic_family=family+'_u32',cohort=cohort,operation=operation,predicate='x<seed' if cohort=='discovery' else 'x>seed',mapper='(x+7)*(x+seed)' if cohort=='discovery' else 'choose(x<k,k-x,x-k)+seed',output='u32',list_inputs=1,fresh_proof_required=True))
TASKS.extend([
 dict(name='paired_score_u32',generic_family='paired_mapped_zip_u32',cohort='discovery',operation='paired',left='choose(x<seed,x,k)',right='choose(x<seed,k,x)',combine='choose(a<b,a+b*k,a-b*k)',output='list_u32',list_inputs=1,fresh_proof_required=True),
 dict(name='paired_signal_heldout_u32',generic_family='paired_mapped_zip_u32',cohort='heldout',operation='paired',left='choose(x>k,x,seed)',right='choose(x>k,seed,x)',combine='choose(a>b,a*b+seed,a+b*k)',output='list_u32',list_inputs=1,fresh_proof_required=True)
])
def source(t):
    if t['operation']=='paired':body='xs.map(fn(x)=>'+t['left']+').zip(xs.map(fn(x)=>'+t['right']+'),fn(a)=>fn(b)=>'+t['combine']+')';result='List<u32>'
    else:
        a='sum(xs.filter(fn(x)=>'+t['predicate']+').map(fn(x)=>'+t['mapper']+'))'
        b='sum(xs.filter(fn(x)=>('+t['predicate']+')==false).map(fn(x)=>'+t['mapper']+'))'
        body=a+('+' if t['operation']=='recombine' else '-' if t['operation']=='contrast' else '*k+')+b+('*3' if t['operation']=='weighted' else '')
        result='u32'
    return f'pub fn {t["name"]}(xs:List<u32>,seed:u32,k:u32)->{result}{{return {body};}}'
def public_spec():
    return dict(schema=1,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,index=i,output_kind=t['output'],list_inputs=['xs'],params=['xs','seed','k'],scalar=t['output']=='u32',scalar_words=1,result_length='xs.length' if t['output']=='list_u32' else 'one scalar word') for i,t in enumerate(TASKS)],scope='Six complementary partition reductions and two paired-calibration list recipes, each primary or preset alternate callback instantiations. All natural one-list ABI. Expert controls already fuse original semantics; weighted expert keeps two accumulators and scalar weights once. Captured web calls, borrowed JS, native resident/snapshot boundaries separate. No general language or compiler ranking.')
