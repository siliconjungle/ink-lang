from pathlib import Path
import json,statistics,math,hashlib
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
r=Path(__file__).resolve().parents[2];o=r/'reports/numeric-text-primitives-2026-10-13'
read=lambda p:json.loads(p.read_bytes());median=statistics.median;gm=lambda xs:math.exp(sum(map(math.log,xs))/len(xs))
js=read(o/'javascript.json');summary=[]
for name in sorted({x['name']for x in js['rows']}):
 rows=[x for x in js['rows']if x['name']==name]
 ratios=[median(x['samples_ns']['ink-js-before'])/median(x['samples_ns']['ink-js'])for x in rows]
 summary.append(dict(name=name,normalisation_speedup=gm(ratios),cells=[dict(size=x['size'],medians_ns={k:median(v)for k,v in x['samples_ns'].items()},contract=x['contract'])for x in rows]))
numerical=[x for x in summary if x['name']in ['gl_length','normalise','rounding','sine','exponential','logarithm']]
native=[json.loads(s)for s in (o/'native-gpu.ndjson').read_text().splitlines()];wasm=read(o/'wasm-javascript.json')
info=dict(javascript=summary,numerical_gmean_normalisation_speedup=gm([x['normalisation_speedup']for x in numerical]),native_gpu=[dict(name=name,size=size,medians_ns={lane:median([x['ns_per_call']for x in native if x['name']==name and x['size']==size and x['lane']==lane])for lane in ['rust-json','c-packed','wgpu-required']})for name in ['float_ops','word_stats','from_wide']for size in [16,512,4096]],wasm_javascript=[dict(name=x['name'],size=x['size'],medians_ns={k:median(v)for k,v in x['samples_ns'].items()})for x in wasm['results']],accuracy=read(r/'build/numeric-text-primitives/accuracy.json'))
(o/'summary.json').write_text(json.dumps(info,indent=2)+'\n')
plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False})
fig,ax=plt.subplots(1,2,figsize=(12,4.5),layout='constrained');fig.suptitle('Ink numerical and text capability epoch',fontsize=16)
for x in numerical:
 ax[0].plot([c['size']for c in x['cells']],[c['medians_ns']['ink-js-before']/c['medians_ns']['ink-js']for c in x['cells']],marker='o',label=x['name'])
ax[0].axhline(1,color='#888',linewidth=1);ax[0].set_xscale('log');ax[0].set_xlabel('Input elements');ax[0].set_ylabel('Before / after complete JavaScript call');ax[0].set_title('Removing redundant float normalisation');ax[0].legend(fontsize=8,ncol=2);ax[0].grid(alpha=.15)
for lane in ['rust-json','c-packed','wgpu-required']:
 rows=[x for x in info['native_gpu']if x['name']=='float_ops'];ax[1].plot([x['size']for x in rows],[x['medians_ns'][lane]/1e6 for x in rows],marker='o',label=lane)
ax[1].set_xscale('log');ax[1].set_yscale('log');ax[1].set_xlabel('Input elements');ax[1].set_ylabel('Complete call + output consumption (ms)');ax[1].set_title('Float operations through native host APIs');ax[1].legend(fontsize=8);ax[1].grid(alpha=.15)
fig.savefig(o/'curves.png',dpi=180);fig.savefig(o/'curves.svg')
print(info['numerical_gmean_normalisation_speedup'])
