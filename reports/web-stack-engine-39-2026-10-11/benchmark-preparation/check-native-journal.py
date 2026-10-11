"""Untimed mocked subprocess checks. These produce no performance evidence."""
import importlib.util,json,tempfile,hashlib
from pathlib import Path
from types import SimpleNamespace
B=Path(__file__).resolve().parents[3]
spec=importlib.util.spec_from_file_location('journal_native',B/'bench/web-stack-general39/native.py');n=importlib.util.module_from_spec(spec);spec.loader.exec_module(n)
def put(p,x):p.write_text(json.dumps(x)+'\n')
rows=[]
for case in ['success','nonzero','spawn','malformed','checksum']:
 with tempfile.TemporaryDirectory(prefix='mock-journal-')as tmp:
  p=Path(tmp);d=p/'native';d.mkdir();put(p/'metadata.json',{'mock':True});put(p/'serial-gate.json',{'authorized':True,'metadata_sha256':n.sha(p/'metadata.json')})
  put(p/'spec.json',{'tasks':[{'name':'mock','list_inputs':2,'output_kind':'list_u32'}]})
  put(p/'fixtures.json',{'frames':[{'id':'frame','task':'mock','xs':[3],'ys':[],'expected':[3],'timed':True,'mode':'mock','split':'mock','dimensions':{}}]})
  put(d/'metadata.json',{'bindings':{},'libraries':{'expert':'mock-library'},'binaries':{'frame':'mock-input'}})
  calls=[]
  def fake(argv,**kwargs):
   calls.append(argv)
   if case=='spawn':raise OSError('controlled spawn failure')
   if case=='nonzero':return SimpleNamespace(returncode=9,stdout='',stderr='controlled child failure')
   if case=='malformed':return SimpleNamespace(returncode=0,stdout='{broken',stderr='')
   single,code=n.observe([3]);count=int(argv[5]);output={'single':single,'code':str(code),'iterations':count,'checksum':str((code*count+(1 if case=='checksum'else 0))%2**64),'seconds':0.002}
   return SimpleNamespace(returncode=0,stdout=json.dumps(output),stderr='')
  old=n.subprocess.run;n.subprocess.run=fake
  try:
   try:result=n.measure(p)
   except (OSError,RuntimeError,ValueError):assert case!='success'
   else:assert case=='success'and len(result['journal'])==12
  finally:n.subprocess.run=old
  lines=[json.loads(x)for x in(d/'journal.ndjson').read_text().splitlines()];assert lines==json.loads((d/'journal.json').read_text());assert [x['sequence']for x in lines]==list(range(len(lines)));assert len(lines)==len(calls)
  if case!='success':assert json.loads((d/'failure.json').read_text())['attempts']==1 and not(d/'results.json').exists()
  try:n.measure(p)
  except ValueError as e:assert 'preserve'in str(e)
  else:raise AssertionError('partial/final evidence was overwritten')
  rows.append({'case':case,'attempts':len(lines),'passed':True})
o={'status':'passed','timed':False,'execution':'mock subprocess only; no native programs or real elapsed samples','checks':rows,'helper_sha256':n.sha(B/'bench/web-stack-general39/native.py')}
(Path(__file__).parent/'native-journal-validation.json').write_text(json.dumps(o,indent=2)+'\n');print(json.dumps(o))
