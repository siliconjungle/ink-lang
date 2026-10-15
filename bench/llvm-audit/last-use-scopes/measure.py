import argparse,hashlib,json,statistics,subprocess
from pathlib import Path
parser=argparse.ArgumentParser()
parser.add_argument('--clients',type=Path,required=True,help='Directory containing last-use-scopes-before and last-use-scopes-after')
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--baseline',type=Path,required=True,help='Baseline provenance JSON')
parser.add_argument('--candidate-source',type=Path,required=True,help='Candidate last_use.rs')
parser.add_argument('--probe',type=Path,default=Path(__file__).with_name('probe.rs'))
args=parser.parse_args();scratch=args.clients.resolve();out=args.output.resolve();out.mkdir(parents=True,exist_ok=False);records=[]
for mode in ['small','wide','shadow','callbacks','branches','depth_guard']:
 samples={v:[] for v in ['before','after']};allocations={v:set() for v in samples};volumes={v:set() for v in samples};outputs={v:set() for v in samples}
 for trial in range(9):
  for variant in (['before','after'] if trial%2==0 else ['after','before']):
   artifact=out/f'{mode}-{variant}-{trial}.trace'
   run=subprocess.run([str(scratch/('last-use-scopes-'+variant)),mode,'3',str(artifact)],capture_output=True,text=True,check=True,timeout=60)
   rows=[json.loads(line) for line in run.stdout.splitlines()];assert len(rows)==3
   assert all(r['case']==mode and r['admitted']==(mode!='depth_guard') for r in rows)
   (out/f'{mode}-{variant}-{trial}.samples.json').write_text(json.dumps(rows,indent=2)+'\n')
   samples[variant].extend(r['ns'] for r in rows);allocations[variant].update(r['allocations'] for r in rows);volumes[variant].update(r['requested_bytes'] for r in rows);outputs[variant].add(artifact.read_text())
 assert outputs['before']==outputs['after'] and len(outputs['before'])==1
 assert all(len(s)==1 for s in [*allocations.values(),*volumes.values()])
 value=next(iter(outputs['before']))
 if mode=='depth_guard':assert all(line=='0 0' for line in value.splitlines())
 medians={v:statistics.median(s) for v,s in samples.items()}
 row={'case':mode,'admitted':mode!='depth_guard','trials':9,'runs_per_trial':3,'median_ns':medians,'after_over_before':medians['after']/medians['before'],'allocation_calls':{v:next(iter(s)) for v,s in allocations.items()},'requested_bytes':{v:next(iter(s)) for v,s in volumes.items()},'samples_ns':samples,'fact_trace_sha256':hashlib.sha256(value.encode()).hexdigest(),'nodes':len(value.splitlines()),'identical_whole_and_field_facts':True}
 records.append(row)
 (out/'results.json').write_text(json.dumps({'scope':'Actual debug ink_core last_use analysis, identical optimized allocation-instrumented clients, shared-machine contention. Each performance subject is admitted by CheckedModule before timing; depth_guard is explicitly unadmitted. Time includes analyse only; requested bytes are cumulative allocation volume, not RSS. No generated-code runtime speed claim. Nine alternating fresh-process pairs, three analysis calls each. Exact preorder whole and field node facts compared.','baseline':json.loads(args.baseline.read_text()),'candidate_last_use_sha256':hashlib.sha256(args.candidate_source.read_bytes()).hexdigest(),'probe_sha256':hashlib.sha256(args.probe.read_bytes()).hexdigest(),'binaries':{v:hashlib.sha256((scratch/('last-use-scopes-'+v)).read_bytes()).hexdigest() for v in samples},'cases':records,'complete':len(records)==6},indent=2)+'\n')
 print(json.dumps({k:v for k,v in row.items() if k!='samples_ns'}),flush=True)
