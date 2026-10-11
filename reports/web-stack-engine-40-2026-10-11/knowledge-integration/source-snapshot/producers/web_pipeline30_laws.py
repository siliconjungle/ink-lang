"""Two pure ordered-list stage transport laws; speed is a separate question.

Concat-filter merges two batches before selecting. Map/filter/map transports
selection to the input and removes one materialized list, recomputing f for
accepted elements. No float reassociation or new checking rule.
"""
from pathlib import Path
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import arrow,bound,lam,law,op,value,var

def named_laws():
 rows=[]
 for t in ('U32','I32','U64','F32'):
  s,ls,bs=value(t),value({'List':t}),value('Bool');us,ps=arrow(s,s),arrow(s,bs)
  xs,ys=var(ls,'xs'),var(ls,'ys');f,g,p=var(us,'f'),var(us,'g'),var(ps,'p')
  ap=lambda cb,a:op(cb['sort']['Arrow'][1],'apply',cb,a)
  mapped=lambda a,cb:op(ls,'method:map',a,cb);filtered=lambda a,cb:op(ls,'method:filter',a,cb);concat=lambda a,b:op(ls,'method:concat',a,b)
  induction=lambda condition:{'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step={'Cases':dict(condition=condition,on_false='Normalize',on_true='Normalize')})}
  rows.append(('concat_filter_transport_'+t.lower(),law(dict(xs=ls,ys=ls,p=ps),concat(filtered(xs,p),filtered(ys,p)),filtered(concat(xs,ys),p),induction(ap(p,var(s,'head'))))))
  x=bound(s,0);pred=lam(s,ap(p,ap(f,x)));compose=lam(s,ap(g,ap(f,x)))
  rows.append(('map_filter_map_transport_'+t.lower(),law(dict(xs=ls,f=us,p=ps,g=us),mapped(filtered(mapped(xs,f),p),g),mapped(filtered(xs,pred),compose),induction(ap(p,ap(f,var(s,'head')))))))
 return rows

def law_roles():return {n:'optimization_endpoint'for n,_ in named_laws()}

def specialize(subject,core=None):
 from producers.beta_sharing17 import derive
 from producers.definition_context28 import bind
 rows=derive(subject,named_laws())
 return [(n,bind(v,core,subject))for n,v in rows]if core is not None else rows

def publish(output,extra=()):
 rows=named_laws()+list(extra);objects={identity(semantic_entry(v)):semantic_entry(v)for _,v in rows};names={n:identity(semantic_entry(v))for n,v in rows}
 store=Store.publish(Path(output),objects.values(),names);store.rebuild();(store.root/'view.json').write_bytes(canonical(store.bundle(names.values()))+b'\n');return store

def source_functions(held_out=False):
 rows=[]
 for t in ('u32','i32','u64','f32'):
  suffix='_heldout'if held_out else''
  predicate=('choose(x<seed,x>k,x<k)'if t=='f32'else'rem_or(x,k,0)<seed')if held_out else'x<seed'
  name='pipeline30_merged_selection'+suffix+'_'+t
  source=f'pub fn {name}(xs:List<{t}>,ys:List<{t}>,seed:{t},k:{t})->List<{t}>'+'{return xs.filter(fn(x)=>batch_accepts(x,seed,k)).concat(ys.filter(fn(x)=>batch_accepts(x,seed,k)));}\n'+f'fn batch_accepts(x:{t},seed:{t},k:{t})->Bool'+'{return '+predicate+';}'
  rows.append((name,t,source))
  f=('choose(x<seed,(x*k)+seed,x-k)'if t=='f32'else'x+quot_or(x,k,0)')if held_out else'choose(x<seed,x+k,x-k)'
  g='choose(x<k,k-x,(x*k)+1)'if held_out else'choose(x<seed,seed-x,x+seed)'
  name='pipeline30_calibrated_selection'+suffix+'_'+t
  source=f'pub fn {name}(xs:List<{t}>,seed:{t},k:{t})->List<{t}>'+'{return xs.map(fn(x)=>calibrate_signal(x,seed,k)).filter(fn(x)=>signal_accepts(x,seed,k)).map(fn(x)=>repair_signal(x,seed,k));}\n'+f'fn calibrate_signal(x:{t},seed:{t},k:{t})->{t}'+'{return '+f+';}\n'+f'fn signal_accepts(x:{t},seed:{t},k:{t})->Bool'+'{return x<seed;}\n'+f'fn repair_signal(x:{t},seed:{t},k:{t})->{t}'+'{return '+g+';}'
  rows.append((name,t,source))
 return rows
