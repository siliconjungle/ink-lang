"""Checked literal-loop expansion; only ordinary normalization has authority."""
from pathlib import Path
import json,subprocess
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import value,var,word,term,op,arrow,law
from producers.frozen_laws import update
root=Path.cwd();compiler=(root/'target/debug/ink').resolve();d=root/'build/v8-unrolling-authoring';d.mkdir(exist_ok=True)
source=d/'source.ink';core=d/'core.json';source.write_text('module unroll_authoring;fn identity(x:u32)->u32{return x;}')
subprocess.run([str(compiler),'emit-core',str(source),'-o',str(core)],capture_output=True,check=True)
results=[];rows=[]
for carrier in ['U32','U64',{'List':'U32'}]:
 s=value(carrier);step_type=arrow(value('U32'),arrow(s,s));step=var(step_type,'step');initial=var(s,'initial')
 for n in [0,1,2,4,8]:
  left=op(s,'call:repeat',term('Nat',{'Nat':n}),initial,step);right=initial
  for i in range(n):right=op(s,'apply',op(arrow(s,s),'apply',step,word('U32',i)),right)
  proposal=law({'step':step_type,'initial':s},left,right)
  name=str(carrier)+'/'+str(n);obj=semantic_entry(proposal);st=Store.publish(d/('case-'+str(len(results))),[obj]);view=d/'view.json';view.write_bytes(canonical(st.bundle([identity(obj)])))
  result=subprocess.run([str(compiler),'knowledge-check',str(core),str(view)],capture_output=True,text=True,timeout=60)
  results.append(dict(name=name,status='checked'if result.returncode==0 else'unadmitted',reason=result.stderr[-1000:]));print(json.dumps(results[-1]),flush=True)
  if result.returncode==0:rows.append(dict(name=name,law=proposal))
update(d/'library',rows)
(d/'receipt.json').write_text(json.dumps(dict(results=results),indent=2)+'\n')
