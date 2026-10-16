from pathlib import Path
import copy,json,subprocess,time,hashlib
from ink_knowledge import canonical,Store,semantic_entry,identity
from producers.semantic_laws import value,var,word,op,law,term
from producers.v8_integer_laws import bindings
from producers.frozen_laws import index,load
from producers.bitvector_proofs import certificate
from producers.rup_transport import pack_certificate
from producers.equality_assistance import prove_with_equalities
b=Path('build/v8-variable-power-cases');compiler=Path('build/v8-proof-dependencies-merged/frozen/ink-integrated').resolve();data=Path('knowledge/producers/data/v8-integer-laws')
def write(path,obj):path.write_bytes(canonical(obj))
def run(*args):return subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True,check=True,timeout=120)
source=b/'source.ink';source.write_text('module variable_power_cases; fn identity(x:u32)->u32{return x;}\n');core=b/'core.json';run('emit-core',source,'-o',core)
s=value('U32');boolean=value('Bool');x=var(s,'x');y=var(s,'y');default=var(s,'default');zero=word('U32',0);one=word('U32',1);params={'x':s,'y':s,'default':s}
aw=lambda a,c:op(s,'call:word_and',a,c)
sub=lambda a:op(s,'binary:-',a,one)
rem=lambda a,c:op(s,'call:rem_or',a,c,default)
neq=lambda a,c:op(boolean,'binary:!=',a,c)
flag=lambda c,t:dict(**{'from':c,'to':term(boolean,{'Bool':t})})
def guard(a):return op(boolean,'binary:&&',neq(a,zero),op(boolean,'binary:==',aw(a,sub(a)),zero))
def replacement(a):return op(s,'call:choose',guard(a[1]),aw(a[0],sub(a[1])),rem(a[0],a[1]))
goal=dict(params=params,conditions=[],**{'from':rem(x,y),'to':bindings([s,s],[x,y],replacement)})
write(b/'goal.json',goal);started=time.monotonic();outcomes=[];supports=[]
def author(g,directory):
 directory.mkdir(exist_ok=True);
 if (directory/'proof.json').exists()and json.loads((directory/'goal.json').read_bytes())==g:return json.loads((directory/'proof.json').read_bytes())
 write(directory/'goal.json',g);run('semantic-bitvector-obligation',core,directory/'goal.json','--core','--semantics','fixed-scalars-v4','--encoding','shared-v2','-o',directory/'cnf.json');problem=json.loads((directory/'cnf.json').read_bytes());cert=pack_certificate(certificate(problem,seconds=8,conflicts=50000,total_seconds=20));proof={'BitVector':dict(semantics='fixed-scalars-v4',hypotheses=list(range(len(g['conditions']))),certificate=cert)};write(directory/'proof.json',proof);return proof
def packed(v):
 if isinstance(v,list):return [packed(x)for x in v]
 if not isinstance(v,dict):return v
 out={k:packed(x)for k,x in v.items()}
 for kind in ['BitVector','Word']:
  if kind in out and isinstance(out[kind],dict)and'certificate'in out[kind]:out[kind]['certificate']=pack_certificate(out[kind]['certificate'])
 return out
try:
 for k in range(32):
  if k:
   row=next(r for r in index(data)if r['name']=='u32_rem_or_power_'+str(k));support=copy.deepcopy(load(data,row));support['proof']=packed(support['proof'])
  else:
   g=dict(params={'x':s,'default':s},conditions=[],**{'from':rem(x,one),'to':aw(x,zero)});support=law(g['params'],g['from'],g['to'],author(g,b/'power-zero'))
  supports.append(support)
 print(json.dumps(dict(stage='support_packed',objects=len(supports),bytes=sum(len(canonical(z))for z in supports))),flush=True)
 def trans(m,l,r):return {'Trans':dict(middle=m,left=l,right=r)}
 def branch(lo,hi,conditions):
  if hi-lo>1:
   mid=(lo+hi)//2;mask=sum(1<<i for i in range(mid,hi));condition=neq(aw(y,word('U32',mask)),zero)
   return {'Cases':dict(condition=condition,on_false=branch(lo,mid,conditions+[flag(condition,False)]),on_true=branch(mid,hi,conditions+[flag(condition,True)]))}
  k=lo;constant=word('U32',1<<k);masked=word('U32',(1<<k)-1);directory=b/('leaf-'+str(k));fact_goal=dict(params=params,conditions=conditions,**{'from':y,'to':constant});fact_proof=author(fact_goal,directory);support=supports[k];sid=identity(semantic_entry(support));hyp={'Hypothesis':len(conditions)}
  def body(strengthened):
   use={'Use':dict(law=sid,arguments={'x':x,'default':default},premises=[])}
   return trans(rem(x,constant),'Normalize',trans(aw(x,masked),use,'Normalize'))

  g=dict(goal,conditions=conditions);claim=prove_with_equalities(g,[dict(**{'from':y,'to':constant},proof=fact_proof)],body,dependencies=[sid]);outcomes.append(dict(k=k,proof_bytes=len(canonical(claim['proof']))));print(json.dumps(outcomes[-1]),flush=True);return claim['proof']
 def chain(k,conditions):
  constant=word('U32',1<<k);masked=word('U32',(1<<k)-1);sid=identity(semantic_entry(supports[k]))
  def body(strengthened):
   use={'Use':dict(law=sid,arguments={'x':x,'default':default},premises=[])}
   return trans(rem(x,constant),'Normalize',trans(aw(x,masked),use,'Normalize'))
  if k==31:
   fact_goal=dict(params=params,conditions=conditions,**{'from':y,'to':constant});fact=author(fact_goal,b/'chain-last')
   return prove_with_equalities(dict(goal,conditions=conditions),[dict(**{'from':y,'to':constant},proof=fact)],body,dependencies=[sid])['proof']
  condition=op(boolean,'binary:==',y,constant)
  equality=dict(**{'from':y,'to':constant})
  on_true={'AssertEquality':dict(equality=equality,premise={'Hypothesis':len(conditions)},body=body(None))}
  return {'Cases':dict(condition=condition,on_true=on_true,on_false=chain(k+1,conditions+[flag(condition,False)]))}
 proof={'Cases':dict(condition=guard(y),on_false='Normalize',on_true=chain(0,[flag(guard(y),True)]))};ids=[identity(semantic_entry(z))for z in supports];claim=law(params,goal['from'],goal['to'],proof,dependencies=sorted(ids));write(b/'law.json',claim)
 objects=[semantic_entry(z)for z in [*supports,claim]];store=Store.publish(b/'candidate',objects,leaf_size=2);write(b/'view.json',store.bundle([identity(objects[-1])]))
 result=run('knowledge-check',core,b/'view.json');(b/'check.stdout').write_text(result.stdout);(b/'check.stderr').write_text(result.stderr)
 outcome=dict(exit_status=0,status='admitted',law=identity(claim),entry=identity(objects[-1]),law_bytes=len(canonical(claim)),view_bytes=(b/'view.json').stat().st_size,leaves=outcomes)
except Exception as error:
 outcome=dict(exit_status=1,status='not_admitted',reason=type(error).__name__+': '+str(error),completed_leaves=outcomes)
 if isinstance(error,subprocess.CalledProcessError):outcome['stderr']=error.stderr
outcome.update(seconds=str(time.monotonic()-started),compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),scope='Bounded ordinary proof composition only. No production source/index change or runtime/selection claim.');(b/'terminal.json').write_text(json.dumps(outcome,indent=2)+'\n');print(json.dumps(outcome),flush=True)
