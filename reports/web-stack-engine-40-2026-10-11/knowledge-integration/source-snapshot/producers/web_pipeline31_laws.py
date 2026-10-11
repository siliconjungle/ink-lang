"""Skip an unused full mapped producer paired with a filtered subsequence.

Projection observes only the filtered side. A generalized arbitrary-prefix
padding induction proves truncation never loses accepted values; filtered
positions are not assumed to align with their original positions.
"""
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,op,term,value,var,binary,word
from producers.web_sequence_laws import named_laws as sequence_laws


def grouped_laws():
 supports=[];roots=[];dependencies=[]
 for t in ('U32','I32','U64','F32'):
  s,ls,bs=value(t),value({'List':t}),value('Bool');un,ps=arrow(s,s),arrow(s,bs)
  xs,f,p,g=var(ls,'xs'),var(un,'f'),var(ps,'p'),var(un,'g')
  head,tail=var(s,'head'),var(ls,'tail');prefix=var(ls,'__congruence');ph,pt=var(s,'padding_head'),var(ls,'padding_tail')
  nil=term(ls,'Nil');cons=lambda h,t:term(ls,{'Cons':[h,t]});concat=lambda a,b:op(ls,'method:concat',a,b)
  mapped=lambda a,cb:op(ls,'method:map',a,cb);filtered=lambda a:op(ls,'method:filter',a,p)
  ap=lambda cb,a:op(cb['sort']['Arrow'][1],'apply',cb,a)
  assoc=dict(sequence_laws())['concat_associative_'+t.lower()];aid=identity(semantic_entry(assoc));dependencies.append(('prior_concat_associative_'+t.lower(),assoc))
  params=dict(xs=ls,f=un,p=ps,g=un)
  fh=ap(f,head);singleton=cons(fh,nil)
  for side in ('left','right'):
   projection=lam(s,lam(s,ap(g,bound(s,0 if side=='left' else 1))))
   zipper=lambda unused,accepted:op(ls,'method:zip',unused,accepted,projection)if side=='left'else op(ls,'method:zip',accepted,unused,projection)
   source=lambda a,z:zipper(concat(z,mapped(a,f)),filtered(a))
   target=lambda a:mapped(filtered(a),g)
   function=lambda a,selected:lam(ls,target(a)if selected else source(a,bound(ls,0)))
   def chain(first,middle,left,right):return {'Trans':dict(middle=middle,left=left,right=right)}
   z=var(ls,'padding')
   transport=law(dict(params,padding=ls),source(xs,z),ap(function(xs,False),z))
   tid=identity(semantic_entry(transport));supports.append(('filtered_'+side+'_projection_beta_transport_'+t.lower(),transport))
   def use_ih(z,index):
    a,b=ap(function(tail,False),z),ap(function(tail,True),z)
    transport_use={'Use':dict(law=tid,arguments=dict(xs=tail,padding=z,f=f,p=p,g=g),premises=[])}
    return chain(None,a,transport_use,chain(None,b,{'Congruence':[{'Hypothesis':index},'Normalize']},'Normalize'))
   def shifted(z):
    old=concat(z,cons(fh,mapped(tail,f)));new=concat(concat(z,singleton),mapped(tail,f))
    association={'Sym':{'Use':dict(law=aid,arguments=dict(xs=z,ys=singleton,zs=mapped(tail,f)),premises=[])}}
    expanded=concat(z,concat(singleton,mapped(tail,f)))
    scalar=chain(None,expanded,'Normalize',association)
    pieces=[scalar,'Normalize','Normalize']if side=='left'else['Normalize',scalar,'Normalize']
    normalized=zipper(old,filtered(tail));aligned=source(tail,concat(z,singleton))
    return normalized,aligned,{'Congruence':pieces}
   # Rejected head: keep it as harmless padding in the unused receiver.
   normalized,aligned,shift=shifted(prefix)
   rejected=chain(None,normalized,'Normalize',chain(None,aligned,shift,use_ih(concat(prefix,singleton),0)))
   # Accepted head with no padding consumes the corresponding mapper head.
   accepted_nil=chain(None,cons(ap(g,head),source(tail,nil)),'Normalize',chain(None,cons(ap(g,head),target(tail)),{'Congruence':['Normalize',use_ih(nil,0)]},'Normalize'))
   # Accepted head with padding consumes one padding value and retains f(head).
   normalized,aligned,shift=shifted(pt)
   accepted_step=chain(None,cons(ap(g,head),normalized),'Normalize',chain(None,cons(ap(g,head),target(tail)),{'Congruence':['Normalize',chain(None,aligned,shift,use_ih(concat(pt,singleton),0))]},'Normalize'))
   accepted={'Induction':dict(variable='__congruence',names=['padding_head','padding_tail'],base=accepted_nil,step=accepted_step)}
   proof={'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Congruence':[{'Cases':dict(condition=ap(p,head),on_false=rejected,on_true=accepted)}]})}
   support=law(params,function(xs,False),function(xs,True),proof,dependencies=[aid,tid]);sid=identity(semantic_entry(support))
   supports.append(('filtered_'+side+'_projection_padding_'+t.lower(),support))
   start=source(xs,nil);end=target(xs);a,b=ap(function(xs,False),nil),ap(function(xs,True),nil)
   public=zipper(mapped(xs,f),filtered(xs))
   use={'Use':dict(law=sid,arguments={n:var(sort,n)for n,sort in sorted(params.items())},premises=[])}
   roots.append(('filtered_'+side+'_projection_erasure_'+t.lower(),law(params,public,end,chain(None,a,'Normalize',chain(None,b,{'Congruence':[use,'Normalize']},'Normalize')),dependencies=[sid])))
 return dependencies,supports,roots


def named_laws():
 _,supports,roots=grouped_laws();return supports+roots+constant_scan_laws()

def law_roles():
 _,supports,roots=grouped_laws();return {**{n:'proof_support'for n,_ in supports},**{n:'optimization_endpoint'for n,_ in roots},**{n:('optimization_endpoint'if n=='constant_scan_indexed_u32'else'proof_support')for n,_ in constant_scan_laws()}}

def publish(output,extra=()):
 dependencies,_,_=grouped_laws();rows=dependencies+named_laws()+list(extra);objects={identity(semantic_entry(v)):semantic_entry(v)for _,v in rows};names={n:identity(semantic_entry(v))for n,v in rows};store=Store.publish(Path(output),objects.values(),names);store.rebuild();(store.root/'view.json').write_bytes(canonical(store.bundle(names.values()))+b'\n');return store

def specialize(subject,core=None):
 from producers.beta_sharing17 import derive,beta_share
 from producers.beta_specialization15 import instantiate_bound,free_parameters,outside_lambda_positions,lift_use
 from producers.definition_context28 import bind
 from ink_planner.semantic_search import children,replace,substitute
 rows=derive(subject,grouped_laws()[2]+[constant_scan_laws()[-1]]);generic=dict(grouped_laws()[2])
 def occurs(v,depth):
  n=v['node']
  if isinstance(n,dict)and 'Bound'in n:return n['Bound']==depth
  return any(occurs(c,depth+int(isinstance(n,dict)and 'Lambda'in n))for c in children(v))
 for fn,body in sorted(subject['functions'].items()):
  for path,v in outside_lambda_positions(body):
   n=v['node']
   if not isinstance(n,dict)or n.get('Op',[None])[0]!='method:zip':continue
   left,right,h=n['Op'][1]
   if not isinstance(h['node'],dict)or 'Lambda'not in h['node']:continue
   inner=h['node']['Lambda']
   if not isinstance(inner['node'],dict)or 'Lambda'not in inner['node']:continue
   for side in ('left','right'):
    mapped,filtered=(left,right)if side=='left'else(right,left)
    a,b=mapped['node'],filtered['node']
    if not isinstance(a,dict)or not isinstance(b,dict)or a.get('Op',[None])[0]!='method:map'or b.get('Op',[None])[0]!='method:filter':continue
    xs,f=a['Op'][1];ys,p=b['Op'][1]
    if xs!=ys:continue
    t=h['sort']['Arrow'][0]['Value'];s=value(t);zero=term(s,{'Word':0})
    if side=='left':
     if occurs(inner,0):continue
     g=instantiate_bound(inner,zero)
    else:
     payload=inner['node']['Lambda']
     if occurs(payload,0):continue
     g=lam(s,instantiate_bound(payload,zero))
    name='filtered_'+side+'_projection_erasure_'+t.lower();rule=generic[name];args=dict(xs=xs,f=f,p=p,g=g)
    expanded=replace(body,path,substitute(rule['from'],args));middle=replace(body,path,substitute(rule['to'],args));target=beta_share(middle);gid=identity(semantic_entry(rule))
    use={'Use':dict(law=gid,arguments=dict(sorted(args.items())),premises=[])}
    proof={'Trans':dict(middle=expanded,left='Normalize',right={'Trans':dict(middle=middle,left=lift_use(expanded,path,use),right='Normalize')})}
    rows.append((fn+'_projected_'+name,law(free_parameters(body),body,target,proof,dependencies=[gid])))
 unique={identity(semantic_entry(v)):(n,v)for n,v in rows};rows=[unique[k]for k in sorted(unique)]
 return [(n,bind(v,core,subject))for n,v in rows]if core is not None else rows


def source_functions(held_out=False):
 rows=[]
 for t in ('u32','i32','u64','f32'):
  discarded=('choose(x<seed,(x*k)+seed,(x-seed)*k)'if t=='f32'else'quot_or(x,k,0)+rem_or(x,k,0)')if held_out else'choose(x<seed,x+k,x-k)'
  for side in ('left','right'):
   name='pipeline31_'+side+'_projection'+('_heldout'if held_out else'')+'_'+t
   full='xs.map(fn(x)=>discarded_value(x,seed,k))';accepted='xs.filter(fn(x)=>batch_accepts(x,seed,k))'
   body=full+'.zip('+accepted+',fn(unused)=>fn(y)=>selected_value(y,k))'if side=='left'else accepted+'.zip('+full+',fn(y)=>fn(unused)=>selected_value(y,k))'
   source=f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->List<{t}>'+'{return '+body+';}\n'+f'fn discarded_value(x:{t},seed:{t},k:{t})->{t}'+'{return '+discarded+';}\n'+f'fn batch_accepts(x:{t},seed:{t},k:{t})->Bool'+'{return x<seed;}\n'+f'fn selected_value(x:{t},k:{t})->{t}'+'{return choose(x<k,k-x,x+k);}'
   rows.append((name,t,source))
 name='pipeline31_uniform_prefix'+('_heldout'if held_out else'')+'_u32'
 step='quot_or(seed,k,0)+1'if held_out else'seed+k'
 rows.append((name,'u32',f'pub fn {name}(xs:List<u32>,seed:u32,k:u32)->List<u32>'+'{return xs.map(fn(unused)=>uniform_step(seed,k)).scan();}\nfn uniform_step(seed:u32,k:u32)->u32{return '+step+';}'))
 return rows


def constant_scan_laws():
 s,ls=value('U32'),value({'List':'U32'});xs,c=var(ls,'xs'),var(s,'c');head,tail=var(s,'head'),var(ls,'tail');start=var('Nat','__congruence');zs=var('Nat','start');cons=lambda a,b:term(ls,{'Cons':[a,b]});ap=lambda f,x:op(f['sort']['Arrow'][1],'apply',f,x);nword=lambda i:op(s,'nat.word',i);succ=lambda i:op('Nat','nat.succ',i);initial=lambda i:binary('*',nword(i),c)
 mapper=lam(s,c);indexer=lam(s,lam(s,binary('*',binary('+',bound(s,1),word('U32',1)),c)))
 source=lambda a,i:op(ls,'scan.acc',op(ls,'method:map',a,mapper),initial(i));target=lambda a,i:op(ls,'indexed.from',a,i,indexer);function=lambda a,selected:lam('Nat',(target if selected else source)(a,bound('Nat',0)))
 transport=law(dict(xs=ls,start='Nat',c=s),source(xs,zs),ap(function(xs,False),zs));tid=identity(semantic_entry(transport))
 normalized=cons(binary('+',initial(start),c),source(tail,succ(start)))
 a=cons(binary('*',binary('+',nword(start),word('U32',1)),c),ap(function(tail,False),succ(start)))
 b=cons(binary('*',binary('+',nword(start),word('U32',1)),c),ap(function(tail,True),succ(start)))
 use={'Use':dict(law=tid,arguments=dict(xs=tail,start=succ(start),c=c),premises=[])}
 step={'Trans':dict(middle=normalized,left='Normalize',right={'Trans':dict(middle=a,left={'Congruence':['Normalize',use]},right={'Trans':dict(middle=b,left={'Congruence':['Normalize',{'Congruence':[{'Hypothesis':0},'Normalize']}]},right='Normalize')})})}
 support=law(dict(xs=ls,c=s),function(xs,False),function(xs,True),{'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Congruence':[step]})},dependencies=[tid]);sid=identity(semantic_entry(support));zero=term('Nat',{'Nat':0});a,b=ap(function(xs,False),zero),ap(function(xs,True),zero)
 publicfrom=op(ls,'method:scan',op(ls,'method:map',xs,mapper));publicto=op(ls,'method:map_indexed',xs,indexer)
 proof={'Trans':dict(middle=a,left='Normalize',right={'Trans':dict(middle=b,left={'Congruence':[{'Use':dict(law=sid,arguments=dict(xs=xs,c=c),premises=[])},'Normalize']},right='Normalize')})}
 public=law(dict(xs=ls,c=s),publicfrom,publicto,proof,dependencies=[sid]);rows=[('constant_scan_beta_transport_u32',transport),('constant_scan_nat_offset_u32',support),('constant_scan_indexed_u32',public)]
 return rows
