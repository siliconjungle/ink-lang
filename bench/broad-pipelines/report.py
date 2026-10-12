"""Plot measured ablations with paired bootstrap intervals; no fitting claims."""
import json,random,statistics,math
from pathlib import Path
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];D=ROOT/'docs/evidence/broad-performance'
r=json.loads((D/'execution.json').read_bytes());rng=random.Random(104729)
def ratio(a,b):
 values=[]
 for _ in range(5000):
  indices=[rng.randrange(len(a))for _ in a];values.append(statistics.median(a[i]for i in indices)/statistics.median(b[i]for i in indices))
 values.sort();return dict(speedup=statistics.median(a)/statistics.median(b),ci95=[values[125],values[4874]])
summary=[]
for row in r['results']:
 s=row['samples_ns'];summary.append(dict(name=row['name'],size=row['size'],regime=row['regime'],database=ratio(s['baseline'],s['selected']),machinery=ratio(s['before-baseline'],s['baseline']),combined=ratio(s['before-baseline'],s['selected']),**({'lodash':ratio(s['lodash-4.17.21'],s['selected'])}if'lodash-4.17.21'in s else{})))
small={'schema':1,'scope':r['scope'],'compiler_sha256':r['compiler_sha256'],'source_sha256':r['source_sha256'],'compilation_seconds':r['compilation_seconds'],'rows':summary,'regressions':[x for x in summary if x['database']['ci95'][1]<1]}
(D/'summary.json').write_text(json.dumps(small,indent=2)+'\n')
plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False})
fig,axes=plt.subplots(1,3,figsize=(15,4.7),layout='constrained')
colors={'before-baseline':'#9b4b54','baseline':'#64748b','selected':'#1f9489','lodash-4.17.21':'#e2a649'}
ax=axes[0]
for lane,label in [('before-baseline','Prior machinery, literal source'),('baseline','New machinery, literal source'),('selected','New machinery + DB laws'),('lodash-4.17.21','Lodash 4.17.21')]:
 rows=[x for x in r['results']if x['name']=='filtered_mapped'and x['regime']=='half'];ax.plot([x['size']for x in rows],[x['median_ns'][lane]/1000 for x in rows],marker='o',label=label,color=colors[lane])
ax.set(xscale='log',yscale='log',xlabel='Rows',ylabel='Complete call + consumption (µs)',title='Filter → map → reduceRight, 50% selected');ax.legend(fontsize=8)
ax=axes[1];families=['filtered_right','filtered_left','filtered_mapped','label','mapped_filtered','summary','identity_rows']
rows=[next(x for x in summary if x['name']==n and x['size']==65536 and x['regime']=='half')for n in families]
ys=list(range(len(rows)));means=[x['database']['speedup']for x in rows];low=[m-x['database']['ci95'][0]for m,x in zip(means,rows)];high=[x['database']['ci95'][1]-m for m,x in zip(means,rows)]
ax.barh(ys,means,color=['#1f9489'if m>=1 else'#9b4b54'for m in means]);ax.errorbar(means,ys,xerr=[low,high],fmt='none',color='#334155',capsize=3);ax.axvline(1,color='#334155',ls='--');ax.set_yticks(ys,families);ax.invert_yaxis();ax.set(xlabel='Literal / selected time; >1 is faster',title='Database contribution with machinery fixed\n65,536 rows, 50% selected')
ax=axes[2];index=json.loads((D/'index-rebuild.json').read_text());proof=json.loads((D/'proof-loading.json').read_text());discovery=json.loads((D/'template-discovery.json').read_text())
values=[index['comparison_without_reverse_indexes_seconds']/index['seconds'],statistics.median(proof['before'])/statistics.median(proof['after']),statistics.median(discovery['seconds']['exhaustive'])/statistics.median(discovery['seconds']['indexed'])]
labels=['Full index rebuild','Read 2,048 proofs','Template matching'];ax.barh(labels,values,color=['#64748b','#64748b','#64748b']);ax.axvline(1,color='#334155',ls='--');ax.invert_yaxis();ax.set(xlabel='Diagnostic before / after time',title='Compilation-side work\nRebuild is a single sequential comparison')
for i,v in enumerate(values):ax.text(v+.1,i,f'{v:.1f}×',va='center')
ax.set_xlim(0,max(values)*1.25)
fig.suptitle('Ink: compiler machinery, database laws and planning costs measured separately',fontsize=14)
fig.savefig(D/'performance.png',dpi=170);fig.savefig(D/'performance.svg');print(json.dumps(dict(rows=len(summary),significant_regressions=len(small['regressions']),figure=str(D/'performance.png'))))
