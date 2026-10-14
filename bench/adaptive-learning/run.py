"""Balanced fresh-process acquisition. Run after preparing an aggregate bundle.

No concurrent benchmark processes. A complete rotation cycle for every mode set.
"""
import argparse,json,os,shutil,subprocess,hashlib
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--profile',type=Path,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2];a.o.mkdir(parents=True,exist_ok=True)
if list(a.o.glob('replay-*.json')):raise ValueError('use a fresh output directory')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
provenance=dict(schema=1,revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(),bundle=json.loads((a.bundle/'bundle.json').read_text()),profile_sha256=sha(a.profile),scripts={str(p.relative_to(root)):sha(p)for folder in ['bench/adaptive-learning','runtime/hosts']for p in (root/folder).glob('*.mjs')})
(a.o/'provenance.json').write_text(json.dumps(provenance,indent=2));shutil.copyfile(a.profile,a.o/'acquisition.fitted.json')
for i in range(5):
 subprocess.run(['node','bench/adaptive-learning/replay.mjs',str(a.bundle),str(root),str(a.o/f'replay-{i}.json')],cwd=root,env={**os.environ,'PROFILE':str(a.profile.resolve()),'BENCH_ROTATION':str(i)},check=True)
for i in range(4):
 env={**os.environ,'BENCH_ROTATION':str(i)}
 subprocess.run(['node','bench/adaptive-learning/json.mjs',str(a.o/f'json-{i}.json')],cwd=root,env=env,check=True)
 subprocess.run(['node','bench/adaptive-learning/collections.mjs',str(a.bundle),str(a.profile),str(a.o/f'collections-{i}.json')],cwd=root,env=env,check=True)
