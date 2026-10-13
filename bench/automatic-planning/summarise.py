"""Fixed program weighting, paired timing uncertainty and every adverse case."""
import os
import csv,json,pathlib
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=pathlib.Path(os.environ.get('INK_AUTO_REPORT', ROOT/'reports/automatic-planning-2026-10-13')).resolve()
programs=json.loads((OUT/'corpus.json').read_text());rng=np.random.default_rng(9137);rows=[];vectors={};B=10000
for program in programs:
 data=json.loads((OUT/'measurements/time'/program['name']/'all/stdout.txt').read_text())
 changed=data['lanes'][0]['artifact_sha256']!=data['lanes'][1]['artifact_sha256']
 for case in data['results']:
  before=np.array(case['samples_ns']['before']);after=np.array(case['samples_ns']['after'])
  log=np.log(before/after);draws=log[rng.integers(0,len(log),size=(B,len(log)))].mean(axis=1)
  speed=float(np.exp(log.mean()));lo,hi=np.exp(np.quantile(draws,[.025,.975]))
  outcome=('gain'if speed>=1.05 and lo>1 else'regression'if speed<=1/1.05 and hi<1 else'uncertain or <5%')if changed else'identical artifact timing variation'
  row=dict(program=program['name'],split=program['split'],size=case['size'],distribution=case['distribution'],
           fixture=case['fixture'],input_identity=case['input_identity'],changed_artifact=changed,speedup=speed,lower=float(lo),upper=float(hi),
           before_median_ns=float(np.median(before)),after_median_ns=float(np.median(after)),outcome=outcome)
  rows.append(row);vectors[case['fixture']]=draws
with (OUT/'cases.csv').open('w',newline='')as file:
 w=csv.DictWriter(file,fieldnames=list(rows[0]),lineterminator='\n');w.writeheader();w.writerows(rows)
def cohort(names):
 means=[];draws=[];per=[]
 for name in names:
  cells=[r for r in rows if r['program']==name and r['size']>0]
  means.append(np.mean([np.log(r['speedup'])for r in cells]));draws.append(np.mean([vectors[r['fixture']]for r in cells],axis=0))
  per.append(dict(program=name,speedup=float(np.exp(means[-1])),gain_cells=sum(r['outcome']=='gain'for r in cells),regression_cells=sum(r['outcome']=='regression'for r in cells)))
 spread=np.exp(np.mean(draws,axis=0));lo,hi=np.quantile(spread,[.025,.975])
 return dict(programs=len(names),cells=sum(r['size']>0 and r['program']in names for r in rows),speedup=float(np.exp(np.mean(means))),lower=float(lo),upper=float(hi),per_program=per,
             weighting='equal program, then equal nonempty sizes/distribution labels; timing-only paired bootstrap conditional on this fixed corpus')
known=[p['name']for p in programs if p['split'].startswith('known')];reserved=[p['name']for p in programs if p['split'].startswith('reserved')]
curves=dict(schema=1,combined=cohort(known+reserved),known=cohort(known),reserved=cohort(reserved),
            regressions=[r for r in rows if r['outcome']=='regression'],empty_cases=[r for r in rows if r['size']==0])
(OUT/'curves.json').write_text(json.dumps(curves,indent=2)+'\n')
print(json.dumps({k:{x:v[x]for x in ['programs','cells','speedup','lower','upper']}for k,v in curves.items()if k in ['combined','known','reserved']}))
