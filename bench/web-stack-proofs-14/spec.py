"""Frozen recipe definitions; source/expert/reference generation shares no timing data.

Dataset generation and performance selection are separate from theorem discovery.
Word arithmetic is intentional; these are calibrated integer/token recipes.
"""

TASKS = [
    dict(name='calibrated_checksum', cohort='discovery', family='mapped_affine_fold',
         operation='fold', pipeline='map', mapper='calibration', predicate='below',
         output='u32', list_inputs=1),
    dict(name='accepted_total', cohort='discovery', family='filtered_sum',
         operation='sum', pipeline='filter', mapper='identity', predicate='below',
         output='u32', list_inputs=1),
    dict(name='calibrated_accepted_total', cohort='discovery', family='mapped_filtered_sum',
         operation='sum', pipeline='map_filter', mapper='calibration', predicate='below',
         output='u32', list_inputs=1),
    dict(name='distance_total', cohort='heldout', family='mapped_sum',
         operation='sum', pipeline='map', mapper='distance', predicate='above',
         output='u32', list_inputs=1),
    dict(name='accepted_checksum', cohort='heldout', family='filtered_affine_fold',
         operation='fold', pipeline='filter', mapper='identity', predicate='above',
         output='u32', list_inputs=1),
    dict(name='calibrated_accepted_checksum', cohort='heldout', family='mapped_filtered_affine_fold',
         operation='fold', pipeline='map_filter', mapper='offset_gate', predicate='above',
         output='u32', list_inputs=1),
    dict(name='callback_mapped_head', cohort='discovery', family='mapped_head',
         operation='head', mapper='maximum', fallback='seed', offset='*k', output='u32', list_inputs=1),
    dict(name='concat_first_result', cohort='discovery', family='concat_head',
         operation='concat_head', fallback='seed', offset='+k', output='u32', list_inputs=2),
    dict(name='self_zip_cardinality', cohort='discovery', family='self_zip_count',
         operation='zip_count', combiner='piecewise', output='u64', list_inputs=1),
    dict(name='clamped_first', cohort='heldout', family='mapped_head',
         operation='head', mapper='minimum', fallback='k', offset='-seed', output='u32', list_inputs=1),
    dict(name='concat_signed_offset', cohort='heldout', family='concat_head',
         operation='concat_head', fallback='k', offset='-seed', output='u32', list_inputs=2),
    dict(name='paired_score_count', cohort='heldout', family='self_zip_count',
         operation='zip_count', combiner='equal', output='u64', list_inputs=1),
    dict(name='threshold_remap', cohort='anchor', family='existing_vector',
         operation='vector', mapper='head_piecewise', pipeline='map', output='list_u32', list_inputs=1),
    dict(name='calibration_pipeline', cohort='anchor', family='existing_map_fusion',
         operation='vector', mapper='head_clamp', pipeline='two_maps', output='list_u32', list_inputs=1),
]

MAPPERS = {
    'identity': 'x',
    'maximum': 'choose(x<seed,seed,x)',
    'minimum': 'choose(x>k,k,x)',
    'calibration': 'x*3+k',
    'distance': 'choose(x<seed,seed-x,x-seed)',
    'offset_gate': 'choose(x<seed,x+k,x-k)',
    'head_piecewise': 'choose(x<seed,x*k,x+seed)',
    'head_clamp': 'choose(x<seed,seed,x)*k',
}


def source(task):
    params='xs:List<u32>,'+('ys:List<u32>,' if task['list_inputs']==2 else '')+'seed:u32,k:u32'
    result='List<u32>' if task['output']=='list_u32' else task['output']
    op=task['operation']
    mapper=MAPPERS[task.get('mapper','identity')]
    if op in ('fold','sum'):
        body='xs'
        if 'map' in task['pipeline']:body+=f'.map(fn(x)=>{mapper})'
        if 'filter' in task['pipeline']:body+='.filter(fn(x)=>x'+('<' if task['predicate']=='below' else '>')+'seed)'
        body=f'foldr({body},seed,fn(x)=>fn(a)=>x+a*k)' if op=='fold' else f'sum({body})'
    elif op=='head':
        fallback=task['fallback']
        body=f'xs.map(fn(x)=>{mapper}).at_or(0,{fallback}){task["offset"]}'
    elif op=='concat_head':body=f"xs.concat(ys).at_or(0,{task['fallback']}){task['offset']}"
    elif op=='zip_count':
        callback='choose(a<seed,a*k+b,b-seed)' if task['combiner']=='piecewise' else 'choose(a==b,a*k-seed,b+seed)'
        body=f'count(xs.zip(xs,fn(a)=>fn(b)=>{callback}))'
    elif task['pipeline']=='two_maps':body='xs.map(fn(x)=>choose(x<seed,seed,x)).map(fn(x)=>x*k)'
    else:body=f'xs.map(fn(x)=>{mapper})'
    return f"pub fn {task['name']}({params})->{result}{{return {body};}}"


def public_spec():
    return dict(schema=1, rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',
        tasks=[dict(t, index=i, output_kind=t['output'],
                    list_inputs=['xs','ys'] if t['list_inputs']==2 else ['xs'],
                    params=['xs']+(['ys'] if t['list_inputs']==2 else [])+['seed','k'],
                    scalar=t['output']!='list_u32', scalar_words=2 if t['output']=='u64' else 1,
                    fresh_proof_required=t['cohort']!='anchor') for i,t in enumerate(TASKS)],
        scope='Twelve reusable proof-consuming scalar recipes plus two existing-law vector anchors. Anchors have no fresh-law claim. Strong expert fused/head/count controls and original-stage controls; no expert retuning from timings. Independent input lists for concat. Pure total wrapping-word value semantics; no real numerical-accuracy claim.')
