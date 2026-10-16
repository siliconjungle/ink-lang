import copy,json,subprocess,tempfile
from pathlib import Path
from ink_knowledge import Store,canonical,semantic_entry,identity
from producers.rup_transport import unpack_certificate,encode_hints
root=Path.cwd();folder=root/'build/v8-proof-transport';compiler=folder/'frozen/ink-final';core=folder/'core.json';law=json.loads((folder/'packed.law.json').read_bytes());plain=json.loads((folder/'plain.law.json').read_bytes())
def unpack(proof):
 if 'BitVector'in proof:
  q=copy.deepcopy(proof);q['BitVector']['certificate']=unpack_certificate(q['BitVector']['certificate']);return q
 q=copy.deepcopy(proof);q['Cases']['on_false']=unpack(q['Cases']['on_false']);q['Cases']['on_true']=unpack(q['Cases']['on_true']);return q
assert unpack(law['proof'])==plain['proof'];assert {k:v for k,v in law.items()if k!='proof'}=={k:v for k,v in plain.items()if k!='proof'}
results=[]
try:Store.publish(folder/'plain-store',[semantic_entry(plain)])
except ValueError as error:results.append(dict(label='plain-original-byte-limit',accepted=False,error=str(error)))
else:raise AssertionError('unexpectedly accepted oversized original object')
obj=semantic_entry(law);store=Store.publish(folder/'packed-store',[obj]);bundle=folder/'packed.bundle.json';bundle.write_bytes(canonical(store.bundle([identity(obj)])))
def run(path,label):
 r=subprocess.run([str(compiler), 'knowledge-check',str(core),str(path)],capture_output=True,text=True,timeout=180);(folder/(label+'.stdout')).write_text(r.stdout);(folder/(label+'.stderr')).write_text(r.stderr);return r
r=run(bundle,'packed-check');results.append(dict(label='packed-complete-shared-budget',accepted=r.returncode==0,exit_status=r.returncode,error=r.stderr[-2000:],entry=identity(obj)))
(folder/'admission.json').write_text(json.dumps(dict(schema=1,results=results),indent=2)+'\n');assert r.returncode==0,r.stderr
for label in ['invalid-digit','future-reference','ambiguous-hints','wrong-source-result']:
 negative=copy.deepcopy(law);leaf=negative['proof']
 while 'Cases'in leaf:leaf=leaf['Cases']['on_false']
 step=leaf['BitVector']['certificate']['steps'][0]
 if label=='invalid-digit':step['hints']=[];step['hint_deltas_v1']='='
 elif label=='future-reference':step['hints']=[];step['hint_deltas_v1']=encode_hints([319999])
 elif label=='ambiguous-hints':step['hints']=[0];step['hint_deltas_v1']='A'
 else:negative['to']={'node':{'Word':2},'sort':{'Value':'U64'}}
 with tempfile.TemporaryDirectory(dir=folder,prefix='negative-')as temp:
  p=Path(temp);entry=semantic_entry(negative);s=Store.publish(p/'store',[entry]);b=p/'bundle.json';b.write_bytes(canonical(s.bundle([identity(entry)])));r=run(b,label);assert r.returncode!=0,label
  results.append(dict(label=label,accepted=False,entry=identity(entry),exit_status=r.returncode,error=r.stderr[-2000:]))
(folder/'admission.json').write_text(json.dumps(dict(schema=1,results=results,scope='Existing 16 MB object/catalogue and complete shared semantic/RUP budgets; no raised limit or new theorem rule. Every selected negative object has an authentic recomputed content identity.'),indent=2)+'\n')
print(json.dumps(results,indent=2))
