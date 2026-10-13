"""Fetch exact upstream source/data pins recorded by the frozen manifest."""
from pathlib import Path
import hashlib,json,subprocess
root=Path(__file__).resolve().parents[2]
for row in json.loads((Path(__file__).with_name('upstreams.json')).read_bytes()):
    p=root/row['path']
    if not p.exists():
        p.parent.mkdir(parents=True,exist_ok=True)
        p.write_bytes(subprocess.check_output(['curl','--fail','--silent','--show-error','--location',row['url']]))
    if hashlib.sha256(p.read_bytes()).hexdigest()!=row['sha256']:
        raise ValueError('upstream content differs: '+str(p))
print('All upstream pins verified')
