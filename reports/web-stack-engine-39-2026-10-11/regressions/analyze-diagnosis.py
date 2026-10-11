"""Recompute frozen diagnosis receipts; no profiling, compilation or timing."""
import collections,hashlib,json,math,pathlib,random,re
B=pathlib.Path(__file__).resolve().parents[3]
R=pathlib.Path(__file__).resolve().parent
P=B/'reports/web-stack-proofs-38-2026-10-11/targets'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
read=lambda p:json.loads(p.read_text())
prep=read(R/'preparation.json'); ready=read(R/'readiness.json'); commands=read(R/'profiling-commands.json')
assert commands['status']=='passed' and len(commands['commands'])==7
assert commands['plan_sha256']==sha(R/'profiling-plan.json')
assert commands['readiness_sha256']==sha(R/'readiness.json')
for p,h in ready['bindings'].items():assert sha(B/p)==h,(p,'readiness changed')
meta=read(P/'metadata.json')
for p,h in meta['bindings'].items():assert sha(P/p)==h,p
fixtures={f['id']:f for f in read(P/'fixtures.json')['frames']}
processes=[]; groups=[]; audit=[]
def paired(d,frame,ref,cur,boundary=None):
 a={x['round']:x['ns_per_call'] for x in d['samples'] if x['frame']==frame and x['variant']==ref and (boundary is None or x['boundary']==boundary)}
 b={x['round']:x['ns_per_call'] for x in d['samples'] if x['frame']==frame and x['variant']==cur and (boundary is None or x['boundary']==boundary)}
 assert set(a)==set(b)==set(range(9)),(frame,ref,cur)
 logs=[math.log(a[i]/b[i]) for i in range(9)]
 key=f"39/diagnose/{d.get('host')}/{d['argv']['seed']}/{frame}/{ref}/{cur}/{boundary}"
 seed=int.from_bytes(hashlib.sha256(key.encode()).digest()[:8],'big');rng=random.Random(seed)
 draws=sorted(math.exp(sum(logs[rng.randrange(9)] for _ in range(9))/9) for _ in range(4000))
 ci=[draws[100],draws[3899]]
 return {'ratio_reference_over_current':math.exp(sum(logs)/9),'ci95_within_process':ci,'classification_within_process':'slower' if ci[1]<1 else 'faster' if ci[0]>1 else 'uncertain','bootstrap_seed':seed,'bootstrap_draws':4000,'paired_rounds':9}
for n in range(1,4):
 d=read(R/f'reproduce-process-{n}.json'); assert d['status']=='passed' and d['mode']=='reproduce' and not d['execArgv'] and not d['profiling_overhead_included']
 assert len(d['samples'])==693 and len(d['validation'])==77
 assert d['script_sha256']==sha(B/'bench/diagnose-pipeline38.mjs')
 for p,h in d['bindings'].items():
  if p in ('metadata','fixtures','script'):continue
  if p.startswith('control_'):assert hashlib.sha256(d['control_sources'][p]['source'].encode()).hexdigest()==h
  else:assert sha(B/p)==h,p
 expected_observable=0
 frame_order=list(dict.fromkeys(v['frame'] for v in d['validation'])); names=d['argv']['variant'].split(',')
 rngstate=int(d['argv']['seed'])&0xffffffff
 def rand():
  global rngstate
  rngstate^=(rngstate<<13)&0xffffffff;rngstate^=rngstate>>17;rngstate^=(rngstate<<5)&0xffffffff;rngstate&=0xffffffff;return rngstate
 expected_order=[]
 for frame in frame_order:
  f=fixtures[frame]; code=(len(f['expected'])+sum((i+1)*v for i,v in enumerate(f['expected'])))&0xffffffff
  assert code==f['web_consumption_code'];expected_observable=(expected_observable+code*int(d['argv']['warmups'])*len(names))&0xffffffff
  for name in names:
   rows=[x for x in d['calibration'] if x['frame']==frame and x['variant']==name]
   assert rows and [x['iterations'] for x in rows]==[1<<i for i in range(len(rows))]
   assert all(x['elapsed_ms']<8 and x['iterations']<65536 for x in rows[:-1])
   assert rows[-1]['elapsed_ms']>=8 or rows[-1]['iterations']>=65536
   assert all(x['iterations']==rows[-1]['iterations'] for x in d['samples'] if x['frame']==frame and x['variant']==name)
  for round_ in range(9):
   order=names[:]
   for i in range(len(order)-1,0,-1):
    j=rand()%(i+1);order[i],order[j]=order[j],order[i]
   expected_order.extend((frame,round_,name) for name in order)
 assert expected_order==[(x['frame'],x['round'],x['variant']) for x in d['samples']]
 for x in d['calibration']+d['samples']:
  f=fixtures[x['frame']];assert x['consumed_elements']==len(f['expected'])*x['iterations']
  assert int(x['checksum'])==(f['web_consumption_code']*x['iterations'])&0xffffffff
  assert math.isclose(x['ns_per_call'],x['elapsed_ms']*1e6/x['iterations'],rel_tol=1e-12)
  expected_observable=(expected_observable+int(x['checksum']))&0xffffffff
 assert expected_observable==d['observable']
 processes.append(d); audit.append({'process':n,'samples':len(d['samples']),'groups':77,'validation':77,'calibration_rows':len(d['calibration']),'interleaving_replayed':True,'all_word_consumption_and_observable_replayed':True,'sha256':sha(R/f'reproduce-process-{n}.json')})
rows=[]
for case in prep['cases']:
 c=case['comparison'];row={'archived':c,'frame_inputs':{k:case[k] for k in ('xs','ys','seed','k','mode')},'fresh_processes':[]}
 if c['host']=='node':
  row['fresh_processes']=[{'process':i+1,**paired(d,c['frame'],c['reference'],c['current'],c['boundary'])} for i,d in enumerate(processes)]
  ratios=[x['ratio_reference_over_current'] for x in row['fresh_processes']]
  row['reproduction_status']='loss_point_direction_all_three_processes' if all(x<1 for x in ratios) else 'not_consistent_across_three_processes'
 else:row['reproduction_status']='pending_actual_browser';row['node_not_browser_proxy']=True
 rows.append(row)
pairs=[('prior_js_owned','checked_js_owned'),('prior_js_owned','control_no_padding_js_owned'),('control_no_padding_js_owned','checked_js_owned'),('checked_js_owned','control_no_pluszero_js_owned'),('expert_js_owned','checked_js_owned'),('prior_wasm_prepared','checked_wasm_prepared'),('prior_novec_wasm_prepared','checked_novec_wasm_prepared'),('checked_wasm_prepared','checked_novec_wasm_prepared'),('prior_wasm_prepared','prior_novec_wasm_prepared'),('prior_wasm_full','checked_wasm_full')]
for frame in frame_order:
 for ref,cur in pairs:groups.append({'frame':frame,'reference':ref,'current':cur,'processes':[{'process':i+1,**paired(d,frame,ref,cur)} for i,d in enumerate(processes)]})
profiles=[]
for version in ('prior','checked'):
 log=(R/f'{version}-js.log').read_text();cp=read(R/f'profiles/{version}-js.cpuprofile');counts=collections.Counter(cp['samples']);nodes={x['id']:x for x in cp['nodes']}
 functions=collections.Counter()
 for id_,n in counts.items():functions[nodes[id_]['callFrame']['functionName']]+=n
 profiles.append({'version':version,'primary_deopt_events':[line for line in log.splitlines() if 'bailout' in line and '__fn0' in line],'cpu_sample_total':len(cp['samples']),'cpu_samples_by_function':dict(functions),'limits':'Whole-process instrumented samples include startup/validation/warmup. Sample counts are not uninstrumented speed ratios; GC sample count does not establish allocation cause.'})
findings=[
 'Eight of eleven Node loss cells retain a point-estimate loss in all three fresh processes. The low32 resident case and both full-call cases cross direction; original archived results remain preserved.',
 'At large extents the paired module-wide no-vectorizer intervention often reverses the resident-Wasm fusion loss. Both original versions contain vectorized loops. This demonstrates compilation-transformation sensitivity, not a universal SIMD failure or a recommendation to disable vectorization globally.',
 'Archived fused JS loses at high4096/high65536 in both orientations despite fewer arrays/traversals. Staged no-padding controls stay closer to prior. Their Function/sloppy compilation context and renamed function differ from archived strict ESM, so a matched unchanged-clone baseline is needed before single-factor causal attribution.',
 'Removing four neutral +0 additions does not consistently resolve JS losses. Existing helper bodies are already inlined in generated source.',
 'Checked JS has fewer observed primary deoptimization events (1 versus 11) in the instrumented representative profiles. More checked deoptimizations is not supported. Exact JIT mechanism remains unresolved.',
 'Static LLVM and printed V8 Wasm code expose integer division/remainder and mixed scalar/vector code. Instruction sites are not dynamic operation counts or cycle measurements.',
 'Nine browser cells remain pending actual-browser reproduction. Node profiles do not establish browser-engine causality; no classified native loss was present in the archived batch.'
]
limits=['Fresh bootstrap intervals are conditional on nine within-process paired rounds, without multiplicity correction. Three process point estimates are separately retained; 27 rounds are not treated as 27 independent processes.','Only archived loss frames were diagnosed; results are not general speed claims.','No additional diagnostic timing beyond frozen plan; instrumented timings excluded.','Source-control compilation-context confound unresolved; no exact single-instruction cause or general planner cost model justified.','No native profiling/reproduction was performed; native static compiler remarks are not timing evidence.']
bindings={str(p.relative_to(B)):sha(p) for p in [R/'readiness.json',R/'preparation.json',R/'profiling-plan.json',R/'profiling-commands.json',R/'static-summary.json',R/'validate-controls.json',*sorted(R.glob('reproduce-process-*.json')),*sorted(R.glob('profile-*.json')),*sorted(R.glob('*-js.log')),*sorted(R.glob('*-wasm.log')),*sorted((R/'profiles').glob('*')),pathlib.Path(__file__)]}
result={'status':'provisional_node_complete_browser_pending','cost_model_changes_performed':False,'archived_case_counts':{'node':11,'browser':9},'fresh_processes':audit,'original_cases':rows,'all_fixed_control_pairs':groups,'instrumented_profiles':profiles,'findings':findings,'limits':limits,'bindings':bindings}
(R/'diagnosis-before-costmodel.json').write_text(json.dumps(result,indent=2)+'\n')
lines=['# Batch38 regression diagnosis before planner changes','',*findings,'','## Fresh Node cases','','Ratios are prior/checked; values below 1 favor prior. Intervals and all controls are retained in the JSON. Browser cases remain pending.','','| Frame | Boundary | Three fresh process ratios | Reproduction |','|---|---|---|---|']
for row in rows:
 if row['fresh_processes']:lines.append('| '+row['archived']['frame'].replace('pipeline38_','')+' | '+row['archived']['boundary']+' | '+', '.join(f"{x['ratio_reference_over_current']:.4f}" for x in row['fresh_processes'])+' | '+row['reproduction_status']+' |')
lines+=['','## Limits','',*limits]
(R/'diagnosis-before-costmodel.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'status':result['status'],'samples':2079,'cases':20,'node_cases_replayed':11,'browser_cases_pending':9,'controls':len(groups),'primary_deopts':[len(x['primary_deopt_events']) for x in profiles]}))
