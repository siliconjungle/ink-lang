from pathlib import Path
import re,subprocess,json,hashlib
root=Path.cwd();base=root/'build/v8-proof-transport';path=base/'legacy-compiler';source='1a5c025fe86e92e7729edb1af093aa1ceb5e1abb';files={}
for missing in re.findall(r"error: couldn't read `([^`]+)`",(base/'legacy-build.log').read_text()):
 destination=(path/missing).resolve();relative=destination.relative_to(path);parts=relative.parts
 if parts[0]in ['knowledge','planner']:
  pin=subprocess.check_output(['git','rev-parse',source+':'+parts[0]],text=True).strip();arg='/'.join(parts[1:]);data=subprocess.check_output(['git','-C',str(root/parts[0]),'show',pin+':'+arg]);ref=parts[0]+':'+pin+':'+arg
 else:data=subprocess.check_output(['git','show',source+':'+str(relative)]);ref=source+':'+str(relative)
 destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(data);files[str(relative)]=dict(sha256=hashlib.sha256(data).hexdigest(),git_source=ref)
assert len(files)==17
p=base/'legacy-source-pins.json';record=json.loads(p.read_text());record['embedded_declared_inputs']=files;p.write_text(json.dumps(record,indent=2)+'\n')
print('Materialized exactly 17 required compiler-embedded module inputs from their pinned Git objects; no knowledge store or reports copied')
