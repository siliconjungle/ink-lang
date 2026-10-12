"""Paired uncertainty, complete curves, explicit adverse observations."""
import json,random,statistics,math,argparse
from pathlib import Path
import matplotlib;matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];p=argparse.ArgumentParser();p.add_argument('--evidence',type=Path,default=ROOT/'docs/evidence/proof-growth');a=p.parse_args();D=a.evidence;rng=random.Random(17491)
def ratio(first,second):
 values=[]
 for _ in range(3000):
  indices=[rng.randrange(len(first))for _ in first];values.append(statistics.median(first[i]for i in indices)/statistics.median(second[i]for i in indices))
 values.sort();return dict(speedup=statistics.median(first)/statistics.median(second),ci95=[values[75],values[2924]])
def summarise(report,base,lanes):
 rows=[]
 for row in report['results']:
  s=row['samples_ns'];rows.append(dict(name=row['name'],size=row['size'],distribution=row.get('distribution'),comparisons={k:ratio(s[base],s[k])for k in lanes if k in s}))
 return dict(rows=rows,geomean={k:math.exp(statistics.mean(math.log(x['comparisons'][k]['speedup'])for x in rows if k in x['comparisons']))for k in lanes},regressions=[dict(name=x['name'],size=x['size'],distribution=x['distribution'],lane=k,**v)for x in rows for k,v in x['comparisons'].items()if v['ci95'][1]<1])
js=json.loads((D/'javascript.json').read_text());real=json.loads((D/'real-inputs.json').read_text());native=json.loads((D/'rust.json').read_text());wasm=json.loads((D/'rust-wasm.json').read_text());gpu=json.loads((D/'gpu-c.json').read_text())
summary={label:summarise(report,base,lanes)for label,report,base,lanes in [('javascript',js,'after-0',['after-11','after-16','automatic']),('real_inputs',real,'after-0',['after-11','after-16','automatic']),('rust',native,'0',['11','16','18']),('rust_wasm',wasm,'0',['11','16','18'])]}
summary['gpu']=summarise(gpu,'gpu-required-0',['gpu-required-11','gpu-required-16']);summary['c']=summarise(gpu,'cpu-0',['cpu-11','cpu-16']);(D/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
plt.rcParams.update({'font.size':10,'axes.spines.top':False,'axes.spines.right':False});fig,axes=plt.subplots(2,2,figsize=(13.5,9),layout='constrained');colors=['#64748b','#dd9b37','#15958c','#945daa']
ax=axes[0,0]
for label,caption in [('javascript','JS, designed inputs'),('real_inputs','JS, actual AST/mesh inputs')]:
 vals=[1,summary[label]['geomean']['after-11'],summary[label]['geomean']['after-16']];ax.plot([0,11,16],vals,'o-',label=caption)
ax.axhline(1,color='#64748b',ls='--');ax.set(xlabel='Enabled generic families (isolated catalogue)',ylabel='Geometric mean baseline / selected time',title='Same compiler, more reusable knowledge\n10 kernels × 3 sizes × 3 distributions');ax.legend(fontsize=8)
ax=axes[0,1];rows=[x for x in real['results']if x['name']=='checksum'and x['distribution']=='early']
for lane,caption,color in zip(['after-0','after-16','automatic','lodash-4.17.21'],['Literal Ink','DB laws','Ordinary measured planner','Actual Lodash'],colors):
 ax.plot([x['size']for x in rows],[x['median_ns'][lane]/1000 for x in rows],'o-',label=caption,color=color)
ax.set(xscale='log',yscale='log',xlabel='Actual AST nodes (prefixes, then full AST)',ylabel='Complete call + consumption (µs)',title='Checksum over parsed Lodash source');ax.legend(fontsize=8)
ax=axes[1,0]
for label,caption in [('rust','Native Rust, owned capture'),('rust_wasm','Rust-Wasm, owned capture')]:
 vals=[1,*[summary[label]['geomean'][k]for k in ['11','16','18']]];ax.plot([0,11,16,18],vals,'o-',label=caption)
ax.axhline(1,color='#64748b',ls='--');ax.set(xlabel='Families; 18 forces optional-result alternative',ylabel='Geometric mean baseline / selected time',title='Capability selection is not profitability selection\nAll forced-selection regressions retained');ax.legend(fontsize=8)
ax=axes[1,1]
for backend,caption in [('gpu-required','Actual wgpu'),('cpu','Packed C companion')]:
 for count,style in [(0,'--'),(16,'-')]:
  key=backend+'-'+str(count);ax.plot([x['size']for x in gpu['results']],[x['median_ns'][key]/1000 for x in gpu['results']],style,marker='o',label=caption+(' literal'if count==0 else' + DB law'))
ax.set(xscale='log',yscale='log',xlabel='Numeric elements',ylabel='Complete packed call (µs)',title='Ordered left fold: upload/packing can dominate');ax.legend(fontsize=8)
fig.suptitle('Ink proof growth: measured gains, boundary costs and regressions',fontsize=15);fig.savefig(D/'curves.png',dpi=170);fig.savefig(D/'curves.svg');svg=D/'curves.svg';svg.write_text('\n'.join(x.rstrip()for x in svg.read_text().splitlines())+'\n');print(json.dumps({k:v['geomean']for k,v in summary.items()}))
