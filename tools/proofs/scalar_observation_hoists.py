"""Staged general beta-expansion proposals for immutable scalar observations.

Reading a small immutable observation before assembling a record can let native
ownership lowering move a large input into an earlier field. Proposal ordering
uses carrier structure only. Every source equality, lexical reconstruction and
fresh physical capability must still pass the ordinary checker.
"""
from producers.semantic_laws import law, op, lam, bound
from producers.definition_context28 import bind
from ink_planner.semantic_search import children, positions, shift, match

SCALARS={'Bool','U32','U64','I32','F32'}

def propose_terms(core,subject,limit=8,frequencies=None):
 records=core['program']['records'];functions={f['name']:f for f in core['program']['functions']}
 def affine(t,seen=frozenset()):
  if not isinstance(t,dict):return False
  if set(t)&{'Buffer','Map','Table'}:return True
  if 'Named'in t:
   n=t['Named'];return n not in seen and any(affine(v,seen|{n})for _,v in records.get(n,[]))
  return any(affine(v,seen)for v in (t.get('Result',[])if 'Result'in t else t.values()))
 def words(t,seen=frozenset()):
  if not isinstance(t,dict):return 1
  if 'List'in t:return 3
  if 'Named'in t:
   n=t['Named'];return 1 if n in seen else sum(words(v,seen|{n})for _,v in records.get(n,[]))
  return 1
 def leaves(t,depth=0):
  n=t['node']
  if isinstance(n,dict)and'Free'in n:yield ('free',n['Free']),t['sort']
  elif isinstance(n,dict)and'Bound'in n and n['Bound']>=depth:yield ('bound',n['Bound']-depth),t['sort']
  for c in children(t):yield from leaves(c,depth+int(isinstance(n,dict)and'Lambda'in n))
 def cheap(t,active=frozenset(),budget=48):
  pending=[t];count=0
  while pending:
   x=pending.pop();count+=1
   if count>budget:return False
   n=x['node'];v=x['sort'].get('Value')if isinstance(x['sort'],dict)else None
   if isinstance(n,dict)and(set(n)&{'Free','Bound'}):
    if v is None or affine(v):return False
   elif isinstance(n,dict)and'Op'in n:
    name,args=n['Op']
    if name.startswith('call:')and name[5:]in functions:
     f=functions[name[5:]]
     if name in active or any(affine(ty)for _,ty in f['params'])or not cheap(subject['functions'][f['name']],active|{name},budget-count):return False
    elif not(name.startswith(('field:','binary:','unary:'))or name in {'call:length','call:choose','call:word_widen_u32_to_u64','call:word_narrow_u64_to_u32'}):return False
    pending.extend(args)
   elif not(isinstance(n,dict)and set(n)&{'Word','Bool'}):return False
  return True
 def abstract(t,captures,depth=0):
  n=t['node'];key=None
  if isinstance(n,dict)and'Bound'in n and n['Bound']>=depth:key=('bound',n['Bound']-depth)
  if key is not None:return dict(sort=t['sort'],node={'Free':captures[key]})
  items=[abstract(c,captures,depth+int(isinstance(n,dict)and'Lambda'in n))for c in children(t)]
  if isinstance(n,dict)and'Op'in n:n={'Op':[n['Op'][0],items]}
  elif isinstance(n,dict)and'Lambda'in n:n={'Lambda':items[0]}
  elif isinstance(n,dict)and'Cons'in n:n={'Cons':items}
  return dict(sort=t['sort'],node=n)
 def transferred(t,depth=0):
  n=t['node']
  if isinstance(n,dict)and'Op'in n:
   name,args=n['Op']
   candidates=args[-1:]if name in {'method:push','method:set','method:insert'}else []
   for arg in candidates:
    an=arg['node'];ty=arg['sort'].get('Value')if isinstance(arg['sort'],dict)else None
    if isinstance(an,dict)and set(an)&{'Free','Bound'}and not affine(ty)and words(ty)>=3:
     yield from leaves(arg,depth)
  for c in children(t):yield from transferred(c,depth+int(isinstance(n,dict)and'Lambda'in n))
 rows=[];frequencies=frequencies or {}
 for caller,body in subject['functions'].items():
  for path,t in positions(body):
   n=t['node'];record=n.get('Op')if isinstance(n,dict)else None
   if not record or not record[0].startswith('record:'):continue
   args=record[1];all_leaves=dict(leaves(t));used={k[1]for k in all_leaves if k[0]=='free'};captures={}
   for key in all_leaves:
    if key[0]=='bound':
     name='ink_observation_capture_'+str(key[1])
     while name in used:name+='_'
     captures[key]=name;used.add(name)
   source=abstract(t,captures);params={k[1]if k[0]=='free'else captures[k]:s for k,s in all_leaves.items()}
   earlier=set()
   for index,arg in enumerate(args):
    ty=arg['sort'].get('Value')if isinstance(arg['sort'],dict)else None
    owners={k for k,s in leaves(arg)if isinstance(s,dict)and not affine(s.get('Value'))and words(s.get('Value'))>=3}
    if isinstance(ty,str)and ty in SCALARS and owners&earlier and cheap(arg):
     observation=abstract(arg,captures);shifted=shift(source,1);children_=shifted['node']['Op'][1];children_[index]=bound(observation['sort'],0)
     target=op(source['sort'],'apply',lam(observation['sort'],shifted),observation)
     proposal=bind(law(params,source,target),core,subject,[caller]);arguments={}
     if not match(proposal['from'],t,set(params),arguments):raise ValueError('source observation matching')
     score=sum(words(all_leaves[k].get('Value'))for k in owners&earlier)*frequencies.get('call:'+caller,1)
     rows.append(dict(label='scalar-observation/'+caller+'/'+str(index),law=proposal,score=score,application=dict(function=caller,path=list(path),arguments=arguments,premises=[])))
    earlier.update(k for k,_ in transferred(arg))
 return sorted(rows,key=lambda r:(-r['score'],r['label'],r['application']['path']))[:limit]
