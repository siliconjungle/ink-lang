"""Read-only saved native observations, no program execution."""
import hashlib,json,math
from pathlib import Path
from native import observe
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
def audit(report):
 p=Path(report);n=p/'native';m=json.loads((n/'metadata.json').read_text());r=json.loads((n/'results.json').read_text());f=json.loads((p/'fixtures.json').read_text());tasks=json.loads((p/'spec.json').read_text())['tasks'];lookup={x['id']:x for x in f['frames']};timed={x['id'] for x in f['frames'] if x['timed']}
 assert r['status']=='passed' and r['metadata_sha256']==sha(n/'metadata.json')
 for file,h in m['bindings'].items():assert sha(n/file)==h,file
 groups={}
 for row in r['samples']:
  assert row['frame'] in timed and row['variant'] in m['libraries'] and row['boundary'] in ['resident-native-destination','captured-native-destination']
  key=(row['frame'],row['variant'],row['boundary']);groups.setdefault(key,[]).append(row);assert 0<row['iterations']<=65536 and row['elapsed_ms']>0 and math.isclose(row['ns_per_call'],row['elapsed_ms']*1e6/row['iterations'],rel_tol=1e-9)
  single,code=observe(lookup[row['frame']]['expected']);assert int(row['checksum'])==code*row['iterations']%2**64
 expected={(frame,v,b) for frame in timed for v in m['libraries'] for b in ['resident-native-destination','captured-native-destination']};assert set(groups)==expected
 for rows in groups.values():assert len(rows)==9 and {x['round'] for x in rows}==set(range(9))
 assert len(m['validation'])==len(lookup)*len(m['libraries']) and all(x['passed'] for x in m['validation'])
 assert {(x['frame'],x['variant']) for x in m['validation']}=={(frame,v) for frame in lookup for v in m['libraries']}
 c={}
 for row in r['calibration']:c.setdefault((row['frame'],row['variant'],row['boundary']),[]).append(row)
 assert set(c)==expected
 for key,rows in c.items():
  assert rows[0]['iterations']==1 and all(b['iterations']==2*a['iterations'] and a['elapsed_ms']<8 for a,b in zip(rows,rows[1:]));assert rows[-1]['elapsed_ms']>=8 or rows[-1]['iterations']==65536;assert all(x['iterations']==rows[-1]['iterations'] for x in groups[key])
 result=dict(status='passed',samples=len(r['samples']),groups=len(groups),complete_prevalidation=len(m['validation']),boundaries=['resident-native-destination','captured-native-destination'],bindings={'metadata':sha(n/'metadata.json'),'results':sha(n/'results.json')})
 (n/'audit.json').write_text(json.dumps(result,indent=2)+'\n');return result
