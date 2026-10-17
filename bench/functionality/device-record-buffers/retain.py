import hashlib,json,tarfile,io,shutil
from pathlib import Path
r=Path('build/ink-device-records-20261017');p=Path('bench/functionality/device-record-buffers')
sha=lambda data:hashlib.sha256(data).hexdigest()
entries={}
def add(name,path):
 assert name not in entries,name
 entries[name]=path.read_bytes()
for f in sorted((r/'final-bundle').rglob('*')):
 if f.is_file() and 'target' not in f.relative_to(r/'final-bundle').parts:add('bundle/'+f.relative_to(r/'final-bundle').as_posix(),f)
fixture=Path('build/device-private-helpers')
for name in ['source.ink','script.json','expected.json','gpu-script.json','gpu-receipts.json','required-gpu-errors.json','gpu-final.snapshot','program.mjs','state-wasm.mjs','check.mjs','check-wasm.mjs']:
 add('device-private-helpers/'+name,fixture/name)
for f in sorted((fixture/'rust').rglob('*')):
 if f.is_file() and 'target' not in f.relative_to(fixture/'rust').parts:add('device-private-helpers/rust/'+f.relative_to(fixture/'rust').as_posix(),f)
control=fixture/'rust/target/wasm32-unknown-unknown/debug/compiled_state.wasm'
assert control.is_file();add('device-private-helpers/rust-control.wasm',control)
for name in ['source-reverse-parity','source-reverse64-parity','source-reverse-until-parity']:
 folder=Path('build')/name
 for item in ['source.ink','script.json','expected.json','gpu-script.json','gpu-receipts.json','required-gpu-errors.json']:
  if (folder/item).is_file():add(name+'/'+item,folder/item)
for f in sorted(Path('build/resident-source-training/validation').rglob('*')):
 if f.is_file():add('resident-validation/'+f.relative_to('build/resident-source-training/validation').as_posix(),f)
add('browser-history.json',r/'browser-history.json')
add('public-guide.html',r/'public-guide.html')
for stem in ['published-conformance','published-gpu-package','runtime-tests','runtime-check','runtime-fetch','root-fetch','gpu-fetch','device-graph','final-compiler','final-build','before-build']:
 for suffix in ['stdout','stderr']:
  f=r/(stem+'.'+suffix)
  if f.is_file():add('logs/'+f.name,f)
assert not (p/'histories-and-images.tar.gz').exists()
with tarfile.open(p/'histories-and-images.tar.gz','w:gz') as archive:
 for name,data in sorted(entries.items()):
  info=tarfile.TarInfo(name);info.size=len(data);info.mode=0o644;archive.addfile(info,io.BytesIO(data))
(p/'archive-files.json').write_text(json.dumps({name:sha(data) for name,data in sorted(entries.items())},indent=2)+'\n')
shutil.copyfile(r/'artifact-equivalence.json',p/'artifact-equivalence.json')
manifest={f.name:sha(f.read_bytes()) for f in sorted(p.iterdir()) if f.is_file() and f.name!='manifest.json'}
(p/'manifest.json').write_text(json.dumps({'schema':1,'files':manifest},indent=2)+'\n')
print(json.dumps({'files':len(entries),'archive_bytes':(p/'histories-and-images.tar.gz').stat().st_size}))
