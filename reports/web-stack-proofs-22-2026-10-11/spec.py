"""Pointwise guard merging and index-preserving mapped self-zip consumers."""
TASKS=[]
for cohort in ['discovery','heldout']:
 for family,op in [('guard_complement_add','add'),('guard_complement_subtract','subtract'),('guard_same_choice_add','same_choice')]:
  held=cohort=='heldout'
  TASKS.append(dict(name=family+'_u32'+('_heldout' if held else ''),generic_family=family+'_fold_u32',cohort=cohort,operation=op,guard='quot_or(x*k+seed,seed,k)>k' if held else 'quot_or(x+seed,k,k)<seed',positive='choose(x>seed,x-seed,seed-x)*3' if held else 'quot_or(x*k+seed,seed,k)',negative='quot_or(x+seed,k,seed)' if held else 'choose(x<k,k-x,x-k)+seed',extra_positive='quot_or(x*k,k,seed)' if held else 'x+seed',extra_negative='x+k' if held else 'quot_or(x+seed,k,seed)',output='u32',list_inputs=1))
for cohort in ['discovery','heldout']:
 for family in ['indexed_both_zip','indexed_left_zip','indexed_right_zip']:
  held=cohort=='heldout'
  TASKS.append(dict(name=family+('_heldout' if held else '')+'_u32',generic_family=family+'_fusion_u32',cohort=cohort,operation=family,left='choose(rem_or(i,3,0)==0,choose(x>k,x,seed),x+k)' if held else 'choose(rem_or(i,2,0)==0,x+k,x-seed)',right='choose(rem_or(i,2,0)==0,seed-x,x*3)' if held else 'choose(rem_or(i,3,0)==0,x*3+k,x+seed)',combine='choose(a>b,a*b+seed,a+b*k)' if held else 'choose(a<b,a+b*k,a-b*k)',left_indexed=family!='indexed_right_zip',right_indexed=family!='indexed_left_zip',output='list_u32',list_inputs=1))
for i,t in enumerate(TASKS):
 t.update(index=i,fresh_proof_required=t['operation'] not in ['add','subtract'],proof_role='old-law reference' if t['operation'] in ['add','subtract'] else 'fresh endpoint')
def source(t):
 if t['output']=='u32':
  c,f,g,d,e=[t[k] for k in ['guard','positive','negative','extra_positive','extra_negative']]
  item=f'choose({c},{f},{g})+choose({c},{d},{e})' if t['operation']=='same_choice' else f'choose({c},{f},0)'+('-' if t['operation']=='subtract' else '+')+f'choose(({c})==false,{g},0)'
  body='sum(xs.map(fn(x)=>'+item+'))'
 else:
  left='xs.map_indexed(fn(i)=>fn(x)=>'+t['left']+')' if t['left_indexed'] else 'xs'
  right='xs.map_indexed(fn(i)=>fn(x)=>'+t['right']+')' if t['right_indexed'] else 'xs'
  body=left+'.zip('+right+',fn(a)=>fn(b)=>'+t['combine']+')'
 result='List<u32>' if t['output']=='list_u32' else 'u32'
 return f'pub fn {t["name"]}(xs:List<u32>,seed:u32,k:u32)->{result}{{return {body};}}'
def public_spec():
 return dict(schema=1,rust_abi='bench_eval(case,xs_ptr,xs_len,ys_ptr,ys_len,seed,k,out)->word_count',tasks=[dict(t,output_kind=t['output'],list_inputs=['xs'],params=['xs','seed','k'],scalar=t['output']=='u32',scalar_words=1,result_length='xs.length' if t['output']=='list_u32' else 'one scalar word') for t in TASKS],scope='Six per-element pointwise guard mergers and six indexed mapped self-zip vector consumers. Natural single-list ABI; unused adapter ys is empty and not captured. Primary/alternate callback instantiations are preset, not an external corpus. Original controls preserve repeated guards and mapped-array/zip stages; strong experts evaluate guard/indexed callbacks once and use one loop, with reusable vector destination. Each original indexed stage restarts at0, wraps U32 index and preserves length. Captured/borrowed/native resident boundaries remain distinct; actual GPU versus fallback is manifest-based.')
