import hashlib,json,sys
from pathlib import Path
p=Path(__file__).resolve().parent;root=p.parents[1];sys.path.insert(0,str(root/'knowledge'))
from ink_knowledge import Store
s=Store(root/'knowledge');pin=s.snapshot_id;before=len(list((s.data/'observations').glob('*.json')));records=[]
for host in ['node','browser']:
 for row in json.loads((p/f'{host}-observations.json').read_text()):
  src=p/f"report-store/store/observations/{row['id']}.json";obj=json.loads(src.read_text());assert s.observe(obj)==row['id'];records.append(dict(run=host,id=row['id'],source=str(src.relative_to(p)),source_sha256=hashlib.sha256(src.read_bytes()).hexdigest()))
s.rebuild();after=len(list((s.data/'observations').glob('*.json')));assert s.snapshot_id==pin and after-before==len(records)==288
(p/'observation-import.json').write_text(json.dumps(dict(status='passed',before=before,after=after,imported=len(records),snapshot=pin,records=records),indent=2)+'\n')
sizes={}
for label in ['baseline','prior','checked']:
 d=p/label;shaders=list(d.glob('*.wgsl'));sizes[label]={name:(d/name).stat().st_size for name in ['program.mjs','cpu.c','cpu.wasm']};sizes[label].update(wgsl_bytes=sum(x.stat().st_size for x in shaders),shader_count=len(shaders))
(p/'artifact-sizes.json').write_text(json.dumps(dict(status='measured',bytes=sizes,scope='Uncompressed emitted files; differing shader counts prohibit aggregate WGSL reduction claim. Plans/runtime/compressed transfer excluded.'),indent=2)+'\n');print(dict(before=before,after=after,sizes=sizes))
