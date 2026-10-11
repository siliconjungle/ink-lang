"""Combine independent wrapping prefix streams in one scan, preserving truncation.

Integer addition/subtraction are homomorphisms of modular addition. No F32
version is valid. Three typed instances of each operation share one mechanism.
"""
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import bound,lam,law,op,term,value,var,binary,word


def chain(middle,left,right):return {'Trans':dict(middle=middle,left=left,right=right)}
def use(oid,**arguments):return {'Use':dict(law=oid,arguments=arguments,premises=[])}
def apply(f,x):return op(f['sort']['Arrow'][1],'apply',f,x)
def apply3(f,y,a,b):return apply(apply(apply(f,y),a),b)


def named_laws():
 rows=[]
 for t in ('U32','I32','U64'):
  s,ls=value(t),value({'List':t});xs,ys=var(ls,'xs'),var(ls,'ys');h,tail=var(s,'head'),var(ls,'tail');yh,yt=var(s,'other_head'),var(ls,'other_tail')
  cons=lambda a,b:term(ls,{'Cons':[a,b]});scan=lambda a,z:op(ls,'scan.acc',a,z)
  for operation,label in [('+','add'),('-','subtract')]:
   combine=lambda a,b:binary(operation,a,b);callback=lam(s,lam(s,combine(bound(s,1),bound(s,0))))
   zip_=lambda a,b:op(ls,'method:zip',a,b,callback)
   source=lambda x,y,a,b:zip_(scan(x,a),scan(y,b));target=lambda x,y,a,b:scan(zip_(x,y),combine(a,b))
   function=lambda x,selected:lam(ls,lam(s,lam(s,(target if selected else source)(x,bound(ls,2),bound(s,1),bound(s,0)))))
   a,b=var(s,'initial_left'),var(s,'initial_right');transport=law(dict(xs=ls,ys=ls,initial_left=s,initial_right=s),source(xs,ys,a,b),apply3(function(xs,False),ys,a,b));tid=identity(semantic_entry(transport));rows.append(('paired_scan_'+label+'_state_beta_'+t.lower(),transport))
   a,b=var(s,'__congruence'),var(s,'__congruence_');na,nb=binary('+',a,h),binary('+',b,yh);out=combine(na,nb)
   normal=cons(out,source(tail,yt,na,nb));fa=cons(out,apply3(function(tail,False),yt,na,nb));fb=cons(out,apply3(function(tail,True),yt,na,nb))
   ih={'Congruence':[{'Congruence':[{'Congruence':[{'Hypothesis':0},'Normalize']},'Normalize']},'Normalize']}
   step=chain(normal,'Normalize',chain(fa,{'Congruence':['Normalize',use(tid,xs=tail,ys=yt,initial_left=na,initial_right=nb)]},chain(fb,{'Congruence':['Normalize',ih]},'Normalize')))
   proof={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Congruence':[{'Induction':dict(variable='__congruence',names=['other_head','other_tail'],base='Normalize',step={'Congruence':[{'Congruence':[step]}]})}]})}
   support=law(dict(xs=ls),function(xs,False),function(xs,True),proof,dependencies=[tid]);sid=identity(semantic_entry(support));rows.append(('paired_scan_'+label+'_state_'+t.lower(),support))
   zero=word(t,0);fa,fb=apply3(function(xs,False),ys,zero,zero),apply3(function(xs,True),ys,zero,zero)
   proof=chain(fa,'Normalize',chain(fb,{'Congruence':[{'Congruence':[{'Congruence':[use(sid,xs=xs),'Normalize']},'Normalize']},'Normalize']},'Normalize'))
   public=law(dict(xs=ls,ys=ls),zip_(op(ls,'method:scan',xs),op(ls,'method:scan',ys)),op(ls,'method:scan',zip_(xs,ys)),proof,dependencies=[sid]);rows.append(('paired_scan_'+label+'_reconstruction_'+t.lower(),public))
 return rows


def law_roles():return {n:('optimization_endpoint'if '_reconstruction_'in n else'proof_support')for n,_ in named_laws()}
def publish(output,extra=()):
 rows=named_laws()+list(extra);objects={identity(semantic_entry(v)):semantic_entry(v)for _,v in rows};names={n:identity(semantic_entry(v))for n,v in rows};st=Store.publish(Path(output),objects.values(),names);st.rebuild();(st.root/'view.json').write_bytes(canonical(st.bundle(names.values()))+b'\n');return st


def source_functions(held_out=False):
 rows=[]
 for t in ('u32','i32','u64'):
  suffix='_heldout'if held_out else''
  for operation,label in [('+','add'),('-','subtract')]:
   name='pipeline32_paired_prefix_'+label+suffix+'_'+t
   x='xs.map(fn(x)=>left_word(x,seed,k))'if held_out else'xs';y='ys.map(fn(x)=>right_word(x,seed,k))'if held_out else'ys'
   source=f'pub fn {name}(xs:List<{t}>,ys:List<{t}>,seed:{t},k:{t})->List<{t}>'+'{return '+x+'.scan().zip('+y+'.scan(),fn(a)=>fn(b)=>a'+operation+'b).map(fn(x)=>output_word(x,seed,k));}\n'+f'fn output_word(x:{t},seed:{t},k:{t})->{t}'+'{return choose(x<seed,x+k,x-k);}'
   if held_out:source+='\n'+f'fn left_word(x:{t},seed:{t},k:{t})->{t}'+'{return quot_or(x,k,0)+seed;}\n'+f'fn right_word(x:{t},seed:{t},k:{t})->{t}'+'{return rem_or(x,k,0)+k;}'
   rows.append((name,t,source))
 return rows


def specialize(subject,core=None):
 """Checked source transports through pure helper and explicit Let contexts.

Untrusted expansion supplies Normalize witnesses; source parameters are not
whitelisted. Exact generic matching and locally checked dependencies authorize
all changes. Function bodies use their own lexical parameter names.
 """
 from producers.beta_specialization15 import free_parameters,outside_lambda_positions,lift_use
 from producers.beta_sharing17 import beta_share
 from producers.definition_context28 import bind
 from ink_planner.semantic_search import replace,substitute,match
 expand=lambda v: expand_source(v,subject,core)
 roots=[(n,v)for n,v in named_laws()if'_reconstruction_'in n]
 rows=[]
 for fn,body in sorted(subject['functions'].items()):
  current=expand(body);proof='Normalize';dependencies=[];hit=False
  for pass_ in range(8):
   found=False
   for path,node in outside_lambda_positions(current):
    for name,generic in roots:
     args={}
     if not match(generic['from'],node,generic['params'],args)or set(args)!=set(generic['params']):continue
     gid=identity(semantic_entry(generic));middle=replace(current,path,substitute(generic['to'],args));target=beta_share(middle)
     witness=chain(middle,lift_use(current,path,use(gid,**dict(sorted(args.items())))),'Normalize')
     proof=chain(current,proof,witness);current=target;dependencies.append(gid);found=True;hit=True
     break
    if found:break
   if not found:break
  if hit:
   v=law(free_parameters(body),body,current,proof,dependencies=sorted(set(dependencies)))
   rows.append((fn+'_modular_reconstruction',bind(v,core,subject)if core is not None else v))
 return rows


def expand_source(body,subject,core=None):
 import copy
 from producers.beta_specialization15 import instantiate_bound
 from ink_planner.semantic_search import children,set_child,substitute
 functions={f['name']:f for f in core['program']['functions']}if core is not None else{}
 def expand(v,depth=0):
  if depth>128:raise ValueError('source transport expansion limit')
  v=copy.deepcopy(v)
  for i,c in enumerate(children(v)):v=set_child(v,i,expand(c,depth+1))
  n=v['node']
  if isinstance(n,dict)and 'Op'in n:
   method,args=n['Op']
   if method.startswith('call:')and method[5:]in functions:
    f=functions[method[5:]];return expand(substitute(subject['functions'][f['name']],{p[0]:a for p,a in zip(f['params'],args)}),depth+1)
   if method=='apply'and isinstance(args[0]['node'],dict)and'Lambda'in args[0]['node']:return expand(instantiate_bound(args[0]['node']['Lambda'],args[1]),depth+1)
  return v
 return expand(body)
