import hashlib,json,subprocess,tempfile
from pathlib import Path
r=Path(__file__).resolve().parents[2];b=r/'build/function-projection';p=b/'combined-source/build/mutable-function-specialization';q=b/'combined-source/build/mutable-function-specialization-parity';ink=b/'publication-ink';results={}
def run(*args):return subprocess.check_output([str(ink),*map(str,args)],stderr=subprocess.PIPE)
receipt=json.loads(run('check-plan',p/'core.json',p/'plan.json','--core'));results['plan']=dict(status='checked',input=receipt['input'],selected=receipt['selected'],plan_sha256=receipt['plan_sha256'])
with tempfile.TemporaryDirectory()as temp:
 for target,name in [('javascript','selected.mjs'),('rust','selected.rs')]:
  out=Path(temp)/name;run('compile',p/'core.json','--core','--plan',p/'plan.json','--target',target,'-o',out);data=out.read_bytes()
  expected=(q/'program.mjs').read_bytes()if target=='javascript'else(q/'rust/src/lib.rs').read_bytes()
  assert data==expected if target=='javascript'else expected.startswith(data),target
  results[target]=dict(status='matched',bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),scope='complete source image'if target=='javascript'else'complete emitted source prefix before the fixed ABI wrapper')
 out=Path(temp)/'functions.json';run('emit-function-model',r/'core/tests/fixtures/staged-neural-frozen.core.json','--core','--functions','loss,update,frame','-o',out)
 assert out.read_bytes()==(b/'staged-training-functions.json').read_bytes()
 run('knowledge-check',r/'core/tests/fixtures/staged-neural-frozen.core.json',b/'staged-function-bundle.json');results['training_functions']=dict(status='matched-and-admitted',objects=157,bytes=out.stat().st_size)
(b/'publication-replay.json').write_text(json.dumps(dict(schema=1,status='passed',compiler_sha256=hashlib.sha256(ink.read_bytes()).hexdigest(),results=results),indent=2)+'\n');print(results)
