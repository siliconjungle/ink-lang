"""Exact rotate and comparison candidates; independent fixed-semantics replay."""
import copy,json,subprocess,time,hashlib
from pathlib import Path
from producers.semantic_laws import value,var,word,op,term,law
from producers.v8_word_laws import templates
from producers.bitvector_proofs import certificate
from producers.frozen_laws import update
root=Path.cwd();d=root/'build/v8-circuit-next';compiler=root/'build/v8-circuit-core/target/debug/source-bits'
rows=[];u32,u64,b=value('U32'),value('U64'),value('Bool');truth=term(b,{'Bool':True})
for kind,width in [('U32',32),('U64',64)]:
 s=value(kind);x=var(s,'x');k=var(u32,'k');opposite=op(u32,'binary:-',word('U32',width),k)
 for label,first,second,rotate in [('left','wrapping_shl','wrapping_shr','rotate_left'),('right','wrapping_shr','wrapping_shl','rotate_right')]:
  a=op(s,'call:'+first,x,k);z=op(s,'call:'+second,x,opposite);target=op(s,'call:'+rotate,x,k)
  for name,bitwise in [('or','word_or'),('xor','word_xor')]:
   condition=[] if name=='or' else [{'from':op(b,'binary:!=',op(u32,'call:word_and',k,word('U32',width-1)),word('U32',0)),'to':truth}]
   rows.append(dict(name=kind.lower()+'/rotate_'+label+'_'+name,goal=dict(params={'x':s,'k':u32},conditions=condition,**{'from':op(s,'call:'+bitwise,a,z),'to':target})))
x,y=var(u32,'small_x'),var(u32,'small_y');widen=lambda x:op(u64,'call:word_widen_u32_to_u64',x)
for name,rel in [('eq','=='),('ne','!='),('lt','<'),('le','<='),('gt','>'),('ge','>=')]:
 rows.append(dict(name='conversion/widen_'+name,goal=dict(params={'small_x':u32,'small_y':u32},conditions=[],**{'from':op(b,'binary:'+rel,widen(x),widen(y)),'to':op(b,'binary:'+rel,x,y)})))
rows += [r for r in templates()if r['name'].endswith(('/shift_left_combine','/shift_right_combine')) or r['name']=='conversion/narrow_mul']
(d/'goals.json').write_text(json.dumps(rows,indent=2)+'\n')
checked=[];receipts=[]
for i,r in enumerate(rows):
 p=d/('case-'+str(i));p.mkdir(exist_ok=True);goal=r['goal'];(p/'goal.json').write_text(json.dumps(goal))
 start=time.monotonic()
 try:
  result=subprocess.run([str(compiler),'problem',str(p/'goal.json')],capture_output=True,text=True,check=True,timeout=60);problem=json.loads(result.stdout)
  proof=certificate(problem,seconds=15,total_seconds=15);proof['encoding']=problem.get('encoding','literal-v1')
  candidate=law(goal['params'],goal['from'],goal['to'],{'BitVector':{'semantics':'fixed-words-v2','hypotheses':list(range(len(goal['conditions']))),'certificate':proof}},conditions=goal['conditions'])
  (p/'law.json').write_text(json.dumps(candidate));subprocess.run([str(compiler),'check',str(p/'law.json')],capture_output=True,text=True,check=True,timeout=60)
  checked.append(dict(name=r['name'],law=candidate));receipt=dict(name=r['name'],status='checked',variables=problem['variables'],clauses=len(problem['clauses']),proof_steps=len(proof['steps']),seconds=time.monotonic()-start)
 except(ValueError,subprocess.SubprocessError)as e:receipt=dict(name=r['name'],status='unadmitted',reason=str(e),seconds=time.monotonic()-start)
 receipts.append(receipt);print(json.dumps(receipt),flush=True)
update(d/'library',checked)
(d/'receipt.json').write_text(json.dumps(dict(harness_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),results=receipts),indent=2)+'\n')
