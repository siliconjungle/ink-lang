"""Generic work-skipping scalar and unused prefix-scan vector consumers."""
TASKS=[]
for held in [False,True]:
 for family,output in [('skip_partition_count','u64'),('skip_first_accepted','u32'),('skip_mapped_first_accepted','u32')]:
  TASKS.append(dict(name=family+'_u32'+('_heldout' if held else ''),generic_family=family+'_u32',cohort='heldout' if held else 'discovery',operation=family,predicate='x<k' if held else 'x>seed',mapper='choose(x<seed,x+k,x-seed)' if held else 'choose(x>k,x-k,x+k)',output=output,list_inputs=1))
for held in [False,True]:
 for family,output in [('scan_left_project','list_u32'),('scan_right_project','list_u32'),('scan_first_value','u32')]:
  TASKS.append(dict(name='pipeline_'+family+('_heldout' if held else '')+'_u32',generic_family=family+'_u32',cohort='heldout' if held else 'discovery',operation=family,mapper='choose(x>k,x*k+seed,seed-x)' if held else 'choose(x<seed,x+k,x-seed)',post='first*k+seed' if held else 'first+k',output=output,list_inputs=1))
for i,t in enumerate(TASKS):t.update(index=i,fresh_proof_required=True,proof_role='fresh work-skipping endpoint')
def source(t):
 op=t['operation']
 if op=='skip_partition_count':body=f'count(xs.filter(fn(x)=>{t["predicate"]}))+count(xs.filter(fn(x)=>({t["predicate"]})==false))'
 elif op.startswith('skip_'):
  body=f'xs.filter(fn(x)=>{t["predicate"]})'
  if op=='skip_mapped_first_accepted':body+=f'.map(fn(x)=>{t["mapper"]})'
  body+='.at_or(0,seed)'
 elif op=='scan_left_project':body=f'xs.scan().zip(xs,fn(prefix)=>fn(x)=>{t["mapper"]})'
 elif op=='scan_right_project':body=f'xs.zip(xs.scan(),fn(x)=>fn(prefix)=>{t["mapper"]})'
 else:body=t['post'].replace('first','xs.scan().at_or(0,seed)')
 result='List<u32>' if t['output']=='list_u32' else t['output']
 return f'pub fn {t["name"]}(xs:List<u32>,seed:u32,k:u32)->{result}{{return {body};}}'
def public_spec():
 return dict(schema=1,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,output_kind=t['output'],list_inputs=['xs'],params=['xs','seed','k'],scalar=t['output']!='list_u32',scalar_words=2 if t['output']=='u64' else 1,result_length='xs.length' if t['output']=='list_u32' else 'two scalar words' if t['output']=='u64' else 'one scalar word') for t in TASKS],scope='Six partition-cardinality and first-match scalars plus four unobserved-prefix scan/zip vectors and two scan-first scalars. Natural single-list ABI; unused adapter ys stays empty and is not captured. Literal controls retain every original filter/map/scan/zip stage, including complete prefix construction before scalar lookup. Strong experts count length directly, forward-scan first matches with early exit, or omit unused scans and zip entirely. Lookup locations first/interior/absent are preset at every size/distribution. Primary/alternate instantiations are not an external corpus. Full captures and result consumption/transfers differ from borrowed JS/native resident kernel boundaries; actual GPU requires manifest eligibility and counters.')
