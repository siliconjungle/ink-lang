"""Independent saved-data intervals and backend/proof attribution tables."""
import collections,hashlib,json,random,statistics
from pathlib import Path
R=Path(__file__).resolve().parent
read=lambda n:json.loads((R/n).read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def interval(a,b):
 assert len(a)==len(b)==9
 rng=random.Random(0);d=[]
 for _ in range(4000):
  ix=[rng.randrange(9) for _ in range(9)];d.append(statistics.median([a[i] for i in ix])/statistics.median([b[i] for i in ix]))
 d.sort();return [statistics.median(a)/statistics.median(b),d[100],d[3899]]
m=read('metadata.json');spec=read('spec.json');tasks={t['name']:t for t in spec['tasks']}
for n,h in m['artifact_hashes'].items():assert sha(R/n)==h,n
for c in m['compilers'].values():assert sha(Path(c['path']))==c['sha256']
counts=collections.defaultdict(collections.Counter);adverse=[];expert_rows=[];allrows=[];verified=interactions=0
for host in ['node','browser','native']:
 summary=read('native/summary.json' if host=='native' else host+'-summary.json')
 raw=read('native/results.json' if host=='native' else host+'-results.json')
 groups=collections.defaultdict(lambda:collections.defaultdict(list))
 for x in raw['samples']:groups[(x['case'],x['input'],x.get('mode',''))][x['variant']].append(x)
 for row in summary['measurements']:
  case=row['case'];mode=row.get('mode','');values={v:[x['ns_per_call'] for x in sorted(xs,key=lambda x:x['round'])] for v,xs in groups[(case,row['input'],mode)].items()}
  assert row['median_ns']=={v:statistics.median(xs) for v,xs in values.items()}
  for label,saved in row['paired_ratios_95pct'].items():
   a,b=row['ratio_variants'][label];ci=interval(values[a],values[b]);assert ci==saved,(host,case,label);verified+=1
   expert='expert' in label
   ink_numerator=a.startswith('ink_')
   verdict=('Ink_faster' if ci[2]<1 else 'expert_faster' if ci[1]>1 else 'inconclusive') if expert and ink_numerator else ('Ink_faster' if ci[1]>1 else 'expert_faster' if ci[2]<1 else 'inconclusive') if expert else ('faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive')
   location=next((x for x in ['first','interior','last','absent'] if row['input'].endswith('/'+x)),'unconditional')
   r=dict(host=host,mode=mode,case=case,input=row['input'],comparison=label,ratio_variants=[a,b],ratio_95pct=ci,verdict=verdict,proof_fresh=tasks[case]['fresh_proof_required'],operation=tasks[case]['operation'],cohort=tasks[case]['cohort'],match_location=location)
   for role in ['all','fresh' if r['proof_fresh'] else 'reference']:
    for group in ['all',r['operation'],r['cohort'],'match:'+location]:counts['|'.join([role,host,mode,label,group])][verdict]+=1
   allrows.append(r)
   if expert:expert_rows.append(r)
   elif verdict=='slower':adverse.append(r)
  for target,saved in row.get('factorial_interactions',{}).items():
   old=[a/b for a,b in zip(values[f'ink_old_prior_{target}'],values[f'ink_old_checked_{target}'])]
   new=[a/b for a,b in zip(values[f'ink_new_prior_{target}'],values[f'ink_new_checked_{target}'])]
   assert interval(old,new)==saved['paired_ratio_95pct'];interactions+=1
out=dict(status='passed',intervals_recomputed=verified,interaction_intervals_recomputed=interactions,counts={k:dict(v) for k,v in counts.items()},scope='Backend/proof factorial and full/synchronous borrowed boundaries are separate. Per-cell exploratory paired intervals, one machine; no pooled or general language ranking.',summary_hashes={n:sha(R/n) for n in ['node-summary.json','browser-summary.json','native/summary.json']})
(R/'outcome-tables.json').write_text(json.dumps(out,indent=2)+'\n')
for name,rows in [('all-comparisons.json',allrows),('regressions.json',adverse),('all-expert-comparisons.json',expert_rows)]:
 (R/name).write_text(json.dumps(dict(scope=out['scope'],rows=rows),indent=2)+'\n')
(R/'root-interval-verification.json').write_text(json.dumps(dict(status='passed',intervals_recomputed=verified,interaction_intervals_recomputed=interactions,all_summary_hashes=out['summary_hashes'],helper_sha256=sha(Path(__file__))),indent=2)+'\n')
print(json.dumps(dict(status='passed',intervals=verified,interaction_intervals=interactions,adverse_comparisons=len(adverse))))
