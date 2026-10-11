"""Preset paired-list and ordered-concat recipe instantiations; no timing inputs."""
TASKS=[]
for cohort in ['discovery','heldout']:
    suffix='' if cohort=='discovery' else '_heldout'
    for family,side in [('independent_left_mapped_zip_postmap','left'),('independent_right_mapped_zip_postmap','right'),('independent_both_mapped_zip_postmap','both')]:
        TASKS.append(dict(name=family+'_u32'+suffix,generic_family=family+'_u32',cohort=cohort,operation='zip',mapped_side=side,output='list_u32',list_inputs=2,fresh_proof_required=True))
for cohort in ['discovery','heldout']:
    suffix='' if cohort=='discovery' else '_heldout'
    for family,pipeline in [('mapped_arbitrary_fold','map'),('mapped_prefix_arbitrary_fold','map_concat'),('mapped_concat_arbitrary_fold','both_map_concat')]:
        TASKS.append(dict(name=family+'_u32'+suffix,generic_family=family+'_u32',cohort=cohort,operation='fold',pipeline=pipeline,output='u32',list_inputs=2,fresh_proof_required=True))

def expressions(t):
    alternate=t['cohort']=='heldout'
    if t['operation']=='zip':
        return dict(left='choose(x<seed,seed-x,x-seed)' if alternate else 'x*3+seed',right='y*y+k' if alternate else 'y+k',combine='choose(a<seed,a+b*k,a-b)' if alternate else 'a-b*k',post='z*k+seed' if alternate else 'z+seed')
    return dict(mapper='choose(x<seed,seed-x,x-seed)' if alternate else 'x*3+k',reducer='choose(a<seed,x-a,x+a)' if alternate else 'choose(x<seed,x+a*k,x-a)')

def source(t):
    e=expressions(t)
    if t['operation']=='zip':
        left='xs'+(f'.map(fn(x)=>{e["left"]})' if t['mapped_side'] in ['left','both'] else '')
        right='ys'+(f'.map(fn(y)=>{e["right"]})' if t['mapped_side'] in ['right','both'] else '')
        body=f'{left}.zip({right},fn(a)=>fn(b)=>{e["combine"]}).map(fn(z)=>{e["post"]})'
        result='List<u32>'
    else:
        seq=f'xs.map(fn(x)=>{e["mapper"]})'
        if t['pipeline']!='map':seq+='.concat('+('ys' if t['pipeline']=='map_concat' else f'ys.map(fn(x)=>{e["mapper"]})')+')'
        body=f'foldr({seq},seed,fn(x)=>fn(a)=>{e["reducer"]})';result='u32'
    return f'pub fn {t["name"]}(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->{result}{{return {body};}}'

def public_spec():
    return dict(schema=1,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,index=i,output_kind=t['output'],list_inputs=['xs','ys'],params=['xs','ys','seed','k'],scalar=t['output']=='u32',scalar_words=1,result_length='min(xs.length,ys.length)' if t['operation']=='zip' else 'one scalar word') for i,t in enumerate(TASKS)],scope='Twelve fresh required recipes in six generic families, six discovery/six preset alternate callbacks; no external corpus or historical timing controls. Independent paired arrays and noncommutative ordered concatenated folds. Same four-argument ABI snapshots both lists, including unused ys on plain-map folds. Original staged and strong fused controls frozen before timing. CPU/GPU same stores and separate frozen policies; no eligibility-as-performance claim.')
