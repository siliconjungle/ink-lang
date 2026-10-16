"""Read-only source, fixture, packet and unfavorable-corpus integrity audit."""
from pathlib import Path
import gzip,hashlib,json,sqlite3,subprocess,tarfile,tempfile
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def archive(name,wanted=None):
 manifest=json.loads((HERE/(name+'-index.json')).read_bytes());path=HERE/(name+'.tar.gz');assert sha(path.read_bytes())==manifest['archive_sha256'];result={}
 with tarfile.open(path)as a:
  assert {m.name for m in a.getmembers()}==set(manifest['files'])
  for m in a.getmembers():
   assert m.isfile()and not Path(m.name).is_absolute()and'..'not in Path(m.name).parts
   raw=a.extractfile(m).read();r=manifest['files'][m.name];assert len(raw)==r['bytes']and sha(raw)==r['sha256']
   if wanted is None or m.name in wanted:result[m.name]=raw
 return result
def historical_inputs(source,inputs):
 for name,digest in inputs.items():
  raw=subprocess.check_output(['git','-C',str(ROOT/'knowledge'),'show',source+':'+name.removeprefix('knowledge/')]);assert sha(raw)==digest,name
def audit():
 old=json.loads((HERE/'index-source-pins.json').read_bytes());historical_inputs(old['knowledge_source'],old['inputs']);legacy=archive('index-controls');assert sha(gzip.decompress((HERE/'index-regressions.log.gz').read_bytes()))==old['regression_log_sha256']
 current=json.loads((HERE/'discovery-controls.json').read_bytes());historical_inputs(current['knowledge_source'],current['inputs']);files=archive('discovery-controls')
 for name,row in current['logs'].items():assert sha(files[name])==row['sha256']and b'\nOK\n'in files[name]and ('Ran '+str(row['methods'])+' tests').encode()in files[name]
 baseline=current['kind_query_controls']['baseline'];indexed=current['kind_query_controls']['indexed'];key=lambda r:[{k:v for k,v in q.items()if k!='query_seconds'}for q in r['queries']]
 assert len(baseline)==len(indexed)==3
 for r in baseline+indexed:assert r['exit_status']==0 and len(r['queries'])==len(r['work'])==15 and key(r)==key(baseline[0])
 assert max(sum(q['vm_steps_upper_bound']for q in r['work'])for r in indexed)<min(sum(q['vm_steps_lower_bound']for q in r['work'])for r in baseline)
 rows=current['transport_controls']['rows'];assert len(rows)==12
 for case in ['ordinary','near-limit']:
  arms={mode:sorted([r for r in rows if r['case']==case and r['variant']==mode],key=lambda r:r['process'])for mode in ['eager','adaptive']}
  for mode,items in arms.items():
   assert len(items)==3 and [r['process']for r in items]==[0,1,2]
   assert all(r['exit_status']==0 and r['exported_objects']==(1 if case=='ordinary'else 35)and r['identities']==(2049 if case=='ordinary'else 2083)for r in items)
   assert len({(r['view_bytes'],r['view_sha256'],r['tree_files'])for r in items})==1
  if case=='near-limit':assert arms['eager'][0]['view_bytes']==arms['adaptive'][0]['view_bytes']==15988578 and arms['eager'][0]['view_sha256']==arms['adaptive'][0]['view_sha256']
  else:assert arms['adaptive'][0]['tree_files']==127<arms['eager'][0]['tree_files']==3536
 parity=json.loads(files['adaptive-transport/byte-parity.json']);assert parity['exit_status']==0
 selected=archive('selected-inputs',{'program/'+name for name in parity['files']})
 for name,digest in parity['files'].items():assert sha(selected['program/'+name])==digest
 preparation=json.loads(files['kind-index-preparation.json']);assert preparation['exit_status']==0 and preparation['proof_snapshot_unchanged']
 fixture=json.loads((HERE/'binding-fixture.json').read_bytes());assert sha((HERE/'binding-fixture.sqlite.gz').read_bytes())==old['fixture_sha256'];raw=gzip.decompress((HERE/'binding-fixture.sqlite.gz').read_bytes());assert sha(raw)==fixture['sqlite_sha256']
 with tempfile.TemporaryDirectory(prefix='ink-binding-audit-')as temp:
  p=Path(temp)/'index.sqlite';p.write_bytes(raw)
  with sqlite3.connect(p.resolve().as_uri()+'?mode=ro',uri=True)as db:
   for name,count in fixture['tables'].items():assert name in {'entries','members','witnesses','snapshots','published_bindings_v1'}and db.execute('SELECT count(*) FROM '+name).fetchone()[0]==count
   rows=db.execute('SELECT p.kind,p.entry_id,p.binding FROM published_bindings_v1 p JOIN members m ON m.entry_id=p.entry_id WHERE m.snapshot_id=? ORDER BY p.entry_id',(fixture['snapshot'],)).fetchall();assert len(rows)==180
   for kind in fixture['bindings']:assert [[ident,binding]for k,ident,binding in rows if k==kind]==fixture['bindings'][kind]
 for name in ['corpus-variable-power-initial','corpus-variable-power-indexed','corpus-variable-power-kind-index','corpus-variable-power']:
  d=HERE.parent/name;terminal=json.loads((d/'terminal.json').read_bytes());assert terminal['exit_status']==0 and terminal['final_source_context_check_passed'];records=json.loads((d/'records.json').read_bytes());assert len(records)==10 and all(r['status']==0 for r in records)
  for name,digest in json.loads((d/'sha256-index.json').read_bytes())['files'].items():assert sha((d/name).read_bytes())==digest
 print('PASS historical/final source hashes, retained archives, exact180-binding fixture, six15-query controls, twelve transport processes, byte-identical checked plans,66+14+12 regressions and all four complete corpus outcomes')
if __name__=='__main__':audit()
