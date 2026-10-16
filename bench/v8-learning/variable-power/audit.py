"""Read-only exact proof/input/measurement/corpus/publication integrity audit."""
from pathlib import Path
import argparse,gzip,hashlib,json,subprocess,tarfile,tempfile
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.frozen_laws import index,load,closure
from producers.v8_integer_laws import templates
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
def sha(raw):return hashlib.sha256(raw).hexdigest()
def audit(replay=False):
 pins=json.loads((HERE/'source-pins.json').read_bytes())
 for name,digest in pins['inputs'].items():
  raw=subprocess.check_output(['git','-C',str(ROOT/'knowledge'),'show',pins['knowledge_measured']+':'+name.removeprefix('knowledge/')]);assert sha(raw)==digest,name
 old=json.loads(subprocess.check_output(['git','-C',str(ROOT/'knowledge'),'show',pins['knowledge_before']+':producers/data/v8-integer-laws/index.json']))
 data=ROOT/'knowledge/producers/data/v8-integer-laws';rows=index(data);byname={r['name']:r for r in rows};assert len(rows)==341
 for r in old['rows']:assert byname[r['name']]==r,r['name']
 root=load(data,byname['u32_rem_or_variable_power_guard']);rid=identity(semantic_entry(root));assert identity(root)=='7cd1769423fbe3011c6ee5eb672c03d8574767c9404d9a3ee5cf8682e210c0f3';assert rid=='16a309e65395ebfffd03b4dea7906400a15ea05fd33dc1299a02ecfd52de26b5'
 goals={r['name']:r['goal']for r in templates()}
 for r in rows:
  law=load(data,r);assert {k:law[k]for k in ['params','conditions','from','to']}==goals[r['name']]
 expanded=closure(data,[('root',root)]);objects={identity(semantic_entry(l)):semantic_entry(l)for _,l in expanded};assert len(objects)==35
 manifest=json.loads((HERE/'selected-inputs-index.json').read_bytes());raw_archive=(HERE/'selected-inputs.tar.gz').read_bytes();assert sha(raw_archive)==manifest['archive_sha256'];selected={}
 want={'program/core.json','program/baseline.plan.json','program/searched.plan.json','program/training.json','program/holdout.json','program-refined/searched.plan.json','boundary.json','conformance/parity-final.stdout','zero-refinement/law.json','zero-refinement/terminal.json'}
 with tarfile.open(HERE/'selected-inputs.tar.gz')as archive:
  members=archive.getmembers();assert {m.name for m in members}==set(manifest['files'])
  for m in members:
   assert m.isfile()and not Path(m.name).is_absolute()and'..'not in Path(m.name).parts
   raw=archive.extractfile(m).read();r=manifest['files'][m.name];assert len(raw)==r['bytes']and sha(raw)==r['sha256'],m.name
   if m.name in want:selected[m.name]=raw
  plan=json.loads(selected['program/searched.plan.json']);selection=plan['steps'][0]['package'];assert selection['knowledge']['objects']==objects and selection['knowledge']['roots']==[rid];assert len(selected['program/searched.plan.json'])==15970653
  boundary=json.loads(selected['boundary.json']);assert boundary['wide_bytes']==16031589 and boundary['compact_bytes']==15970479 and 'input exceeds size limit'in boundary['wide_rejection']
  assert sha(canonical(selection))==boundary['compact_sha256']and set(selection['knowledge']['membership'])==set(objects)
  refined=json.loads(selected['program-refined/searched.plan.json']);refined_root=json.loads(selected['zero-refinement/law.json']);frid=identity(semantic_entry(refined_root));assert frid=='93682dd9d6f4a9a55d2cc894392817ac6d8af0d2661d2b5287a3bdd2a80e53e1';assert refined['steps'][0]['package']['knowledge']['objects']==dict(objects,**{frid:semantic_entry(refined_root)})
  source=plan['input_core_sha256'];assert source=='ca2b86774a357d3698b322817d0f387d011195b36de09bc40f4ef0127c6abfa0'
  for name in ['runtime-javascript','runtime-rust','runtime-javascript-refined','runtime-rust-refined']:
   result=json.load(archive.extractfile(name+'/result.json'));assert result['source']==source and not result['heldout_accepted'];fingerprints=[]
   for split in ['training','holdout']:
    report=json.load(archive.extractfile(name+'/'+split+'-report.json'));a=report['acquisition'];assert not a['rejected'];assert len(a['observations'])==24 and len(a['acquisition']['rows'])==24
    assert {r['phase']for r in a['acquisition']['rows']}=={'power','nonpower','zero','empty'};assert {r['process']for r in a['acquisition']['rows']}=={0,1,2};assert all(len(r['complete_call_ns'])==11 for r in a['acquisition']['rows']);current=set(a['acquisition']['input_fingerprints']);assert not any(current&f for f in fingerprints);fingerprints.append(current)
  for name,count in [('runtime-gpu',2),('runtime-gpu-refined',3)]:
   receipt=json.load(archive.extractfile(name+'/receipt.json'));assert receipt['input_core_sha256']==source and len(receipt['artifacts'])==count and len(receipt['validated_measurements'])==count
   device=None;fingerprints=[]
   for split,p in receipt['phases'].items():
    assert len(p['reports'])==3 and len(p['rows'])==3*count*3
    for process,report in enumerate(p['reports']):
     assert report['device']['isFallbackAdapter']is False and not report['rejected'];assert device in [None,report['device']];device=report['device']
     request=archive.extractfile(name+'/'+split+'-'+str(process)+'.request.json').read();assert sha(request)==report['request_sha256']
     for row in report['rows']:
      c=row['counters'];assert c['observed']['dispatches']==c['reported']['dispatches']>0 and c['observed']['submissions']>0 and c['observed']['readbacks']>0 and c['reported']['readback_bytes']>0;assert len(row['complete_call_ns'])==11
    current=set(p['input_fingerprints']);assert not any(current&f for f in fingerprints);fingerprints.append(current)
    workload=json.load(archive.extractfile(name+'/'+split+'.workload.json'))
    for phase,calls in workload['phases'].items():
     for i,call in enumerate(calls):
      xs,y,default,cohort=call['args'];expected=(sum(x%y if y else default for x in xs)+cohort)&0xffffffff;oracle=json.load(archive.extractfile(name+'/oracle-'+split+'-'+phase+'-'+str(i)+'.stdout'));assert oracle['value']==expected and oracle['input_core_sha256']==source and oracle['selected_core_sha256']==source
  assert json.loads(selected['conformance/parity-final.stdout'])['calls']==19
 validation=json.loads((HERE/'validation-terminal.json').read_bytes());assert validation['exit_status']==0 and validation['full_suite_methods']==31 and validation['focused_methods']==3 and validation['all_integer_roots']==341
 for name in ['knowledge-tests','focused-tests']:
  raw=gzip.decompress((HERE/(name+'.log.gz')).read_bytes());assert b'\nOK\n'in raw;assert sha(raw)==validation['full_suite_log_sha256'if name=='knowledge-tests'else'focused_log_sha256']
 corpus=HERE.parent/'corpus-variable-power';terminal=json.loads((corpus/'terminal.json').read_bytes());assert terminal['exit_status']==0 and terminal['final_source_context_check_passed']
 for name,digest in json.loads((corpus/'sha256-index.json').read_bytes())['files'].items():assert sha((corpus/name).read_bytes())==digest
 records=json.loads((corpus/'records.json').read_bytes());assert len(records)==10 and all(r['status']==0 for r in records)
 readback=json.loads((HERE/'database-readback.json').read_bytes());proposals=json.loads((HERE/'observation-proposals.json').read_bytes())['objects'];assert len(proposals)==282 and readback['count']==282 and readback['proof_snapshot_unchanged']and not readback['selection_policy_changed'];assert {identity(o)for o in proposals}==set(readback['observations'])
 store=Store(ROOT/'knowledge');assert store.snapshot_id==readback['proof_snapshot']
 for obj in proposals:assert json.loads((store.data/'observations'/(identity(obj)+'.json')).read_bytes())==obj
 if replay:
  compiler=ROOT/pins['compiler']['path'];assert sha(compiler.read_bytes())==pins['compiler']['sha256']
  with tempfile.TemporaryDirectory(prefix='ink-v8-variable-replay-')as temp:
   d=Path(temp);(d/'core.json').write_bytes(selected['program/core.json'])
   for name in ['program/searched.plan.json','program-refined/searched.plan.json']:
    (d/'plan.json').write_bytes(selected[name]);r=subprocess.run([compiler,'check-plan',d/'core.json',d/'plan.json','--core'],capture_output=True,text=True,timeout=180);assert not r.returncode,r.stderr
 print('PASS341 frozen integer patterns, unchanged340 identities,35-object source boundary,521 selected inputs, original/refined complete-call controls, actual-device counters/oracles,31+3 tests, ten-program frozen corpus and282 exact database observations'+('; ordinary current-kernel replay'if replay else ''))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--replay',action='store_true');audit(p.parse_args().replay)
