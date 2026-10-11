"""Describe recorded instrumented spans without rerunning calls or adding nested times."""
from pathlib import Path
import json,hashlib,statistics,collections,math
B=Path(__file__).resolve().parents[3];R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def union(intervals):
 intervals=sorted(intervals);end=None;covered=0.
 for a,b in intervals:
  if end is None or a>end:covered+=b-a;end=b
  elif b>end:covered+=b-end;end=b
 return covered
def median(values):return statistics.median(values)
raw=R/'attribution-results.json';j=json.loads(raw.read_text());audit=R/'attribution-audit.json';a=json.loads(audit.read_text());assert a['status']=='passed'and a['bindings'][str(raw.relative_to(B))]==sha(raw)
assert len(j['rows'])==252 and len(j['warmups'])==84 and j['actual_gpu_calls']==112 and j['excluded_from_performance_comparisons']
rows=[];parents=collections.Counter();zero_spans=0;span_count=0
for row in j['rows']:
 exclusive=collections.defaultdict(float);inclusive=collections.defaultdict(float);spans=row['spans']
 for s in spans:
  span_count+=1;zero_spans+=s['elapsed_ms']==0
  children=[c for c in spans if c['parent']==s['id']]
  for c in children:assert s['start']<=c['start']<=c['end']<=s['end']
  remainder=s['elapsed_ms']-union([(c['start'],c['end'])for c in children]);assert remainder>=-1e-7
  exclusive[s['name']]+=max(0,remainder);inclusive[s['name']]+=s['elapsed_ms']
  if s['name']=='unpack':parents[(row['version'],row['requested'],'inside_cpu_total'if s['parent']is not None and spans[s['parent']]['name']=='cpu-total'else'outside_cpu_total')]+=1
 coverage=union([(s['start'],s['end'])for s in spans]);assert abs(coverage-sum(exclusive.values()))<1e-7;assert coverage<=row['return_ms']+1e-7
 rows.append({**{k:row[k]for k in ['frame','layout','version','requested','round','total_ms','return_ms','consumer_ms']},'exclusive_ms':dict(exclusive),'inclusive_ms':dict(inclusive),'span_union_ms':coverage,'return_outside_spans_ms':max(0,row['return_ms']-coverage)})
groups=[]
for version in ['original','candidate']:
 for route in ['cpu','auto','gpu']:
  rs=[r for r in rows if r['version']==version and r['requested']==route];names=sorted({n for r in rs for n in r['exclusive_ms']})
  groups.append(dict(version=version,route=route,rows=len(rs),zero_total=len([r for r in rs if r['total_ms']==0]),total_median_ms=median([r['total_ms']for r in rs]),return_median_ms=median([r['return_ms']for r in rs]),consumer_median_ms=median([r['consumer_ms']for r in rs]),exclusive_phase_medians_ms={n:median([r['exclusive_ms'].get(n,0)for r in rs])for n in names}))
cells=[];point_signs=collections.Counter()
for frame in dict.fromkeys(r['frame']for r in rows):
 for route in ['cpu','auto','gpu']:
  sides={v:[r for r in rows if r['version']==v and r['requested']==route and r['frame']==frame]for v in ['original','candidate']};medians={v:median([r['total_ms']for r in rs])for v,rs in sides.items()};delta=medians['candidate']-medians['original'];point_signs['candidate_logged_higher'if delta>1e-6 else'candidate_logged_lower'if delta< -1e-6 else'within_rounding_tolerance']+=1
  for round in range(3):
   original=next(r for r in j['rows']if r['frame']==frame and r['requested']==route and r['version']=='original'and r['round']==round);candidate=next(r for r in j['rows']if r['frame']==frame and r['requested']==route and r['version']=='candidate'and r['round']==round);assert original['backend']==candidate['backend']and original['consumption']==candidate['consumption']and original['counters']==candidate['counters']
  cells.append(dict(frame=frame,route=route,rounds=3,total_ms={v:[r['total_ms']for r in rs]for v,rs in sides.items()},median_total_ms=medians,candidate_minus_original_median_ms=delta,exclusive_medians_ms={v:{n:median([r['exclusive_ms'].get(n,0)for r in rs])for n in sorted({n for r in rs for n in r['exclusive_ms']})}for v,rs in sides.items()}))
copy=json.loads((R/'copy-counts-final-2.json').read_text());assert copy['status']=='passed'and len(copy['rows'])==16
copy_summary={v:dict(rows=len(rs),result_slices=sum(r['counters']['arena_result_slices']for r in rs),result_slice_words=sum(r['counters']['arena_slice_words']for r in rs))for v in ['original','candidate']for rs in [[r for r in copy['rows']if r['variant']==v]]}
protocol=json.loads((R/'browser-attribution/protocol.json').read_text());device_controls={}
for layout,versions in protocol['layouts'].items():
 left=R/versions['original']['folder']/'ink-device.mjs';right=R/versions['candidate']['folder']/'ink-device.mjs';device_controls[layout]=dict(original_sha256=sha(left),candidate_sha256=sha(right),identical=left.read_bytes()==right.read_bytes())
summary=dict(device_bridge_controls=device_controls,status='passed_descriptive_only',instrumented=True,profitability_claim=False,measurement=dict(rows=252,warmups_separate=84,actual_gpu_measured=84,actual_gpu_warmups=28,actual_gpu_total=112,contexts=14,paired_context_routes=42,rounds=3,span_count=span_count,zero_span_intervals=zero_spans,zero_total_calls=sum(r['total_ms']==0 for r in rows),observed_quantization_ms=.1),phase_rule='For each span subtract the UNION of direct child intervals; exclusive phases sum to the UNION of all spans. Return minus span union is unattributed host/await scheduling/transfer work, not kernel time.',groups=groups,cells=cells,point_signs_descriptive_only=dict(point_signs),unpack_parent_counts=[dict(version=v,route=r,location=l,count=n)for(v,r,l),n in sorted(parents.items())],mock_copy_audit=copy_summary,bindings={p.relative_to(B).as_posix():sha(p)for p in [raw,audit,R/'copy-counts-final-2.json',R.parent/'parity/browser-audit.json',R/'browser-attribution/protocol.json',R/'browser-attribution-controls.json',R/'e9-release-review.json',R.parent/'final-source-receipt.json',Path(__file__)]},limits=j['limits']+['Most phases are below the approximately 0.1 ms observed clock granularity; zero means unresolved.','Three instrumented rounds cannot establish profitability or causal latency from logged deltas; no inferential performance classification is made.','CPU decode moved inside candidate cpu-total; compare all unpack spans or exclusive phases, not raw cpu-total.','Direct JS execution span includes its output adapter; it is not an isolated mathematical kernel.','GPU shader time is not independently measured; return includes async transfer/readback and host scheduling.','Mock copy audit proves intercepted operations in a fixture, not actual compiled allocation counts.','Only U32 device bridge compares archived/current readback implementations; other carrier clones share the current device bridge. Compiled algorithm/Wasm/JS/shader assets match within every pair.','Preserved release is core e9; newer main V6 features remain outside this evidence.'])
(R/'attribution-summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps({'status':summary['status'],'measurement':summary['measurement'],'groups':groups,'unpack_parent_counts':summary['unpack_parent_counts'],'mock_copy':copy_summary}))
