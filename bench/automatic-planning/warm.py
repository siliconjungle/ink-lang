"""Repeated ordinary compilation reuses exact-epoch hints and rechecks proofs."""
import json,pathlib,subprocess,sys,time,os
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=pathlib.Path(os.environ.get('INK_AUTO_REPORT', ROOT/'reports/automatic-planning-2026-10-13')).resolve()
database=pathlib.Path(sys.argv[1]).resolve();compiler=pathlib.Path(sys.argv[2]).resolve()
snapshot=json.loads((OUT/'after-input-snapshot.json').read_text())
code=pathlib.Path(sys.argv[3]).resolve()if len(sys.argv)>3 else ROOT
sys.path[:0]=[str(code/'knowledge'),str(code/'planner')]
from ink_knowledge import identity
rows=[]
for repeat in range(3):
 for program in json.loads((OUT/'corpus.json').read_text()):
  d=OUT/'warm'/program['name']/str(repeat);d.mkdir(parents=True,exist_ok=True)
  command=[str(compiler),'compile',str(ROOT/program['source']),'--optimise',str(database),
           '--snapshot',str(database/'store/snapshots'/f'{identity(snapshot)}.json'),
           '--target','javascript','-o',str(d/'output.mjs')]
  started=time.perf_counter();result=subprocess.run(command,env=dict(os.environ,INK_DISTRIBUTION=str(code)),capture_output=True,text=True)
  (d/'stdout.txt').write_text(result.stdout);(d/'stderr.txt').write_text(result.stderr)
  row=dict(program=program['name'],repeat=repeat,seconds=time.perf_counter()-started,status=result.returncode)
  assert result.returncode==0,result.stderr
  receipt=json.loads((d/'output.mjs.planning.json.receipt.json').read_text());assert receipt['cache']['hit'],receipt
  original=(OUT/'compiled/after/javascript'/program['name']/'plan.json').read_bytes()
  assert original==(d/'output.mjs.planning.json').read_bytes()
  rows.append(row);print(program['name'],repeat,round(row['seconds'],4),flush=True)
(OUT/'warm-compilation.json').write_text(json.dumps(rows,indent=2)+'\n')
