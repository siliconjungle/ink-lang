"""Reproducible discovery, memory and traversal curves with paired intervals."""
import argparse,json,math,random,statistics,sys
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'bench/composable-knowledge'))
from report import interval

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'docs/evidence/discovery-reuse');a=p.parse_args();out=a.output;out.mkdir(parents=True,exist_ok=True)
 raw=json.loads((ROOT/'build/discovery-reuse/results.json').read_bytes());execution=json.loads((ROOT/'build/traversal-elimination/results.json').read_bytes());summary=dict(discovery=[],matching=[],javascript={})
 for row in raw['results']:
  lanes={lane:interval([([r['seconds']for r in row['samples']['baseline']],[r['seconds']for r in row['samples'][lane]])])for lane in ['structure','reuse','bounded-read','combined']}
  memory={lane:statistics.median(r['peak_python_bytes']for r in samples)for lane,samples in row['samples'].items()}
  summary['discovery'].append(dict(functions=row['functions'],lanes=lanes,median_peak_python_bytes=memory,laws=row['samples']['combined'][0]['laws']))
 for row in raw['same_head_matching']:summary['matching'].append(dict(templates=row['templates'],inference_attempts=row['inference_attempts'],**interval([(row['samples_seconds']['baseline'],row['samples_seconds']['structure'])])))
 for name in sorted({r['fn']for r in execution['results']}):
  cells=[r for r in execution['results']if r['fn']==name and r['size']>0]
  summary['javascript'][name]=interval([(r['samples_ns']['literal'],r['samples_ns']['selected'])for r in cells])
 summary['native']={};native_reports={}
 for target,file in [('Rust','native.json'),('Rust-Wasm','wasm.json')]:
  data=json.loads((ROOT/'build/traversal-elimination/native'/file).read_bytes());native_reports[target]=data;summary['native'][target]={}
  for name in sorted({r['fn']for r in data['results']}):
   cells=[r for r in data['results']if r['fn']==name and r['size']>0]
   summary['native'][target][name]=interval([(r['samples_ns']['literal'],r['samples_ns']['selected'])for r in cells])
 summary['regressions']=[dict(fn=r['fn'],size=r['size'],ratio=r['median_ns']['literal']/r['median_ns']['selected'])for r in execution['results']if r['median_ns']['selected']>r['median_ns']['literal']]
 summary['native_regressions']={target:[dict(fn=r['fn'],size=r['size'],ratio=statistics.median(r['samples_ns']['literal'])/statistics.median(r['samples_ns']['selected']))for r in data['results']if statistics.median(r['samples_ns']['selected'])>statistics.median(r['samples_ns']['literal'])]for target,data in native_reports.items()}
 for name,value in [('discovery.json',raw),('traversals.json',execution),('native.json',native_reports['Rust']),('wasm.json',native_reports['Rust-Wasm']),('summary.json',summary)]: (out/name).write_text(json.dumps(value,indent=2)+'\n')
 plt.rcParams.update({'font.size':10});fig,axes=plt.subplots(2,3,figsize=(16,9))
 ax=axes[0,0]
 for lane,label in [('baseline','Previous'),('structure','Structure only'),('reuse','Reuse only'),('bounded-read','Sized reads only'),('combined','Combined')]:ax.plot([r['functions']for r in raw['results']],[r['median_seconds'][lane]*1000 for r in raw['results']],marker='o',label=label)
 ax.set(xlabel='Functions (repeated existing corpus)',ylabel='Discovery + instantiation (ms)',title='Complete discovery: same canonical laws');ax.legend()
 ax=axes[0,1]
 for lane in ['baseline','combined']:ax.plot([r['functions']for r in summary['discovery']],[r['median_peak_python_bytes'][lane]/1024**2 for r in summary['discovery']],marker='o',label=lane)
 ax.set(xlabel='Functions',ylabel='Traced Python peak (MiB)',title='Memory measured separately');ax.legend()
 ax=axes[0,2]
 for lane in ['baseline','structure']:ax.plot([r['templates']for r in raw['same_head_matching']],[r['median_seconds'][lane]*1000 for r in raw['same_head_matching']],marker='o',label=lane)
 ax.set(xlabel='Same-head templates / typed sites (stress)',ylabel='Matching + indexing (ms)',title='Literal discrimination; no DB or proof costs');ax.legend()
 ax=axes[1,0]
 for name in summary['javascript']:
  cells=[r for r in execution['results']if r['fn']==name and r['size']>0];ax.plot([r['size']for r in cells],[r['median_ns']['literal']/r['median_ns']['selected']for r in cells],marker='o',label=name)
 ax.set(xlabel='Rows per input',ylabel='Original / selected complete JS call',title='Forced traversal elimination: designed kernels',xscale='log',yscale='log');ax.axhline(1,color='grey',linestyle='--');ax.legend(fontsize=8)
 for at,(target,data)in enumerate(native_reports.items(),1):
  ax=axes[1,at]
  for name in summary['native'][target]:
   cells=[r for r in data['results']if r['fn']==name and r['size']>0];ax.plot([r['size']for r in cells],[statistics.median(r['samples_ns']['literal'])/statistics.median(r['samples_ns']['selected'])for r in cells],marker='o',label=name)
  ax.set(xlabel='Rows per input',ylabel='Original / selected complete JSON call',title=target+': conversion and output charged',xscale='log');ax.axhline(1,color='grey',linestyle='--');ax.legend(fontsize=8)
 fig.tight_layout();fig.savefig(out/'curves.png',dpi=180);fig.savefig(out/'curves.svg');print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
