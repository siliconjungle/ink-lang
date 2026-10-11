"""Stage only batch37 canonical objects, observations and producer surface."""
from pathlib import Path
import hashlib,json,subprocess
R=Path(__file__).resolve().parent;K=R.parents[1]/'knowledge'
def read(p):return json.loads(p.read_text())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def tracked(p):return subprocess.run(['git','ls-files','--error-unmatch',p],cwd=K,capture_output=True).returncode==0
publication=read(R/'publication.json');observations=read(R/'observations.json')
paths=['README.md','producers/web_pipeline37_laws.py','tests/test_web_pipeline37_laws.py','store/names.json','store/snapshot.json','store/snapshots/'+publication['snapshot']+'.json']
paths+=['store/objects/'+i+'.json'for i in publication['fresh_entries']]
paths+=['store/observations/'+x['id']+'.json'for x in observations['records']]
seen=set()
def tree(i):
 if i in seen:return
 seen.add(i);p='store/trees/'+i+'.json';j=read(K/p)
 if not tracked(p):paths.append(p)
 if 'left'in j:tree(j['left']);tree(j['right'])
tree(read(K/'store/snapshot.json')['root'])
paths=sorted(set(paths));assert len(publication['fresh_entries'])==22 and len(observations['records'])==840
assert not subprocess.check_output(['git','diff','--cached','--name-only'],cwd=K)
p=R/'knowledge-stage-paths.nul';p.write_bytes(b''.join(x.encode()+b'\0'for x in paths));subprocess.run(['git','add','--pathspec-from-file='+str(p),'--pathspec-file-nul'],cwd=K,check=True)
staged=set(subprocess.check_output(['git','diff','--cached','--name-only','-z'],cwd=K).decode().split('\0'))-{''};assert staged==set(paths),(staged-set(paths),set(paths)-staged)
subprocess.run(['git','diff','--cached','--check'],cwd=K,check=True)
(R/'knowledge-stage-paths.json').write_text(json.dumps(dict(status='scoped',paths=paths,bindings={p:sha(K/p)for p in paths},new_checked_objects=22,new_observations=840,new_tree_nodes=sum(p.startswith('store/trees/')for p in paths)),indent=2)+'\n');print('Scoped knowledge paths',len(paths))
