import hashlib,json,statistics,subprocess
from pathlib import Path
r=Path(__file__).resolve().parent;out=r/'native-paired';out.mkdir(exist_ok=True);binary=r/'native-target/release/ink-composed-graph-measurement';control=json.loads((r/'paired/summary.json').read_bytes());pairs=[]
for reference in control['pairs']:
 i=reference['pair'];order=reference['order'];row=dict(pair=i,order=order,variants={})
 for name in order:
  raw=subprocess.check_output([str(binary),name,'250000',str(i+1)]);data=json.loads(raw);row['variants'][name]=data;(out/f'pair-{i}-{name}.json').write_bytes(raw)
  for a,b in zip(reference['variants'][name]['records'],data['records']):
   assert a['checksum']==b['checksum'],(i,name,a['stride'],'checksum')
   assert a['snapshot']==b['snapshot'],(i,name,a['stride'],'checkpoint')
 pairs.append(row);print(json.dumps(dict(pair=i,ratios={name:[a['seconds']/b['seconds']for a,b in zip(row['variants']['baseline']['records'],row['variants'][name]['records'])]for name in ['projected','selected']})),flush=True)
ratios={name:[statistics.median(p['variants']['baseline']['records'][j]['seconds']/p['variants'][name]['records'][j]['seconds']for p in pairs)for j in range(3)]for name in ['projected','selected']}
result=dict(schema=1,pairs=pairs,median_paired_throughput=ratios,binary_sha256=hashlib.sha256(binary.read_bytes()).hexdigest(),scope='Six rotated fresh-process triples, typed Rust state calls, 250000 measured requests after 10000 warmup. All complete checksums and checkpoints additionally match the prior JavaScript triples. Ratios compare implementations within Rust, not Rust against Node.')
(out/'summary.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(ratios),flush=True)
