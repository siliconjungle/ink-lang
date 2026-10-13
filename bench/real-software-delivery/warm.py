"""Warm compilation preserves byte identity and freshly replays the proof chain."""
from pathlib import Path
import json,subprocess,time,statistics,hashlib,sys
sys.path.insert(0,str(Path(__file__).resolve().parent));from run import ROOT,OUT,assert_frozen,read,save,env
assert_frozen();rows=[]
for p in read(OUT/'corpus.json'):
 if p['split']!='held-out' or not p['supported']:continue
 initial=read(OUT/'compiled/packed-grown/balanced'/p['name']/'process.json')
 for i in range(3):
  dest=OUT/'warm'/p['name']/str(i);dest.mkdir(parents=True,exist_ok=True)
  cmd=list(initial['command']);cmd[cmd.index('--emit')+1]=str(dest/'output.mjs');cmd[cmd.index('-o')+1]=str(dest/'plan.json')
  start=time.monotonic();r=subprocess.run(cmd,env=env(),capture_output=True,text=True,timeout=180);elapsed=time.monotonic()-start
  (dest/'stdout.txt').write_text(r.stdout);(dest/'stderr.txt').write_text(r.stderr);assert r.returncode==0,r.stderr
  receipt=read(dest/'plan.json.receipt.json');assert receipt['cache']['hit'];assert receipt['diagnostics']['fresh_work']==dict(search=False,measurements=False,selected_replay_reported=True)
  digest=hashlib.sha256((dest/'output.mjs').read_bytes()).hexdigest();assert digest==initial['artifact_sha256']
  row=dict(program=p['name'],repeat=i,seconds=elapsed,cache=receipt['cache'],artifact_sha256=digest);save(dest/'process.json',row);rows.append(row)
  print('warm',p['name'],i,round(elapsed,3),flush=True)
save(OUT/'warm-summary.json',dict(schema=1,rows=rows,median_seconds=statistics.median(r['seconds'] for r in rows),scope='Same frozen epoch; only selected full proof freshly replayed, search and measurement histories labelled reused; identical emitted code.'))
