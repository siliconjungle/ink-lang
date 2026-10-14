from pathlib import Path
import json,subprocess,hashlib
r=Path.cwd();d=r/'build/state-lifecycle-gap';c=json.loads((d/'primary-0.config.json').read_text());c['ink_artifacts']=[dict(label='Ink compact commits',path=str(d/'final-compact.mjs'))]
for label,units in [('merged-primary',16384),('merged-retained',65536)]:
 for i in range(3):
  c['units']=units;c['process_index']=i;(d/f'{label}-{i}.config.json').write_text(json.dumps(c))
  with (d/f'{label}-{i}.json').open('w')as out:subprocess.run(['node','--conditions=browser','bench/signals-state/maintained-bench.mjs',str(d/f'{label}-{i}.config.json')],stdout=out,check=True)
  print(label,i,'completed',flush=True)
