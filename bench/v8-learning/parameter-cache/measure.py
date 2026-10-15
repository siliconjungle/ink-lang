from pathlib import Path
import argparse,json,subprocess,sys,hashlib,statistics
sys.path.insert(0,'planner');sys.path.insert(0,'knowledge')
from ink_planner.value_transfer import transfer
saved=Path(__file__).resolve().parent
args=argparse.ArgumentParser();args.add_argument('--output',type=Path,required=True);args.add_argument('--compiler',type=Path,default=Path('target/debug/ink'));args=args.parse_args()
p=args.output.resolve();p.mkdir(parents=True,exist_ok=False);compiler=args.compiler.resolve();source=saved/'source.ink'
receipt=json.loads((saved/'receipt.json').read_text())
actual_compiler=hashlib.sha256(compiler.read_bytes()).hexdigest()
(p/'reproduction-context.json').write_text(json.dumps(dict(original_compiler=receipt['compiler_sha256'],actual_compiler=actual_compiler),indent=2)+'\n')
def run(*args):
 r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=120)
 if r.returncode:raise RuntimeError(r.stderr[-3000:])
 return r.stdout
from producers.representations import generate
model=json.loads(run(compiler,'emit-action-model',source,'-o',p/'measure-model.json')and(p/'measure-model.json').read_text())
proposal=generate(model,p/'measure-store',cache_query='score',preserve_cache=True,cache_arguments=[7,True])
(p/'measure-representation.json').write_text(json.dumps(proposal['requests'][1]))
run(compiler,'build',source,'--target','javascript','-o',p/'baseline.mjs')
run(compiler,'emit-representation',source,p/'measure-representation.json','--target','javascript','-o',p/'selected.mjs')
for name in ['baseline.mjs','selected.mjs']:
 if (p/name).read_bytes()!=(saved/name).read_bytes():raise ValueError('rebuilt artifact differs from retained measurement input: '+name)
metadata=json.loads(run('node','planner/ink_planner/measure_state.mjs','--describe',p/'baseline.mjs'))
artifacts=[dict(measurement=n,path=str(p/(f+'.mjs')),artifact_sha256=hashlib.sha256((p/(f+'.mjs')).read_bytes()).hexdigest())for n,f in [('baseline','baseline'),('cached','selected')]]
summary={}
for split,n in [('training',128),('heldout',193)]:
 setup=[dict(call='put',args=[i,(i*17+3)%257,False])for i in range(n)]
 phases=dict(load=dict(kind='module_load'),initialise=dict(kind='initialise'),hot=dict(kind='history',calls=[dict(call='score',args=[7,True])for _ in range(256)]),cold=dict(kind='history',calls=[dict(call='score',args=[8+(i%3),bool(i%2)])for i in range(16)]),edit=dict(kind='history',calls=[dict(call='put',args=[n//2,999,False]),dict(call='score',args=[7,True]),dict(call='put',args=[0,99,True]),dict(call='score',args=[7,True])]),checkpoint=dict(kind='checkpoint'),restore=dict(kind='restore'))
 def oracle(calls,label):
  script=p/(split+'-'+label+'.calls.json');script.write_text(json.dumps(calls));snapshot=p/(split+'-'+label+'.snapshot')
  expected=json.loads(run(compiler,'execute',source,script,'--portable','--snapshot-out',snapshot))
  return transfer(expected),snapshot.read_bytes().hex()
 setup_expected,seed=oracle(setup,'setup');converted={}
 for name,phase in phases.items():
  expected,snapshot=oracle(setup+phase.get('calls',[]),name)
  converted[name]=dict(phase,expected=expected,snapshot=snapshot)
  if 'calls'in phase:converted[name]['calls']=transfer(phase['calls'])
 packet=dict(artifacts=artifacts,metadata=metadata,setup=transfer(setup),setup_expected=setup_expected,seed=seed,phases=converted)
 request=p/(split+'-measurement.json');reports=[]
 for process in range(3):
  request.write_text(json.dumps(dict(packet,process_index=process)))
  report=json.loads(run('node','--expose-gc','planner/ink_planner/measure_state.mjs',request))
  if report['rejected']:raise RuntimeError(str(report['rejected']))
  (p/(split+'-'+str(process)+'.samples.json')).write_text(json.dumps(report,indent=2)+'\n');reports.append(report)
 weights=dict(load=1,initialise=1,hot=100,cold=10,edit=10,checkpoint=1,restore=1)
 medians={lane:{phase:statistics.median([int(x)for r in reports for row in r['rows']if row['measurement']==lane and row['phase']==phase for x in row['complete_call_ns']])for phase in phases}for lane in ['baseline','cached']}
 totals={lane:sum(weights[k]*v for k,v in rows.items())for lane,rows in medians.items()}
 summary[split]=dict(setup_rows=n,weights=weights,phase_medians_ns=medians,weighted_total_ns=totals,speedup=totals['baseline']/totals['cached'],node=reports[0]['node'])
 print(split,summary[split],flush=True)
(p/'measure-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
