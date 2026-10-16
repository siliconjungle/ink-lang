"""Retain terminal merged validation, referencing identical baseline bytes once."""
from pathlib import Path
import argparse,hashlib,json,re,tarfile
HERE=Path(__file__).resolve().parent
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def results(raw):return {m[0]:m[1]for m in re.findall(r'^test_\S+ \(([^)]+)\) \.\.\. (ok|ERROR|FAIL)\s*$',raw.decode(),re.M)}
def main():
 p=argparse.ArgumentParser();p.add_argument('--scratch',type=Path,required=True);p.add_argument('--suite-session',type=int,required=True);p.add_argument('--corpus-session',type=int,required=True);a=p.parse_args();b=a.scratch;pins=json.loads((b/'source-pins.json').read_bytes());compiler=pins['compiler'];assert sha(Path(compiler['path']).read_bytes())==compiler['sha256'];expected=set(json.loads((b/'test-inventory.json').read_bytes())['tests']);first=(b/'knowledge-tests.log').read_bytes();retry=(b/'setup-retry.log').read_bytes();rows=results(first);retried=results(retry);failed={k for k,v in rows.items()if v!='ok'};known='knowledge.tests.test_equality_assistance.EqualityAssistance.test_ordered_facts_retain_and_discharge_original_conditions';assert len(expected)==31 and set(rows)==expected and failed=={known}and retried=={known:'ok'}and b'PermissionError: [Errno 13] Permission denied'in first and b'FAILED (errors=1)'in first and b'\nOK\n'in retry
 index=(b/'index-integration-tests.log').read_bytes();assert b'Ran 72 tests'in index and b'\nOK\n'in index and len(results(index))==72 and set(results(index).values())=={'ok'}
 conformance=json.loads((b/'conformance/terminal.json').read_bytes());device=json.loads((b/'device-final/terminal.json').read_bytes());replay=json.loads((b/'replay/terminal.json').read_bytes())
 for r in [conformance,device,replay]:assert r['exit_status']==0 and r['compiler_sha256']==compiler['sha256']
 assert conformance['calls']==19 and device['actual_device_calls']==12 and len(replay['oracles'])==6
 parity=json.loads((b/'emission-parity.json').read_bytes());assert all(parity['rows']['gpu-'+str(i)]['current_hashes']==parity['rows']['gpu-'+str(i)]['historical_hashes']for i in range(2));assert all(r['equal']for r in parity['rows']['conformance'].values())
 corpus=HERE.parent/'corpus-variable-power-merged';ct=json.loads((corpus/'terminal.json').read_bytes());assert ct['exit_status']==0 and ct['observed_session']==a.corpus_session and ct['final_source_context_check_passed']
 report=json.loads((b/'device-final/device.stdout').read_bytes());request=(b/'device-final/request.json').read_bytes();assert report['request_sha256']==sha(request)and len(report['results'])==12 and report['device']['isFallbackAdapter']is False
 assert {r['input_sha256']for r in report['results']}=={r['input_sha256']for r in replay['oracles']}
 for r in report['results']:assert r['observed']['dispatches']==r['reported']['dispatches']>0 and r['observed']['submissions']>0 and r['observed']['readbacks']>0 and r['reported']['readback_bytes']>0
 base=json.loads((HERE/'selected-inputs-index.json').read_bytes())['files'];files={};references={}
 def add(path,name,member=None):
  assert path.is_file()and not path.is_symlink();raw=path.read_bytes()
  if member in base and sha(raw)==base[member]['sha256']:references[name]=dict(archive='selected-inputs.tar.gz',member=member,**base[member])
  else:files[name]=path
 for name in ['source-pins.json','Cargo.lock','build.log','core-receipt-check.json','package-implementation-diff.json','emission-parity.json','test-inventory.json','knowledge-tests.log','setup-retry.log','index-integration-tests.log','corpus.log','conformance.log','device.log','device-final.log','replay.log']:
  add(b/name,name)
 for name in ['conformance.py','validate_merged.py','replay_merged.py']:add(HERE/name,'runners/'+name)
 for path in sorted((b/'conformance').rglob('*')):
  rel=path.relative_to(b/'conformance')
  if path.is_file()and not path.is_symlink()and not any(x in {'target','empty-store','proposal-transport','__pycache__'}for x in rel.parts):add(path,'conformance/'+str(rel),'conformance/'+str(rel))
 device_members={'source.core.json':'program/core.json','plan-0.json':'program/baseline.plan.json','artifact-0.plan.json':'program/baseline.plan.json','plan-1.json':'program/searched.plan.json','artifact-1.plan.json':'program/searched.plan.json','training.workload.json':'runtime-gpu/training.workload.json','holdout.workload.json':'runtime-gpu/holdout.workload.json'}
 for path in sorted((b/'device-final').rglob('*')):
  rel=path.relative_to(b/'device-final');name=str(rel)
  if not path.is_file()or path.is_symlink()or any(x in {'cpu-target','__pycache__'}for x in rel.parts):continue
  member=device_members.get(name,'runtime-gpu/'+name if name.startswith(('artifact-0/','artifact-1/'))else None);add(path,'device/'+name,member)
 for path in sorted((b/'replay').iterdir()):
  if path.is_file():add(path,'replay/'+path.name,{'source.core.json':'program/core.json','guard.plan.json':'program/searched.plan.json','zero-first.plan.json':'program-refined/searched.plan.json'}.get(path.name))
 index={name:dict(bytes=path.stat().st_size,sha256=sha(path.read_bytes()))for name,path in sorted(files.items())}
 with tarfile.open(HERE/'merged-inputs.tar.gz','w:gz',compresslevel=9)as archive:
  for name,path in sorted(files.items()):archive.add(path,arcname=name,recursive=False)
 (HERE/'merged-inputs-index.json').write_text(json.dumps(dict(schema=1,archive_sha256=sha((HERE/'merged-inputs.tar.gz').read_bytes()),files=index,references=references,scope='Byte-identical source/plans/emitted images reference the already retained selected archive; no duplicate target/private store or full revision copy.'),indent=2)+'\n')
 terminal=dict(schema=1,exit_status=0,source=pins,tests_covered=31,proof_suite=dict(observed_session=a.suite_session,initial_exit_status=1,initial_setup_error='Frozen copy lacked execute permission; image bytes unchanged when mode corrected.',failed_methods=sorted(failed),retry_exit_status=0,remaining_methods_passed=30,complete_expected_inventory=True),index_and_upstream_integration_methods=72,conformance=conformance,device=device,replay=replay,corpus=dict(path=str(corpus.relative_to(HERE.parent)),observed_session=a.corpus_session,final_source_context_check_passed=True),scope='All31 intended proof methods covered successfully after the one permission-only setup retry; initial failure retained.72 separate integration methods, complete CPU/actual-device values, exact image parity and stable merged corpus. No timing transfer, policy change or CI-complete claim.')
 (HERE/'merged-validation.json').write_text(json.dumps(terminal,indent=2)+'\n');print('Retained',len(files),'new control files and',len(references),'exact baseline references')
if __name__=='__main__':main()
