from pathlib import Path
import subprocess,json,time
root=Path.cwd();log=root/'build/frontier-current-runs.log'
def call(args,label):
 with log.open('a')as output:
  output.write(json.dumps(dict(status='started',label=label,command=args,time=time.time()))+'\n');output.flush()
  result=subprocess.run(args,stdout=output,stderr=subprocess.STDOUT,cwd=root)
  output.write(json.dumps(dict(status='completed',label=label,code=result.returncode,time=time.time()))+'\n');output.flush()
  if result.returncode:raise SystemExit(result.returncode)
node=['node','--expose-gc']
for process in [1001,1002,1003]:
 for fixture in ['replace-4096','mixed-4096','read-heavy-4096']:
  call(node+['bench/frontier-json/run.mjs',str(process),'--javascript-only','--fixture='+fixture],f'state/{process}/{fixture}')
 call(node+['bench/frontier-json/json-kernels.mjs',str(process),'--warmup-calls=200'],f'json/{process}')
for process in [1001,1002,1003]:
 call(node+['bench/frontier-json/lifecycle-compare.mjs',str(process),'--ink-module=build/frontier-json/ink.mjs'],f'lifecycle/{process}')
