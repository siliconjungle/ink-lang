"""Reject tampered staged evidence in isolated hardlinked copies."""
from pathlib import Path
import hashlib,importlib.util,json,os,shutil,tempfile
R=Path(__file__).resolve().parent;B=R.parents[1]
spec=importlib.util.spec_from_file_location('checked_publisher',B/'knowledge/producers/publish_web_pipeline33.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
rows=[]
for attack in ['remove-old-name','change-admission-log']:
 with tempfile.TemporaryDirectory(prefix='ink36-publication-negative-')as tmp:
  tmp=Path(tmp);root=tmp/'knowledge';stage=tmp/'staging';shutil.copytree(B/'knowledge/store',root/'store',copy_function=os.link);shutil.copytree(R/'staging',stage,copy_function=os.link)
  before=(root/'store/snapshot.json').read_bytes()
  if attack=='remove-old-name':
   p=stage/'current/store/names.json';v=json.loads(p.read_text());old=json.loads((root/'store/names.json').read_text());v.pop(next(iter(old)));p.unlink();p.write_text(json.dumps(v)+'\n')
  else:
   p=stage/'commands.json';raw=p.read_bytes();p.unlink();p.write_bytes(raw+b' ')
  try:module.publish(root,stage,tmp/'publication.json')
  except ValueError as e:
   assert(root/'store/snapshot.json').read_bytes()==before;rows.append(dict(attack=attack,rejected=str(e),pointer_unchanged=True))
  else:raise AssertionError('tampered stage published')
(R/'publication-negative-controls.json').write_text(json.dumps(dict(status='passed',controls=rows,source_sha256=sha(__file__)),indent=2)+'\n');print(json.dumps(rows))
