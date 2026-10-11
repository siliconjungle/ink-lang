"""Read-only saved native observations, no program execution."""
import hashlib,json,math
from pathlib import Path
from native import observe
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def audit(report,output=None):
 p=Path(report);n=p/'native';m=json.loads((n/'metadata.json').read_text());r=json.loads((n/'results.json').read_text());f=json.loads((p/'fixtures.json').read_text());tasks=json.loads((p/'spec.json').read_text())['tasks'];lookup={x['id']:x for x in f['frames']};timed={x['id'] for x in f['frames'] if x['timed']}
 assert r['status']=='passed' and r['metadata_sha256']==sha(n/'metadata.json')
 main=json.loads((p/'metadata.json').read_text());assert m['main_metadata_sha256']==sha(p/'metadata.json')
 for file,h in main['bindings'].items():assert sha(p/file)==h,file
 for file,h in m['bindings'].items():assert sha(n/file)==h,file
 groups={}
 for row in r['samples']:
  assert row['frame'] in timed and row['variant'] in m['libraries'] and row['boundary'] in ['resident-native-destination','captured-native-destination','resident-native-scalar','captured-native-scalar']
  key=(row['frame'],row['variant'],row['boundary']);groups.setdefault(key,[]).append(row);assert 0<row['iterations']<=16384 and math.isfinite(row['elapsed_ms'])and row['elapsed_ms']>0 and math.isclose(row['ns_per_call'],row['elapsed_ms']*1e6/row['iterations'],rel_tol=1e-9)
  single,code=observe(lookup[row['frame']]['expected']);assert int(row['checksum'])==code*row['iterations']%2**64
 def boundaries(frame):return ['resident-native-destination','captured-native-destination']if isinstance(lookup[frame]['expected'],list)else['resident-native-scalar','captured-native-scalar']
 expected={(frame,v,b)for frame in timed for v in m['libraries']for b in boundaries(frame)};assert set(groups)==expected
 for rows in groups.values():assert len(rows)==5 and {x['round'] for x in rows}==set(range(5))
 assert len(m['validation'])==len(lookup)*len(m['libraries']) and all(x['passed'] for x in m['validation'])
 assert {(x['frame'],x['variant']) for x in m['validation']}=={(frame,v) for frame in lookup for v in m['libraries']}
 c={}
 for row in r['calibration']:
  assert row['frame']in timed and row['variant']in m['libraries']and row['boundary']in ['resident-native-destination','captured-native-destination','resident-native-scalar','captured-native-scalar']
  assert 0<row['iterations']<=16384 and math.isfinite(row['elapsed_ms'])and row['elapsed_ms']>=0 and math.isclose(row['ns_per_call'],row['elapsed_ms']*1e6/row['iterations'],rel_tol=1e-9)
  _,code=observe(lookup[row['frame']]['expected']);assert int(row['checksum'])==code*row['iterations']%2**64
  c.setdefault((row['frame'],row['variant'],row['boundary']),[]).append(row)
 assert set(c)==expected
 for key,rows in c.items():
  assert rows[0]['iterations']==1 and all(b['iterations']==2*a['iterations'] and a['elapsed_ms']<2 for a,b in zip(rows,rows[1:]));assert rows[-1]['elapsed_ms']>=2 or rows[-1]['iterations']==16384;assert all(x['iterations']==rows[-1]['iterations'] for x in groups[key])
 # Reconstruct native subprocess order/calibration escalation and bind every
 # statistical row to raw stdout from its exact ABI/input/count invocation.
 import random
 rng=random.Random(m['protocol']['seed']);wanted=[]
 for frame in [x for x in f['frames']if x['timed']]:
  for boundary in boundaries(frame['id']):
   for v in m['libraries']:wanted+=c[(frame['id'],v,boundary)]
   for round in range(5):
    order=list(m['libraries']);rng.shuffle(order)
    for v in order:wanted.append(next(x for x in groups[(frame['id'],v,boundary)]if x['round']==round))
 assert len(wanted)==len(r['journal'])and json.loads((n/'journal.json').read_text())==r['journal']
 with(n/'journal.ndjson').open(encoding='utf-8')as stream:
  count=0
  for count,line in enumerate(stream,1):
   record=json.loads(line);assert record['sequence']==count-1 and record==r['journal'][count-1]
  assert count==len(r['journal'])
 sample_order=[(x['frame'],x['boundary'],x['round'],x['variant'])for x in wanted if 'round'in x]
 assert sample_order==[(x['frame'],x['boundary'],x['round'],x['variant'])for x in r['samples']]
 for row,journal in zip(wanted,r['journal']):
  frame=lookup[row['frame']];task=next(t for t in tasks if t['name']==frame['task']);idx=tasks.index(task)
  argv=list(map(str,[n/'driver',m['libraries'][row['variant']],m['binaries'][row['frame']],idx,int(task['output_kind']=='list_u32'),row['iterations'],int(row['boundary'].startswith('captured-native-')),task['list_inputs']]))
  assert journal['argv']==argv and journal['exit_code']==0
  stdout=json.loads(journal['stdout']);single,code=observe(frame['expected']);assert stdout['single']==single and int(stdout['code'])==code and stdout['iterations']==row['iterations']and int(stdout['checksum'])==code*row['iterations']%2**64
  assert math.isclose(stdout['seconds']*1000,row['elapsed_ms'],rel_tol=1e-12,abs_tol=1e-15)
 result=dict(status='passed',samples=len(r['samples']),groups=len(groups),complete_prevalidation=len(m['validation']),boundaries=['resident-native-destination','captured-native-destination','resident-native-scalar','captured-native-scalar'],bindings={'metadata':sha(n/'metadata.json'),'results':sha(n/'results.json'),'journal':sha(n/'journal.json'),'journal_ndjson':sha(n/'journal.ndjson')})
 result['audit_tool_sha256']=sha(__file__)
 target=Path(output)if output is not None else n/'audit.json'
 if output is not None and target.exists():raise ValueError('preserve supplementary native audit')
 target.write_text(json.dumps(result,indent=2)+'\n');return result
