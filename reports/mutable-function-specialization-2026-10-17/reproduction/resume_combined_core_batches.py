import hashlib,json,os,subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parents[2]
checkout=root/'build/function-projection/combined-source/core'
target=root/'build/function-projection/core-target'
output=root/'build/function-projection/combined-validation'
output.mkdir(parents=True,exist_ok=True)
manifest=checkout/'Cargo.toml'
env=dict(os.environ);env['CARGO_TARGET_DIR']=str(target)
def source_hash():
 rows={str(p.relative_to(checkout)):hashlib.sha256(p.read_bytes()).hexdigest() for p in checkout.rglob('*') if p.is_file() and 'target' not in p.relative_to(checkout).parts}
 return hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest(),rows
source,files=source_hash()
meta=json.loads(subprocess.check_output(['cargo','metadata','--locked','--no-deps','--format-version','1','--manifest-path',str(manifest)],env=env))
package=next(p for p in meta['packages'] if p['name']=='ink-core')
tests=sorted(t['name'] for t in package['targets'] if t['kind']==['test'])
phases=[('lib',['test','--lib'])]
if any('bin' in t['kind'] for t in package['targets']):phases.append(('bins',['test','--bins']))
for i in range(0,len(tests),8):
 args=['test']
 for name in tests[i:i+8]:args+=['--test',name]
 phases.append(('integration-'+str(i//8),args))
if any('example' in t['kind'] for t in package['targets']):phases.append(('examples',['build','--examples']))
phases.append(('doc',['test','--doc']))
record=dict(status='running',source_sha256=source,files=files,private_checkout=True,private_target=True,
 targets=package['targets'],phases=[],scope='All declared library and integration tests, example builds and doctests with default features. Compilation is isolated; completed package outputs are cleaned between groups to bound retained disk use. Finite implementation checks, not compiler correctness.')
receipt=output/'receipt.json'
prior=json.loads(receipt.read_bytes())
assert prior['source_sha256']==source and prior['files']==files
for index,row in enumerate(prior['phases']):
 if row['status']!=0:break
 label,args=phases[index]
 command=['cargo',*args,'--locked','--manifest-path',str(manifest)]
 assert row['name']==label and row['command']==command
 assert hashlib.sha256((output/(label+'.log')).read_bytes()).hexdigest()==row['log_sha256']
 record['phases'].append(row)
resume_count=len(record['phases'])
record['resume_scope']='Only completed phases with identical source files, exact commands and authenticated retained logs are reused after a disk-full link failure. The failed phase and every remaining phase run normally.'
for index,(label,args) in enumerate(phases):
 if index<resume_count:continue
 assert source_hash()[0]==source,'private source changed during validation'
 command=['cargo',*args,'--locked','--manifest-path',str(manifest)]
 log=output/(label+'.log');start=time.monotonic()
 with log.open('wb') as stream:result=subprocess.run(command,cwd=checkout,env=env,stdout=stream,stderr=subprocess.STDOUT)
 row=dict(name=label,command=command,status=result.returncode,seconds=time.monotonic()-start,log_sha256=hashlib.sha256(log.read_bytes()).hexdigest())
 record['phases'].append(row)
 if result.returncode:record['status']='failed'
 receipt.write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(row),flush=True)
 if result.returncode:raise SystemExit(result.returncode)
 with (output/(label+'-clean.log')).open('wb') as stream:
  cleaned=subprocess.run(['cargo','clean','--manifest-path',str(manifest),'--package','ink-core'],cwd=checkout,env=env,stdout=stream,stderr=subprocess.STDOUT)
 if cleaned.returncode:raise SystemExit(cleaned.returncode)
assert source_hash()[0]==source
record['status']='passed';record['completed_targets']=len(tests);receipt.write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(dict(status='passed',integration_targets=len(tests),phases=len(phases))),flush=True)
