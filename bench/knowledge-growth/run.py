from common import *
import argparse
p=argparse.ArgumentParser();p.add_argument('--mode',choices=['validate','time','memory'],required=True);a=p.parse_args();check_frozen();rows=[]
if a.mode=='time' and not (OUT/'candidate-replay-complete.json').exists():
 subprocess.run(['python3',str(ROOT/'bench/knowledge-growth/export-candidates.py')],check=True)
 save(OUT/'candidate-replay-complete.json',dict(status='freshly replayed all distinct automatic candidates'))
for program in read(OUT/'corpus.json'):
 name=program['name'];lanes=[None]
 if a.mode=='memory':
  lanes=[f"{lane}/{point['label']}"for lane in ['forced','automatic','automatic-default']for point in read(OUT/'checkpoints.json')if (OUT/'compiled'/lane/point['label']/name/'output.mjs').exists()]+['literal']
 if a.mode=='memory':
  controls={'sequence-every':'upstream/lodash.every','ast-ancestor':'upstream/typescript.findAncestor','spatial-collision':'upstream/rbush.build+collides','index-membership':'upstream/lodash.includes','particle-step':'upstream/gl-matrix.scaleAndAdd','incremental-distinct':'upstream/rxjs.subscribe+distinct+toArray','compact-set':'upstream/lodash.uniq'}
  if name in controls:lanes.append(controls[name])
 for lane in lanes:
  d=OUT/'measurements'/a.mode/name/(lane.replace('/','--')if lane else'all')
  if (d/'process.json').exists() and read(d/'process.json')['status']==0:
   valid=True
   if a.mode=='validate':
    cache=read(d/'stdout.txt');present={v['name'] for v in cache['lanes']}
    required={f"{l}/{point['label']}"for l in ['forced','automatic','automatic-default']for point in read(OUT/'checkpoints.json')if (OUT/'compiled'/l/point['label']/name/'output.mjs').exists()}
    valid=required<=present
   if valid:rows.append(read(d/'process.json'));continue
  command=['node','--expose-gc',ROOT/'bench/knowledge-growth/bench.mjs',a.mode,name]+([lane]if lane else[])
  result=process(command,d);rows.append(result);save(OUT/f'{a.mode}-processes.json',rows);print(a.mode,name,lane,result['status'],round(result['seconds'],2),flush=True)
  if result['status'] and a.mode=='validate':raise SystemExit((d/'stderr.txt').read_text())
check_frozen();save(OUT/f'{a.mode}-processes.json',rows)
