"""Untrusted additive word tactic built entirely from replayed database lemmas.

The kernel does no polynomial normalization. This producer writes a derivation
using general associativity, commutativity, additive inverses and ground values.
"""
import hashlib,json,subprocess,tempfile
from pathlib import Path
from action_replacement import var,convert,trans
from point_delta import binary
from bitvector_proofs import certificate

def free(t):
 if 'Var'in t:return {t['Var']}
 if 'Binary'in t:return free(t['Binary']['left'])|free(t['Binary']['right'])
 return set()
def eqbinary(op,p,q):return {'Binary':dict(op=op,left=p,right=q)}
def refl(t):return {'Refl':t}
def term(items):
 if not items:return {'U64':0}
 out=items[-1]
 for x in reversed(items[:-1]):out=binary('+',x,out)
 return out
class Tactic:
 def __init__(self,add,compiler):self.add=add;self.compiler=compiler;self.laws={};self.memo={}
 def lemma(self,a,z,p):
  params=[[n,'U64']for n in sorted(free(a)|free(z))]
  i=self.add({'Theorem':dict(params=params,conditions=[],**{'from':a,'to':z},proof=p)})
  return {'Use':dict(theorem=i,arguments=[var(n)for n,_ in params],premises=[])}
 def law(self,name,args):
  if name not in self.laws:
   a,b,c=map(var,['a','b','c']);zero={'U64':0};neg=lambda x:binary('-',zero,x)
   laws={
    'assoc':(binary('+',binary('+',a,b),c),binary('+',a,binary('+',b,c))),
    'commute':(binary('+',a,b),binary('+',b,a)),
    'zero':(binary('+',a,zero),a),
    'left_zero':(binary('+',zero,a),a),
    'inverse':(binary('+',a,neg(a)),zero),
    'subtract':(binary('-',a,b),binary('+',a,neg(b))),
    'negate_add':(neg(binary('+',a,b)),binary('+',neg(a),neg(b))),
    'double_negate':(neg(neg(a)),a),
    'multiply_zero':(binary('*',a,zero),zero),
    'zero_multiply':(binary('*',zero,a),zero),
   };left,right=laws[name];params=[[n,'U64']for n in sorted(free(left)|free(right))];goal=dict(params=params,conditions=[],**{'from':left,'to':right})
   cache=Path(__file__).resolve().parents[1]/'build/word-laws';cache.mkdir(parents=True,exist_ok=True);key=hashlib.sha256(json.dumps(goal,sort_keys=True).encode()).hexdigest();file=cache/(key+'.json')
   if file.exists():proof=json.loads(file.read_text())
   else:
    print('author scalar axiom',name,flush=True)
    with tempfile.TemporaryDirectory(prefix='ink-scalar-law-')as directory:
     path=Path(directory)
     def cert(g):
      (path/'goal.json').write_text(json.dumps(g));result=subprocess.run([str(self.compiler),'bitvector-obligation',str(path/'goal.json'),'-o',str(path/'cnf.json')],capture_output=True,text=True)
      if result.returncode:raise ValueError(result.stderr)
      c=certificate(json.loads((path/'cnf.json').read_text()))
      if len(c['steps'])>20000:raise ValueError('scalar certificate exceeds step bound')
      return {'BitVector':dict(**{k:g[k]for k in ['from','to']},hypotheses=[],certificate=c)}
     if name=='assoc':
      parts=[]
      for lo in range(0,64,16):
       mask=((1<<16)-1)<<lo;g={**goal,**{k:binary('&',goal[k],{'U64':mask})for k in ['from','to']}};parts.append([mask,cert(g)])
      proof={'WordExtensionality':dict(**{'from':left,'to':right},parts=parts)}
     else:proof=cert(goal)
    file.write_text(json.dumps(proof,separators=(',',':'))+'\n')
   if 'WordExtensionality'in proof:
    parts=[]
    for mask,part in proof['WordExtensionality']['parts']:
     leaf=part['BitVector'];leaf_id=self.add({'Theorem':dict(params=params,conditions=[],**{k:leaf[k]for k in ['from','to']},proof=part)})
     parts.append([mask,{'Use':dict(theorem=leaf_id,arguments=[var(n)for n,_ in params],premises=[])}])
    proof={'WordExtensionality':{**proof['WordExtensionality'],'parts':parts}}
   identity=self.add({'Theorem':dict(**goal,proof=proof)});self.laws[name]=(identity,params)
  i,params=self.laws[name];assert len(args)==len(params)
  return {'Use':dict(theorem=i,arguments=args,premises=[])}
 def concat(self,left,right):
  a,z=term(left),term(right);target=term(left+right)
  if not left:return self.law('left_zero',[z])
  if not right:return self.law('zero',[a])
  if len(left)==1:return convert(binary('+',a,z),target)
  x,tail=left[0],term(left[1:]);p=self.law('assoc',[x,tail,z]);q=eqbinary('+',refl(x),self.concat(left[1:],right));return self.lemma(binary('+',a,z),target,trans(p,q))
 def inside(self,items,index,p):
  for x in reversed(items[:index]):p=eqbinary('+',refl(x),p)
  return p
 def tidy(self,items):
  start=term(items);proof=refl(start);items=list(items)
  def append(p,new):
   nonlocal proof,items
   proof=self.lemma(start,term(new),trans(proof,p));items=list(new)
  def key(x):
   if 'U64'in x:return ('z','',0)
   if 'Binary'in x and x['Binary']['op']=='-' and x['Binary']['left']=={'U64':0}:return ('a',json.dumps(x['Binary']['right'],sort_keys=True),1)
   return ('a',json.dumps(x,sort_keys=True),0)
  for stop in reversed(range(1,len(items))):
   for i in range(stop):
    if key(items[i])<=key(items[i+1]):continue
    a,b=items[i:i+2];tail=items[i+2:]
    if tail:p=trans({'Sym':self.law('assoc',[a,b,term(tail)])},eqbinary('+',self.law('commute',[a,b]),refl(term(tail))),self.law('assoc',[b,a,term(tail)]))
    else:p=self.law('commute',[a,b])
    new=items[:i]+[b,a]+tail;append(self.inside(items,i,p),new)
  i=0
  while i<len(items):
   if items[i]=={'U64':0}:
    if len(items)==1:append(convert(term(items),{'U64':0}),[]);break
    p=self.law('left_zero',[term(items[i+1:])])if i<len(items)-1 else self.law('zero',[items[i-1]])
    index=i if i<len(items)-1 else i-1;append(self.inside(items,index,p),items[:i]+items[i+1:]);i=max(0,i-1);continue
   if i+1>=len(items):break
   a,b=items[i:i+2];tail=items[i+2:];combine=None
   if 'U64'in a and 'U64'in b:combine={'U64':(a['U64']+b['U64'])%(1<<64)};p=convert(binary('+',a,b),combine)
   elif b==binary('-',{'U64':0},a):combine={'U64':0};p=self.law('inverse',[a])
   if combine is not None:
    if tail:p=trans({'Sym':self.law('assoc',[a,b,term(tail)])},eqbinary('+',p,refl(term(tail))))
    append(self.inside(items,i,p),items[:i]+[combine]+tail);i=max(0,i-1)
   else:i+=1
  return items,proof
 def negative(self,items):
  original=binary('-',{'U64':0},term(items))
  if not items:return [],convert(original,{'U64':0})
  if len(items)>1:
   a=items[0];rest=term(items[1:]);xs,p=self.negative([a]);ys,q=self.negative(items[1:]);allitems=xs+ys
   proof=trans(self.law('negate_add',[a,rest]),eqbinary('+',p,q),self.concat(xs,ys));return allitems,self.lemma(original,term(allitems),proof)
  a=items[0]
  if 'U64'in a:z={'U64':(-a['U64'])%(1<<64)};return ([]if z=={'U64':0}else[z]),convert(original,z)
  if 'Binary'in a and a['Binary']['op']=='-'and a['Binary']['left']=={'U64':0}:return [a['Binary']['right']],self.law('double_negate',[a['Binary']['right']])
  return [original],refl(original)
 def normal(self,t):
  identity=json.dumps(t,sort_keys=True)
  if identity in self.memo:return self.memo[identity]
  if 'Binary'not in t:result=([]if t=={'U64':0}else[t],refl(t))
  else:
   x=t['Binary'];op=x['op'];a,pa=self.normal(x['left']);b,pb=self.normal(x['right']);initial=eqbinary(op,pa,pb);left,right=term(a),term(b)
   if op=='+':items=a+b;p=trans(initial,self.concat(a,b))
   elif op=='-':
    neg,pn=self.negative(b);items=a+neg;p=trans(initial,self.law('subtract',[left,right]),eqbinary('+',refl(left),pn),self.concat(a,neg))
   elif op=='*'and (not a or not b):items=[];p=trans(initial,self.law('zero_multiply',[right])if not a else self.law('multiply_zero',[left]))
   elif op=='*'and 'U64'in left and 'U64'in right:z={'U64':left['U64']*right['U64']%(1<<64)};items=[]if z=={'U64':0}else[z];p=trans(initial,convert(binary('*',left,right),z))
   else:items=[binary(op,left,right)];p=initial
   tidied,q=self.tidy(items);result=(tidied,self.lemma(t,term(tidied),trans(p,q)))
  self.memo[identity]=result;return result
 def prove(self,a,z):
  xs,p=self.normal(a);ys,q=self.normal(z)
  if xs!=ys:raise ValueError('word tactic normal forms differ')
  return self.lemma(a,z,trans(p,{'Sym':q}))
