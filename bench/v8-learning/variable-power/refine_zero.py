from pathlib import Path
import hashlib,json,subprocess,time
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import value,var,word,op,law,term
from producers.v8_integer_laws import bindings
from producers.equality_assistance import prove_with_equalities
from producers.bitvector_proofs import certificate
from producers.rup_transport import pack_certificate
b=Path('build/v8-variable-power-cases');out=b/'zero-refinement';out.mkdir(exist_ok=False);compiler=Path('build/v8-proof-dependencies-final-cli/frozen/ink-integrated').resolve();begin=time.monotonic();objects=json.loads((b/'mixed/objects.json').read_bytes());old=json.loads((b/'mixed/law.json').read_bytes());oid=identity(semantic_entry(old));s=value('U32');bo=value('Bool');x=var(s,'x');y=var(s,'y');default=var(s,'default');zero=word('U32',0);one=word('U32',1);params=old['params'];nonzero=op(bo,'binary:!=',y,zero)
def write(name,v):(out/name).write_bytes(canonical(v))
def run(*args):
 r=subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True,timeout=180);assert not r.returncode,r.stderr;return r

def target(args):
 x,y=args;pre=op(s,'binary:-',y,one);mask=op(s,'call:word_and',x,pre);single=op(bo,'binary:==',op(s,'call:word_and',y,pre),zero);rem=op(s,'call:rem_or',x,y,default)
 return op(s,'call:choose',op(bo,'binary:!=',y,zero),op(s,'call:choose',single,mask,rem),default)
right=bindings([s,s],[x,y],target);condition=dict(**{'from':nonzero,'to':term(bo,{'Bool':False})});fact_goal=dict(params=params,conditions=[condition],**{'from':y,'to':zero});write('zero-goal.json',fact_goal);run('semantic-bitvector-obligation',b/'core.json',out/'zero-goal.json','--core','--semantics','fixed-scalars-v4','--encoding','shared-v2','-o',out/'zero-cnf.json');cert=pack_certificate(certificate(json.loads((out/'zero-cnf.json').read_bytes()),seconds=8,conflicts=50000,total_seconds=20));fact={'BitVector':dict(semantics='fixed-scalars-v4',hypotheses=[0],certificate=cert)};write('zero-proof.json',fact)
false=prove_with_equalities(dict(params=params,conditions=[condition],**{'from':old['to'],'to':right}),[dict(**{'from':y,'to':zero},proof=fact)],lambda _: 'Normalize')['proof'];single=op(bo,'binary:==',op(s,'call:word_and',y,op(s,'binary:-',y,one)),zero)
proof={'Trans':dict(middle=old['to'],left={'Use':dict(law=oid,arguments={'x':x,'y':y,'default':default},premises=[])},right={'Cases':dict(condition=nonzero,on_true={'Cases':dict(condition=single,on_true='Normalize',on_false='Normalize')},on_false=false)})};new=law(params,old['from'],right,proof,dependencies=[oid]);write('law.json',new);objects.append(new);write('objects.json',objects);store=Store.publish(out/'candidate',[semantic_entry(x)for x in objects],leaf_size=2);write('view.json',store.bundle([identity(semantic_entry(new))]));r=run('knowledge-check',b/'core.json',out/'view.json');(out/'check.stdout').write_text(r.stdout);(out/'check.stderr').write_text(r.stderr);receipt=dict(schema=1,exit_status=0,law=identity(new),entry=identity(semantic_entry(new)),objects=len(objects),law_bytes=len(canonical(new)),view_bytes=(out/'view.json').stat().st_size,seconds=str(time.monotonic()-begin),compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest());write('terminal.json',receipt);print(json.dumps(receipt))
