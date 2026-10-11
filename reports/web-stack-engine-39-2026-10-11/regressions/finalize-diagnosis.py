"""Audit actual-browser journals and complete all20 archived cases, without timing."""
import pathlib,json,hashlib,math,random,collections
B=pathlib.Path(__file__).resolve().parents[3];R=pathlib.Path(__file__).resolve().parent;P=B/'reports/web-stack-proofs-38-2026-10-11/targets'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();read=lambda p:json.loads(p.read_text())
node=read(R/'diagnosis-before-costmodel.json');d=read(R/'browser-reproduce-process-1.json');fixtures={f['id']:f for f in read(P/'fixtures.json')['frames']}
assert d['status']=='passed' and d['actual_browser'] and d['mode']=='reproduce'
assert d['metadata_sha256']==sha(P/'metadata.json') and d['harness_sha256']==sha(B/'bench/diagnose-pipeline38.browser.mjs')
assert d['protocol']=={'rounds':9,'warmups':64,'seed':2026113901,'target_ms':8,'max_iterations':65536}
assert len(d['validation'])==26 and len(d['samples'])==234 and len(d['warmups'])==1664
meta=read(P/'metadata.json')
for p,h in meta['bindings'].items():assert sha(P/p)==h,p
for p,h in node['bindings'].items():assert sha(B/p)==h,p
original=[x['archived'] for x in node['original_cases'] if x['archived']['host']=='browser']
assert len(original)==9
for a,b in zip(original,d['original_browser_regressions']):
 for key in ['frame','boundary','reference','current','host','classification']:assert a[key]==b[key]
 assert math.isclose(a['ratio_reference_over_current'],b['ratio_reference_over_current'],rel_tol=1e-14)
state=d['protocol']['seed']&0xffffffff

def rng():
 global state
 state^=(state<<13)&0xffffffff;state^=state>>17;state^=(state<<5)&0xffffffff;state&=0xffffffff;return state
expected_order=[];observable=0
for frame in dict.fromkeys(x['frame'] for x in d['validation']):
 names=[x['variant'] for x in d['validation'] if x['frame']==frame]
 for name in names:
  v=[x for x in d['validation'] if x['frame']==frame and x['variant']==name][0]
  assert v['passed'] and v['complete_output'] and v['nonmutation']
  if not name.endswith('prepared'):assert v['owned_changed_input_lifetime']
  assert [x['iteration'] for x in d['warmups'] if x['frame']==frame and x['variant']==name]==list(range(64))
  rows=[x for x in d['calibration'] if x['frame']==frame and x['variant']==name]
  assert [x['iterations'] for x in rows]==[1<<i for i in range(len(rows))]
  assert all(x['elapsed_ms']<8 and x['iterations']<65536 for x in rows[:-1])
  assert rows[-1]['elapsed_ms']>=8 or rows[-1]['iterations']>=65536
  assert all(x['iterations']==rows[-1]['iterations'] for x in d['samples'] if x['frame']==frame and x['variant']==name)
 for round_ in range(9):
  order=names[:]
  for i in range(len(order)-1,0,-1):
   j=rng()%(i+1);order[i],order[j]=order[j],order[i]
  expected_order.extend((frame,round_,name) for name in order)
assert expected_order==[(x['frame'],x['round'],x['variant']) for x in d['samples']]
for x in d['calibration']+d['samples']:
 f=fixtures[x['frame']];code=(len(f['expected'])+sum((i+1)*v for i,v in enumerate(f['expected'])))&0xffffffff
 assert code==f['web_consumption_code'];assert int(x['checksum'])==(code*x['iterations'])&0xffffffff
 assert x['consumed_elements']==len(f['expected'])*x['iterations']
 assert math.isclose(x['ns_per_call'],x['elapsed_ms']*1e6/x['iterations'],rel_tol=1e-12)
 observable=(observable+int(x['checksum']))&0xffffffff
assert observable==d['observable']
def pair(frame,ref,cur,boundary=None):
 a={x['round']:x['ns_per_call'] for x in d['samples'] if x['frame']==frame and x['variant']==ref and (not boundary or x['boundary']==boundary)}
 b={x['round']:x['ns_per_call'] for x in d['samples'] if x['frame']==frame and x['variant']==cur and (not boundary or x['boundary']==boundary)}
 assert set(a)==set(b)==set(range(9))
 logs=[math.log(a[i]/b[i]) for i in range(9)];seed=int.from_bytes(hashlib.sha256(f'39/actualbrowser/{frame}/{ref}/{cur}/{boundary}'.encode()).digest()[:8],'big');r=random.Random(seed)
 draws=sorted(math.exp(sum(logs[r.randrange(9)] for _ in range(9))/9) for _ in range(4000));ci=[draws[100],draws[3899]]
 return {'ratio_reference_over_current':math.exp(sum(logs)/9),'ci95_within_process':ci,'classification_within_process':'slower' if ci[1]<1 else 'faster' if ci[0]>1 else 'uncertain','bootstrap_seed':seed,'draws':4000,'rounds':9}
rows=node['original_cases']
for row in rows:
 c=row['archived']
 if c['host']=='browser':
  row['fresh_actual_browser']=pair(c['frame'],c['reference'],c['current'],c['boundary']);row['reproduction_status']='single_actual_browser_run_loss' if row['fresh_actual_browser']['ratio_reference_over_current']<1 else 'single_actual_browser_run_direction_reversal';row.pop('node_not_browser_proxy',None)
 row['causal_explanation']='Resident-Wasm module-wide vectorizer control supplies transformation-sensitivity evidence; exact machine cause remains unisolated.' if 'prepared' in c['current'] else 'Full-call includes capture/packing/owned output/consumer, so small ratios can change with boundary overhead and noise; exact cause unisolated.' if 'full' in c['current'] else 'Observed JS fusion/source-shape slowdown; exact JIT cause unknown pending matched ESM controls.'
controls=[]
for frame in dict.fromkeys(x['frame'] for x in d['validation']):
 if any(x['frame']==frame and x['variant']=='prior_novec_wasm_prepared' for x in d['samples']):
  for ref,cur in [('prior_wasm_prepared','checked_wasm_prepared'),('prior_novec_wasm_prepared','checked_novec_wasm_prepared'),('checked_wasm_prepared','checked_novec_wasm_prepared'),('prior_wasm_prepared','prior_novec_wasm_prepared')]:controls.append({'frame':frame,'reference':ref,'current':cur,**pair(frame,ref,cur)})
findings=node['findings'][:-1]+['Actual Chrome154 reproduction completed all nine browser loss cells at exact original full/resident/JS boundaries. Every fresh ratio and within-process interval is retained; one browser process does not establish independent-process certainty or V8 causes universal to other browsers.']
counts=collections.Counter(row['fresh_actual_browser']['classification_within_process'] for row in rows if 'fresh_actual_browser' in row)
result={'status':'completed_twenty_case_diagnosis_before_costmodel','costmodel_changes_by_this_lane':False,'node_provisional_receipt_sha256':sha(R/'diagnosis-before-costmodel.json'),'original_cases':rows,'node_control_pairs':node['all_fixed_control_pairs'],'browser_control_pairs':controls,'browser_audit':{'status':'passed','validation':26,'groups':26,'samples':234,'warmups':1664,'calibration_rows':len(d['calibration']),'all_word_consumption':True,'interleaving_replayed':True,'observable_replayed':True,'original_cases':9,'classification_counts':dict(counts),'host':d['host']},'findings':findings,'limits':node['limits']+['Actual browser has one fresh process, with nine paired within-process rounds; lack of independent-browser-process replication and multiplicity correction remains explicit.','No assertion that every regression has a fully isolated cause. Diagnosis supports preserving staged candidates and measuring selection; it does not justify case-hash whitelists.'],'bindings':{str(p.relative_to(B)):sha(p) for p in [R/'diagnosis-before-costmodel.json',R/'browser-reproduce-process-1.json',B/'bench/diagnose-pipeline38.browser.mjs',pathlib.Path(__file__),R/'browser-reproduction.jpg'] if p.exists()}}
(R/'diagnosis-twenty-before-costmodel.json').write_text(json.dumps(result,indent=2)+'\n')
lines=['# Complete twenty-case diagnosis before cost-model changes','',*findings,'','All original losses remain preserved. Fresh ratios are prior/checked; below1 favors prior.','','| Host | Frame | Boundary | Fresh ratio(s) | Fresh classification |','|---|---|---|---|---|']
for row in rows:
 c=row['archived'];fresh=row.get('fresh_processes') or [row['fresh_actual_browser']]
 lines.append('| '+c['host']+' | '+c['frame'].replace('pipeline38_','')+' | '+c['boundary']+' | '+', '.join(f"{x['ratio_reference_over_current']:.4f}" for x in fresh)+' | '+', '.join(x['classification_within_process'] for x in fresh)+' |')
lines+=['','## Limits','',*result['limits']]
(R/'diagnosis-twenty-before-costmodel.md').write_text('\n'.join(lines)+'\n')
print(json.dumps({'status':result['status'],'browser_classifications':dict(counts),'browser_ratios':[round(x['fresh_actual_browser']['ratio_reference_over_current'],4) for x in rows if 'fresh_actual_browser' in x]}))
