import copy,json,subprocess,tempfile,importlib.util,time
from pathlib import Path
from producers.frozen_laws import read,update
from producers.v8_integer_laws import templates
from producers.semantic_laws import law,op,var,word,term,value
from ink_knowledge import Store,canonical,semantic_entry,identity
root=Path.cwd();folder=root/'build/v8-rup-compaction';compiler=root/'build/v8-signed-division/frozen/ink-final-merged';spec=importlib.util.spec_from_file_location('inline_all',folder/'inline_all.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);results=[];cases={}
def check(claim,d):
 obj=semantic_entry(claim);store=Store.publish(d/'knowledge',[obj]);packet=d/'bundle.json';packet.write_bytes(canonical(store.bundle([identity(obj)])));r=subprocess.run([compiler,'knowledge-check',folder/'core.json',packet],capture_output=True,text=True,timeout=120);assert r.returncode==0,r.stderr
for row in read(folder/'masked/case-library'):
 start=time.monotonic();original=row['law'];candidate=copy.deepcopy(original);goal={k:original[k]for k in ['params','conditions','from','to']}
 with tempfile.TemporaryDirectory(dir=folder)as tmp:
  d=Path(tmp);g=d/'goal.json';g.write_bytes(canonical(goal));cnf=d/'cnf.json';subprocess.run([compiler,'semantic-bitvector-obligation',folder/'core.json',g,'--core','--semantics','fixed-scalars-v4','--encoding','shared-v2','-o',cnf],capture_output=True,check=True);problem=json.loads(cnf.read_bytes());cert,stats=module.compact_certificate(problem,original['proof']['BitVector']['certificate'],seconds=60);candidate['proof']['BitVector']['certificate']=cert;check(candidate,d)
 update(folder/'all-inline-cases',[dict(name=row['name'],law=candidate)]);case=int(row['name'].rsplit('_',1)[1]);cases[case]=candidate;result=dict(name=row['name'],status='checked',before_bytes=len(canonical(original)),after_bytes=len(canonical(candidate)),seconds=round(time.monotonic()-start,3),**stats);results.append(result);print(json.dumps(result),flush=True)
 (folder/'inline-all-results.json').write_text(json.dumps(dict(schema=1,rows=results),indent=2)+'\n')
goal=next(r['goal']for r in templates()if r['name']=='u64_quot_or_self')
def build(lo,hi,hyps,lower=None,upper=None):
 if hi-lo==1:
  selected=sorted(i for i in [lower,upper]if i is not None);assert cases[lo]['conditions']==[hyps[i]for i in selected];return dict(BitVector=dict(semantics='fixed-scalars-v4',hypotheses=selected,certificate=cases[lo]['proof']['BitVector']['certificate']))
 mid=(lo+hi)//2;condition=op(value('Bool'),'binary:==',op(value('U64'),'call:word_and',var(value('U64'),'x'),word('U64',((1<<64)-1)^((1<<(8*mid))-1))),word('U64',0));index=len(hyps)
 false=build(mid,hi,hyps+[dict(**{'from':condition,'to':term(value('Bool'),{'Bool':False})})],index,upper);true=build(lo,mid,hyps+[dict(**{'from':condition,'to':term(value('Bool'),{'Bool':True})})],lower,index);return dict(Cases=dict(condition=condition,on_false=false,on_true=true))
claim=law(goal['params'],goal['from'],goal['to'],build(0,8,[]))
try:
 with tempfile.TemporaryDirectory(dir=folder)as tmp:check(claim,Path(tmp))
 update(folder/'unconditional-inline-library',[dict(name='u64_quot_or_self',law=claim)]);result=dict(status='checked',bytes=len(canonical(claim)))
except Exception as error:result=dict(status='unadmitted',bytes=len(canonical(claim)),reason=str(error))
(folder/'inline-all-root.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result),flush=True)
