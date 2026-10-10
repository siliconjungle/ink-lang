"""Preset order-independent scores and fixed-point normalization recipes."""
TASKS=[]
SORT=[('sorted_calibrated_total','x*3+k','choose(x<seed,x*k,x+k)'),('sorted_squared_energy','x*x+k','(x-seed)*(x-seed)'),('sorted_distance_total','choose(x<seed,seed-x,x-seed)','choose(x<seed,x,seed)')]
for cohort in ['discovery','heldout']:
    suffix='' if cohort=='discovery' else '_heldout'
    for family,primary,alternate in SORT:
        TASKS.append(dict(name=family+'_u32'+suffix,generic_family='sorted_mapped_sum_u32',cohort=cohort,operation='sort_reduce',expression=alternate if cohort=='heldout' else primary,output='u32',list_inputs=1,fresh_proof_required=True))
for cohort in ['discovery','heldout']:
    suffix='' if cohort=='discovery' else '_heldout'
    for family,n,primary,alternate in [('lower_projection_repeat',8,'choose(a<seed,seed,a)','choose(a<k,k,a)'),('upper_projection_repeat',32,'choose(a>k,k,a)','choose(a>seed,seed,a)'),('keyed_projection_repeat',64,'choose(a==seed,k,a)','choose(a==k,seed,a)')]:
        TASKS.append(dict(name=family+'_u32'+suffix,generic_family='idempotent_positive_repeat_function_u32',cohort=cohort,operation='projection',expression=alternate if cohort=='heldout' else primary,iterations=n,output='list_u32',list_inputs=2,fresh_proof_required=True))

def expressions(t):return dict(callback=t['expression'])
def source(t):
    if t['operation']=='sort_reduce':body='sum(xs.sort().map(fn(x)=>'+t['expression']+'))';result='u32'
    else:body='xs.map(fn(x)=>repeat('+str(t['iterations']) +',x,fn(i)=>fn(a)=>'+t['expression']+'))';result='List<u32>'
    params='xs:List<u32>,seed:u32,k:u32' if t['list_inputs']==1 else 'xs:List<u32>,ys:List<u32>,seed:u32,k:u32'
    return f'pub fn {t["name"]}({params})->{result}{{return {body};}}'
def public_spec():
    return dict(schema=1,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,index=i,output_kind=t['output'],list_inputs=['xs'] if t['list_inputs']==1 else ['xs','ys'],params=['xs','seed','k'] if t['list_inputs']==1 else ['xs','ys','seed','k'],scalar=t['output']=='u32',scalar_words=1,result_length='xs.length' if t['operation']=='projection' else 'one scalar word') for i,t in enumerate(TASKS)],scope='Six unsorted-score reductions and six repeated fixed-point projection recipes. Preset alternate callback instantiations, not an external corpus. Natural sort ABI(xs,seed,k) snapshots one list; author projection ABI(xs,ys,seed,k) snapshots both lists including unused ys. Per-task boundaries are matched across every implementation; strong experts already skip sort/repetition. Preset 8/32/64 counts and before-timing profiles; no general language ranking. Compile-time idempotence premises checked per static callback; no runtime input guards.')
