"""Required checker regression and packed/plain compatibility controls."""
import copy,gzip,hashlib,json,platform,statistics,subprocess,time
from pathlib import Path
from ink_knowledge import Store,identity,canonical,semantic_entry
from producers.rup_transport import pack_certificate
base=Path('build/v8-proof-transport').resolve();old=base/'frozen/ink-legacy';new=base/'frozen/ink-final';out=base/'checker-controls';out.mkdir()
inputs=Path('bench/v8-learning/rup-compaction').resolve();laws=[]
for p in sorted((inputs/'controls').glob('*/compacted.law.json.gz')):laws.append((p.parent.name,json.loads(gzip.decompress(p.read_bytes()))))
for p in sorted((inputs/'conditional-cases').glob('*.json.gz')):laws.append((p.stem.split('.')[0],json.loads(gzip.decompress(p.read_bytes()))))
assert len(laws)==15
variants={'plain':[],'packed':[]}
for label in variants:
 for name,law in laws:
  obj=copy.deepcopy(law)
  if label=='packed':obj['proof']['BitVector']['certificate']=pack_certificate(obj['proof']['BitVector']['certificate'])
  entry=semantic_entry(obj);store=Store.publish(out/(label+'-'+name),[entry]);path=out/(label+'-'+name+'.bundle.json');path.write_bytes(canonical(store.bundle([identity(entry)])));variants[label].append(path)
tracked=[old,new,inputs/'core.json',*variants['plain'],*variants['packed']];before={str(p):hashlib.sha256(p.read_bytes()).hexdigest()for p in tracked}
rows=[];samples={k:[]for k in ['legacy-plain','current-plain','current-packed']}
for worker in range(3):
 for round in range(7):
  order=list(samples)
  if (worker+round)%2:order.reverse()
  for label in order:
   compiler=old if label=='legacy-plain'else new;paths=variants['packed'if label=='current-packed'else'plain'];total=0
   for group,path in enumerate(paths):
    start=time.perf_counter_ns();r=subprocess.run([compiler,'knowledge-check',inputs/'core.json',path],capture_output=True,text=True,timeout=180);elapsed=time.perf_counter_ns()-start;assert r.returncode==0,(label,path,r.stderr);rows.append(dict(worker=worker,round=round,label=label,group=group,ns=elapsed));total+=elapsed
   samples[label].append(dict(worker=worker,round=round,ns=total))
  (out/'progress.json').write_text(json.dumps(dict(worker=worker,round=round,calls=len(rows))))
assert before=={str(p):hashlib.sha256(p.read_bytes()).hexdigest()for p in tracked}
result=dict(schema=1,laws=15,workers=3,rounds=7,cells=rows,samples=samples,median_batch_ns={k:statistics.median(row['ns']for row in v)for k,v in samples.items()},inputs_sha256=before,host=platform.platform(),scope='Alternating complete fresh CLI knowledge-check calls on the same 15 exact admitted control statements (seven compacted legacy controls and eight conditional self-quotient components), separate ordinary arrays vs bounded packed hints. Includes startup, JSON/core reading, canonical hashing and full replay. All outputs checked, preparation excluded, shared workstation. This is checker control timing, not whole-compiler or compiled-runtime performance.')
(out/'result.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items()if k not in ['cells','samples','inputs_sha256']}))
