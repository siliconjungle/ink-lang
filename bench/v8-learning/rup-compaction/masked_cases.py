"""Private bounded exhaustive source cases and ordinary RUP unit factoring."""
import argparse,hashlib,json,subprocess,tempfile,time
from pathlib import Path
from producers.v8_integer_laws import templates
from producers.semantic_laws import law,op,var,word,term,value
from producers.frozen_laws import update
from ink_knowledge import canonical,semantic_entry,identity,Store
from producers.bitvector_proofs import certificate as raw_certificate
from producers.rup_compaction import compact_certificate
def certificate(problem,seconds=60):
 raw=raw_certificate(problem,seconds=min(20,seconds),conflicts=1000000,total_seconds=seconds)
 return compact_certificate(problem,raw,seconds=60)
p=argparse.ArgumentParser();p.add_argument('names',nargs='*');args=p.parse_args();root=Path.cwd();folder=root/'build/v8-rup-compaction/masked';folder.mkdir(exist_ok=True);(folder/'core.json').write_bytes((root/'build/v8-rup-compaction/core.json').read_bytes());compiler=root/'build/v8-signed-division/frozen/ink-final-merged';image=hashlib.sha256(compiler.read_bytes()).hexdigest();proposals={r['name']:r['goal']for r in templates()};outcomes=[];leaves=[]
names=args.names or ['u64_quot_or_self','u64_rem_or_self','u64_rem_or_zero_numerator']
for name in names:
 goal=proposals[name];variable='y'if 'zero_numerator'in name else'x';started=time.monotonic();deadline=started+900
 def check(claim,d):
  obj=semantic_entry(claim);store=Store.publish(d/'knowledge',[obj]);(d/'bundle.json').write_bytes(canonical(store.bundle([identity(obj)])));r=subprocess.run([compiler,'knowledge-check',folder/'core.json',d/'bundle.json'],capture_output=True,text=True,timeout=120)
  if r.returncode:raise ValueError(r.stderr.strip())
 def build(lo,hi,hyps,lower=None,upper=None):
  if time.monotonic()>=deadline:raise ValueError('masked author deadline')
  if hi-lo==1:
   chosen=sorted(i for i in [lower,upper]if i is not None);conditions=[hyps[i]for i in chosen];request=dict(goal,conditions=conditions)
   with tempfile.TemporaryDirectory(dir=folder)as tmp:
    d=Path(tmp);(d/'goal.json').write_bytes(canonical(request));subprocess.run([compiler,'semantic-bitvector-obligation',folder/'core.json',d/'goal.json','--core','--semantics','fixed-scalars-v4','--encoding','shared-v2','-o',d/'cnf.json'],capture_output=True,check=True,timeout=30);problem=json.loads((d/'cnf.json').read_bytes());cert,stats=certificate(problem,seconds=min(60,max(.01,deadline-time.monotonic())));proof=dict(BitVector=dict(semantics='fixed-scalars-v4',hypotheses=list(range(len(chosen))),certificate=cert));claim=law(goal['params'],goal['from'],goal['to'],proof,conditions=conditions);check(claim,d);update(folder/'case-library',[dict(name=name+'/case_'+str(lo).zfill(3),law=claim)])
   leaves.append(dict(name=name,case=lo,status='checked',bytes=len(canonical(claim)),steps=len(cert['steps']),**stats));(folder/'balanced-leaves.json').write_text(json.dumps(leaves,indent=2)+'\n');print(json.dumps(leaves[-1]),flush=True);return dict(BitVector=dict(semantics='fixed-scalars-v4',hypotheses=chosen,certificate=cert))
  mid=(lo+hi)//2;condition=op(value('Bool'),'binary:==',op(value('U64'),'call:word_and',var(value('U64'),variable),word('U64',((1<<64)-1)^((1<<(8*mid))-1))),word('U64',0));index=len(hyps)
  false=build(mid,hi,hyps+[dict(**{'from':condition,'to':term(value('Bool'),{'Bool':False})})],index,upper)
  true=build(lo,mid,hyps+[dict(**{'from':condition,'to':term(value('Bool'),{'Bool':True})})],lower,index)
  return dict(Cases=dict(condition=condition,on_false=false,on_true=true))
 try:
  proof=build(0,8,[]);claim=law(goal['params'],goal['from'],goal['to'],proof)
  with tempfile.TemporaryDirectory(dir=folder)as tmp:check(claim,Path(tmp))
  update(folder/'balanced-library',[dict(name=name,law=claim)]);result=dict(name=name,status='checked',seconds=round(time.monotonic()-started,3),bytes=len(canonical(claim)),cases=8)
 except Exception as error:result=dict(name=name,status='unadmitted',seconds=round(time.monotonic()-started,3),reason=str(error))
 outcomes.append(result);(folder/'balanced-outcomes.json').write_text(json.dumps(dict(schema=1,compiler_sha256=image,rows=outcomes),indent=2)+'\n');print(json.dumps(result),flush=True)
assert hashlib.sha256(compiler.read_bytes()).hexdigest()==image
