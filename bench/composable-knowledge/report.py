"""Paired sample uncertainty and honest discovery/storage/runtime curves."""
import argparse,json,math,random,statistics
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def interval(pairs):
 rng=random.Random(1881);point=math.exp(statistics.mean(math.log(statistics.median(a)/statistics.median(b))for a,b in pairs));draws=[]
 for _ in range(2000):
  ratios=[]
  for a,b in pairs:
   ids=[rng.randrange(len(a))for _ in a]
   ratios.append(math.log(statistics.median(a[i]for i in ids)/statistics.median(b[i]for i in ids)))
  draws.append(math.exp(statistics.mean(ratios)))
 draws.sort();return dict(speedup=point,ci95=[draws[50],draws[1949]])

def main():
 p=argparse.ArgumentParser();p.add_argument('--input',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True);raw=json.loads((a.input/'results.json').read_bytes());native=json.loads((a.input/'physical/native.json').read_bytes());wasm=json.loads((a.input/'physical/wasm.json').read_bytes())
 summary=dict(discovery=[],storage=[],javascript={},physical={})
 for field,baseline,selected in [('discovery','exhaustive','indexed'),('storage','loose','packed')]:
  for row in raw[field]:summary[field].append(dict(entries=row['entries'],**interval([(row['samples_seconds'][baseline],row['samples_seconds'][selected])])))
 for cohort in sorted({r['cohort']for r in raw['execution']['results']}):
  rows=[r for r in raw['execution']['results']if r['cohort']==cohort];summary['javascript'][cohort]={lane:interval([(r['samples_ns']['literal'],r['samples_ns'][lane])for r in rows])for lane in ['prior-one','prior-chain','composed']}
 for name,rows in [('Rust',native['results']),('Rust-Wasm',wasm['results'])]:
  summary['physical'][name]={lane:interval([(r['samples_ns']['shared'],r['samples_ns'][lane])for r in rows])for lane in ['packed','memo','composed']}
 summary['regressions']={}
 for name,rows in [('javascript',raw['execution']['results']),('Rust',native['results']),('Rust-Wasm',wasm['results'])]:
  baseline='literal'if name=='javascript'else'shared';bad=[]
  for row in rows:
   for lane in row['samples_ns']:
    if lane==baseline:continue
    ratio=interval([(row['samples_ns'][baseline],row['samples_ns'][lane])])
    if ratio['speedup']<1:bad.append(dict(cohort=row.get('cohort'),size=row['size'],position=row.get('fraction',row.get('key')),lane=lane,**ratio))
  summary['regressions'][name]=bad
 for name,value in [('results',raw),('native',native),('wasm',wasm),('summary',summary)]:
  (a.output/(name+'.json')).write_text(json.dumps(value,indent=2)+'\n')
 plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False})
 fig,axes=plt.subplots(2,2,figsize=(13,8.5));ax=axes[0,0]
 for lane,label in [('exhaustive','Exhaustive template discovery'),('indexed','Structural template index')]:
  ax.plot([r['entries']for r in raw['discovery']],[r['median_seconds'][lane]*1000 for r in raw['discovery']],marker='o',label=label)
 ax.set(xlabel='Template entries (18 real families + labelled stress variants)',ylabel='Discovery + law generation (ms)',title='Same generated laws; frozen compiler');ax.legend()
 ax=axes[0,1]
 for lane,label in [('loose','Loose files'),('packed','Packed transport')]:ax.plot([r['entries']for r in raw['storage']],[r['median_seconds'][lane]*1000 for r in raw['storage']],marker='o',label=label)
 ax.set(xlabel='Storage fixture entries',ylabel='Authenticated full export + serialization (ms)',title='Identical object identities and exported bytes');ax.legend()
 ax=axes[1,0];lanes=['prior-one','prior-chain','composed'];labels=['Earlier single proposal','Earlier complete chain','Imported composition']
 for i,(cohort,values)in enumerate(summary['javascript'].items()):
  ax.bar([n+(i-.5)*.35 for n in range(3)],[values[k]['speedup']for k in lanes],width=.35,label='Actual AST inputs'if cohort.startswith('actual')else'Designed inputs')
 ax.set_xticks(range(3),labels,rotation=10);ax.axhline(1,color='black',linewidth=.7);ax.set(ylabel='Geometric mean speedup over literal JS',title='Forced alternatives; strong existing-chain control');ax.legend()
 ax=axes[1,1];lanes=['packed','memo','composed']
 for i,(target,values)in enumerate(summary['physical'].items()):ax.bar([n+(i-.5)*.35 for n in range(3)],[values[k]['speedup']for k in lanes],width=.35,label=target)
 ax.set_xticks(range(3),['Packing','Memoisation','Both']);ax.axhline(1,color='black',linewidth=.7);ax.set(ylabel='Geometric mean speedup over shared storage',title='Complete JSON state calls; regressions retained');ax.legend()
 fig.suptitle('Composable knowledge: scaling improves; runtime profitability varies',fontsize=15);fig.tight_layout(rect=(0,0,1,.96));fig.savefig(a.output/'curves.png',dpi=180);fig.savefig(a.output/'curves.svg')
 print(json.dumps(summary['javascript']))
if __name__=='__main__':main()
