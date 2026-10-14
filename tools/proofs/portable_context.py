"""Untrusted minimization of an exact portable source definition context.

Keep all captured function bodies and every type referenced by the law or those
bodies. Removing unused declarations is a proposal: normal admission and source
matching still check the resulting complete context.
"""
import copy

def prune(law):
 result=copy.deepcopy(law);context=result.get('definition_context')
 if context is None:return result
 seeds=set()
 def collect(value):
  if isinstance(value,dict):
   if isinstance(value.get('Named'),str):seeds.add(value['Named'])
   for child in value.values():collect(child)
  elif isinstance(value,list):
   for child in value:collect(child)
 collect({k:v for k,v in result.items()if k!='definition_context'})
 collect(context['definitions'])
 pending=list(seeds);seen=set()
 while pending:
  name=pending.pop()
  if name in seen:continue
  seen.add(name);before=set(seeds);collect(context['records'].get(name,[]));pending.extend(seeds-before)
 context['records']={k:v for k,v in context['records'].items()if k in seen}
 context['enums']={k:v for k,v in context['enums'].items()if k in seen}
 if 'ids'in context:
  context['ids']=[name for name in context['ids']if name in seen]
  if not context['ids']:del context['ids']
 return result
