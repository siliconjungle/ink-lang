from pathlib import Path
import json,hashlib,sys,subprocess,shutil
R=Path(__file__).resolve().parent;B=R.parents[1];K=B/'knowledge';sys.path[:0]=[str(K)]
from ink_knowledge import Store,identity
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
compiler=B.parent/'toolchain/ink-web-engine-28';pins=read(R/'initial-pins.json');old=Store(K,K/'store/snapshots'/f"{pins['baseline_snapshot']}.json");assert old.snapshot_id==pins['baseline_snapshot']
view=read(R/'context/candidate-view.json');rows=read(R/'context/candidate-rows.json');old_ids=set(old.members());fresh=set(view['objects'])-old_ids;assert len(fresh)==9==len(rows)
commands=[]
def run(argv):
 p=subprocess.run(list(map(str,argv)),capture_output=True,text=True,cwd=B);commands.append(dict(argv=list(map(str,argv)),returncode=p.returncode,stdout=p.stdout,stderr=p.stderr));assert p.returncode==0,p.stderr;return json.loads(p.stdout)
admission=run([compiler,'knowledge-check',R/'context/dummy.core.json',R/'context/candidate-view.json']);assert set(admission['entries'])==set(view['objects'])
for row in rows:
 assert row['id'] in fresh and sha(Path(row['source_core']))==row['source_sha256']
 # Each certificate is checked against its exact original source context.
 bundle=Store(R/'context/candidate-store').bundle([row['id']]);package=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=read(Path(row['source_core']))['sha256'] if 'sha256' in read(Path(row['source_core'])) else None,knowledge=bundle,applications=[])
 # The subject supplies the actual checked module identity; JSON file hash differs.
 subject=R/'context'/f'{row["id"]}-subject.json';runargv=[compiler,'emit-semantic',row['source_core'],'--core','-o',subject]
 p=subprocess.run(list(map(str,runargv)),capture_output=True,text=True,cwd=B);commands.append(dict(argv=list(map(str,runargv)),returncode=p.returncode,stdout=p.stdout,stderr=p.stderr));assert p.returncode==0,p.stderr
 package['input_core_sha256']=read(subject)['input_core_sha256'];path=R/'context'/f'{row["id"]}-empty-selection.json';path.write_text(json.dumps(package)+'\n');run([compiler,'check-selection',row['source_core'],path])
objects=[old.object(i) for i in sorted(old_ids)]+[view['objects'][i] for i in sorted(fresh)];names=read(K/'store/names.json');saved_names={k:v for k,v in names.items() if v in old_ids}
for row in rows:
 if row['name'] in names:assert names[row['name']]==row['id']
 names[row['name']]=row['id']
new=Store.publish(K,objects,names);assert set(new.members())==old_ids|fresh and len(new.members())==1831
assert all(new.object(i)==old.object(i) for i in old_ids);assert all(names[k]==v for k,v in saved_names.items());new.rebuild()
archive=K/'research/web-engine-28';archive.mkdir(parents=True,exist_ok=True)
for n in ['candidate-view.json','candidate-rows.json','candidate-evidence.json'] :shutil.copy2(R/'context'/n,archive/n)
receipt={'status':'checked','previous_snapshot':old.snapshot_id,'snapshot':new.snapshot_id,'previous_entries':1822,'entries':1831,'added_entries':9,'new_ids':sorted(fresh),'reused_generic_dependencies':sorted(set(view['objects'])&old_ids),'compiler_sha256':sha(compiler),'candidate_sha256':sha(R/'context/candidate-view.json'),'admission':admission,'commands':commands,'prior_objects_and_names_preserved':True,'scope':'nine context-bound certificates using existing equality rules; profitability measured separately, no theorem based on timings'}
(R/'publication.json').write_text(json.dumps(receipt,indent=2)+'\n');(archive/'publication.json').write_text(json.dumps(receipt,indent=2)+'\n');print(new.snapshot_id,len(new.members()))
