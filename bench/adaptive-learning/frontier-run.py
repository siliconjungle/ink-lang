"""Run serial, fresh-process Frontier comparisons after building the pinned inputs."""
import argparse,shutil,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('-o',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2];output=a.o.resolve()
assert not output.exists(),'use a fresh output directory'
output.mkdir(parents=True)
script=root/'bench/adaptive-learning/frontier.mjs'
subprocess.run(['node','--expose-gc',str(script),'acquire',str(output/'acquisition')],cwd=root,check=True)
for name in ['sessions','lifetime']:
 (output/name).mkdir()
 shutil.copy2(output/'acquisition/profiles.json',output/name/'profiles.json')
for i in range(3):
 for command,name in [('run','sessions'),('sweep','lifetime')]:
  with (output/f'{name}-{i}.log').open('w') as log:
   subprocess.run(['node','--expose-gc',str(script),command,str(output/name),str(i)],cwd=root,stdout=log,stderr=subprocess.STDOUT,check=True)
  print(name,i,'passed',flush=True)
for name in ['sessions','lifetime']:
 subprocess.run(['python3',str(root/'bench/adaptive-learning/frontier-summary.py'),str(output/name)],cwd=root,check=True)
