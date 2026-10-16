"""Compose ordinary RUP equalities through the generic checked word cover."""
import sys,json,time,subprocess,tempfile,hashlib,os
from pathlib import Path
from cases import templates
from producers.bitvector_proofs import certificate
from producers.semantic_laws import law,op,word
from producers.frozen_laws import update
from ink_knowledge import Store,semantic_entry,identity,canonical
root=Path.cwd();folder=root/'build/v8-signed-division';source_compiler=folder/'next-target/debug/ink'
frozen=folder/'frozen';frozen.mkdir(exist_ok=True);compiler=frozen/('ink-parts-'+str(os.getpid()));os.link(source_compiler,compiler)
report=os.environ.get('INK_PARTS_REPORT','parts-authoring')
image=hashlib.sha256(compiler.read_bytes()).hexdigest();choices=sys.argv[1:]or['u64_rem_or_power_20']
rows={r['name']:r for r in templates()};outcomes=[]
for name in choices:
 row=rows[name];goal=row['goal'];carrier=goal['from']['sort']['Value'];width=64 if carrier=='U64'else 32;started=time.monotonic();parts=[]
 try:
  with tempfile.TemporaryDirectory(prefix='parts-',dir=folder)as temp:
   d=Path(temp)
   deadline=time.monotonic()+180
   def prove_range(start,count):
    if time.monotonic()>=deadline:raise ValueError('decomposition authoring deadline')
    mask=((1<<count)-1)<<start;claim=dict(goal)
    for side in ['from','to']:claim[side]=op(goal[side]['sort'],'call:word_and',goal[side],word(carrier,mask))
    (d/'goal.json').write_bytes(canonical(claim))
    r=subprocess.run([compiler,'semantic-bitvector-obligation',folder/'core.json',d/'goal.json','--core','--semantics','fixed-scalars-v4','--encoding','shared-v2','-o',d/'cnf.json'],capture_output=True,text=True,timeout=30);r.check_returncode()
    problem=json.loads((d/'cnf.json').read_bytes())
    try:
     cert=certificate(problem,seconds=4,conflicts=100000,total_seconds=min(10,max(0.01,deadline-time.monotonic())))
     if len(cert['steps'])>20000:raise ValueError('split oversized proposed certificate')
    except ValueError:
     if count==1:raise
     print(name,'split',start,count,flush=True);half=count//2
     prove_range(start,half);prove_range(start+half,count-half);return
    parts.append([mask,dict(BitVector=dict(semantics='fixed-scalars-v4',hypotheses=[],certificate=cert))])
    print(name,'mask',start,count,'steps',len(cert['steps']),flush=True)
   for start in range(0,width,8):prove_range(start,8)
   equality=law(goal['params'],goal['from'],goal['to'],dict(WordExtensionality=dict(parts=parts)))
   obj=semantic_entry(equality);store=Store.publish(d/'knowledge',[obj]);(d/'bundle.json').write_bytes(canonical(store.bundle([identity(obj)])))
   checked=subprocess.run([compiler,'knowledge-check',folder/'core.json',d/'bundle.json'],capture_output=True,text=True,timeout=120)
   if checked.returncode:raise ValueError(checked.stderr.strip())
   update(folder/'adaptive-library',[dict(name=name,law=equality)])
   result=dict(name=name,status='checked',parts=len(parts),seconds=round(time.monotonic()-started,3),proof_steps=sum(len(p['BitVector']['certificate']['steps'])for _,p in parts))
 except Exception as error:result=dict(name=name,status='unadmitted',reason=str(error),parts=len(parts),seconds=round(time.monotonic()-started,3))
 outcomes.append(result);(folder/(report+'.json')).write_text(json.dumps(dict(schema=1,compiler_sha256=image,rows=outcomes),indent=2)+'\n');print(json.dumps(result),flush=True)
assert hashlib.sha256(compiler.read_bytes()).hexdigest()==image,'compiler changed'
