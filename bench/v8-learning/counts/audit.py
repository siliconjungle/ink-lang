#!/usr/bin/env python3
"""Verify retained bytes/contexts; optionally replay ordinary count/Q plans."""
import argparse,gzip,hashlib,json,re,subprocess,tarfile
from pathlib import Path
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
def sha(raw):return hashlib.sha256(raw).hexdigest()
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path);p.add_argument('--scratch',type=Path);a=p.parse_args();index=json.loads((HERE/'selected-inputs-index.json').read_bytes());archive=HERE/'selected-inputs.tar.gz';assert sha(archive.read_bytes())==index['archive_sha256'];blobs={}
 with tarfile.open(archive)as tar:
  for member in tar.getmembers():
   assert member.isfile()and re.fullmatch(r'blobs/[0-9a-f]{64}',member.name);raw=tar.extractfile(member).read();assert sha(raw)==member.name[6:];blobs[member.name[6:]]=raw
 assert len(blobs)==index['blobs']and sum(map(len,blobs.values()))==index['unique_bytes']
 def raw(name):
  item=index['files'][name];data=blobs[item['blob']];assert item.get('transform')in [None,'append-lf'];data+=b'\n'if item.get('transform')else b'';assert len(data)==item['bytes']and sha(data)==item['sha256'];return data
 for name in index['files']:
  assert not Path(name).is_absolute()and'..'not in Path(name).parts;raw(name)
 def read(name):return json.loads(raw(name))
 pins=read('count-final-source-pins.json');package=read('count-core-package.json');private=read('count-private-package-validation.json');assert private['status']=='passed'and private['private_checkout']and private['private_target'];assert pins['core_tree']==package['core_tree']==private['core_tree']
 for commit in [pins['distribution_source'],package['commit'],package['source']]:assert subprocess.check_output(['git','rev-parse',commit+':core'],cwd=ROOT,text=True).strip()==package['core_tree']
 results=re.findall(rb'test result: (\w+)\. (\d+) passed; (\d+) failed',raw('count-private-package.log'));assert all(x[0]==b'ok'and x[2]==b'0'for x in results)and sum(int(x[1])for x in results)==493
 assert read('count-v8-tests-terminal.json')['all_expected_methods_covered'];assert read('count-v8-test-inventory.json')['count']==16
 assert b'Ran 14 tests'in raw('count-all-v8-tests.log')and b'FAILED (errors=1)'in raw('count-all-v8-tests.log');assert b'Ran 3 tests'in raw('count-word-tests-retry.log')and raw('count-word-tests-retry.log').rstrip().endswith(b'OK')
 assert read('root-regressions-terminal.json')['legacy_full_seed_count']==647;assert len(re.findall(rb'^logic:seed\d+ \(',raw('legacy-full-minimal.log'),re.M))==647
 assert b'144 values/outcomes and exact snapshots matched'in raw('frozen-eight-final.log')
 for name in ['corpus','count-corpus']:
  terminal=read(name+'/terminal.json');report=read(name+'/report.json');records=read(name+'/records.json');assert terminal['exit_status']==0 and len(records)==10 and all(r['status']==0 for r in records);assert report['context']==read(name+'/context.json')and report['headline']['programs']==10
 assert read('count-corpus/terminal.json')['new_count_roots_attributed']==[]
 conformance=read('count-conformance-final/terminal.json');assert conformance['exit_status']==0 and conformance['calls_per_lane']==23 and conformance['lanes']==4 and all(conformance['initial_javascript_byte_parity'].values())
 for name in ['runtime-javascript','runtime-rust','count-runtime-javascript','count-runtime-javascript-final','count-runtime-rust-final']:
  r=read(name+'/result.json');assert r['controls']['processes']==3 and r['controls']['rounds']==11
  assert r['heldout_accepted']==(name in ['count-runtime-javascript','count-runtime-javascript-final'])
 for name in ['runtime-gpu','count-runtime-gpu-final']:
  r=read(name+'/receipt.json');assert read(name+'/terminal.json')['processes']==3
  for phase in r['phases'].values():
   assert len(phase['reports'])==3
   for report in phase['reports']:
    assert not report['rejected']and all(row['counters']for row in report['rows'])
 from ink_knowledge import Store,canonical,identity,semantic_entry
 observations=json.loads((HERE/'observation-proposals.json').read_bytes())['objects'];assert len(observations)==168 and len({identity(o)for o in observations})==168
 for obj in observations:Store.validate_observation(obj);assert obj['entries']==[]
 library=read('count-library/index.json');assert len(library['rows'])==18;entries=[]
 for row in library['rows']:
  law=json.loads(gzip.decompress(raw('count-library/'+row['sha256']+'.json.gz')));assert identity(law)==row['sha256']and law['from']==row['from']and law['params']==row['params'];entries.append(semantic_entry(law))
 if a.compiler:
  assert a.scratch,'fresh --scratch required for replay';scratch=a.scratch.resolve();scratch.mkdir(parents=True,exist_ok=False);(scratch/'storage-retention.json').write_text(json.dumps(dict(schema=1,keep=[dict(path='.',reason='Required selected count/quotient source proof replay')],safe_to_remove=[]),indent=2)+'\n');store=Store.publish(scratch/'library',entries);(scratch/'all-counts.json').write_bytes(canonical(store.bundle([identity(e)for e in entries])));(scratch/'core.json').write_bytes(raw('core.json'))
  for name in ['program','count-program']:
   (scratch/(name+'.core.json')).write_bytes(raw(name+'/core.json'));(scratch/(name+'.plan.json')).write_bytes(raw(name+'/searched.plan.json'))
  (scratch/'false-count.json').write_bytes(raw('reification-regression/64.json'))
  commands=[('counts',['knowledge-check',scratch/'core.json',scratch/'all-counts.json'],0),('quotient',['check-plan',scratch/'program.core.json',scratch/'program.plan.json','--core'],0),('count-plan',['check-plan',scratch/'count-program.core.json',scratch/'count-program.plan.json','--core'],0),('false-normalize',['knowledge-check',scratch/'core.json',scratch/'false-count.json'],1)]
  for label,arguments,expected in commands:
   result=subprocess.run([str(a.compiler.resolve()),*map(str,arguments)],cwd=ROOT,capture_output=True,text=True,timeout=180);(scratch/(label+'.stdout')).write_text(result.stdout);(scratch/(label+'.stderr')).write_text(result.stderr);assert(result.returncode==0)==(expected==0),(label,result.stderr[-2000:])
 print('PASS retained493 core tests,16 method coverage,647 legacy objects,144 frozen outcomes,92 count target calls, two frozen corpora and168 exact observations; artifact hashes grant no proof authority')
if __name__=='__main__':main()
