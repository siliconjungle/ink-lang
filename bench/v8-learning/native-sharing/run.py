from pathlib import Path
from types import SimpleNamespace
import argparse,json,subprocess,sys,os,hashlib,statistics,time
sys.path[:0]=['knowledge','planner']
from ink_planner.native_measurements import measure
args=argparse.ArgumentParser();args.add_argument('--output',type=Path,required=True);args=args.parse_args()
p=args.output.resolve();p.mkdir(parents=True,exist_ok=False);saved=Path('bench/v8-learning/sharing').resolve();compiler=Path('target/debug/ink').resolve()
artifacts=[]
for lane in ['baseline','shared']:
 source=p/(lane+'.rs');command=[str(compiler),'build',str(saved/'source.ink'),'--target','rust','-o',str(source)]
 if lane=='shared':command += ['--selection',str(saved/'selection.json')]
 r=subprocess.run(command,capture_output=True,text=True,timeout=90)
 if r.returncode:raise RuntimeError(r.stderr[-3000:])
 source=source/'src/lib.rs'
 name='ink-v8-sharing-'+lane;project=source.parents[1]
 manifest=project/'Cargo.toml';manifest.write_text(manifest.read_text().replace('name=\"compiled-state\"','name='+json.dumps(name)))
 artifacts.append(dict(measurement=lane,package=name,path=str(project),artifact_sha256=hashlib.sha256(source.read_bytes()).hexdigest()))
root=p/'measurement-root';root.mkdir(exist_ok=True)
planner=SimpleNamespace(root=root,directory=p,options=SimpleNamespace(measure_timeout=300))
training=json.loads((saved/'training-request.json').read_text());holdout=json.loads((saved/'holdout-request.json').read_text())
report,build=measure(planner,artifacts,training['phases'],training['measurement'])
(p/'training-0.json').write_text(json.dumps(report,indent=2)+'\n');reports=dict(training=[report],holdout=[])
executable=root/'offline-native-target/release/ink-offline-calls'
for split,request in [('training',training),('holdout',holdout)]:
 packet=dict(artifacts=artifacts,phases=request['phases'],measurement=request['measurement']);path=p/(split+'-request.json');path.write_text(json.dumps(packet))
 for i in range(1 if split=='training'else 0,3):
  out=subprocess.run([str(executable),str(path)],capture_output=True,text=True,timeout=120)
  if out.returncode:raise RuntimeError(out.stderr[-3000:])
  value=json.loads(out.stdout)
  if value['rejected']:raise ValueError(str(value['rejected']))
  reports[split].append(value);(p/(split+'-'+str(i)+'.json')).write_text(json.dumps(value,indent=2)+'\n')
summary=dict(schema=1,boundary='Complete generated native JSON-call ABI, input conversion and full output consumption included; constructor observed separately; compare only within native lanes',compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),build=build,processes=3,splits={})
for split,rows in reports.items():
 medians={lane:statistics.median(int(x)for r in rows for row in r['rows']if row['measurement']==lane for x in row['complete_call_ns'])for lane in ['baseline','shared']}
 ratios=[]
 for r in rows:
  times={lane:statistics.median(int(x)for row in r['rows']if row['measurement']==lane for x in row['complete_call_ns'])for lane in medians}
  ratios.append(times['baseline']/times['shared'])
 summary['splits'][split]=dict(median_ns=medians,speedup=medians['baseline']/medians['shared'],process_speedups=ratios)
(p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary),flush=True)
