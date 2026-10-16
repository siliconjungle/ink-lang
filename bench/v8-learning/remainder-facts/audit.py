"""Read-only integrity/outcome audit. Ordinary compiler replay remains authority."""
from pathlib import Path
import json,hashlib,gzip,tarfile,statistics,argparse,subprocess
parser=argparse.ArgumentParser();parser.add_argument('--inputs-only',action='store_true');args=parser.parse_args()
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2]
def sha(data):return hashlib.sha256(data).hexdigest()
pins=json.loads((HERE/'source-pins.json').read_bytes())
def historical(revision,path):return json.loads(subprocess.check_output(['git','-C',str(ROOT/'knowledge'),'show',revision+':'+path]))
index_path='producers/data/v8-integer-laws/index.json'
previous={r['name']:r['sha256']for r in historical(pins['knowledge_before'],index_path)['rows']}
current_index=(historical(pins['knowledge_published'],index_path)if pins.get('knowledge_published')else json.loads((ROOT/'knowledge'/index_path).read_bytes()))
current={r['name']:r['sha256']for r in current_index['rows']}
assert len(previous)==338 and len(current)==340 and all(current[k]==v for k,v in previous.items())
x=json.loads((HERE/'selected-inputs-index.json').read_bytes());assert sha((HERE/'selected-inputs.tar.gz').read_bytes())==x['archive_sha256']
with tarfile.open(HERE/'selected-inputs.tar.gz')as archive:
 members=archive.getmembers();assert len(members)==len({m.name for m in members})==len(x['files'])
 for member in members:
  assert member.isfile()and'..'not in Path(member.name).parts and not Path(member.name).is_absolute()
  assert not any(n in {'target','cpu-target','knowledge','__pycache__'}for n in Path(member.name).parts)
  data=archive.extractfile(member).read();assert x['files'][member.name]==dict(bytes=len(data),sha256=sha(data)),member.name
 def get(name):return json.load(archive.extractfile(name))
 terminal=get('reproduction-final/terminal.json');assert terminal['exit_status']==0 and len(terminal['rows'])==2
 update=json.loads((HERE/'library-update.json').read_bytes());assert update['before']==338 and update['after']==340 and update['all_previous_identities_preserved']
 for row in terminal['rows']:
  claim=json.loads(gzip.decompress((ROOT/'knowledge/producers/data/v8-integer-laws'/(row['law']+'.json.gz')).read_bytes()))
  from ink_knowledge import canonical,identity,semantic_entry
  assert identity(claim)==row['law'] and identity(semantic_entry(claim))==row['entry'] and len(canonical(claim))==row['law_bytes']
  assert claim['dependencies']==[] and 'AssertEquality'in claim['proof']
 for target in ['javascript','rust']:
  result=get('runtime-'+target+'/result.json');assert not result['heldout_accepted']
  for split in ['training','holdout']:
   report=get('runtime-'+target+'/'+split+'-report.json');assert report['chosen']==result['measurements'][0] and report['acquisition']['rejected']==[]
   assert report['selection']['uncertainty_guard']['minimum_gain_ppm']==100000
 device=get('runtime-gpu/receipt.json');ids=[a['measurement']for a in device['artifacts']];assert len(ids)==2 and sorted(ids)==device['validated_measurements']
 assert get('runtime-gpu/terminal.json')['normalized_holdout_disjoint']
 summary=json.loads((HERE/'gpu-summary.json').read_bytes())
 for split,receipt in device['phases'].items():
  assert len(receipt['reports'])==3
  assert 'remainder'in get('runtime-gpu/'+split+'.workload.json')['workload']['shape']['domain']
  rows=[]
  for report in receipt['reports']:
   timings={row['measurement']:list(map(int,row['complete_call_ns']))for row in report['rows']}
   for row in report['rows']:
    counters=row['counters'];assert counters['observed']['dispatches']==counters['reported']['dispatches']>0
    assert counters['observed']['readbacks']>0 and counters['observed']['submissions']>0
   a,b=[statistics.median(timings[i])for i in ids]
   rows.append(dict(baseline_ns=a,rewrite_ns=b,ratio=a/b,ten_percent_extrema=max(timings[ids[1]])*10<=min(timings[ids[0]])*9))
  assert all(r['ten_percent_extrema']for r in rows) and summary['phases'][split]['processes']==rows
  assert summary['phases'][split]['paired_ratio']==statistics.median(r['ratio']for r in rows)
log=gzip.decompress((HERE/'knowledge-tests.log.gz').read_bytes()).decode();assert '\nOK\n'in log and 'FAILED'not in log
assert 'test_frozen_laws_replay_and_rehashed_invalid_signed_rewrite_rejects'in log and 'test_wide_remainders_preserve_strict_work_lazy_defaults_and_full_width'in log
if args.inputs_only:
 print('PASS selected immutable proof/measurement inputs and complete14-test regression; corpus audit not requested')
 raise SystemExit(0)
corpus=HERE.parent/'corpus-remainder-facts';terminal=json.loads((corpus/'terminal.json').read_bytes());report=json.loads((corpus/'report.json').read_bytes())
assert terminal['exit_status']==0 and terminal['final_source_context_check_passed']
assert terminal['report_sha256']==sha((corpus/'report.json').read_bytes())
assert report['headline']['compiled']==10 and report['headline']['programs']==10
for name,expected in json.loads((corpus/'sha256-index.json').read_bytes())['files'].items():assert sha((corpus/name).read_bytes())==expected,name
print('PASS two self-contained ordinary laws, unchanged338 identities, full knowledge regression, exact CPU/device measurement receipts and stable ten-program corpus')
