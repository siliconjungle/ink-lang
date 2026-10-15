"""Derive a complete current comparison without pooling old implementation epochs."""
from pathlib import Path
import json,statistics
D=Path(__file__).resolve().parent
cohort=json.loads((D/'cohort.json').read_text())
PROCESSES=[1001,1002,1003]
def measurement(workload,size,lane):
 return next(r for r in cohort['measurements']if (r['workload'],r['size'],r['lane'])==(workload,size,lane))
def pair(label,workload,size,ink,frontier,scope):
 a=measurement(workload,size,ink);b=measurement(workload,size,frontier)
 ratios={p:b['process_medians_ns'][p]/a['process_medians_ns'][p]for p in map(str,PROCESSES)}
 return dict(label=label,workload=workload,size=size,ink_lane=ink,frontier_lane=frontier,ink_ns=a['median_ns_per_call'],frontier_ns=b['median_ns_per_call'],frontier_over_ink=b['median_ns_per_call']/a['median_ns_per_call'],process_ratios=ratios,scope=scope)
pairs=[
 pair('Ordinary row updates','replace',4096,'ink-js','frontier-state-main-patch','Input capture, result/events/version and acknowledgement included'),
 pair('Prepared row updates','replace',4096,'ink-js-prepared','frontier-state-main-prepared-patch','Input capture/preparation excluded for both; setup separately recorded'),
 pair('Mixed state operations','mixed',4096,'ink-js','frontier-state-main-patch','Fixed mix of updates, failures, removals and total queries'),
 pair('Read-heavy state operations','read-heavy',4096,'ink-js','frontier-state-main-patch','Fixed mix of two updates and seven total queries per cycle'),
 pair('Known retained immutable JSON edit','known-edit-immutable',512,'ink-js-compiled-json-set','frontier-immutable-known-patch','Prepared representations; unchanged subtrees may be shared; API-return timing with complete-value preflight'),
 pair('Known fully detached JSON edit','known-edit-detached',512,'ink-js-owned-json-set','frontier-owned-known-patch','Complete mutable results detached from caller inputs; alias-disjointness preflight'),
 pair('JSON text parse/edit/return string','json-text-input-edit-text-output',512,'ink-json-text-pipeline','frontier-json-text-known-edit','Returned string length consumed; deferred flattening may remain'),
 pair('JSON text parse/edit/UTF-8 output','json-text-input-edit-utf8-output',512,'ink-json-text-pipeline','frontier-json-text-known-edit','UTF-8 encoding and digest of every output byte included'),
 pair('Explicit indexed plan, row updates','replace',4096,'ink-js-db-indexed','frontier-state-main-patch','Manually supplied checked database alternative; not default selection'),
 pair('Explicit indexed plan, read-heavy','read-heavy',4096,'ink-js-db-indexed','frontier-state-main-patch','Manually supplied checked database alternative; not default selection'),
]
lifecycle=[];bindings=None
for process in PROCESSES:
 r=json.loads((D/'raw'/f'lifecycle-{process}.json').read_text())
 current={k:r['provenance'][k]for k in ['hashes','revisions','target','node']}
 if bindings is None:bindings=current
 elif bindings!=current:raise ValueError('lifecycle implementation epoch changed')
 if any(not row['verified']for row in r['measurements']):raise ValueError('unverified lifecycle')
 lifecycle.extend(r['measurements'])
footprint=[]
for scenario in ['json-tree','state','transport','transport-compact']:
 row=dict(scenario=scenario)
 for lane in ['ink','frontier']:
  selected=[x for x in lifecycle if x['scenario']==scenario and x['lane']==lane]
  assert len(selected)==3
  row[lane]=dict(heap_delta_bytes=statistics.median(x['retained_delta_bytes']['heapUsed']for x in selected),owned_buffer_bytes=selected[0]['retained_buffer_bytes'],retained_phase_peak_rss_bytes=statistics.median(x['retained_phase_peak_rss_bytes']for x in selected),initialise_or_parse_retain_ns=statistics.median(int(x['retain_ns'])for x in selected))
 footprint.append(row)
result=dict(schema=1,verdict='Mixed: Ink wins retained/shared JSON edits and query-heavy state; Frontier wins ordinary/prepared updates and complete JSON text pipelines',processes=PROCESSES,pairs=pairs,lifecycle=footprint,aggregation=cohort['aggregation'],scope='Current compiled JavaScript on Node 26.1.0 arm64; shared host, three fresh cohorts, nine rotated rounds; no general or causal V8 speedup claim',limits=cohort['limits']+['Prepared/retained input and ownership contracts labelled separately','UTF-8 pipeline consumes all bytes; string-return and codec diagnostics have shallower timed consumers','Forced-GC heap deltas and shared-runtime RSS are diagnostics, not allocation counts or statistical memory bounds','Fresh comparison against unchanged Frontier controls; not a before/after V8 attribution experiment'])
(D/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
for row in pairs:print(f"{row['label']}: Ink {row['ink_ns']/1000:.3f} us; Frontier {row['frontier_ns']/1000:.3f} us; Frontier/Ink {row['frontier_over_ink']:.3f}")
