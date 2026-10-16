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
assert len(previous)==len(current)==340
changed={'u64_rem_or_self','u64_rem_or_zero_numerator'}
assert {k for k in previous if previous[k]!=current[k]}==changed
assert current_index['schema']==2 and len(current_index['objects'])==2
x=json.loads((HERE/'selected-inputs-index.json').read_bytes());assert sha((HERE/'selected-inputs.tar.gz').read_bytes())==x['archive_sha256']
with tarfile.open(HERE/'selected-inputs.tar.gz')as archive:
 members=archive.getmembers();assert len(members)==len({m.name for m in members})==len(x['files'])
 for member in members:
  assert member.isfile()and'..'not in Path(member.name).parts and not Path(member.name).is_absolute()
  assert not any(n in {'target','cpu-target','knowledge','__pycache__'}for n in Path(member.name).parts)
  data=archive.extractfile(member).read();assert x['files'][member.name]==dict(bytes=len(data),sha256=sha(data)),member.name
 def get(name):return json.load(archive.extractfile(name))
 terminal=get('reproduction/terminal.json');assert terminal['exit_status']==0 and len(terminal['rows'])==2
 update=json.loads((HERE/'library-update.json').read_bytes());assert update['before_index_entries']==update['after_index_entries']==340 and update['previous338_identities_preserved']
 for row in terminal['rows']:
  claim=json.loads(gzip.decompress((ROOT/'knowledge/producers/data/v8-integer-laws'/(row['law']+'.json.gz')).read_bytes()))
  from ink_knowledge import canonical,identity,semantic_entry
  assert identity(claim)==row['law'] and identity(semantic_entry(claim))==row['entry'] and len(canonical(claim))==row['law_bytes']
  assert len(claim['dependencies'])==1 and 'AssertEquality'in claim['proof']
  old_claim=json.loads(gzip.decompress(subprocess.check_output(['git','-C',str(ROOT/'knowledge'),'show',pins['knowledge_before']+':producers/data/v8-integer-laws/'+previous[row['name']]+'.json.gz'])))
  assert {k:v for k,v in claim.items()if k not in {'proof','dependencies'}}=={k:v for k,v in old_claim.items()if k not in {'proof','dependencies'}}
  dep=claim['dependencies'][0];raw_id=current_index['objects'][dep]
  support=json.loads(gzip.decompress((ROOT/'knowledge/producers/data/v8-integer-laws'/(raw_id+'.json.gz')).read_bytes()))
  assert identity(support)==raw_id and identity(semantic_entry(support))==dep
 for target in ['javascript','rust']:
  result=get('runtime-'+target+'/result.json');assert not result['heldout_accepted']
  for split in ['training','holdout']:
   report=get('runtime-'+target+'/'+split+'-report.json');assert report['chosen']==result['measurements'][0] and report['acquisition']['rejected']==[]
   assert report['selection']['uncertainty_guard']['minimum_gain_ppm']==100000
 device=get('runtime-gpu/receipt.json');ids=[a['measurement']for a in device['artifacts']];assert len(ids)==2 and sorted(ids)==device['validated_measurements']
 assert get('runtime-gpu/terminal.json')['normalized_holdout_disjoint']
 summary=json.loads((HERE/'gpu-summary.json').read_bytes())
 for split,receipt in device['phases'].items():
  assert receipt['rejected']==[] and len(receipt['reports'])==3
  assert 'self quotient, self remainder and zero-numerator remainder'in get('runtime-gpu/'+split+'.workload.json')['workload']['shape']['domain']
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
 boundary=json.loads((HERE/'boundary.json').read_bytes());composition=json.loads((HERE/'composition.json').read_bytes())
 assert get('boundary-reproduction/boundary.json')==boundary
 assert boundary['exit_status']!=0 and 'size limit'in boundary['reason'] and boundary['selection_bytes']>16_000_000
 selection=get('program/searched.plan.json')['steps'][0]['package'];raw=canonical(selection)
 assert sha(raw)==composition['selection_sha256'] and len(raw)==composition['selection_bytes']<16_000_000
 assert composition['exit_status']==0 and composition['objects']==len(selection['knowledge']['objects'])==4 and len(selection['applications'])==3
 assert boundary['source']==composition['source']==selection['input_core_sha256']
 assert get('runtime-gpu/receipt.json')['input_core_sha256']==selection['input_core_sha256']
 assert len(boundary['entry_ids'])==3 and len(composition['roots'])==3
 assert get('program/baseline.plan.json')['input_core_sha256']==selection['input_core_sha256']
log=gzip.decompress((HERE/'knowledge-tests.log.gz').read_bytes()).decode();assert '\nOK\n'in log and 'FAILED'not in log
validation=json.loads((HERE/'validation-terminal.json').read_bytes())
assert validation['exit_status']==0 and validation['tests']==28 and validation['log_sha256']==sha(log.encode())
assert 'Ran 28 tests in 672.141s' in log
assert 'test_dependencies_precede_consumers_when_definition_context_changes_ids' in log and 'test_authenticated_false_support_still_rejects_in_ordinary_checker' in log
assert 'test_frozen_laws_replay_and_rehashed_invalid_signed_rewrite_rejects'in log and 'test_wide_remainders_preserve_strict_work_lazy_defaults_and_full_width'in log
if args.inputs_only:
 print('PASS selected immutable proof/measurement inputs and complete knowledge regression; corpus audit not requested')
 raise SystemExit(0)
proposals=json.loads((HERE/'observation-proposals.json').read_bytes())['objects'];readback=json.loads((HERE/'database-readback.json').read_bytes())
from ink_knowledge import Store
assert len(proposals)==readback['count']==36 and len(set(readback['observations']))==36
assert readback['proof_snapshot_unchanged'] and not readback['selection_policy_changed']
store=Store(ROOT/'knowledge')
for obj,ident in zip(proposals,readback['observations']):
 Store.validate_observation(obj)
 assert identity(obj)==ident and obj['program']==composition['source'] and obj['entries']==[]
 assert json.loads((store.data/'observations'/(ident+'.json')).read_bytes())==obj
for path,expected in pins['knowledge_inputs'].items():
 raw=(subprocess.check_output(['git','-C',str(ROOT/'knowledge'),'show',pins['knowledge_published']+':'+path])if pins.get('knowledge_published')else(ROOT/'knowledge'/path).read_bytes())
 assert sha(raw)==expected,path
corpus=HERE.parent/'corpus-proof-dependencies';terminal=json.loads((corpus/'terminal.json').read_bytes());report=json.loads((corpus/'report.json').read_bytes())
assert terminal['exit_status']==0 and terminal['final_source_context_check_passed']
assert terminal['report_sha256']==sha((corpus/'report.json').read_bytes())
assert report['headline']['compiled']==10 and report['headline']['programs']==10
for name,expected in json.loads((corpus/'sha256-index.json').read_bytes())['files'].items():assert sha((corpus/name).read_bytes())==expected,name
print('PASS shared ordinary proof dependencies, unchanged 338 identities, full knowledge regression, exact CPU/device measurement receipts and stable ten-program corpus')
