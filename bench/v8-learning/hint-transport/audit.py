"""Read-only integrity and selected outcome audit; no builds or timing calls."""
import hashlib,json,statistics,tarfile
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def sha(data):return hashlib.sha256(data).hexdigest()
def audit():
 index=json.loads((ROOT/'selected-inputs-index.json').read_bytes());assert sha((ROOT/'selected-inputs.tar.gz').read_bytes())==index['archive_sha256']
 with tarfile.open(ROOT/'selected-inputs.tar.gz')as archive:
  assert set(archive.getnames())==set(index['files'])
  for name,item in index['files'].items():
   member=archive.getmember(name);assert member.isfile()and member.size==item['bytes'];assert sha(archive.extractfile(member).read())==item['sha256']
  def read(name):return json.loads(archive.extractfile(name).read())
  plans=[read('program/'+n+'.plan.json')for n in ['baseline','searched']];assert plans[0]['steps']==[]and len(plans[1]['steps'])==1
  for target in ['javascript','rust']:
   result=read('runtime-'+target+'/result.json');assert result['heldout_accepted']is False
   previous=set()
   for split in ['training','holdout']:
    r=read('runtime-'+target+'/'+split+'-report.json');a=r['acquisition'];assert len(a['validated_measurements'])==2 and not a['rejected']
    assert r['chosen']==result['measurements'][0];current=set(a['acquisition']['input_fingerprints']);assert current and not previous&current;previous=current
  r=read('runtime-gpu/receipt.json');assert read('runtime-gpu/terminal.json')['exit_status']==0
  ids=[a['measurement']for a in r['artifacts']];assert set(ids)==set(r['validated_measurements']);assert not set(r['phases']['training']['input_fingerprints'])&set(r['phases']['holdout']['input_fingerprints'])
  expected={}
  for split,data in r['phases'].items():
   assert len(data['reports'])==3 and data['peak_rss_bytes']is None;values=[]
   for report in data['reports']:
    assert not report['rejected']and report['device']['isFallbackAdapter']is False
    rows={row['measurement']:row for row in report['rows']};assert set(rows)==set(ids)
    for row in rows.values():
     c=row['counters'];assert c['observed']['dispatches']==c['reported']['dispatches']>0;assert c['observed']['submissions']>0 and c['observed']['readbacks']>0;assert len(row['complete_call_ns'])==11
    v=[statistics.median(map(int,rows[i]['complete_call_ns']))for i in ids];guard=max(map(int,rows[ids[1]]['complete_call_ns']))<.9*min(map(int,rows[ids[0]]['complete_call_ns']));assert guard
    values.append(dict(baseline_ns=v[0],rewrite_ns=v[1],ratio=v[0]/v[1],ten_percent_extrema=guard))
   expected[split]=dict(processes=values,baseline_ns=statistics.median(v['baseline_ns']for v in values),rewrite_ns=statistics.median(v['rewrite_ns']for v in values),paired_ratio=statistics.median(v['ratio']for v in values))
  assert json.loads((ROOT/'gpu-summary.json').read_bytes())['phases']==expected
 import gzip,re
 private=json.loads((ROOT/'isolated-core.json').read_bytes());raw=gzip.decompress((ROOT/'isolated-core.log.gz').read_bytes());assert sha(raw)==private['log_sha256']
 for name,count in [('core-tests-final.log.gz',470),('isolated-core.log.gz',470),('rup-crosscheck.log.gz',2)]:
  assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',gzip.decompress((ROOT/name).read_bytes()).decode())))==count
 admission=json.loads((ROOT/'admission.json').read_bytes())['results'];assert len(admission)==6 and [r['accepted']for r in admission]==[False,True,False,False,False,False]
 assembly=json.loads((ROOT/'assembly.json').read_bytes());assert assembly['plain_bytes']==23762435 and assembly['packed_bytes']==8305056
 checker=json.loads((ROOT/'checker-raw.json').read_bytes());terminal=json.loads((ROOT/'checker-terminal.json').read_bytes());summary=json.loads((ROOT/'checker-summary.json').read_bytes())
 assert terminal['exit_status']==0 and terminal['calls']==len(checker['cells'])==945
 assert sha((ROOT/'checker-raw.json').read_bytes())==terminal['raw_sha256']
 assert sha((ROOT/'measure_checker.py').read_bytes())==terminal['script_sha256']
 med={label:[statistics.median(r['ns']for r in samples if r['worker']==i)for i in range(3)]for label,samples in checker['samples'].items()}
 assert summary['block_medians_ns']==med
 for worker in range(3):
  for round in range(7):
   for label in checker['samples']:
    cells=[r for r in checker['cells']if r['worker']==worker and r['round']==round and r['label']==label]
    assert sorted(r['group']for r in cells)==list(range(15))
    assert sum(r['ns']for r in cells)==next(r['ns']for r in checker['samples'][label]if r['worker']==worker and r['round']==round)
 for archive_name,index_name in [('trained-integration-inputs.tar.gz','trained-integration-index.json'),('merged-emission-inputs.tar.gz','merged-emission.json')]:
  index=json.loads((ROOT/index_name).read_bytes());assert sha((ROOT/archive_name).read_bytes())==index['archive_sha256']
  with tarfile.open(ROOT/archive_name)as archive:
   assert set(archive.getnames())==set(index['files'])
   for name,expected in index['files'].items():
    data=archive.extractfile(name).read()
    if isinstance(expected,dict):assert len(data)==expected['bytes'];expected=expected['sha256']
    assert sha(data)==expected
 integrated=json.loads((ROOT/'merged-emission.json').read_bytes());assert integrated['terminal']['exit_status']==0 and integrated['terminal']['actual_device_calls']==8 and len(integrated['report']['results'])==8
 for row in integrated['report']['results']:
  assert row['observed']['dispatches']==row['reported']['dispatches']>0 and row['observed']['submissions']>0 and row['observed']['readbacks']>0
 trained=json.loads((ROOT/'trained-integration.json').read_bytes());assert trained['exit_status']==0 and trained['reference_cases']==143 and len(trained['targets'])==5
 for name,expected in trained['log_sha256'].items():assert sha(gzip.decompress((ROOT/(name+'.gz')).read_bytes()))==expected
 for name in ['corpus-hint-transport','corpus-hint-transport-combined']:
  directory=ROOT.parent/name;index=json.loads((directory/'sha256-index.json').read_bytes())
  for relative,expected in index['files'].items():assert sha((directory/relative).read_bytes())==expected
  terminal=json.loads((directory/'terminal.json').read_bytes());report=json.loads((directory/'report.json').read_bytes());assert terminal['exit_status']==0 and report['headline']['compiled']==10 and report['headline']['programs_selecting_alternative']==0
 print('PASS immutable proof/checker/runtime evidence, both frozen corpora, final143-case five-target trained conformance and8actualGPUcalls')
if __name__=='__main__':audit()
