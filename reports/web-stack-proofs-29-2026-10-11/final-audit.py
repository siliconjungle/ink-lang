from pathlib import Path
import json,hashlib,sys,sqlite3
R=Path(__file__).resolve().parent;B=R.parents[1];K=B/'knowledge'
sys.path.insert(0,str(K));from ink_knowledge import Store,identity
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
pins=read(R/'initial-pins.json');pub=read(R/'publication.json');obs=read(R/'observations.json');plans=read(R/'measurement-plans.json');freeze=read(R/'timing-freeze.json')
assert sha(pins['compiler'])==pins['compiler_sha256']==freeze['compiler_sha256']
for p,h in freeze['bindings'].items():assert sha(p)==h,p
for p,h in pins['source_baseline']['inventory'].items():assert sha(B/p)==h,p
store=Store(K);ids=set(store.members());assert len(ids)==1867 and store.snapshot_id==pub['snapshot']==obs['snapshot']
assert ids==set(Store(R/'pipeline/union-store').members())
assert Store(R/'pipeline/union-store').snapshot_id==store.snapshot_id
assert set(Store(R/'pipeline/fair-prior-store').members())<ids
for i,h in pins['baseline_objects'].items():assert identity(store.object(i))==h==i
names=read(K/'store/names.json')
for n,i in pins['baseline_names'].items():assert names[n]==i
all_obs={p.stem:p for p in (K/'store/observations').glob('*.json')};assert len(all_obs)==19160
for i,h in pins['baseline_observation_file_hashes'].items():assert sha(all_obs[i])==h
new=set(all_obs)-set(pins['baseline_observation_file_hashes']);assert len(new)==630==obs['new_observations']
rows={x['id']:x for x in obs['rows']};assert set(rows)==new
assert sha(R/'measurement-plans.json')==obs['plans_sha256']
for pid,p in plans.items():assert identity(p)==pid
samples=0
for i in sorted(new):
 o=read(all_obs[i]);Store.validate_observation(o);assert identity(o)==i
 row=rows[i];plan=plans[o['plan']];assert o['entries']==row['proof_entries'];assert set(o['entries'])<=ids
 assert o['program']==plan['program'];assert o['plan']==row['plan'];assert len(o['metrics']['complete_call_ns'])==9
 assert all(int(x)>0 for x in o['metrics']['complete_call_ns']);samples+=9
 assert plan['compiler_sha256']==pins['compiler_sha256'] and plan['metadata_sha256']==sha(R/'metadata.json')
 raw=R/('native/results.json' if row['host']=='native' else row['host']+'-results.json');assert sha(raw)==plan['timing_artifact_sha256']
 if row['variant'].startswith('expert'):assert not o['entries']
assert samples==5670==obs['samples']
assert store.rebuild()==1867
with sqlite3.connect(K/'index.sqlite') as db:
 indexed_entries=db.execute('select count(*) from members where snapshot_id=?',(store.snapshot_id,)).fetchone()[0]
 indexed_obs=db.execute('select count(*) from observations').fetchone()[0]
 assert indexed_entries==1867 and indexed_obs==19160
before=read(R/'ownership-before29.json');current=read(B.parent/'agent-ownership.json')
for key,v in before.items():assert current[key]==v,key
assert (B.parent/'REPORT.md').read_bytes().endswith((R/'parent-report-before29.md').read_bytes())
new_sources=[B/'knowledge/producers/web_pipeline29_laws.py',B/'knowledge/tests/test_web_pipeline29_laws.py',B/'bench/web-stack-proofs-29.py']+[p for p in (B/'bench/web-stack-proofs-29').rglob('*') if p.is_file() and '__pycache__' not in p.parts]
inventory=dict(pins['source_baseline']['inventory']);inventory.update({str(p.relative_to(B)):sha(p) for p in new_sources})
(R/'source-final.json').write_text(json.dumps(dict(status='passed',baseline_unchanged=343,new_source_files=len(new_sources),inventory=inventory,compiler_sha256=pins['compiler_sha256']),indent=2)+'\n')
result=dict(status='passed',frozen_bindings=len(freeze['bindings']),baseline_source_unchanged=343,baseline_objects_preserved=1831,baseline_observations_unchanged=18530,baseline_names_preserved=True,snapshot=store.snapshot_id,entries=1867,observations=19160,new_objects=len(ids-set(pins['baseline_objects'])),new_observations=630,samples=5670,measurement_plans=len(plans),observation_schema_identity_membership='passed',sqlite_members=indexed_entries,sqlite_observations=indexed_obs,old_ownership_fields_preserved=True,old_parent_report_suffix_preserved=True,source_inventory_sha256=sha(R/'source-final.json'),compiler_sha256=pins['compiler_sha256'])
(R/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
