"""Frozen Engine40 release graph; unrelated newer main source retained, excluded."""
from pathlib import Path
import hashlib,json,subprocess,tomllib,re
B=Path(__file__).resolve().parents[3];R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def git(repo,*args):return subprocess.check_output(['git','-C',str(B/repo),*args],text=True).strip()
expected={'runtime':'33457f5c221cec442c0f3aa9b8e091c9ce00266c','lowerings/c':'77fadd8ea75f68348bb6803fa7039899dd918e1f','lowerings/gpu':'1fba7a0bd42af4585dbe2fbbe30c64b669737687','lowerings/wasm':'34d27b23e295b331897dd06e03312d61ae4aa6db','lowerings/js':'8f0ce56a2f5e25e674de5272135f7e0332167fce','lowerings/rust':'25dc9f8f0bf22a182bc7c7c8ab6ae4a477ca2ebd'}
heads={};preserved={};before=json.loads((R/'integration-before.json').read_text())
for name,h in before['files'].items():
 same=sha(B/name)==h
 if name!='lowerings/js/src/lib.rs':assert same,name
 preserved[name]=dict(before=h,after=sha(B/name),identical=same)
for repo,head in expected.items():
 assert git(repo,'rev-parse','HEAD')==head
 assert git(repo,'status','--porcelain=v1','--untracked-files=no')==''
 subprocess.run(['git','-C',str(B/repo),'merge-base','--is-ancestor',head,'main'],check=True)
 subprocess.run(['git','-C',str(B/repo),'merge-base','--is-ancestor',head,'origin/main'],check=True)
 m=tomllib.loads((B/repo/'Cargo.toml').read_text());assert m['dependencies']['ink-core']['rev']=='e9e7fe9674439446c702a9f06985302e82ea893e'
 lock=tomllib.loads((B/repo/'Cargo.lock').read_text());core=[p['source']for p in lock['package']if p['name']=='ink-core'];assert len(core)==1 and'e9e7fe9674439446c702a9f06985302e82ea893e'in core[0]
 if repo in ['runtime','lowerings/c','lowerings/gpu','lowerings/wasm']:
  rust=[p['source']for p in lock['package']if p['name']=='ink-lowering-rust'];assert len(rust)==1 and expected['lowerings/rust']in rust[0]
 heads[repo]=dict(release=head,main=git(repo,'rev-parse','main'),origin_main=git(repo,'rev-parse','origin/main'),release_in_published_main_ancestry=True,manifest_sha256=sha(B/repo/'Cargo.toml'),lock_sha256=sha(B/repo/'Cargo.lock'))
assert tomllib.loads((B/'runtime/Cargo.toml').read_text())['dependencies']['ink-lowering-c']['rev']==expected['lowerings/c']
for repo in ['lowerings/gpu','lowerings/wasm']:assert tomllib.loads((B/repo/'Cargo.toml').read_text())['dependencies']['ink-lowering-c']['rev']==expected['lowerings/c']
assert tomllib.loads((B/'lowerings/c/Cargo.toml').read_text())['dependencies']['ink-lowering-rust']['rev']==expected['lowerings/rust']
logs=['e9-fixed-rust-regression.log','e9-release-runtime-tests.log','e9-release-runtime-locked-check.log','e9-release-c-locked-check.log','e9-release-gpu-locked-check.log','e9-release-wasm-locked-check.log','representation-bounds-regression.log','representation-rust-all-tests.log','representation-rust-df73-tests.log','c-main-df73-locked-check.log']
for name in logs:
 text=(R/name).read_text();assert'error:'not in text.lower(),name
 if'locked-check'in name:assert'Finished'in text
assert sum(int(n)for n in re.findall(r'test result: ok\. (\d+) passed',(R/'e9-release-runtime-tests.log').read_text()))==6
scope=dict(status='passed',release_core='e9e7fe9674439446c702a9f06985302e82ea893e',release_heads=heads,source_preservation=preserved,fix=dict(commit=expected['lowerings/rust'],production_change='Private storage bounds use the same selected executable datatype closure as literal definition emission.',kernel_or_selection_change=False,focused_test='Compiled checked live/nested/self-recursive datatype storage while excluding checked but unreachable datatype; preserved Arc identity and rejected depth overflow.'),publication=dict(rust_newer_main_preserved='806613273a72b359f42309c4fea4ae23c91765f8',c_newer_main_preserved='e72f3d1ca211a12dd6400d6ee5b64c5041ad7f6b',historical_release_detached=['lowerings/rust','lowerings/c'],no_reset_force_or_pr=True),gates=dict(release_locked_checks=['runtime','C','GPU','Wasm'],rust_focused_regression=True,rust_all_unit_tests=3,runtime_rust_tests=6,root_three_affected_histories='parent retest pending'),bindings={p.relative_to(B).as_posix():sha(p)for p in [Path(__file__),R/'representation-native-failure/bindings.json',*[R/n for n in logs]]},limits=['The release boundary excludes newer df73/V6 source: numerical NaN canonicalization, Wasm worker receipt/host execution and portable definition ABI changes are retained in published ancestry, not part of Engine40 claims.','Frozen benchmark artifacts have not been regenerated; instrumented transport timing remains gated.','Standalone checks and focused regression do not replace parent complete action-history/target parity gates.'])
(R/'e9-release-review.json').write_text(json.dumps(scope,indent=2)+'\n');print(json.dumps({'status':'passed','heads':expected,'root_retest':'pending'}))
