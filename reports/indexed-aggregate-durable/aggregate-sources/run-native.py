import json,pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[3]
binaries={k:root/'build/indexed-aggregate'/v/'release/bench' for k,v in [('source','source-bench-target'),('direct','native-bench-target'),('indexed','indexed-bench-target')]}
measurements=[]
for round in range(5):
 for label in (['indexed','direct','source'] if round%2 else ['source','direct','indexed']):
  result=json.loads(subprocess.run([str(binaries[label]),str(round)],capture_output=True,text=True,check=True).stdout)
  measurements.extend(dict(m,label=label) for m in result['measurements'])
for phase in ['action:put','action:erase','action:total_query','action:count_query']:
 assert len({m['snapshot_sha256'] for m in measurements if m['phase']==phase})==1,phase
(root/'reports/indexed-aggregate-durable/aggregate-rust-performance.json').write_text(json.dumps(dict(rows=4000,calls=96,measurements=measurements),indent=2)+'\n')
print('identical native histories and exact snapshots passed')
