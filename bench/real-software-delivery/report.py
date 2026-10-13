"""Retain fixed-corpus gains/losses, capability gaps and build/runtime tradeoffs."""
import json,math,statistics,random,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/real-software-delivery-2026-10-13'
sys.path.insert(0,str(Path(__file__).resolve().parent));from run import assert_frozen,read,save

def gm(cells,lane,baseline,indices=None):
 vals=[]
 for i,c in enumerate(cells):
  x=c['samples_ns'][baseline];y=c['samples_ns'][lane]
  if indices is not None:x=[x[j] for j in indices[i]];y=[y[j] for j in indices[i]]
  vals.append(math.log(statistics.median(x)/statistics.median(y)))
 return math.exp(statistics.mean(vals))
def ci(cells,lane,baseline,repetitions=1500):
 rng=random.Random(413293);xs=sorted(gm(cells,lane,baseline,[[rng.randrange(11) for _ in range(11)] for _ in cells]) for _ in range(repetitions));return [xs[int(.025*repetitions)],xs[int(.975*repetitions)]]
def main():
 protocol=assert_frozen();corpus=read(OUT/'corpus.json');held=[p for p in corpus if p['split']=='held-out'];eligible=[p for p in held if p['supported']]
 raw={p['name']:read(OUT/'timings'/(p['name']+'.json')) for p in eligible}
 cells=[dict(program=name,**c) for name,v in raw.items() for c in v['rows'] if c['size']>0]
 assert len(cells)==25
 curves=[]
 for lane,baseline,experiment in [('packed-base/quick','literal','automatic_delivery'),('packed-grown/quick','literal','automatic_delivery'),('packed-base/balanced','literal','automatic_delivery'),('packed-grown/balanced','literal','automatic_delivery'),('packed-grown/quick','packed-base/quick','frozen_database_growth'),('packed-grown/balanced','packed-base/balanced','frozen_database_growth'),('packed-grown/quick','packed-grown/balanced','effort_tradeoff'),('packed-grown/balanced','upstream','upstream_control')]:
  build=[read(OUT/'compiled'/lane/p['name']/'process.json') for p in eligible];adverse=[]
  for c in cells:
   bounds=ci([c],lane,baseline,1000);artifacts={p['name']:p.get('sha256') for p in raw[c['program']]['lanes']};same=artifacts.get(lane)==artifacts.get(baseline) and lane!='upstream' and baseline!='upstream'
   kind='same_artifact_timing' if same else 'gain' if bounds[0]>1 else 'regression' if bounds[1]<1 else 'uncertain'
   adverse.append(dict(program=c['program'],label=c['label'],size=c['size'],speedup=gm([c],lane,baseline),ci95=bounds,classification=kind))
  curves.append(dict(experiment=experiment,lane=lane,baseline=baseline,geometric_mean_speedup=gm(cells,lane,baseline),timing_only_fixed_corpus_ci95=ci(cells,lane,baseline),programs=len(eligible),nonempty_cells=len(cells),selected_alternatives=sum(x['selected_alternative'] for x in build),cold_median_seconds=statistics.median(x['seconds'] for x in build),cold_total_seconds=sum(x['seconds'] for x in build),per_program={p['name']:gm([c for c in cells if c['program']==p['name']],lane,baseline) for p in eligible},gains=sum(c['classification']=='gain' for c in adverse),regressions=sum(c['classification']=='regression' for c in adverse),same_artifact_cells=sum(c['classification']=='same_artifact_timing' for c in adverse),cells=adverse))
 originals=[dict(program=n,**next(c for c in v['rows'] if c['label']=='original')) for n,v in raw.items()]
 validation=[read(p) for p in sorted((OUT/'validation').glob('*.json'))]
 summary=dict(schema=1,protocol=protocol,coverage=dict(selected_sources=len(corpus),held_out_sources=len(held),held_out_supported=len(eligible),unsupported=[p for p in corpus if not p['supported']]),curves=curves,original_seed_only_speedup={lane:gm(originals,lane,'literal') for lane in ['packed-base/quick','packed-base/balanced','packed-grown/quick','packed-grown/balanced']},validation=dict(programs=len(validation),cases=sum(len(v['rows']) for v in validation),complete_comparisons=sum(len(v['rows'])*len(v['lanes']) for v in validation)),scope='Fixed human-selected upstream kernel corpus, bounded semantic domains. Timing-only paired bootstrap; not software-population uncertainty. Whole-program/host/renderer/network costs excluded. Every empty and unchanged case retained in raw timing files.')
 save(OUT/'summary.json',summary);chart(curves)
 print(json.dumps({k:v for k,v in summary.items() if k not in ['protocol','curves']},indent=2));print(json.dumps([{k:v for k,v in c.items() if k not in ['cells','per_program']} for c in curves],indent=2))
def chart(curves):
 import matplotlib;matplotlib.use('Agg');import matplotlib.pyplot as plt
 fig,ax=plt.subplots(1,3,figsize=(14,5));fig.subplots_adjust(left=.065,right=.975,bottom=.28,top=.80,wspace=.32)
 fig.suptitle('Real upstream kernels: automatic delivery and its cost',fontsize=18,fontweight='bold',x=.065,ha='left')
 delivery=[next(c for c in curves if c['lane']==l and c['experiment']=='automatic_delivery') for l in ['packed-base/quick','packed-grown/quick','packed-base/balanced','packed-grown/balanced']]
 labels=['Base\nquick','Grown\nquick','Base\nbalanced','Grown\nbalanced'];y=[c['geometric_mean_speedup'] for c in delivery];bounds=[c['timing_only_fixed_corpus_ci95'] for c in delivery]
 ax[0].errorbar(range(4),y,yerr=[[a-b[0] for a,b in zip(y,bounds)],[b[1]-a for a,b in zip(y,bounds)]],fmt='o',capsize=4,color='#94a3b8',label='Observed timing variation');ax[0].axhline(1,color='#2563eb',linewidth=2,label='Identical generated code');ax[0].set_ylabel('Complete-call timing ratio over literal Ink');ax[0].set_title('No generated-code improvements');ax[0].legend(frameon=False,fontsize=8)
 ax[1].plot(range(4),[c['cold_median_seconds'] for c in delivery],'o-',color='#d97706');ax[1].set_ylim(bottom=0);ax[1].set_ylabel('Median complete cold build, seconds ↓');ax[1].set_title('Existing search budgets; no tuned defaults')
 ax[2].plot(range(4),[c['selected_alternatives'] for c in delivery],'o-',color='#0f9c85');ax[2].set_ylim(-.3,6.3);ax[2].set_ylabel('Automatically selected held-out sources / 6');ax[2].set_title('String-length capability gap retained')
 for a in ax:a.set_xticks(range(4),labels);a.grid(axis='y',alpha=.25);a.spines[['top','right']].set_visible(False)
 fig.text(.065,.06,'Five executable held-out kernels and one unsupported source. Actual upstream seed inputs plus disclosed stress repetitions.\nLiteral loop ports, bounded numeric domains, human selection and D3 sibling overlap limit generalisation. All losses remain in the report.',fontsize=10,color='#52647b')
 for ext in ['png','svg']:fig.savefig(OUT/('curves.'+ext),dpi=150)
if __name__=='__main__':main()
