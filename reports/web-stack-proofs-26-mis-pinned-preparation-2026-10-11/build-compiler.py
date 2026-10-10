"""Root-only build and exact guarded source binding, before any timings."""
import hashlib,json,shutil,subprocess
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda p:json.loads(Path(p).read_text())
pins=read(R/'initial-pins.json');before=read(R/'source-boundary-before.json');after={p:sha(B/p) for p in before};changed=sorted(p for p in before if after[p]!=before[p]);assert changed==sorted(pins['expected_source_changes'])
assert all(sha(R/'original-source'/p)==before[p] for p in changed)
old=B.parent/'toolchain/ink-accepted-proofs';new=B.parent/'toolchain/ink-direct-js-proofs';assert sha(old)==pins['prior_compiler_sha256'] and not new.exists()
cmd=['cargo','build','--release','--bin','ink'];result=subprocess.run(cmd,cwd=B,capture_output=True,text=True);(R/'compiler-build.log').write_text(result.stdout+result.stderr);assert result.returncode==0,result.stderr
assert {p:sha(B/p) for p in before}==after
shutil.copy2(B/'target/release/ink',new);assert sha(new)!=sha(old)
(R/'source-boundary-after.json').write_text(json.dumps(after,indent=2)+'\n')
v=dict(status='passed',command=cmd,exit_code=result.returncode,old_path=str(old),new_path=str(new),old_sha256=sha(old),new_sha256=sha(new),changed_guarded_files=changed,changed_production_files=pins['expected_production_changes'],unchanged_guarded_files=len(before)-len(changed),original_source_hashes_authenticated=True,source_guard_keys=len(before),scope='Only JS emitter production changes; two existing structural test assertions updated for direct statement bodies. Exact102-key guard, original copies authenticated. Same semantic checker/planner/native/Wasm/GPU/host bytes.')
(R/'compiler-build.json').write_text(json.dumps(v,indent=2)+'\n');print(json.dumps(v))
