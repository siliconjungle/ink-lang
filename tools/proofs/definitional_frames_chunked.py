"""Untrusted source frame proofs for indexed loops over record state.

Projection precedes expansion of unrelated fields. Loop erasure is proposed
only with a separately checked universal frame law and a concrete proof that
every callback preserves the observed field. Nothing here grants authority.
"""
from producers.definitional_roundtrips import _beta,_substitute
from producers.definition_context28 import bind
from producers.semantic_laws import law,value,var,op,word,lam,bound,term

def propose(core,subject,function,parameter,frame_law,*,steps=8192,lemmas=None):
 functions={f['name']:f for f in core['program']['functions']};records=core['program']['records']
 declaration=functions[function];params=dict(declaration['params'])
 if parameter not in params or params[parameter]!=declaration['result']:raise ValueError('frame observer result must match its observed parameter')
 if any(n.startswith('__assumed_')for n in params):raise ValueError('reserved proof parameter collision')
 remaining=[steps]
 def trans(middle,left,right):return {'Trans':dict(middle=middle,left=left,right=right)}
 def chain(before,after,proof,tail):return tail if before==after else trans(after,proof,tail)
 def call(t):return t['node'].get('Op')if isinstance(t['node'],dict)else None
 def boolean(t):
  node=t['node']
  if isinstance(node,dict)and'Bool'in node:return node['Bool']
  c=call(t)
  if not c:return None
  name,args=c
  if name in ['binary:||','binary:&&']:
   a,b=map(boolean,args)
   if name=='binary:||':return True if a is True or b is True else False if a is False and b is False else None
   return False if a is False or b is False else True if a is True and b is True else None
  if name=='binary:=='and args[0]['sort']==args[1]['sort']:
   a,b=args
   if a['sort']in[value('U32'),value('U64'),value('Bool')]and a==b:return True
  return None
 def boolean_proof(t):
  known=boolean(t)
  if known is None:raise ValueError('symbolic boolean is not decided')
  c=call(t)
  if not c or c[0]not in ['binary:||','binary:&&']:return 'Normalize'
  name,args=c;values=list(map(boolean,args))
  normalized=[a if b is None else term(value('Bool'),{'Bool':b})for a,b in zip(args,values)]
  middle=op(value('Bool'),name,*normalized)
  proofs=['Normalize'if b is None else boolean_proof(a)for a,b in zip(args,values)]
  undecided=next((a for a,b in zip(args,values)if b is None),None)
  finish='Normalize'if undecided is None else {'Cases':dict(condition=undecided,on_true='Normalize',on_false='Normalize')}
  return trans(middle,{'Congruence':proofs},finish)
 def head(t,depth):
  if depth>96:raise ValueError('frame definition depth budget')
  remaining[0]-=1
  if remaining[0]<0:raise ValueError('frame definition work budget')
  c=call(t)
  if not c:return t,'Normalize'
  name,args=c;after=None
  if name=='apply'and not(isinstance(args[0]['node'],dict)and'Lambda'in args[0]['node']):
   function,fproof=head(args[0],depth+1)
   if function!=args[0]:
    middle=op(t['sort'],'apply',function,args[1]);result,tail=head(middle,depth+1)
    return result,chain(t,middle,{'Congruence':[fproof,'Normalize']},tail)
  if name.startswith('call:')and name[5:]in functions:
   f=functions[name[5:]];after=_substitute(subject['functions'][f['name']],dict(zip((n for n,_ in f['params']),args)))
  elif name=='apply'and isinstance(args[0]['node'],dict)and'Lambda'in args[0]['node']:
   after=_beta(args[0]['node']['Lambda'],args[1])
  if after is None:return t,'Normalize'
  reduced,proof=head(after,depth+1);return reduced,chain(t,after,'Unfold',proof)
 def reduce_inner(t,depth=0):
  h,proof=head(t,depth);c=call(h)
  if not c:return h,proof
  name,args=c
  if name=='call:choose':
   condition,yes,no=args;known=boolean(condition)
   if known is not None:
    selected=yes if known else no;result,tail=reduce(selected,depth+1)
    literal=op(h['sort'],name,term(value('Bool'),{'Bool':known}),yes,no)
    selection=trans(literal,{'Congruence':[boolean_proof(condition),'Normalize','Normalize']},chain(literal,selected,'Unfold',tail))
    return result,chain(t,h,proof,selection)
   a,pa=reduce(yes,depth+1);b,pb=reduce(no,depth+1);result=a if a==b else op(h['sort'],name,condition,a,b)
   def branch(selected,reduced,p):return trans(selected,'Normalize',trans(reduced,p,'Normalize'))
   tail={'Cases':dict(condition=condition,on_true=branch(yes,a,pa),on_false=branch(no,b,pb))}
   return result,chain(t,h,proof,tail)
  if name.startswith('record:'):
   children=[reduce(a,depth+1)for a in args];middle=op(h['sort'],name,*(a for a,_ in children));result=middle
   fields=records[name[7:]];projections=[call(a)for a,_ in children]
   if projections and all(p and p[0]=='field:'+field for p,(field,_)in zip(projections,fields)):
    receiver=projections[0][1][0]
    if all(p[1]==[receiver]for p in projections):result=receiver
   return result,chain(t,h,proof,chain(h,middle,{'Congruence':[p for _,p in children]},'Normalize'))
  if name.startswith('field:'):
   receiver,rproof=head(args[0],depth+1);middle=op(h['sort'],name,receiver);rc=call(receiver)
   prefix={'Congruence':[rproof]}
   if rc and rc[0].startswith('record:'):
    fields=records[rc[0][7:]];index=next(i for i,(field,_)in enumerate(fields)if field==name[6:]);selected=rc[1][index]
    result,tail=reduce(selected,depth+1)
    tail=chain(middle,selected,'Unfold',tail)
   elif rc and rc[0]=='call:choose':
    condition,yes,no=rc[1];a=op(h['sort'],name,yes);b=op(h['sort'],name,no)
    ra,pa=reduce(a,depth+1);rb,pb=reduce(b,depth+1)
    result=ra if ra==rb else op(h['sort'],'call:choose',condition,ra,rb)
    def branch(projected,reduced,p):return trans(projected,'Normalize',trans(reduced,p,'Normalize'))
    tail={'Cases':dict(condition=condition,on_true=branch(a,ra,pa),on_false=branch(b,rb,pb))}
   elif rc and rc[0]=='call:repeat_until':
    count,initial,stop,step=rc[1];state_sort=initial['sort'];result_sort=h['sort']
    observe=lam(state_sort,op(result_sort,name,bound(state_sort,0)))
    app=lambda f,a:op(f['sort']['Arrow'][1],'apply',f,a)
    item=var(value('U32'),'__assumed_item');current=var(state_sort,'__assumed_current')
    before=app(observe,app(app(step,item),current));after=app(observe,current)
    framed,callback=reduce(before,depth+1)
    if framed!=op(result_sort,name,current):raise ValueError('loop callback does not definitionally preserve the field')
    callback=trans(framed,callback,{'Sym':'Unfold'})
    until=op(state_sort,'until.from',count,word('U32',0),initial,stop,step)
    field_until=op(result_sort,name,until);observed_until=app(observe,until);observed_initial=app(observe,initial)
    use={'Use':dict(law=frame_law,types=dict(S=state_sort['Value'],R=result_sort['Value']),arguments=dict(count=count,index=word('U32',0),state=initial,observe=observe,stop=stop,step=step),premises=[],assumptions=[callback])}
    result,rest=reduce(observed_initial,depth+1)
    tail=trans(field_until,{'Congruence':['Unfold']},trans(observed_until,{'Sym':'Unfold'},trans(observed_initial,use,rest)))
   else:return middle,chain(t,h,proof,prefix)
   return result,chain(t,h,proof,chain(h,middle,prefix,tail))
  return h,proof
 def reduce(t,depth=0):
  result,proof=reduce_inner(t,depth)
  if lemmas is None:return result,proof
  from producers.flat_term import depth as nesting
  if nesting(proof)<48:return result,proof
  # Each recursive calculation is unconditional. Turn long calculations into
  # ordinary source-bound lemmas and replay their exact uses, keeping wire and
  # proof budgets unchanged. No hypothesis or observation becomes an axiom.
  from producers.definition_context28 import calls
  from ink_knowledge import identity,semantic_entry
  params={}
  def collect(value):
   if isinstance(value,dict):
    node=value.get('node')
    if isinstance(node,dict)and 'Free'in node:
     name=node['Free'];sort=value['sort']
     if name in params and params[name]!=sort:raise ValueError('lemma free variable sort collision')
     params[name]=sort
    for child in value.values():collect(child)
   elif isinstance(value,list):
    for child in value:collect(child)
  collect([t,result]);params=dict(sorted(params.items()))
  dependencies=set()
  def dependencies_of(value):
   if isinstance(value,dict):
    if 'Use'in value:dependencies.add(value['Use']['law'])
    for child in value.values():dependencies_of(child)
   elif isinstance(value,list):
    for child in value:dependencies_of(child)
  dependencies_of(proof)
  candidate=law(params,t,result,proof,dependencies=sorted(dependencies));candidate['semantics']='ink-general-laws-v1'
  candidate=bind(candidate,core,subject,sorted(calls(candidate,functions)))
  obj=semantic_entry(candidate);key=identity(obj)
  if not any(identity(existing)==key for existing in lemmas):lemmas.append(obj)
  return result,{'Use':dict(law=key,arguments={n:var(sort,n)for n,sort in params.items()},premises=[])}
 source=op(value(declaration['result']),'call:'+function,*(var(value(t),n)for n,t in declaration['params']))
 result,proof=reduce(source);target=var(value(params[parameter]),parameter)
 if result!=target:raise ValueError('source observer did not preserve its parameter')
 candidate=law({n:value(t)for n,t in declaration['params']},source,target,proof,dependencies=[frame_law]+([]if lemmas is None else[__import__('ink_knowledge').identity(obj)for obj in lemmas]));candidate['semantics']='ink-general-laws-v1'
 return bind(candidate,core,subject,[function])
