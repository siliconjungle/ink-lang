#!/usr/bin/env python3
"""Propose complete definitional equality between two source functions.

The tool supplies no axioms. The existing kernel must replay both exact source
closures; function names or successful tests grant no equality authority.
"""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import law,value,var,op,word
from producers.definition_context28 import bind
from producers.definitional_roundtrips import _substitute,_beta

def reduce_source(core,subject,source,*,steps=8192):
 """Build explicit, replayable unfold/beta/projection calculations."""
 functions={f['name']:f for f in core['program']['functions']};records=core['program']['records'];remaining=[steps]
 def chain(before,after,proof,tail):
  return tail if before==after else {'Trans':dict(middle=after,left=proof,right=tail)}
 def reduce(t,depth=0):
  remaining[0]-=1
  if remaining[0]<0 or depth>=96:raise ValueError('source equality calculation budget')
  call=t['node'].get('Op')if isinstance(t['node'],dict)else None
  if not call:return t,'Normalize'
  name,args=call;after=None;head_proof='Normalize'
  # Proposals for existing fixed list meanings. Each exact one-step equation
  # is replayed with Unfold by the kernel; this author supplies no rule authority.
  if name=='call:length'and len(args)==1:
   if args[0]['node']=='Nil':after=word('U32',0)
   elif isinstance(args[0]['node'],dict)and'Cons'in args[0]['node']:after=op(t['sort'],'binary:+',op(t['sort'],name,args[0]['node']['Cons'][1]),word('U32',1))
  elif name=='call:foldl'and len(args)==3:
   xs,state,callback=args
   if xs['node']=='Nil':after=state
   elif isinstance(xs['node'],dict)and'Cons'in xs['node']:
    head,tail=xs['node']['Cons'];inner=op(callback['sort']['Arrow'][1],'apply',callback,head);updated=op(state['sort'],'apply',inner,state);after=op(t['sort'],name,tail,updated,callback)
  elif name=='method:at_or'and len(args)==3 and isinstance(args[1]['node'],dict)and'Word'in args[1]['node']:
   xs,index,fallback=args;n=index['node']['Word']
   if xs['node']=='Nil':after=fallback
   elif isinstance(xs['node'],dict)and'Cons'in xs['node']:after=xs['node']['Cons'][0]if n==0 else op(t['sort'],name,xs['node']['Cons'][1],word('U32',n-1),fallback)
  if after is None and name.startswith('call:')and name[5:]in functions:
   f=functions[name[5:]];after=_substitute(subject['functions'][f['name']],dict(zip((n for n,_ in f['params']),args)));head_proof='Unfold'
  elif name=='apply'and isinstance(args[0]['node'],dict)and'Lambda'in args[0]['node']:
   after=_beta(args[0]['node']['Lambda'],args[1]);head_proof='Unfold'
  if after is not None:
   result,tail=reduce(after,depth+1);return result,chain(t,after,head_proof,tail)
  if name.startswith('field:'):
   receiver,rproof=reduce(args[0],depth+1);middle=op(t['sort'],name,receiver)
   constructor=receiver['node'].get('Op')if isinstance(receiver['node'],dict)else None
   if constructor and constructor[0].startswith('record:'):
    fields=records[constructor[0][7:]];index=next(i for i,(field,_)in enumerate(fields)if field==name[6:]);selected=constructor[1][index]
    result,tail=reduce(selected,depth+1)
    return result,chain(t,middle,{'Congruence':[rproof]},chain(middle,selected,'Unfold',tail))
   return middle,{'Congruence':[rproof]}
  children=[reduce(a,depth+1)for a in args];middle=op(t['sort'],name,*(a for a,_ in children));result=middle;args=middle['node']['Op'][1]
  proof='Normalize'
  if name.startswith('binary:')and len(args)==2 and all(isinstance(a['node'],dict)and'Word'in a['node']and a['sort'].get('Value')in {'U32','U64'}for a in args):
   a,b=(x['node']['Word']for x in args);kind=name[7:]
   if kind=='+':result=word(t['sort']['Value'],(a+b)&((1<<{'U32':32,'U64':64}[t['sort']['Value']])-1))
   elif kind in {'==','!=','<','<=','>','>='}:result=dict(sort=t['sort'],node={'Bool':{'==':a==b,'!=':a!=b,'<':a<b,'<=':a<=b,'>':a>b,'>=':a>=b}[kind]})
  if name=='call:choose'and len(args)==3 and isinstance(args[0]['node'],dict)and'Bool'in args[0]['node']:
   result=args[1]if args[0]['node']['Bool']else args[2];proof='Unfold'
  if name=='method:freeze'and len(args)==1:
   inner=args[0]['node'].get('Op')if isinstance(args[0]['node'],dict)else None
   if inner and inner[0]=='call:buffer':result=inner[1][0]
  if name.startswith('record:')and args:
   fields=records[name[7:]];projections=[a['node'].get('Op')if isinstance(a['node'],dict)else None for a in args]
   if len(fields)==len(args)and all(p and p[0]=='field:'+f for p,(f,_)in zip(projections,fields)):
    receiver=projections[0][1][0]
    if all(p[1]==[receiver]for p in projections):result=receiver
  return result,chain(t,middle,{'Congruence':[p for _,p in children]},proof)
 return reduce(source)
p=argparse.ArgumentParser(description=__doc__)
for n in ['core','subject','compiler']:p.add_argument('--'+n,type=Path,required=True)
for n in ['left','right']:p.add_argument('--'+n,required=True)
p.add_argument('--normalization-bridge',action='store_true',help='Ask the existing kernel to normalize between the two explicitly unfolded residual terms')
p.add_argument('-o',type=Path,required=True);a=p.parse_args()
if a.o.exists():raise ValueError('refusing to overwrite proof output')
core=json.loads(a.core.read_text());subject=json.loads(a.subject.read_text());functions={f['name']:f for f in core['program']['functions']};left=functions[a.left];right=functions[a.right]
if left['params']!=right['params']or left['result']!=right['result']:raise ValueError('source signatures differ')
params={n:value(t)for n,t in left['params']};args=[var(params[n],n)for n,_ in left['params']];source=op(value(left['result']),'call:'+a.left,*args);target=op(source['sort'],'call:'+a.right,*args)
normal,left_proof=reduce_source(core,subject,source);other,right_proof=reduce_source(core,subject,target)
if normal!=other and not a.normalization_bridge:raise ValueError('source calculations do not establish the same result')
tail={'Sym':right_proof}if normal==other else{'Trans':dict(middle=other,left='Normalize',right={'Sym':right_proof})}
proof={'Trans':dict(middle=normal,left=left_proof,right=tail)}
proposal=law(params,source,target,proof);proposal['semantics']='ink-general-laws-v1';obj=semantic_entry(bind(proposal,core,subject,[a.left,a.right]));ident=identity(obj);store=Store.publish(a.o,[obj],{'source_equality':ident});view=a.o/'view.json';view.write_bytes(canonical(store.bundle([ident])))
r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
if r.returncode:raise ValueError(r.stderr[-3000:])
(a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',identity=ident,scope='Complete typed source function equality by existing normalization; no maintained invariant or convergence assumption.')))
