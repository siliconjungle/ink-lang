"""Replay frozen matched ESM evidence, never execute or time a kernel."""
import pathlib,json,hashlib,math,random,re,collections,itertools
B=pathlib.Path(__file__).resolve().parents[3];R=pathlib.Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();read=lambda p:json.loads(p.read_text())
ready=read(R/'matched-esm-readiness.json');plan=read(R/'matched-esm-plan.json');commands=read(R/'matched-esm-commands.json');manifest=read(R/'matched-esm-manifest.json');validation=read(R/'matched-esm-validation.json')
for p,h in ready['bindings'].items():assert sha(B/p)==h,p
assert commands['status']=='passed' and len(commands['commands'])==7
assert commands['plan_sha256']==sha(R/'matched-esm-plan.json') and commands['readiness_sha256']==sha(R/'matched-esm-readiness.json')
for a,b in zip(commands['commands'],plan['commands']):
 assert a['argv']==b['argv'] and a['exit_code']==0;assert a['log_sha256']==sha(R/(a['name']+'.log'))
assert len(validation['validation'])==24 and len(validation['allocation_validation'])==16 and not validation['samples']
for row in manifest['rows']:
 original=(B/row['original_path']).read_text();current=(B/row['path']).read_text();assert sha(B/row['path'])==row['sha256'];assert current.split('function __fn1',1)[1]==original.split('function __fn1',1)[1]
 if 'clone' in row['variant']:assert current==original
 assert current.startswith('function __fn0(')
for row in validation['allocation_validation']:
 n=4096 if row['frame'].endswith('-4096') else 65536;assert row['common_capture_typed_array_copies']==2
 expected=3 if 'no_padding' in row['variant'] else 4 if 'prior' in row['variant'] else 1
 assert row['primary_array_constructors']==expected
 assert sum(row['capacities'])==row['total_primary_array_elements']
fixtures={f['id']:f for f in read(B/'reports/web-stack-proofs-38-2026-10-11/targets/fixtures.json')['frames']}
processes=[];audits=[]
for i in range(1,4):
 d=read(R/f'matched-reproduce-process-{i}.json');assert d['status']=='passed' and not d['execArgv'] and not d['profiling_overhead_included'] and d['mode']=='reproduce'
 assert d['harness_sha256']==sha(B/'bench/diagnose-pipeline38.matched.mjs') and d['manifest_sha256']==sha(R/'matched-esm-manifest.json')
 assert len(d['samples'])==216 and len(d['validation'])==24 and len(d['warmups'])==1536
 state=int(d['argv']['seed'])&0xffffffff
 def rng():
  global state
  state^=(state<<13)&0xffffffff;state^=state>>17;state^=(state<<5)&0xffffffff;state&=0xffffffff;return state
 observable=0;order=[]
 for frame in plan['frames']:
  names=plan['variants'];f=fixtures[frame]
  for name in names:
   assert len([x for x in d['validation'] if x['frame']==frame and x['variant']==name and x['complete_output'] and x['nonmutation'] and x['owned_changed_input_lifetime']])==1
   assert [x['iteration'] for x in d['warmups'] if x['frame']==frame and x['variant']==name]==list(range(64))
   observable=(observable+f['web_consumption_code']*64)&0xffffffff
   rows=[x for x in d['calibration'] if x['frame']==frame and x['variant']==name]
   assert [x['iterations'] for x in rows]==[1<<k for k in range(len(rows))]
   assert all(x['elapsed_ms']<8 and x['iterations']<65536 for x in rows[:-1])
   assert rows[-1]['elapsed_ms']>=8 or rows[-1]['iterations']>=65536
   assert all(x['iterations']==rows[-1]['iterations'] for x in d['samples'] if x['frame']==frame and x['variant']==name)
  for round_ in range(9):
   shuffled=names[:]
   for k in range(len(shuffled)-1,0,-1):
    j=rng()%(k+1);shuffled[k],shuffled[j]=shuffled[j],shuffled[k]
   order.extend((frame,round_,name) for name in shuffled)
 assert order==[(x['frame'],x['round'],x['variant']) for x in d['samples']]
 for x in d['calibration']+d['samples']:
  f=fixtures[x['frame']];assert x['consumed_elements']==x['iterations']*len(f['expected'])
  assert int(x['checksum'])==(f['web_consumption_code']*x['iterations'])&0xffffffff
  assert math.isclose(x['ns_per_call'],x['elapsed_ms']*1e6/x['iterations'],rel_tol=1e-12)
  observable=(observable+int(x['checksum']))&0xffffffff
 assert observable==d['observable']
 processes.append(d);audits.append({'process':i,'samples':216,'groups':24,'validations':24,'warmups':1536,'calibration_rows':len(d['calibration']),'checksum_observable_interleaving_calibration_replayed':True})
def paired(d,frame,a,b):
 aa={x['round']:x['ns_per_call'] for x in d['samples'] if x['frame']==frame and x['variant']==a};bb={x['round']:x['ns_per_call'] for x in d['samples'] if x['frame']==frame and x['variant']==b}
 assert set(aa)==set(bb)==set(range(9));logs=[math.log(aa[k]/bb[k]) for k in range(9)]
 seed=int.from_bytes(hashlib.sha256(f"39/matchedESM/{d['argv']['seed']}/{frame}/{a}/{b}".encode()).digest()[:8],'big');r=random.Random(seed);draws=sorted(math.exp(sum(logs[r.randrange(9)] for _ in range(9))/9) for _ in range(4000));ci=[draws[100],draws[3899]]
 return {'ratio_reference_over_current':math.exp(sum(logs)/9),'ci95_within_process':ci,'classification_within_process':'slower' if ci[1]<1 else 'faster' if ci[0]>1 else 'uncertain','bootstrap_seed':seed,'draws':4000,'paired_rounds':9}
comparisons=[]
for frame in plan['frames']:
 for a,b in itertools.combinations(plan['variants'],2):comparisons.append({'frame':frame,'reference':a,'current':b,'processes':[{'process':i+1,**paired(d,frame,a,b)} for i,d in enumerate(processes)]})
profiles=[]
for c in commands['commands']:
 if c['kind']!='instrumented_profile':continue
 log=(R/(c['name']+'.log')).read_text();d=read(R/(c['name']+'.json'));assert d['profiling_overhead_included'] and not d['samples'] and len(d['profile_calls'])==1
 f=fixtures[d['profile_calls'][0]['frame']];assert d['observable']==(f['web_consumption_code']*(256+64))&0xffffffff
 chunks=re.split(r'(?=--- Optimized code ---)',log)[1:];records=[]
 for chunk in chunks:
  text=chunk.split('--- End code ---',1)[0]
  assert 'name = __fn0' in text
  lines=text.splitlines();instruction_part=text.split('Source positions:',1)[0]
  records.append({'optimization_id':int(re.search(r'optimization_id = (\d+)',text)[1]),'kind':re.search(r'kind = (\S+)',text)[1],'instruction_bytes':int(re.search(r'Instructions \(size = (\d+)\)',text)[1]),'inlined_functions':int(re.search(r'Inlined functions \(count = (\d+)\)',text)[1]),'static_instruction_sites':{op:len(re.findall(r'\b'+op+r'\b',instruction_part)) for op in ['fdiv','udiv','sdiv','fcvtzs','fcvtzu','bl','blr']},'printed_code_sha256':hashlib.sha256(text.encode()).hexdigest()})
 assert records and records[-1]['kind']=='TURBOFAN_JS'
 deopts=[x for x in log.splitlines() if 'bailout' in x and '<JSFunction __fn0 ' in x]
 profiles.append({'variant':d['profile_calls'][0]['variant'],'code_versions':records,'last_printed_optimized_code':records[-1],'primary_deopt_events':deopts,'primary_deopt_count':len(deopts),'tier_events':[x for x in log.splitlines() if 'completed compiling' in x and '<JSFunction __fn0 ' in x],'instrumented_times_excluded':True,'limits':'Last printed TurboFan code confirms available tier, not continuous residency during every uninstrumented batch. Instruction sites and code size are not dynamic counts or causal cycle evidence.'})
selected=[x for x in comparisons if (x['reference'],x['current']) in [('prior_original_esm','prior_unchanged_clone_esm'),('checked_original_esm','checked_unchanged_clone_esm'),('prior_unchanged_clone_esm','checked_unchanged_clone_esm'),('prior_unchanged_clone_esm','prior_no_padding_esm'),('prior_no_padding_esm','checked_unchanged_clone_esm'),('checked_unchanged_clone_esm','checked_no_pluszero_esm')]]
findings=[
 'Matched strict ESM fused-versus-staged comparisons remain adverse in all four high-value fixtures across all three fresh processes. Source names/strictness/helpers/exports/rest-module bytes are preserved; the former Function/sloppy confound is removed.',
 'Unchanged original-versus-clone controls show process/path context variation (all point ratios retained); they are not assumed identically timed simply because their bytes match.',
 'Removing the primary concat allocation/copy loops reduces staged arrays4→3, while fused output uses1. The no-padding staged code still beats fused code on all12 fixture/process point estimates. Extra checked allocation or padding-copy cost cannot explain these specific losses.',
 'Four neutral-addition removal has mixed effects and does not consistently close the fused gap. No general neutral-addition speed claim is supported.',
 'All four representative profiled primaries reach TurboFan. Last printed primary code has0 JIT-inlined functions because scalar helpers were already source-inlined. Staged profiles have more observed primary deopts; missing helper inlining, lack of checked top-tier code, and more checked primary deopts are unsupported explanations.',
 'The controlled result localizes these Node losses to staging/fusion of the scalar arithmetic pipeline under these fixtures. Exact causal machine instruction, array representation, scheduling or register-pressure mechanism remains unknown; printed static instructions do not isolate it.',
 'No supplemental actual-browser timing ran. Browser nine-case results and Node/Wasm diagnostic receipts remain separately preserved. No production, cost-model or canonical edits were made by this lane.'
]
limits=['Three fresh process estimates retained separately;4000-draw intervals condition on9within-process pairs without multiplicity correction. No27-round independent-process inference.','Six variants execute in seeded interleaving in each process; callsite feedback/order and module URL effects remain measured by no-op baselines rather than assumed absent.','Untimed counted constructors establish primary allocation counts only; they omit engine-internal allocations and are not performance profiles.','Instrumented profile validation/startup/warmup are part of logs; timing ratios use only uninstrumented processes.','Retain exact JIT cause unknown. No universal fusion penalty or source-pattern/hash-specific cost-model rule follows from four selected archived regression fixtures.']
files=[pathlib.Path(__file__),R/'matched-esm-readiness.json',R/'matched-esm-plan.json',R/'matched-esm-commands.json',R/'matched-esm-validation.json',R/'diagnosis-twenty-before-costmodel.json',*sorted(R.glob('matched-profile-*.log')),*sorted(R.glob('matched-profile-*.json')),*sorted(R.glob('matched-reproduce-process-*.json')),*sorted(R.glob('matched-reproduce-process-*.log'))]
result={'status':'passed','timers_complete':True,'process_audits':audits,'samples':648,'groups':72,'all_control_pair_cells':comparisons,'control_pair_cells':60,'within_process_comparisons':180,'allocation_validation':validation['allocation_validation'],'profile_evidence':profiles,'findings':findings,'limits':limits,'bindings':{str(p.relative_to(B)):sha(p) for p in files}}
(R/'matched-esm-analysis.json').write_text(json.dumps(result,indent=2)+'\n')
lines=['# Matched ESM regression follow-up','',*findings,'','Ratios are reference/current; below1 favors reference. All15 pair orientations per frame are retained in JSON.','','| Fixture | Pair | Three fresh process ratios |','|---|---|---|']
for x in selected:lines.append('| '+x['frame'].replace('pipeline38_','')+' | '+x['reference']+' / '+x['current']+' | '+', '.join(f"{p['ratio_reference_over_current']:.4f}" for p in x['processes'])+' |')
lines+=['','## Profile evidence','']
for x in profiles:lines.append(f"{x['variant']}: last printed {x['last_printed_optimized_code']['kind']} primary has{x['last_printed_optimized_code']['instruction_bytes']} instruction bytes, {x['primary_deopt_count']} observed primary deopts and{x['last_printed_optimized_code']['inlined_functions']} JIT-inlined functions. Helpers already appear inline in source. Static code size/counts do not establish cause.")
lines+=['','## Limits','',*limits]
(R/'matched-esm-analysis.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'status':'passed','samples':648,'comparisons':180,'profile_last_sizes':[(x['variant'],x['last_printed_optimized_code']['instruction_bytes'],x['primary_deopt_count']) for x in profiles]}))
