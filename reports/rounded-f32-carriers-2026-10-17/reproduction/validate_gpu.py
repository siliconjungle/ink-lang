import hashlib,json,os,shutil,subprocess,time
from pathlib import Path
r=Path(__file__).resolve().parents[2];base=r/'build/float-islands';out=base/'gpu-validation';out.mkdir(exist_ok=False)
source=base/'integration/source';inventory=json.loads((base/'integration/sources.json').read_bytes())
assert all(hashlib.sha256((source/p).read_bytes()).hexdigest()==sha for p,sha in inventory['files'].items())
command=['cargo','test','--locked','--test','numerical_state','numerical_storage_rollback_events_and_pure_calls_match_all_cpu_paths','--','--exact','--nocapture']
env=dict(os.environ,CARGO_TARGET_DIR=str(base/'integration/target'),INK_TEST_WASM='1',INK_PARITY_REQUIRE_ALL='1',INK_TEST_WGPU='1')
receipt=dict(status='running',command=command,environment={k:env[k]for k in ['INK_TEST_WASM','INK_PARITY_REQUIRE_ALL','INK_TEST_WGPU']},distribution=inventory['distribution'])
def save():(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
save();started=time.monotonic()
with(out/'test.log').open('wb')as log:result=subprocess.run(command,cwd=source,env=env,stdout=log,stderr=subprocess.STDOUT)
receipt.update(exit_code=result.returncode,seconds=time.monotonic()-started,log_sha256=hashlib.sha256((out/'test.log').read_bytes()).hexdigest());save()
if result.returncode:receipt['status']='failed';save();raise SystemExit(result.returncode)
artifacts=source/'build/numerical-state-parity'
for name in ['gpu-script.json','gpu-receipts.json','gpu-final.snapshot','expected.json','source.ink']:
    shutil.copy2(artifacts/name,out/name)
receipts=json.loads((out/'gpu-receipts.json').read_bytes())
receipt['gpu_calls']=sum(row.get('backend')=='gpu'for row in receipts)
assert receipt['gpu_calls']>0
receipt['outcomes']=len(receipts);receipt['status']='passed-real-eligible-dispatch'
receipt['scope']='Native WGPU host, complete numerical source history and exact final checkpoint; actual eligible word dispatch. This does not establish F32 arithmetic carriers or training on a GPU, nor browser WebGPU execution.'
receipt['files']={p.name:dict(bytes=p.stat().st_size,sha256=hashlib.sha256(p.read_bytes()).hexdigest())for p in out.iterdir()if p.is_file()and p.name!='receipt.json'}
save();print(json.dumps(receipt),flush=True)
