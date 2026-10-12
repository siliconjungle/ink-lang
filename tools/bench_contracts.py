#!/usr/bin/env python3
"""Measure replayed contract candidates and publish immutable observations."""
import argparse,hashlib,json,os,statistics,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store
from ink_planner.implementation_selection import measurement_id
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--candidates',type=Path,required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
compiler=a.compiler.resolve();directory=a.candidates.resolve();a.o.mkdir(parents=True,exist_ok=True);out=a.o.resolve();report=json.loads((directory/'candidates.json').read_text());store=Store(directory);core=directory/'input-core.json';phases=[]
def emit(ident):
 package=store.object(ident)['payload']['package'];packet=out/(ident+'.json');packet.write_text(json.dumps(package));artifact=out/(ident+'.mjs')
 start=time.perf_counter_ns();subprocess.run([str(compiler),'build',str(core),'--core','--selection',str(packet),'--target','javascript','-o',str(artifact)],check=True,capture_output=True,text=True);phases.append(dict(candidate=ident,checking_and_emission_ns=str(time.perf_counter_ns()-start)))
 return artifact,package
baseline,_=emit(report['baseline']);candidates=[]
for ident in report['candidates']:
 artifact,package=emit(ident);names=list(package['contract_refinement']['bodies'])
 if len(names)!=1:raise ValueError('benchmark requires one replaced specification per candidate')
 candidates.append(dict(id=ident,path=str(artifact),function=names[0]))
configuration=out/'configuration.json';configuration.write_text(json.dumps(dict(baseline=str(baseline),candidates=candidates)))
raw=subprocess.check_output(['node',str(ROOT/'tools/bench_contracts.mjs'),str(configuration)],text=True);result=json.loads(raw);compiler_hash=hashlib.sha256(compiler.read_bytes()).hexdigest();observations=[];summary=[]
for c in candidates:
 for rows in [64,4096,65536]:
  samples=[m for m in result['measurements']if m['candidate']==c['id']and m['rows']==rows]
  workload=dict(shape=dict(function=c['function'],rows=rows),distribution='ascending-distinct',concurrency=1,residency='immutable-host-arrays')
  for label,ident in [('baseline',report['baseline']),('selected',c['id'])]:
   observations.append(store.observe(dict(schema=1,program=report['source'],entries=[ident],plan=measurement_id(ident,compiler_hash,'javascript'),target=result['target'],workload=workload,metrics=dict(complete_call_ns=[s[label]for s in samples],peak_bytes=None))))
  before=statistics.median(int(s['baseline'])for s in samples);after=statistics.median(int(s['selected'])for s in samples)
  summary.append(dict(function=c['function'],rows=rows,baseline_median_ns=int(before),selected_median_ns=int(after),speedup=before/max(1,after)))
result.update(compiler_sha256=compiler_hash,source=report['source'],observations=observations,phases=phases,summary=summary)
(out/'report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(summary,indent=2))
