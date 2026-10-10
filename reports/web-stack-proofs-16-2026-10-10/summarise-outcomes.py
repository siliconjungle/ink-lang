"""Descriptive tables; consume already independently audited intervals."""
import collections,hashlib,json
from pathlib import Path
R=Path(__file__).resolve().parent
S=json.loads((R/'spec.json').read_text());tasks={t['name']:t for t in S['tasks']}
counts=collections.defaultdict(collections.Counter);supported=collections.defaultdict(list);regressions=[];controls=[]
for host in ['node','browser','native']:
 summary=R/('native/summary.json' if host=='native' else host+'-summary.json')
 for row in json.loads(summary.read_text())['measurements']:
  fresh=tasks[row['case']]['fresh_proof_required'];scope='fresh' if fresh else 'reference';mode=row.get('mode','');cohort=tasks[row['case']]['cohort']
  for comparison,ci in row['paired_ratios_95pct'].items():
   prior=comparison.startswith('prior_over_checked');expert='expert' in comparison
   if not (prior or expert):continue
   verdict=('faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive') if prior else ('Ink_faster' if ci[2]<1 else 'expert_faster' if ci[1]>1 else 'inconclusive')
   for family in ['all',cohort,'ordered' if 'arbitrary_fold' in row['case'] else 'weight' if fresh else 'reference']:
    key='|'.join([scope,host,mode,comparison,family]);counts[key][verdict]+=1
    if verdict=='faster':supported[key].append(ci[0])
   record=dict(host=host,mode=mode,case=row['case'],input=row['input'],cohort=cohort,comparison=comparison,ratio_95pct=ci,verdict=verdict,fresh_proof_required=fresh)
   if prior and fresh and verdict=='slower':regressions.append(record)
   if expert:controls.append(record)
out=dict(scope='Fresh12 versus reference18; individual exploratory intervals, correlated views; no suite-wide or general language ranking.',counts={k:dict(v) for k,v in counts.items()},supported_gain_median_ranges={k:[min(v),max(v)] for k,v in supported.items()},summary_hashes={n:hashlib.sha256((R/n).read_bytes()).hexdigest() for n in ['node-summary.json','browser-summary.json','native/summary.json']})
(R/'outcome-tables.json').write_text(json.dumps(out,indent=2)+'\n');(R/'fresh-regressions.json').write_text(json.dumps(dict(scope=out['scope'],rows=regressions),indent=2)+'\n');(R/'all-expert-comparisons.json').write_text(json.dumps(dict(scope=out['scope'],rows=controls),indent=2)+'\n')
print(json.dumps({k:v for k,v in out['counts'].items() if k.startswith('fresh') and k.endswith('all')}))
