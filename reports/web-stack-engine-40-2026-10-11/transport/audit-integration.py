"""Audit merged independent graph, retained storage/transport bytes and untimed gates."""
from pathlib import Path
import hashlib,json,subprocess,tomllib,re
B=Path(__file__).resolve().parents[3];R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def git(repo,*args):return subprocess.check_output(['git','-C',str(B/repo),*args],text=True).strip()
before=json.loads((R/'integration-before.json').read_text());preserved={}
for name,h in before['files'].items():
 same=sha(B/name)==h
 if name!='lowerings/js/src/lib.rs':assert same,name
 preserved[name]=dict(before=h,after=sha(B/name),identical=same)
assert git('runtime','diff','bf2c382','HEAD','--')==''
assert(B/'runtime/Cargo.lock').read_bytes()==subprocess.check_output(['git','-C',str(B/'runtime'),'show','bf2c382:Cargo.lock'])
heads={}
for repo,old in before['heads'].items():
 subprocess.run(['git','-C',str(B/repo),'merge-base','--is-ancestor',old,'HEAD'],check=True)
 assert git(repo,'status','--porcelain=v1','--untracked-files=no')==''
 m=tomllib.loads((B/repo/'Cargo.toml').read_text());assert m['dependencies']['ink-core']['rev']=='e9e7fe9674439446c702a9f06985302e82ea893e'
 lock=tomllib.loads((B/repo/'Cargo.lock').read_text());cores=[p['source']for p in lock['package']if p['name']=='ink-core'];assert len(cores)==1 and'e9e7fe9674439446c702a9f06985302e82ea893e'in cores[0]
 heads[repo]=dict(head=git(repo,'rev-parse','HEAD'),origin_main=git(repo,'rev-parse','origin/main'),standalone_core=cores[0],manifest_sha256=sha(B/repo/'Cargo.toml'),lock_sha256=sha(B/repo/'Cargo.lock'))
assert git('runtime','ls-remote','origin','refs/heads/main').split()[0]==heads['runtime']['head']
logs=['integration-runtime-check.log','integration-runtime-rust-tests.log','integration-runtime-host-tests.log','integration-gpu-device-tests.log']+[f'integration-{n}-locked-check.log'for n in ['c','gpu','js','wasm','rust']]
for name in logs:
 text=(R/name).read_text();assert'error:'not in text.lower(),name
 if name.endswith('locked-check.log')or name=='integration-runtime-check.log':assert'Finished'in text,name
assert 'fail 0'in(R/'integration-runtime-host-tests.log').read_text()
assert sum(int(n)for n in re.findall(r'test result: ok\. (\d+) passed',(R/'integration-runtime-rust-tests.log').read_text()))==6
receipt=dict(status='passed',heads=heads,source_preservation=preserved,runtime_merge=dict(commit=heads['runtime']['head'],published_direct_main=True,tree_equals_upstream_bf2c382=True,only_conflict='Cargo.lock: upstream exact lock retained, local five-line old-pin alignment superseded',both_histories_retained=True),gates=dict(runtime_locked_check=True,standalone_backend_locked_checks=5,runtime_rust_tests=6,runtime_host_runner_entries=40,gpu_mock_regressions=True,no_measurements=True),bindings={p.relative_to(B).as_posix():sha(p)for p in [R/'integration-before.json',Path(__file__),*[R/n for n in logs]]},limits=['Root façade patch unifies local Rust dc6ea9d; standalone C/runtime preserve upstream transitive Rust2bcce3e with identical core e9.','Core/reference representation semantics and final compiled CPU/native-GPU parity are parent-owned follow-up gates.','Runtime library tests include flat transport and emitted GPU discovery; they do not universally prove the new Reference machine.','Archived benchmark/attribution assets were not regenerated and timings remain gated.','Prior ignored standalone lock bytes preserved under integration-locks-before; tracked JS lock unchanged.','Node test runner count includes one fixture-module entry; 39 named host tests.'])
(R/'integration-review.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'status':'passed','runtime':heads['runtime']['head'],'lowerings':{k:v['head']for k,v in heads.items()if k!='runtime'}}))
