"""Serial independent validation, interleaved timing and separate memory processes."""
import argparse,json,os,pathlib,subprocess,sys,time
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=pathlib.Path(os.environ.get('INK_AUTO_REPORT', ROOT/'reports/automatic-planning-2026-10-13')).resolve()
p=argparse.ArgumentParser();p.add_argument('--mode',choices=['reference','validate','time','memory'],required=True);p.add_argument('--compiler',type=pathlib.Path);a=p.parse_args()
programs=json.loads((OUT/'corpus.json').read_text());fixtures=json.loads((OUT/'fixtures.json').read_text());rows=[]
def run(command,d):
 d.mkdir(parents=True,exist_ok=True)
 if (d/'process.json').exists():return json.loads((d/'process.json').read_text())
 start=time.perf_counter()
 with (d/'stdout.txt').open('wb')as stdout,(d/'stderr.txt').open('wb')as stderr:
  child=subprocess.Popen(list(map(str,command)),cwd=ROOT,stdout=stdout,stderr=stderr)
  _,status,usage=os.wait4(child.pid,0)
 r=dict(command=list(map(str,command)),status=os.waitstatus_to_exitcode(status),seconds=time.perf_counter()-start,
        process_high_water_bytes=usage.ru_maxrss*(1 if sys.platform=='darwin'else 1024),stdout=str((d/'stdout.txt').relative_to(ROOT)))
 (d/'process.json').write_text(json.dumps(r,indent=2)+'\n');return r
if a.mode=='reference':
 if not a.compiler:p.error('reference requires the frozen compiler')
 byname={p['name']:p for p in programs}
 for f in fixtures:
  if f['size']>257:continue
  r=run([a.compiler,'run',ROOT/byname[f['program']]['source'],'run',ROOT/f['path']],OUT/'reference'/f['program']/pathlib.Path(f['path']).stem)
  rows.append(r)
else:
 for program in programs:
  for lane in (['before','after']if a.mode=='memory'else[None]):
   r=run(['node','--expose-gc',ROOT/'bench/automatic-planning/bench.mjs',a.mode,program['name']]+([lane]if lane else[]),OUT/'measurements'/a.mode/program['name']/(lane or'all'))
   rows.append(r);print(a.mode,program['name'],lane,r['status'],round(r['seconds'],3),flush=True)
   if r['status']:raise SystemExit((ROOT/pathlib.Path(r['stdout']).parent/'stderr.txt').read_text()[-3000:])
(OUT/(a.mode+'-processes.json')).write_text(json.dumps(rows,indent=2)+'\n')
