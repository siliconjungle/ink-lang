"""Freeze disjoint, bounded contexts sharing exact factorial target bytes."""
import hashlib,json,os
from pathlib import Path
R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((R/'metadata.json').read_text());s=json.loads((R/'spec.json').read_text());f=json.loads((R/'fixtures.json').read_text())
out=R/'browser-batches';out.mkdir(exist_ok=False);batches=[]
links=['runner.mjs','literal.mjs','expert.mjs','browser.html','rust-literal.wasm','rust-expert.wasm']
for i in range((len(s['tasks'])+3)//4):
 tasks=s['tasks'][i*4:(i+1)*4];names={t['name'] for t in tasks};p=out/f'b{i}';p.mkdir()
 keep=[(j,x) for j,x in enumerate(f['inputs']) if x['case'] in names];remap={j:k for k,(j,x) in enumerate(keep)}
 sub=dict(f,cases=[t['name'] for t in tasks],inputs=[x for j,x in keep],cells=[dict(c,input=remap[c['input']]) for c in f['cells'] if c['case'] in names],profiles=[x for x in f['profiles'] if x['case'] in names])
 meta=dict(m,tasks={k:v for k,v in m['tasks'].items() if k in names},gpu_manifest={variant:{k:v for k,v in rows.items() if k in names} for variant,rows in m['gpu_manifest'].items()},gpu_aliases={k:v for k,v in m['gpu_aliases'].items() if k in names})
 for name,value in [('fixtures',sub),('spec',dict(s,tasks=tasks)),('metadata',meta)]:
  (p/(name+'.json')).write_text(json.dumps(value,separators=(',',':'))+'\n')
 for name in links:os.link(R/name,p/name)
 for name in ['old','new']:(p/name).symlink_to(R/name,target_is_directory=True)
 batches.append(dict(batch=i,cases=sub['cases'],inputs=len(sub['inputs']),cells=len(sub['cells']),fixtures_sha256=sha(p/'fixtures.json'),spec_sha256=sha(p/'spec.json'),metadata_sha256=sha(p/'metadata.json')))
manifest=dict(status='frozen-before-timing',reason='At most four tasks per context, all disjoint frames/cells required; global Rust task indices retained; seed resets per context.',main_fixture_sha256=sha(R/'fixtures.json'),main_spec_sha256=sha(R/'spec.json'),main_metadata_sha256=sha(R/'metadata.json'),linked_artifacts={n:sha(R/n) for n in links},batches=batches,scope='Startup sums contexts; merged cold-call map covers first context. No successful context is omitted.')
(out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(dict(status='passed',batches=len(batches),inputs=sum(x['inputs'] for x in batches),cells=sum(x['cells'] for x in batches))))
