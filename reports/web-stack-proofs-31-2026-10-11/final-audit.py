from pathlib import Path
import json,hashlib,sys,sqlite3
R=Path(__file__).resolve().parent;B=R.parents[1];K=B/'knowledge'
sys.path.insert(0,str(K));from ink_knowledge import Store,identity
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
pins=read(R/'initial-pins.json');pub=read(R/'publication.json');obs=read(R/'observations.json');plans=read(R/'measurement-plans.json');freeze=read(R/'timing-freeze.json')
assert sha(pins['compiler'])==pins['compiler_sha256']==freeze['compiler_sha256']
for p,h in freeze['bindings'].items():assert sha(p)==h,p
for p,h in pins['source_baseline']['inventory'].items():assert sha(B/p)==h,p
store=Store(K);ids=set(store.members());assert len(ids)==pub['entries'] and store.snapshot_id==pub['snapshot']==obs['snapshot']
assert ids==set(Store(R/'proofs/union-store').members())
assert Store(R/'proofs/union-store').snapshot_id==store.snapshot_id
assert set(Store(R/'prior-store').members())==set(pins['baseline_objects'])
for i,h in pins['baseline_objects'].items():
 assert identity(store.object(i))==h==i
 assert sha(K/'store/objects'/(i+'.json'))==pins['baseline_object_file_hashes'][i]
 assert sha(K/'store/objects'/(i+'.json'))==sha(R/'prior-store/store/objects'/(i+'.json'))
names=read(K/'store/names.json')
for n,i in pins['baseline_names'].items():assert names[n]==i
all_obs={p.stem:p for p in (K/'store/observations').glob('*.json')};assert len(all_obs)==obs['observations_total']
for i,h in pins['baseline_observation_file_hashes'].items():assert sha(all_obs[i])==h
new=set(all_obs)-set(pins['baseline_observation_file_hashes']);assert len(new)==840==obs['new_observations']
rows={x['id']:x for x in obs['rows']};assert set(rows)==new
assert sha(R/'measurement-plans.json')==obs['plans_sha256']
for pid,p in plans.items():assert identity(p)==pid
raw_hashes={host:sha(R/('native/results.json'if host=='native'else host+'-results.json'))for host in ['native','node','browser']}
metadata_hash=sha(R/'metadata.json');samples=0
for i in sorted(new):
 o=read(all_obs[i]);Store.validate_observation(o);assert identity(o)==i
 row=rows[i];plan=plans[o['plan']];assert o['entries']==row['proof_entries'];assert set(o['entries'])<=ids
 assert o['program']==plan['program'];assert o['plan']==row['plan'];assert len(o['metrics']['complete_call_ns'])==9
 assert all(int(x)>0 for x in o['metrics']['complete_call_ns']);samples+=9
 assert plan['compiler_sha256']==pins['compiler_sha256'] and plan['metadata_sha256']==metadata_hash
 assert raw_hashes[row['host']]==plan['timing_artifact_sha256']
 if row['variant'].startswith('expert')or row['variant'].startswith('rust'):assert not o['entries']
assert samples==7560==obs['samples']
assert store.rebuild()==len(ids)
with sqlite3.connect(K/'index.sqlite') as db:
 indexed_entries=db.execute('select count(*) from members where snapshot_id=?',(store.snapshot_id,)).fetchone()[0]
 indexed_obs=db.execute('select count(*) from observations').fetchone()[0]
 assert indexed_entries==len(ids) and indexed_obs==len(all_obs)
before=read(R/'ownership-before31.json');current=read(B.parent/'agent-ownership.json')
for key,v in before.items():assert current[key]==v,key
assert (B.parent/'REPORT.md').read_bytes().endswith((R/'parent-report-before31.md').read_bytes())
new_sources=[B/'knowledge/producers/web_pipeline31_laws.py',B/'knowledge/tests/test_web_pipeline31_laws.py',B/'bench/web-stack-proofs-31.py']+[p for p in (B/'bench/web-stack-proofs-31').rglob('*')if p.is_file()and '__pycache__'not in p.parts]
inventory=dict(pins['source_baseline']['inventory']);inventory.update({str(p.relative_to(B)):sha(p)for p in new_sources})
(R/'source-final.json').write_text(json.dumps(dict(status='passed',baseline_unchanged=len(pins['source_baseline']['inventory']),new_source_files=len(new_sources),inventory=inventory,compiler_sha256=pins['compiler_sha256']),indent=2)+'\n')
result=dict(status='passed',frozen_bindings=len(freeze['bindings']),baseline_source_unchanged=len(pins['source_baseline']['inventory']),baseline_objects_preserved=pins['baseline_entries'],baseline_observations_unchanged=pins['baseline_observations'],baseline_names_preserved=True,snapshot=store.snapshot_id,entries=len(ids),observations=len(all_obs),new_objects=len(ids-set(pins['baseline_objects'])),new_observations=840,samples=7560,measurement_plans=len(plans),observation_schema_identity_membership='passed',sqlite_members=indexed_entries,sqlite_observations=indexed_obs,old_ownership_fields_preserved=True,old_parent_report_suffix_preserved=True,source_inventory_sha256=sha(R/'source-final.json'),compiler_sha256=pins['compiler_sha256'])
(R/'final-audit.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
