"""Freeze disjoint task browser contexts before timing."""
import hashlib,json,os
from pathlib import Path
R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 m=json.loads((R/'metadata.json').read_text());s=json.loads((R/'spec.json').read_text());f=json.loads((R/'fixtures.json').read_text());out=R/'browser-batches';out.mkdir(exist_ok=True);batches=[]
 for index in range((len(s['tasks'])+3)//4):
  tasks=s['tasks'][index*4:(index+1)*4];names={t['name'] for t in tasks};p=out/f'b{index}';p.mkdir();keep=[(i,x) for i,x in enumerate(f['inputs']) if x['case'] in names];remap={i:j for j,(i,x) in enumerate(keep)}
  fixture=dict(f,cases=[t['name'] for t in tasks],inputs=[x for i,x in keep],cells=[dict(c,input=remap[c['input']]) for c in f['cells'] if c['case'] in names],profiles=[x for x in f['profiles'] if x['case'] in names])
  for label,d in [('fixtures',fixture),('spec',dict(s,tasks=tasks))]:(p/f'{label}.json').write_text(json.dumps(d,separators=(',',':'))+'\n')
  for label in ['runner.mjs','literal.mjs','expert.mjs','browser.html','rust-literal.wasm','rust-expert.wasm']:os.link(R/label,p/label)
  for label in ['baseline','prior','checked','gpu-prior','gpu-checked']:(p/label).symlink_to(R/label,target_is_directory=True)
  batches.append(dict(batch=index,cases=fixture['cases'],inputs=len(fixture['inputs']),cells=len(fixture['cells']),fixtures_sha256=sha(p/'fixtures.json'),spec_sha256=sha(p/'spec.json')))
 assert sum(b['inputs'] for b in batches)==len(f['inputs']) and sum(b['cells'] for b in batches)==len(f['cells'])
 assert sorted(t['index'] for t in s['tasks'])==list(range(len(s['tasks'])))
 manifest=dict(status='frozen-before-timing',reason='Sequential groups of at most four tasks fixed before timing; exact disjoint frames/cells and unchanged global Rust indices/runner. Seed resets per context; startup sums all three contexts; no successful batch omitted.',main_fixture_sha256=sha(R/'fixtures.json'),main_spec_sha256=sha(R/'spec.json'),main_metadata_sha256=sha(R/'metadata.json'),batches=batches,linked_artifacts={n:m['artifact_hashes'][n] for n in ['runner.mjs','literal.mjs','expert.mjs','browser.html','rust-literal.wasm','rust-expert.wasm']})
 (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps(dict(status='passed',batches=len(batches),inputs=len(f['inputs']),cells=len(f['cells']))))
if __name__=='__main__':main()
