"""Independent contribution classifiers and index-preserving collection consumers."""
TASKS=[]
for cohort in ['discovery','heldout']:
    for family,operation in [('partition_dual_add','add'),('partition_dual_subtract','subtract'),('partition_dual_weighted','weighted')]:
        TASKS.append(dict(name=family+'_u32'+('_heldout' if cohort=='heldout' else ''),generic_family=family+'_u32',cohort=cohort,operation=operation,predicate='x<seed' if cohort=='discovery' else 'x>k',positive='quot_or(x+seed,k,seed)' if cohort=='discovery' else 'choose(x>seed,x-seed,seed-x)*3',negative='choose(x<k,k-x,x-k)+seed' if cohort=='discovery' else 'quot_or(x*k+seed,seed,k)',output='u32',list_inputs=1))
for cohort in ['discovery','heldout']:
    for family in ['map_indexed','indexed_map','indexed_indexed']:
        unary='choose(x>k,x-seed,seed-x)' if cohort=='heldout' else 'choose(x<seed,x+k,x-k)'
        first_indexed='choose(rem_or(i,2,0)==0,x+k,x-seed)'
        second_indexed='choose(rem_or(i,3,0)==0,x*k,x+seed)' if cohort=='heldout' else 'choose(rem_or(i,2,0)==0,x*k,x+seed)'
        TASKS.append(dict(name=family+('_heldout' if cohort=='heldout' else '')+'_u32',generic_family=family+'_fusion_u32',cohort=cohort,operation=family,first=unary if family=='map_indexed' else first_indexed,second=unary if family=='indexed_map' else second_indexed,first_indexed=family!='map_indexed',second_indexed=family!='indexed_map',output='list_u32',list_inputs=1))
for i,t in enumerate(TASKS):t.update(index=i,fresh_proof_required=True)
def source(t):
    op=t['operation']
    if t['output']=='u32':
        a='sum(xs.filter(fn(x)=>'+t['predicate']+').map(fn(x)=>'+t['positive']+'))'
        b='sum(xs.filter(fn(x)=>('+t['predicate']+')==false).map(fn(x)=>'+t['negative']+'))'
        body=a+('+' if op=='add' else '-' if op=='subtract' else '*k+')+b+('*3' if op=='weighted' else '')
    else:
        first=('map_indexed(fn(i)=>fn(x)=>' if t['first_indexed'] else 'map(fn(x)=>')+t['first']+')'
        second=('map_indexed(fn(i)=>fn(x)=>' if t['second_indexed'] else 'map(fn(x)=>')+t['second']+')'
        body='xs.'+first+'.'+second
    result='List<u32>' if t['output']=='list_u32' else 'u32'
    return f'pub fn {t["name"]}(xs:List<u32>,seed:u32,k:u32)->{result}{{return {body};}}'
def public_spec():
    return dict(schema=1,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,output_kind=t['output'],list_inputs=['xs'],params=['xs','seed','k'],scalar=t['output']=='u32',scalar_words=1,result_length='xs.length' if t['output']=='list_u32' else 'one scalar word') for t in TASKS],scope='Six independent-positive/negative callback partition reductions and six index-preserving pipeline vectors. Natural single-list ABI; unused ys adapter slot does not imply a second input or copied array. Three reduction and three indexed families each have primary/alternate callback instantiations. Experts already fuse traversals; weighted experts use two accumulators and sink scalar weights once. Public index wraps U32, each staged indexed operator restarts at0 and preserves length. Captured/borrowed/native resident boundaries distinct. Preset instantiations are not an external corpus or general language ranking.')
