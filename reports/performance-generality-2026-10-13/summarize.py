"""Regenerate medians and an exportable curve from all retained process samples."""
import hashlib,json,statistics
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
D=Path(__file__).resolve().parent
median=statistics.median
rows=[r for f in sorted(D.glob('run-*.json'))for r in json.loads(f.read_text())['results']]
summary=[]
for n in sorted({r['n']for r in rows}):
 for phase in ['query','replacement','checkpoint','restore']:
  groups={lane:[median(r[phase+'_samples_ns'])for r in rows if r['n']==n and r['lane']==lane]for lane in ['baseline','optimized']}
  costs={lane:median(v)for lane,v in groups.items()}
  summary.append(dict(n=n,phase=phase,median_process_ns=costs,process_range_ns={lane:[min(v),max(v)]for lane,v in groups.items()},gain=costs['baseline']/costs['optimized']))
capture=[r for f in sorted(D.glob('capture-*.json'))for r in json.loads(f.read_text())['rows']]
copies=[]
for n in sorted({r['n']for r in capture}):
 for shape in ['words','records','nested']:
  groups={lane:[median(r['samples_ns'][lane])for r in capture if r['n']==n and r['shape']==shape]for lane in ['dispatcher','compiled']}
  costs={lane:median(v)for lane,v in groups.items()}
  copies.append(dict(n=n,shape=shape,median_process_ns=costs,process_range_ns={lane:[min(v),max(v)]for lane,v in groups.items()},gain=costs['dispatcher']/costs['compiled']))
report=dict(schema=1,processes=5,aggregation='median of per-process medians; retained sample and process ranges',invariants=summary,capture=copies,hashes={f.name:hashlib.sha256(f.read_bytes()).hexdigest()for f in sorted(D.glob('*'))if f.suffix in ['.mjs','.json','.log']and f.name!='summary.json'},scope='Exploratory shared-host Node measurements; predicate remains quadratic; no framework, DOM or confidence-bound claim')
(D/'summary.json').write_text(json.dumps(report,indent=2)+'\n')
fig,axes=plt.subplots(1,3,figsize=(12,3.6),layout='constrained')
for ax,phase in zip(axes,['query','replacement','restore']):
 data=[r for r in summary if r['phase']==phase]
 for lane,label in [('baseline','Before'),('optimized','After')]:
  ax.plot([r['n']for r in data],[r['median_process_ns'][lane]/1e6 for r in data],marker='o',label=label)
  ax.fill_between([r['n']for r in data],[r['process_range_ns'][lane][0]/1e6 for r in data],[r['process_range_ns'][lane][1]/1e6 for r in data],alpha=.12)
 ax.set_xscale('log',base=2);ax.set_yscale('log');ax.set_title(phase.capitalize());ax.set_xlabel('Elements');ax.set_ylabel('Milliseconds');ax.grid(alpha=.2);ax.legend()
fig.suptitle('Typed invariant validation: five fresh processes, same source and public contract')
fig.savefig(D/'curve.png',dpi=170);fig.savefig(D/'curve.pdf')
