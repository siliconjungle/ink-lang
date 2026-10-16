from pathlib import Path
import copy,hashlib,json,subprocess,time
from ink_knowledge import canonical,identity,semantic_entry,Store
from producers.semantic_laws import value,var,word,op,law
from producers.frozen_laws import index,load
from producers.bitvector_proofs import certificate
from producers.rup_transport import pack_certificate
from producers.equality_assistance import prove_with_equalities
b=Path('build/v8-variable-power-cases/quotient-assisted');compiler=Path('build/v8-proof-dependencies-final-cli/frozen/ink-integrated').resolve();data=Path('knowledge/producers/data/v8-integer-laws');rows=index(data)
def write(p,x):p.write_bytes(canonical(x))
def run(*a):return subprocess.run([str(compiler),*map(str,a)],capture_output=True,text=True,check=True,timeout=120)
s=value('U32');x=var(s,'x');default=var(s,'default');params={'x':s,'default':s};source=b/'source.ink';source.write_text('module power_remainder_author; fn identity(x:u32)->u32{return x;}\n');core=b/'core.json';run('emit-core',source,'-o',core)
def packed(v):
 if isinstance(v,list):return [packed(x)for x in v]
 if not isinstance(v,dict):return v
 out={k:packed(x)for k,x in v.items()}
 for key in ['BitVector','Word']:
  if key in out and isinstance(out[key],dict)and'certificate'in out[key]:out[key]['certificate']=pack_certificate(out[key]['certificate'])
 return out
results=[];selected={};supporting={};started=time.monotonic()
for k in range(32):
 d=b/str(k);d.mkdir();begin=time.monotonic();quotient=copy.deepcopy(load(data,next(r for r in rows if r['name']==('u32_quot_or_power_'+str(k)if k else'u32_quot_or_one'))));quotient['proof']=packed(quotient['proof']);qid=identity(semantic_entry(quotient));constant=word('U32',1<<k)
 g=dict(params=params,conditions=[],**{'from':op(s,'call:rem_or',x,constant,default),'to':op(s,'call:word_and',x,word('U32',(1<<k)-1))});write(d/'goal.json',g)
 def author(request):
  write(d/'strengthened.json',request);run('semantic-bitvector-obligation',core,d/'strengthened.json','--core','--semantics','fixed-scalars-v4','--encoding','shared-v2','-o',d/'cnf.json');problem=json.loads((d/'cnf.json').read_bytes());cert=pack_certificate(certificate(problem,seconds=10,conflicts=60000,total_seconds=25));return {'BitVector':dict(semantics='fixed-scalars-v4',hypotheses=[0],certificate=cert)}
 try:
  use={'Use':dict(law=qid,arguments={'x':x,'default':default},premises=[])};fact={t:quotient[t]for t in ['from','to']};fact['proof']=use
  claim=prove_with_equalities(g,[fact],author,dependencies=[qid]);write(d/'law.json',claim);write(d/'quotient.json',quotient);store=Store.publish(d/'candidate',[semantic_entry(quotient),semantic_entry(claim)],leaf_size=2);write(d/'view.json',store.bundle([identity(semantic_entry(claim))]));checked=run('knowledge-check',core,d/'view.json');(d/'check.stdout').write_text(checked.stdout);(d/'check.stderr').write_text(checked.stderr)
  selected[k]=claim;supporting[qid]=quotient;row=dict(k=k,status='admitted',law=identity(claim),entry=identity(semantic_entry(claim)),law_bytes=len(canonical(claim)),quotient_entry=qid,quotient_bytes=len(canonical(quotient)))
 except Exception as error:
  row=dict(k=k,status='not_admitted',reason=type(error).__name__+': '+str(error))
  if isinstance(error,subprocess.CalledProcessError):row['stderr']=error.stderr
 row['seconds']=str(time.monotonic()-begin);results.append(row);print(json.dumps(row),flush=True)
write(b/'terminal.json',dict(schema=1,exit_status=0,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),rows=results,admitted=len(selected),seconds=str(time.monotonic()-started),scope='Bounded ordinary quotient-assisted constant witnesses. No production index/source change, runtime measurement or authority.'))
