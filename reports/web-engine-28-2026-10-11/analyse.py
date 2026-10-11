from pathlib import Path
import json,math,statistics,random,hashlib
R=Path(__file__).resolve().parent
sources={'node':'node-results.json','browser':'browser-results.json','native':'native/results28.json','gpu':'gpu-performance/results.json','context':'context-performance/timing.json','owned-node':'owned-js-control/node-results.json','owned-browser':'owned-js-control/browser-results.json'}
raw={h:json.loads((R/p).read_text()) for h,p in sources.items()}
groups={}
for host,d in raw.items():
 assert d['status']=='passed'
 for row in d['samples']:
  assert math.isfinite(row['ns_per_call']) and row['ns_per_call']>0 and row['iterations']>0
  key=(host,row.get('name',row.get('task')),row['frame'],row.get('boundary','captured'))
  rounds=groups.setdefault(key,{}).setdefault(row['variant'],{})
  assert row['round'] not in rounds
  rounds[row['round']]=row
for variants in groups.values():
 for rounds in variants.values():assert set(rounds)==set(range(9))
comparisons=[]
rng=random.Random(2026112803)
cohorts={
 'node':[('baseline_js_owned','current_js_owned'),('baseline_wasm_captured','current_wasm_captured'),('current_js_owned','current_js_into'),('js_expert_into','current_js_into'),('rust_wasm_prepared','current_wasm_prepared'),('rust_wasm_captured','current_wasm_captured')],
 'browser':[('baseline_js_owned','current_js_owned'),('baseline_wasm_captured','current_wasm_captured'),('current_js_owned','current_js_into'),('js_expert_into','current_js_into'),('rust_wasm_prepared','current_wasm_prepared'),('rust_wasm_captured','current_wasm_captured')],
 'native':[('baseline','current-owned'),('current-owned','current-into'),('rust-expert','current-into')],
 'gpu':[('js_expert_full','current_gpu_requested'),('rust_wasm_expert_full','current_gpu_requested'),('js_original_full','current_js_full'),('js_expert_full','current_js_full'),('rust_wasm_expert_full','current_wasm_full')],
 'owned-node':[('expert_js_owned','current_js_owned')],
 'owned-browser':[('expert_js_owned','current_js_owned')],
 'context':[('literal_javascript','selected_javascript'),('literal_cpu','selected_cpu')]
}
# Boundaries are part of group identity. Owned-vs-destination allocation
# comparisons deliberately cross only explicitly listed web cohorts.
for host,pairs in cohorts.items():
 cells={}
 for (h,name,frame,boundary),vs in groups.items():
  if h==host:
   merged=cells.setdefault((name,frame),{})
   for variant,rounds in vs.items():merged[variant]=(boundary,rounds)
 for (name,frame),vs in sorted(cells.items()):
  for reference,current in pairs:
   if reference not in vs or current not in vs:continue
   if host=='native' and reference=='current-owned' and current=='current-into' and name=='helper_ordered_checksum_u32':continue
   # Native resident and snapshot retain distinct comparisons.
   boundaries=sorted({k[3] for k in groups if k[:3]==(host,name,frame)}) if host=='native' else [None]
   for native_boundary in boundaries:
    a,b=(groups[(host,name,frame,native_boundary)][v] for v in [reference,current]) if native_boundary else (vs[v][1] for v in [reference,current])
    logs=[math.log(a[i]['ns_per_call']/b[i]['ns_per_call']) for i in range(9)]
    boots=sorted(math.exp(math.fsum(rng.choices(logs,k=9))/9) for _ in range(4000))
    ratio=math.exp(math.fsum(logs)/9);lo,hi=boots[100],boots[3899]
    comparisons.append(dict(host=host,name=name,frame=frame,size=b[0]['size'],reference=reference,current=current,boundary=native_boundary or vs[current][0],reference_boundary=native_boundary or vs[reference][0],ratio=ratio,ci95=[lo,hi],classification='win' if lo>1 else 'loss' if hi<1 else 'uncertain',reference_ns=statistics.median(x['ns_per_call'] for x in a.values()),current_ns=statistics.median(x['ns_per_call'] for x in b.values())))
aggregates=[]
for key in sorted({(x['host'],x['reference'],x['current'],x['boundary']) for x in comparisons}):
 rows=[x for x in comparisons if (x['host'],x['reference'],x['current'],x['boundary'])==key]
 for size in ['all',32,65536]:
  subset=rows if size=='all' else [x for x in rows if x['size']==size]
  if not subset:continue
  aggregates.append(dict(host=key[0],reference=key[1],current=key[2],boundary=key[3],size=size,cells=len(subset),geomean_ratio=math.exp(statistics.mean(math.log(x['ratio']) for x in subset)),range=[min(x['ratio'] for x in subset),max(x['ratio'] for x in subset)],classifications={c:sum(x['classification']==c for x in subset) for c in ['win','loss','uncertain']}))
summary={'status':'passed','samples':sum(len(d['samples']) for d in raw.values()),'groups':len(groups),'protocol':'ratios reference/current; greater than1 is faster current; per-cell95% paired-round bootstrap4000 resamples; descriptive equal-cell geometric aggregates; no cross-host raw-time claims','bindings':{p:hashlib.sha256((R/p).read_bytes()).hexdigest() for p in sources.values()},'comparisons':comparisons,'aggregates':aggregates}
(R/'analysis.json').write_text(json.dumps(summary,indent=2)+'\n')
for x in aggregates:
 if x['size']=='all':print(x['host'],x['reference'],'/',x['current'],x['boundary'],f"{x['geomean_ratio']:.3f}x",x['cells'],x['classifications'])
print('samples',summary['samples'])
