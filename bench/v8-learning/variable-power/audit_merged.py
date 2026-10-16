"""Read-only audit of merged sources, successful coverage and exact device work."""
from pathlib import Path
import hashlib,json,subprocess,tarfile
from retain_merged import results
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def audit():
 terminal=json.loads((HERE/'merged-validation.json').read_bytes());assert terminal['exit_status']==0;source=terminal['source'];compiler=source['compiler'];assert sha((ROOT/compiler['path']).read_bytes())==compiler['sha256'];manifest=json.loads((HERE/'merged-inputs-index.json').read_bytes());assert sha((HERE/'merged-inputs.tar.gz').read_bytes())==manifest['archive_sha256'];baseline=json.loads((HERE/'selected-inputs-index.json').read_bytes());assert sha((HERE/'selected-inputs.tar.gz').read_bytes())==baseline['archive_sha256'];wanted={'source-pins.json','core-receipt-check.json','package-implementation-diff.json','emission-parity.json','test-inventory.json','knowledge-tests.log','setup-retry.log','index-integration-tests.log','device/device.stdout','device/request.json','device/terminal.json','replay/terminal.json','conformance/terminal.json'};data={}
 with tarfile.open(HERE/'merged-inputs.tar.gz')as archive:
  assert {m.name for m in archive.getmembers()}==set(manifest['files'])
  for m in archive.getmembers():
   assert m.isfile()and not Path(m.name).is_absolute()and'..'not in Path(m.name).parts;raw=archive.extractfile(m).read();r=manifest['files'][m.name];assert len(raw)==r['bytes']and sha(raw)==r['sha256'],m.name
   if m.name in wanted:data[m.name]=raw
 with tarfile.open(HERE/'selected-inputs.tar.gz')as archive:
  for name,r in manifest['references'].items():
   assert r['archive']=='selected-inputs.tar.gz'and {k:r[k]for k in ['bytes','sha256']}==baseline['files'][r['member']];raw=archive.extractfile(r['member']).read();assert len(raw)==r['bytes']and sha(raw)==r['sha256']
   if name in wanted:data[name]=raw
 assert json.loads(data['source-pins.json'])==source
 git=lambda *args:subprocess.check_output(['git','-C',str(ROOT),*args],text=True).strip()
 assert git('rev-parse',source['source']+':core')==source['core_package']['core_tree']
 for name,revision in source['packages'].items():assert git('ls-tree',source['source'],name).split()[2]==revision
 check=json.loads(data['core-receipt-check.json']);raw=subprocess.check_output(['git','-C',str(ROOT),'show',source['source']+':'+check['upstream_receipt_git_path']]);assert sha(raw)==check['receipt_sha256'];receipt=json.loads(raw);assert receipt['status']=='passed'and receipt['tests']==486 and len(receipt['files'])==227 and receipt['core_tree']==source['core_package']['core_tree'];assert all(p['status']==0 for p in receipt['phases'])
 expected=set(json.loads(data['test-inventory.json'])['tests']);first=results(data['knowledge-tests.log']);retry=results(data['setup-retry.log']);assert len(expected)==31 and set(first)==expected and {k for k,v in first.items()if v!='ok'}==set(retry)and set(retry.values())=={'ok'}and {k for k,v in first.items()if v=='ok'}|set(retry)==expected;assert b'PermissionError: [Errno 13] Permission denied'in data['knowledge-tests.log']and b'FAILED (errors=1)'in data['knowledge-tests.log']and b'\nOK\n'in data['setup-retry.log'];index=results(data['index-integration-tests.log']);assert len(index)==72 and set(index.values())=={'ok'}and b'\nOK\n'in data['index-integration-tests.log']
 changes=json.loads(data['package-implementation-diff.json'])['changes'];assert all(set(paths)<={'Cargo.toml','Cargo.lock'}for paths in changes.values())
 parity=json.loads(data['emission-parity.json'])['rows']
 for i in range(2):
  row=parity['gpu-'+str(i)];assert row['current_hashes']==row['historical_hashes']and len(row['current_hashes'])==34 and not row['missing']and not row['extra']and not row['different']
  for name,digest in row['current_hashes'].items():assert baseline['files'][f'runtime-gpu/artifact-{i}/'+name]['sha256']==digest
 assert len(parity['conformance'])==12 and all(r['equal']and r['historical']==r['current']for r in parity['conformance'].values())
 conformance=json.loads(data['conformance/terminal.json']);device=json.loads(data['device/terminal.json']);replay=json.loads(data['replay/terminal.json']);report=json.loads(data['device/device.stdout']);request=json.loads(data['device/request.json'])
 for row in [conformance,device,replay]:assert row['exit_status']==0 and row['compiler_sha256']==compiler['sha256']
 assert conformance['calls']==19 and device['actual_device_calls']==12 and report['device']['isFallbackAdapter']is False and len(report['results'])==12 and report['request_sha256']==sha(data['device/request.json']);assert len(replay['oracles'])==6 and {r['input_sha256']for r in report['results']}=={r['input_sha256']for r in replay['oracles']};assert {r['measurement']for r in report['results']}=={r['measurement']for r in request['artifacts']}
 for row in replay['oracles']:
  label='oracle-'+row['split']+'-'+row['phase']+'-0';assert manifest['files']['replay/'+label+'.stdout']['sha256']==row['receipt_sha256']==baseline['files']['runtime-gpu/'+label+'.stdout']['sha256'];assert manifest['files']['replay/'+label+'.args.json']['sha256']==row['arguments_sha256']
 for row in report['results']:assert row['observed']['dispatches']==row['reported']['dispatches']>0 and row['observed']['submissions']>0 and row['observed']['readbacks']>0 and row['reported']['readback_bytes']>0
 corpus=HERE.parent/terminal['corpus']['path'];ct=json.loads((corpus/'terminal.json').read_bytes());assert ct['exit_status']==0 and ct['final_source_context_check_passed']and ct['observed_session']==terminal['corpus']['observed_session'];context=json.loads((corpus/'context.json').read_bytes());assert context['compiler_sha256']==compiler['sha256']
 for name,digest in json.loads((corpus/'sha256-index.json').read_bytes())['files'].items():assert sha((corpus/name).read_bytes())==digest
 assert len(json.loads((corpus/'records.json').read_bytes()))==10
 print('PASS exact merged source/pins/core receipt, all31 intended proof methods after retained setup retry,72 integration methods,19x4 CPU conformance calls,twelve actual GPU calls,six source oracles,both checked plans,68 exact GPU files,12 exact CPU files and stable ten-program corpus; no timing/context transfer or CI-complete claim')
if __name__=='__main__':audit()
