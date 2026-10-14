"""Summarise complete process rotations without selecting favourable runs."""
import json,statistics,sys
from pathlib import Path
root=Path(sys.argv[1]);median=statistics.median
replays=[json.loads(p.read_text())for p in sorted(root.glob('replay-[0-9].json'))]
jsons=[json.loads(p.read_text())for p in sorted(root.glob('json-[0-9].json'))]
groups=[json.loads(p.read_text())for p in sorted(root.glob('collections-[0-9].json'))]
out=dict(processes=dict(replay=len(replays),json=len(jsons),collections=len(groups)),replay=[],json=[],collections=[])
for name in [r['trace']for r in replays[0]['results']]:
 rows=[next(r for r in d['results']if r['trace']==name)for d in replays];v=dict(trace=name)
 for mode in rows[0]['controls']:
  values=[median(r['controls'][mode]['elapsed_ns'])/1e6 for r in rows];v[mode]=dict(median_ms=median(values),range_ms=[min(values),max(values)])
 for key in ['hindsight_ns','available_switching_gain_ns','controller_choice_gap_ns','execution_residual_ns']:
  v[key]=median(r['analysis'][key]for r in rows)
 v['best_fixed_ns']=median(min(r['analysis']['fixed_ns'].values())for r in rows)
 out['replay'].append(v)
for scenario in dict.fromkeys(r['scenario']for r in jsons[0]['results']):
 v=dict(scenario=scenario)
 for mode in ['raw_linear','linear','incremental','eager']:
  rows=[next(r for r in d['results']if r['scenario']==scenario and r['mode']==mode)for d in jsons]
  values=[r['elapsed_ns']/1e6 for r in rows];v[mode]=dict(median_ms=median(values),range_ms=[min(values),max(values)],stats=rows[0]['stats'])
 out['json'].append(v)
for mode in ['fixed','whole','local_fixed','local']:
 rows=[next(r for r in d['results']if r['mode']==mode)for d in groups];values=[r['elapsed_ns']/1e6 for r in rows]
 out['collections'].append(dict(mode=mode,median_ms=median(values),range_ms=[min(values),max(values)],restored_states=[r['restored_states']for r in rows],restored_bytes=[r['restored_bytes']for r in rows]))
(root/'summary.json').write_text(json.dumps(out,indent=2)+'\n')
for r in out['replay']:print('replay',r['trace'],{k:round(v['median_ms'],2)for k,v in r.items()if isinstance(v,dict)},'bestfixed',round(r['best_fixed_ns']/1e6,2),'oracle',round(r['hindsight_ns']/1e6,2),'choicegap',round(r['controller_choice_gap_ns']/1e6,2))
for r in out['json']:print('json',r['scenario'],{k:round(v['median_ms'],2)for k,v in r.items()if isinstance(v,dict)})
for r in out['collections']:print('collections',r)
