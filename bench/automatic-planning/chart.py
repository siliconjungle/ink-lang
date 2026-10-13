"""Display automatic execution gains and the compilation costs that deliver them."""
import os
import csv,json,pathlib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=pathlib.Path(os.environ.get('INK_AUTO_REPORT', ROOT/'reports/automatic-planning-2026-10-13')).resolve()
data=json.loads((OUT/'curves.json').read_text());programs=json.loads((OUT/'corpus.json').read_text())
values=data['combined']['per_program'];names=[r['program']for r in values]
fig,axes=plt.subplots(1,2,figsize=(15,7.5),layout='constrained')
changed={r['program']:r['changed_artifact']=='True' for r in csv.DictReader((OUT/'cases.csv').open())}
colors=['#b9bfc4'if not changed[p['name']]else'#246b8e'if p['split'].startswith('known')else'#e99b3f'for p in programs]
bars=axes[0].barh(names,[r['speedup']for r in values],color=colors);axes[0].axvline(1,color='black',lw=1)
for bar,name in zip(bars,names):
 if not changed[name]:bar.set_hatch('//')
axes[0].invert_yaxis();axes[0].set_xlabel('Automatic execution speedup (before = 1)')
axes[0].set_title('Blue known; orange reserved; grey unchanged artifacts')
before=json.loads((OUT/'before-javascript-compilation.json').read_text());after=json.loads((OUT/'after-javascript-compilation.json').read_text())
x=np.arange(len(names));b={r['program']:r['seconds']for r in before};a={r['program']:r['seconds']for r in after}
axes[1].plot(x,[b[n]for n in names],'o-',label='Before: cold ordinary build')
axes[1].plot(x,[a[n]for n in names],'o-',label='After: cold build + automatic selection inputs')
warm=OUT/'warm-compilation.json'
if warm.exists():
 rows=json.loads(warm.read_text());w={n:np.median([r['seconds']for r in rows if r['program']==n])for n in names}
 axes[1].plot(x,[w[n]for n in names],'o-',label='After: cached choice, fresh proof replay')
axes[1].set_yscale('log');axes[1].set_ylabel('Complete compilation seconds (log scale)')
axes[1].set_xticks(x,names,rotation=65,ha='right');axes[1].legend(fontsize=8)
axes[1].set_title('Search, checking, publication, acquisition and emission included')
fig.suptitle('Ordinary automated planning — new machinery epoch; no hand-authored selection',fontsize=14)
fig.savefig(OUT/'automatic-performance-and-cost.png',dpi=170)
fig.savefig(OUT/'automatic-performance-and-cost.svg')
