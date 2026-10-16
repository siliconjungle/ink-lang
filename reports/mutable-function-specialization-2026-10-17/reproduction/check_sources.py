import hashlib,json,subprocess
from pathlib import Path
r=Path(__file__).resolve().parents[2];d=r/'build/function-projection';p=d/'combined-source';rows={};counts={}
def git(repo,*args):return subprocess.check_output(['git','-C',str(repo),*args])
def check(repo,revision,folder,paths,label):
 count=0
 for entry in git(repo,'ls-tree','-r','-z',revision,*paths).split(b'\0'):
  if not entry:continue
  meta,name=entry.split(b'\t');mode,kind,expected=meta.decode().split();name=name.decode()
  if kind!='blob':continue
  data=(folder/name).read_bytes();assert hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()==expected,(label,name)
  rows[str((folder/name).relative_to(p))]=hashlib.sha256(data).hexdigest();count+=1
 counts[label]=count
source=git(r,'rev-parse','HEAD').decode().strip()
check(r,source,p,['Cargo.toml','Cargo.lock','src','core','stdlib'],'distribution')
pins={}
for name in ['abi','native-support','lowerings/rust','lowerings/js','lowerings/wasm','lowerings/gpu','runtime','knowledge','planner']:
 pin=git(r,'ls-tree',source,name).decode().split()[2];pins[name]=pin
 if name=='knowledge':
  paths=['libraries/'+n for n in git(r/name,'ls-tree','--name-only',pin+':libraries').decode().splitlines()if n.endswith('.ink')]
 elif name=='planner':paths=['browser/pipeline-selection.mjs']
 else:paths=['Cargo.toml','Cargo.lock','src','devices','shaders','hosts','include','assets']
 check(r/name,pin,p/name,paths,name)
record=dict(schema=1,status='matched',distribution=source,packages=pins,counts=counts,files=rows,compiler_sha256=hashlib.sha256((d/'publication-ink').read_bytes()).hexdigest(),scope='All owned compilation source directories, manifests, tracked locks, core test inputs and embedded knowledge/browser/device/host resources match committed Git blobs. Normal Cargo builds the compiler; third-party crates and toolchains remain trusted. No source or build artifacts were restored into Cargo targets.')
(d/'compiler-sources.json').write_text(json.dumps(record,indent=2)+'\n');print(counts,len(rows),record['compiler_sha256'])
