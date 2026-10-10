"""Read-only interpretation of saved fresh-fold outcomes and checked source bindings."""
import collections,hashlib,json
from pathlib import Path
B=Path(__file__).resolve().parents[2];R=Path(__file__).resolve().parent
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
m=read(R/'metadata.json');table=read(R/'outcome-tables.json');fixtures=read(R/'fixtures.json');profiles=read(R/'fixture-profile.json');fresh={n for n,t in m['tasks'].items() if t['fresh_proof_required']};assert fresh=={'invariant_fold_u32','invariant_fold_heldout_u32'}
for file,h in table['summary_hashes'].items():assert sha(R/file)==h
inputs={x['id']:x for x in fixtures['inputs']};timed={fixtures['inputs'][c['input']]['id'] for c in fixtures['cells'] if c['case'] in fresh};assert len(timed)==16
MASK=(1<<32)-1;checked_profiles=[]
for p in profiles['profiles']:
 if p['case'] not in fresh:continue
 x=inputs[p['input']];a=x['seed'];k=x['factor'];enabled=a<k;held='heldout' in p['case'];yes=no=0
 for word in reversed(x['xs']):
  condition=(word<x['seed'] if held else a<x['seed']) if enabled else (a<k if held else a>k)
  if condition:yes+=1
  else:no+=1
  if held:
   a=((((a*k)&MASK)+word)&MASK if condition else (a-word)&MASK) if enabled else ((((word*k)&MASK)+a)&MASK if condition else (word-((a*x['seed'])&MASK))&MASK)
  else:
   a=((word+((a*k)&MASK))&MASK if condition else (word-a)&MASK) if enabled else ((a-((word*x['seed'])&MASK))&MASK if condition else (a+word)&MASK)
 assert a==x['expected'][p['case']]
 assert p['invariant_gate_enabled']==enabled and p['selected_inner_true']==yes and p['selected_inner_false']==no and p['original_invariant_tests']==len(x['xs']) and p['both_live_branches_traverse'] and p['fold_order']=='right'
 if p['input'] in timed:checked_profiles.append(dict(case=p['case'],input=p['input'],enabled=enabled,length=len(x['xs']),inner_true=yes,inner_false=no,inner_branch_degenerate=(not yes or not no)))
assert len(checked_profiles)==16 and sum(x['enabled'] for x in checked_profiles)==8
proofs=[]
for task in sorted(fresh):
 t=m['tasks'][task];assert t['prior_equals_original'] and t['checked_changes_prior'];assert t['selections']['prior']['applications']==0 or t['selections']['prior']['applications']==[]
 selected=read(R/t['selections']['checked']['path']);assert len(selected['applications'])==1 and set(t['new_laws'])=={selected['applications'][0]['law']}
 prior=read(R/t['selections']['prior']['selected_core_path']);current=read(R/t['selections']['checked']['selected_core_path']);original=read(R/'tasks'/task/'core.json');find=lambda c:next(f['body'] for f in c['program']['functions'] if f['name']==task)
 assert find(prior)==find(original) and find(current)!=find(prior)
 for backend in ('old','new'):assert t['matrix_bundles'][backend+'_checked']['selected_core_sha256']==t['selections']['checked']['selected_core_sha256']
 proofs.append(dict(task=task,selected_law=selected['applications'][0]['law'],original_core_sha256=t['core_sha256'],selected_core_sha256=t['selections']['checked']['selected_core_sha256']))
def classification(triple,expert=False):
 assert len(triple)==3 and triple[1]<=triple[0]<=triple[2]
 if triple[1]>1:return 'expert_faster' if expert else 'faster'
 if triple[2]<1:return 'Ink_faster' if expert else 'slower'
 return 'inconclusive'
counts={};rows=[]
for host,file in [('node','node-summary.json'),('browser','browser-summary.json'),('native','native/summary.json')]:
 data=read(R/file)
 for row in data['measurements']:
  if row['case'] not in fresh:continue
  assert row['input'] in timed
  mode=row.get('mode','');p=next(x for x in checked_profiles if x['input']==row['input'])
  for key,triple in row['paired_ratios_95pct'].items():
   expert=('expert' in key);label=classification(triple,expert);group=f'fresh|{host}|{mode}|{key}|all';counts.setdefault(group,collections.Counter())[label]+=1
   rows.append(dict(host=host,mode=mode,case=row['case'],input=row['input'],gate_enabled=p['enabled'],comparison=key,variants=row['ratio_variants'][key],paired_ratio_95pct=triple,outcome=label))
for group,count in counts.items():assert dict(count)==table['counts'][group],(group,count,table['counts'][group])
paths=[Path(__file__),R/'metadata.json',R/'outcome-tables.json',R/'fixture-profile.json',R/'fixtures.json',R/'node-summary.json',R/'browser-summary.json',R/'native/summary.json',R/'emission-recovery-independent-review.json',B/'knowledge/research/web-stack-proofs-26/invariant/evidence.json']
v=dict(schema=1,status='PASS',blocking_findings=[],fresh_tasks=2,timed_cells_per_host=16,checked_profiles=checked_profiles,typed_author_correctness=dict(frames=168,interpreter_runs=336,types=['U32','I32','U64','F32'],default_fold_sources=8,valid_unselected_map_sources=8),selected_sources=proofs,saved_interval_classifications_verified=len(rows),fresh_counts={k:dict(v) for k,v in counts.items()},rows=rows,bindings={str(p.relative_to(B)):sha(p) for p in paths},scope='Saved intervals and their summary hashes independently classified; no new bootstrap or timing executed. Exact original/selected source roots and complete timed profile recurrence/gate outcomes checked. Both live branches traverse. Correctness is broader than two timed U32 callback instances.',limitations=['No-op false fold is old20 and excluded. These are standard identities, not new mathematics.','Map roots are checked but unselected under the frozen CPU cost model; no measured map-hoisting claim.','Fresh proof marginal gain differs from JS lowering gain; enabled and disabled are two live ordered reducers, not skip states.','Some timed inner-reducer branches are degenerate; their exact counts are retained and do not establish general branch-mixed performance.','Identical per-proof C/executable Wasm makes backend-only Wasm/native intervals a control measurement, not evidence of changed CPU code.','Preset callbacks on one machine, full captured calls and borrowed calls have separate costs. Strong expert outcomes include losses and inconclusive cells.'])
(R/'fresh-fold-independent-review.json').write_text(json.dumps(v,indent=2)+'\n')
(R/'fresh-fold-independent-review.md').write_text('''# Fresh fold interpretation

Both timed U32 exports replay one fresh source certificate. The fair-prior bodies equal the original, while current bodies hoist `seed<k` outside two mutually exclusive ordered folds. Both gate profiles execute a complete reverse traversal; there is no disabled O(1) shortcut. The eight generic endpoints comprise two standard identities across four types; map endpoints remain checked but unselected. Typed correctness covers 168 frames/336 runs and F32 exceptional values, whereas performance covers two U32 callback recipes.

The new JS backend marginally improves the checked fresh folds in eight of sixteen captured-call cells on each host, with eight inconclusive cells each. The new proofs alone on the new JS backend yield Node 4 faster/11 inconclusive/1 slower and browser 2 faster/12 inconclusive/2 slower. These effects must not be conflated. Against efficient captured JS, current fresh folds have Node 1 Ink win/5 inconclusive/10 expert wins and browser 0 Ink wins/8 inconclusive/8 expert wins. Borrowed calls remain a separate comparison.

Proof effects on new Wasm yield Node 0 faster/15 inconclusive/1 slower and browser 0 faster/14 inconclusive/2 slower. Native resident proof effects are 0 faster/15 inconclusive/1 slower; snapshot effects are 1 faster/15 inconclusive/0 slower. Current fresh native resident expert outcomes are 4 Ink wins/9 inconclusive/3 Rust wins; snapshot outcomes are 2 Ink wins/11 inconclusive/3 Rust wins. None establishes universal language superiority.

All 16 timed fold profiles were recomputed from the exact frozen arrays/scalars and matched their full golden result and inner-branch counts. Some inner reducer branches degenerate under those presets; the JSON retains each count explicitly. The invariant flag itself covers both outcomes. Under each selected proof core, old/new C and all executable/non-debug Wasm sections are identical; only debug paths differ. Backend-only CPU timing fluctuations therefore do not demonstrate a CPU compiler change. The JSON binds every saved summary, selection provenance and recovery receipt. No new timing, bootstrap, build, compiler test or canonical write was performed here.
''')
print(json.dumps(dict(status='PASS',saved_interval_classifications=len(rows),receipt_sha256=sha(R/'fresh-fold-independent-review.json'))))
