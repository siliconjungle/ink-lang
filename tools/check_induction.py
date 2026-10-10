#!/usr/bin/env python3
"""Reproducible unchanged-compiler proof-library extension and hostile-object checks."""
from pathlib import Path
import hashlib,json,shutil,subprocess
root=Path(__file__).resolve().parents[1]
out=root/'reports/database-induction';out.mkdir(parents=True,exist_ok=True)
db=out/'library';db.mkdir(exist_ok=True);commands=[];checks=[]
def run(args):
    args=list(map(str,args));commands.append(args);return subprocess.run(args,cwd=root,capture_output=True,text=True)
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def require(ok,label):
    if not ok:raise RuntimeError(label)
    checks.append(label)
result=run(['python3','dev.py','build','--bin','lang']);require(result.returncode==0,'compiler builds')
lang=root/'target/debug/lang';compiler_hash=digest(lang)
result=run(['python3','knowledge/producers/inductive_proofs.py',db]);require(result.returncode==0,'external producer runs')
names=json.loads((db/'names.json').read_text());full=json.loads((db/'lock.json').read_text())
def lock(filename,objects):
    p=out/filename;p.write_text(json.dumps(dict(schema=1,semantics=full['semantics'],objects=objects),indent=2)+'\n')
    # The loader resolves objects relative to each lock, never a remote registry.
    return p
(out/'objects').mkdir(exist_ok=True)
for p in (db/'objects').iterdir():shutil.copy2(p,out/'objects'/p.name)
def verify(p,expected, label):
    result=run([lang,'verify-library',p]);require((result.returncode==0)==expected,label)
    require(digest(lang)==compiler_hash,'unchanged compiler: '+label)
    return result
base=[names[n] for n in ['List64','map_double','map_inc','map_composed','composed','Tree64','copy_tree']]
phases=[]
for phase,objects,size in [('empty',[],0),('definitions',base,9),('list-proof',base+[names['map_composition']],10),('reused-instance',base+[names['map_composition'],names['map_boundary_instance']],11),('tree-proof',full['objects'],12)]:
    p=lock(phase+'.json',objects);result=verify(p,True,phase);status=json.loads(result.stdout);require(len(status['closure'])==size,phase+' closure size');phases.append(dict(phase=phase,**status))
def altered(name,mutate):
    obj=json.loads((out/'objects'/f'{names[name]}.json').read_text());mutate(obj)
    data=(json.dumps(obj,separators=(',',':'))+'\n').encode();identity=hashlib.sha256(data).hexdigest();(out/'objects'/f'{identity}.json').write_bytes(data);return identity
negative=[]
def reject(label,identity):
    p=lock('reject-'+label+'.json',base+[identity]);result=verify(p,False,label);negative.append(dict(case=label,exit_code=result.returncode,error=result.stderr.strip()))
reject('rehashed-forgery',altered('map_composition',lambda o:o['declaration']['Theorem'].update(proof={'Refl':o['declaration']['Theorem']['from']})))
reject('undeclared-transitive-function',altered('map_composition',lambda o:o['dependencies'].remove(names['composed'])))
reject('nondecreasing-recursion',altered('map_inc',lambda o:o['declaration']['Function']['body']['Match']['branches'][1]['body']['Construct']['arguments'].__setitem__(1,{'SelfCall':[{'Var':'xs'}]})))
reject('unknown-trust-field',altered('map_composition',lambda o:o.update(trusted=True)))
reject('wrong-semantics',altered('map_composition',lambda o:o.update(semantics='trusted-optimisation-v1')))
reject('path-traversal','../outside')
leaf=out/'objects'/f'{names["double"]}.json';original=leaf.read_bytes();leaf.write_bytes(b'{}')
try:
    result=verify(out/'tree-proof.json',False,'content tampering');negative.append(dict(case='content-tampering',exit_code=result.returncode,error=result.stderr.strip()))
finally:leaf.write_bytes(original)
result=verify(out/'tree-proof.json',True,'restored original object')
report={'status':'passed','checks':len(checks),'compiler_sha256':compiler_hash,'phases':phases,'negative':negative,'commands':commands,'scope':'Locally checked mathematical definitions and induction proofs; source rewrite bridge, machine-code equivalence and performance remain separate work.'}
(out/'result.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'status':'passed','checks':len(checks),'objects':len(names),'report':str(out/'result.json')},indent=2))
