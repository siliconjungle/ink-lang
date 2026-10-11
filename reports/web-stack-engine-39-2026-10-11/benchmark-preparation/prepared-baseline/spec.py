"""General web-stack suite. U32 wrap semantics and independent dimensions."""
MASK=2**32-1
DEFS=[
 ('affine','map','train','xs.map(fn(x)=>x*k+seed)'),
 ('compaction','filter-compaction','train','xs.filter(fn(x)=>rem_or(x,16,0)<seed).map(fn(x)=>x*k+1)'),
 ('scan','prefix-scan','train','xs.scan()'),
 ('branch','piecewise-map','heldout-family','xs.map(fn(x)=>choose(x<seed,x*k+1,quot_or(x,k,0)+seed))'),
 ('ordered','ordered-reduction','heldout-family','foldr(xs,seed,fn(x)=>fn(acc)=>choose(acc<seed,x+acc*k,x-acc))'),
 ('stencil','neighbor-stencil','heldout-family','xs.map_indexed(fn(i)=>fn(x)=>xs.at_or(i-1,0)+x*k+xs.at_or(i+1,0))'),
 ('update','sparse-overwrite','heldout-family','xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,k,1)==0,ys.at_or(i,x),x))'),
 ('update_recompute','overwrite-recompute','heldout-family','xs.map_indexed(fn(i)=>fn(x)=>choose(rem_or(i,k,1)==0,ys.at_or(i,x),x))'),
]
TASKS=[dict(name='general39_'+name,source='pub fn general39_'+name+'(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->'+('u32' if name=='ordered' else 'List<u32>')+'{return '+expr+';}',family=family,split=split,list_inputs=2,output_kind='scalar_u32'if name=='ordered'else'list_u32',operation=name)for name,family,split,expr in DEFS]
def public_spec():return dict(tasks=TASKS,result_kind='mixed_u32',source_scope='Eight workloads, seven distinct families; sparse update and full recompute are the same fixed overwrite-batch semantics. No stateful proof authority; each call begins from declared xs and dense ys payload. Train families frozen before candidate work; four disjoint heldout families. No universal speed claim.')
def wordgen(seed,n,distribution):
 import random
 r=random.Random(seed)
 if distribution=='uniform':return [r.getrandbits(32)for _ in range(n)]
 if distribution=='clustered':return [r.choice([0,1,7,8,15,16,255,256,MASK])for _ in range(n)]
 return [(i*13+3)&MASK for i in range(n)]
def staged(op,xs,ys,seed,k):
 if op=='affine':return [(x*k+seed)&MASK for x in xs]
 if op=='branch':return [((x*k+1)if x<seed else((x//k if k else 0)+seed))&MASK for x in xs]
 if op=='compaction':return [(x*k+1)&MASK for x in xs if x%16<seed]
 if op=='scan':
  out=[];v=0
  for x in xs:v=(v+x)&MASK;out.append(v)
  return out
 if op=='ordered':
  a=seed
  for x in reversed(xs):a=((x+a*k)if a<seed else(x-a))&MASK
  return a
 if op=='stencil':return [((xs[i-1]if i else 0)+x*k+(xs[i+1]if i+1<len(xs)else 0))&MASK for i,x in enumerate(xs)]
 return [(ys[i]if k and i%k==0 and i<len(ys)else x)for i,x in enumerate(xs)]
def independent(op,xs,ys,seed,k):
 mod=2**32
 if op=='scan':
  import itertools
  return [a%mod for a in itertools.accumulate(xs)]
 if op=='ordered':
  # Explicit stack consumption makes right-to-left order visible; never regroup.
  stack=list(xs);acc=seed
  while stack:
   value=stack.pop();acc=(value+acc*k if acc<seed else value-acc)%mod
  return acc
 if op=='compaction':return [(x*k+1)%mod for x in xs if divmod(x,16)[1]<seed]
 if op=='stencil':
  padded=[0]+list(xs)+[0]
  return [(a+b*k+c)%mod for a,b,c in zip(padded,padded[1:],padded[2:])]
 if op in ['update','update_recompute']:
  out=list(xs)
  for i in range(0,min(len(xs),len(ys)),k or len(xs)+1):
   if k:out[i]=ys[i]
  return out
 return [(x*k+seed if op=='affine'else(x*k+1 if x<seed else((divmod(x,k)[0]if k else 0)+seed)))%mod for x in xs]
def fixture(t,ident,n,shape,distribution,parameter,size_split,timed=True,xs=None,ys=None):
 x=wordgen(3901,n,distribution)if xs is None else xs
 ny={'equal':n,'short':n//3,'long':n+7}[shape]
 y=wordgen(3917,ny,distribution)if ys is None else ys
 seed=parameter if t['operation']=='compaction'else 0x80000000;k=parameter if t['operation'].startswith('update')else 7
 expected=staged(t['operation'],x,y,seed,k);assert expected==independent(t['operation'],x,y,seed,k)
 if t['operation']=='ordered' and len(x)>2:
  a=seed
  for v in x:a=((v+a*k)if a<seed else(v-a))&MASK
  # Record negative-order witness when this particular input distinguishes it.
  order_witness=a!=expected
 else:order_witness=None
 changes=[{'index':i,'value':y[i]}for i in range(0,min(len(x),len(y)),k) ]if t['operation'].startswith('update')and k else []
 return dict(id=ident,task=t['name'],xs=x,ys=y,seed=seed,k=k,expected=expected,timed=timed,mode=distribution,split=t['split']if t['split']!='train'else size_split,dimensions=dict(size=n,shape=shape,value_distribution=distribution,parameter=parameter),input_shape=dict(xs=len(x),ys=len(y),relation=shape),acceptance=dict(accepted=len(expected)if isinstance(expected,list)else None),algorithmic_work=dict(change_batch=changes,change_count=len(changes),state_semantics='fixed overwrite batch applied to fresh xs snapshot on every invocation'if t['operation'].startswith('update')else None,reverse_order_negative_witness=order_witness),web_consumption_code=(len(expected)+sum((i+1)*v for i,v in enumerate(expected)))%2**32 if isinstance(expected,list)else expected)
def fixtures():
 frames=[]
 # Full factorial correctness matrix: size, shape, values and selectivity/change
 # density varied independently. Timed subset is balanced, bounded and frozen.
 for t in TASKS:
  params=[2,14]if t['operation']=='compaction'else[4,64]if t['operation'].startswith('update')else[7]
  for n in [0,1,32,2048,16384]:
   for shape in ['short','equal','long']:
    for dist in ['uniform','clustered']:
     for par in params:
      ident=f'{t["name"]}-{n}-{shape}-{dist}-{par}'
      # 3 cells per ordinary family, 6 per parameterized family: 33 total.
      timed=n in [32,2048,16384] and shape=='equal' and dist==('clustered'if n==2048 else'uniform')
      frames.append(fixture(t,ident,n,shape,dist,par,'heldout-cell'if n==2048 else'train',timed))
  frames.append(fixture(t,t['name']+'-boundaries',5,'long','clustered',0,'correctness',False,[0,1,MASK,0x80000000,15],[MASK,0,7,8,15,1,2]))
 return dict(frames=frames,seed=2026113901,scope='Independent full-factorial correctness axes (sizes, shapes, value distributions and selectivity/change density). Timed balanced subset: 33 cells. Whole branch/ordered/stencil/update families held out; 2048 cells held out from train family tuning. Heldout suite frozen before candidate work; repeated examination invalidates future confirmatory status.')
