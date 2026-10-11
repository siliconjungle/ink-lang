"""Preset wrapping-word recipes; no performance data are used in definitions."""
TASKS=[]
for cohort in ['discovery','heldout']:
    suffix='' if cohort=='discovery' else '_heldout'
    for name,pipeline,family in [('accepted_total','filter','filtered_predicated_sum'),('calibrated_accepted_total','map_filter','mapped_filtered_predicated_sum'),('accepted_calibrated_total','filter_map','filtered_mapped_predicated_sum')]:
        TASKS.append(dict(name=name+suffix,cohort=cohort,family=family,operation='sum',pipeline=pipeline,mapper='calibration' if cohort=='discovery' else 'distance',predicate='below' if cohort=='discovery' else 'above_k',output='u32',list_inputs=1))
    for combine in ['add','subtract','weighted']:
        TASKS.append(dict(name='dual_sum_'+combine+suffix,cohort=cohort,family='dual_sum_'+combine,operation='dual_sum',combine=combine,mapper='distance' if cohort=='discovery' else 'distance_k',second_mapper='offset_scale' if cohort=='discovery' else 'square_offset',output='u32',list_inputs=1))
for name,op,pipeline,mapper,predicate in [
    ('calibrated_checksum','fold','map','calibration','below'),
    ('accepted_total','sum','filter','identity','below'),
    ('calibrated_accepted_total','sum','map_filter','calibration','below'),
    ('distance_total','sum','map','distance','above'),
    ('accepted_checksum','fold','filter','identity','above'),
    ('calibrated_accepted_checksum','fold','map_filter','offset_gate','above')]:
    TASKS.append(dict(name='abi_'+name,original_name=name,cohort='anchor',family='round14_abi_regression',operation=op,pipeline=pipeline,mapper=mapper,predicate=predicate,output='u32',list_inputs=1))
MAPPERS={'identity':'x','calibration':'x*3+k','distance':'choose(x<seed,seed-x,x-seed)','distance_k':'choose(x>k,x-k,k-x)','offset_scale':'(x+seed)*k','square_offset':'x*x+seed','offset_gate':'choose(x<seed,x+k,x-k)'}
def predicate(t):return 'x<seed' if t['predicate']=='below' else 'x>k' if t['predicate']=='above_k' else 'x>seed'
def source(t):
    mapper=MAPPERS[t['mapper']]
    if t['operation']=='dual_sum':
        a=f'sum(xs.map(fn(x)=>{mapper}))';b=f'sum(xs.map(fn(x)=>{MAPPERS[t["second_mapper"]]}))'
        body=f'{a}*k+{b}*seed' if t['combine']=='weighted' else f'{a}-{b}' if t['combine']=='subtract' else f'{a}+{b}'
    else:
        body='xs'
        stages={'map':['map'],'filter':['filter'],'map_filter':['map','filter'],'filter_map':['filter','map']}[t['pipeline']]
        for stage in stages:body+=f'.map(fn(x)=>{mapper})' if stage=='map' else f'.filter(fn(x)=>{predicate(t)})'
        body=f'foldr({body},seed,fn(x)=>fn(a)=>x+a*k)' if t['operation']=='fold' else f'sum({body})'
    return f'pub fn {t["name"]}(xs:List<u32>,seed:u32,k:u32)->u32{{return {body};}}'
def public_spec():
    return dict(schema=1,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,index=i,output_kind='u32',list_inputs=['xs'],params=['xs','seed','k'],scalar=True,scalar_words=1,fresh_proof_required=t['cohort']!='anchor') for i,t in enumerate(TASKS)],scope='Twelve predicated/two-consumer word reductions plus six archived round14 ABI regression sources/inputs; six discovery and six preset held-out callback instantiations. Anchors separately test representation specialization; no new aggregate-law discovery claim. All arithmetic wrapsU32; callbacks pure total. Same external cost model applies to prior/current. Strong expert algorithms frozen before timings.')
