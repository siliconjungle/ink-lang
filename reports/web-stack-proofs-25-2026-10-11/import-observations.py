"""Import exact factorial Wasm observations after all performance runs stop."""
import argparse,hashlib,json,sys
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sys.path.insert(0,str(B/'knowledge'))
from ink_knowledge import Store
read=lambda p:json.loads(Path(p).read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
a=argparse.ArgumentParser();a.add_argument('host',choices=['node','browser']);args=a.parse_args()
m=read(R/'metadata.json');f=read(R/'fixtures.json');raw=read(R/(args.host+'-results.json'))
assert raw['status']=='passed' and not (R/(args.host+'-observations.json')).exists()
for p,h in m['artifact_hashes'].items():assert sha(R/p)==h,p
st=Store(B/'knowledge');assert st.snapshot_id==m['new_snapshot']
inputs={x['id']:x for x in f['inputs']};groups={}
for row in raw['samples']:
 if row['variant'].endswith('_wasm'):groups.setdefault((row['case'],row['input'],row['variant']),[]).append(row)
assert len(groups)==5*len(f['cells'])
records=[]
for (case,inp,variant),rows in sorted(groups.items()):
 rows=sorted(rows,key=lambda x:x['round']);assert [x['round'] for x in rows]==list(range(9))
 task=m['tasks'][case];x=inputs[inp]
 if variant.startswith('ink_'):
  _,backend,proof,_=variant.split('_');plan=task['selections'][proof]['sha256'];entries=task['selections'][proof]['laws']
  compiler=m['compilers'][backend]['sha256'];binary=m['artifact_hashes'][f'{backend}/{proof}/{case}/cpu.wasm']
 else:
  assert variant=='rust_expert_wasm';plan=m['artifact_hashes']['rust-expert.wasm'];entries=[];compiler=None;binary=plan
 obj=dict(schema=1,program=task['core_sha256'],entries=sorted(entries),plan=plan,target=dict(hardware=str(m['environment']['cpu']),driver=f'{args.host}:{raw["host"]}; exported Wasm memory only',toolchain=json.dumps(dict(ink=compiler,rustc=m['environment']['rustc'],zig=m['zig'],wasm_sha256=binary),sort_keys=True),backend=variant,bridge='One-list target-native input capture and full-result transport; runner '+sha(R/'runner.mjs')),workload=dict(shape=dict(case=case,length=len(x['xs']),second_length=len(x['ys']),seed=x['seed'],factor=x['factor']),distribution=inp,concurrency=1,residency='resident host inputs; warm modules; captured complete calls'),metrics=dict(complete_call_ns=[str(round(row['ns_per_call'])) for row in rows],peak_bytes=max(row['linear_memory_bytes'] for row in rows)))
 records.append(dict(id=st.observe(obj),case=case,input=inp,variant=variant))
assert st.snapshot_id==m['new_snapshot'] and len({x['id'] for x in records})==len(records)
(R/(args.host+'-observations.json')).write_text(json.dumps(records,indent=2)+'\n')
print(json.dumps(dict(status='passed',host=args.host,imported=len(records),snapshot_unchanged=True)))
