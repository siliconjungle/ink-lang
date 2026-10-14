"""Next V8 review slice: total narrowing proposals, ordinary independent proofs."""
from pathlib import Path
import json,subprocess,hashlib
from producers.semantic_laws import value,var,word,op
from producers.author_word_identities import checked_law
from producers.frozen_laws import update
root=Path.cwd();compiler=(root/'target/debug/ink').resolve();d=root/'build/v8-conversion-authoring';d.mkdir(exist_ok=True)
source=d/'source.ink';core=d/'core.json';source.write_text('module conversion_authoring;fn identity(x:u32)->u32{return x;}')
subprocess.run([str(compiler),'emit-core',str(source),'-o',str(core)],capture_output=True,check=True)
u32,u64=value('U32'),value('U64');x,y=var(u64,'x'),var(u64,'y');small=var(u32,'small')
narrow=lambda t:op(u32,'call:word_narrow_u64_to_u32',t)
widen=lambda t:op(u64,'call:word_widen_u32_to_u64',t)
requests=[('narrow_widen',narrow(widen(small)),small,{'small':u32}),
          ('widen_narrow_mask',widen(narrow(x)),op(u64,'call:word_and',x,word('U64',(1<<32)-1)),{'x':u64})]
for name in ['call:word_and','call:word_or','call:word_xor','binary:+','binary:-','binary:*']:
 requests.append(('narrow_'+name.replace(':','_'),narrow(op(u64,name,x,y)),op(u32,name,narrow(x),narrow(y)),dict(x=u64,y=u64)))
rows=[];results=[];compiler_hash=hashlib.sha256(compiler.read_bytes()).hexdigest()
for i,(name,left,right,params)in enumerate(requests):
 case=d/str(i);case.mkdir(exist_ok=True)
 goal=dict(params=params,conditions=[],**{'from':left,'to':right})
 try:
  law,receipt=checked_law(compiler,core,goal,case,15)
  rows.append(dict(name=name,law=law));results.append(dict(name=name,status='checked',receipt=receipt))
 except (ValueError,subprocess.TimeoutExpired)as e:results.append(dict(name=name,status='unadmitted',reason=str(e)))
 print(json.dumps(results[-1]),flush=True)
if hashlib.sha256(compiler.read_bytes()).hexdigest()!=compiler_hash:raise ValueError('Compiler changed')
update(d/'library',rows)
(d/'receipt.json').write_text(json.dumps(dict(compiler_sha256=compiler_hash,results=results),indent=2)+'\n')
