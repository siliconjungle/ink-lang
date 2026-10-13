"""Measure same-epoch cache hits with fresh proof replay and identical emission."""
from pathlib import Path
import os,json,subprocess,time,hashlib,statistics
root=Path(__file__).resolve().parents[2];out=root/'reports/automatic-delivery-2026-10-13';code=root/'build/automatic-delivery/after-code'
env=dict(os.environ,INK_DISTRIBUTION=str(code),PYTHONPATH=os.pathsep.join([str(code/'knowledge'),str(code/'planner')]))
rows=[]
for source in sorted((root/'bench/automatic-delivery/corpus').glob('*.ink')):
 original=out/'compiled/after/base'/source.stem
 old=json.loads((original/'process.json').read_text())
 for repeat in range(3):
  dest=out/'warm'/source.stem/str(repeat);dest.mkdir(parents=True,exist_ok=True)
  command=list(old['command'])
  command[command.index('--emit')+1]=str(dest/'output.mjs');command[command.index('-o')+1]=str(dest/'plan.json')
  started=time.monotonic();r=subprocess.run(command,cwd=root,env=env,capture_output=True,text=True,timeout=180)
  elapsed=time.monotonic()-started
  (dest/'stdout.txt').write_text(r.stdout);(dest/'stderr.txt').write_text(r.stderr)
  assert r.returncode==0,r.stderr
  receipt=json.loads((dest/'plan.json.receipt.json').read_text());assert receipt['cache']['hit']
  assert hashlib.sha256((dest/'output.mjs').read_bytes()).hexdigest()==old['artifact_sha256']
  row=dict(program=source.stem,repeat=repeat,seconds=elapsed,cache=receipt['cache'],selected=receipt['selected'],artifact_sha256=old['artifact_sha256'])
  (dest/'process.json').write_text(json.dumps(row,indent=2)+'\n');rows.append(row)
  print(source.stem,repeat,round(elapsed,3),'proof replay and identical artifact',flush=True)
(out/'warm-summary.json').write_text(json.dumps(dict(schema=1,rows=rows,median_seconds=statistics.median(r['seconds']for r in rows),scope='Same frozen compiler, database snapshot and machinery. Warm complete compilation still replays selected proof and emits byte-identical artifact; original search and costs are historical.'),indent=2)+'\n')
