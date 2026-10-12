#!/usr/bin/env python3
"""Real checker gates for synthesis, independent search and failed scoring."""
import copy,json,os,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'planner'),str(ROOT/'knowledge')]
from ink_knowledge import Store,semantic_entry,identity
from producers.semantic_laws import examples
compiler=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else ROOT/'target/debug/ink'
env={**os.environ,'PYTHONPATH':str(ROOT/'planner')+':'+str(ROOT/'knowledge')}
with tempfile.TemporaryDirectory(prefix='ink-probabilistic-integration-') as tmp:
 tmp=Path(tmp);source=tmp/'program.ink';core=tmp/'core.json'
 source.write_text('module SynthesisGate;\nfn scalar(x:u32)->u32{return '+'+'.join(['x']*13)+';}\n')
 subprocess.run([compiler,'emit-core',source,'-o',core],check=True,capture_output=True)
 selected=tmp/'selection.json'
 subprocess.run([sys.executable,'-m','ink_planner.synthesis','--compiler',compiler,'--core',core,'--function','scalar','--output-store',tmp/'synthesized','-o',selected],env=env,check=True,capture_output=True)
 package=json.loads(selected.read_text());assert package['applications']
 subprocess.run([compiler,'check-selection',core,selected],check=True,capture_output=True)
 law_id=package['applications'][0]['law'];obj=copy.deepcopy(package['knowledge']['objects'][law_id]);obj['payload']['to']={'sort':{'Value':'U32'},'node':{'Word':0}}
 bad=Store.publish(tmp/'bad',[obj]);bad_id=identity(obj);damaged=copy.deepcopy(package)
 damaged['knowledge']=bad.bundle([bad_id]);damaged['applications'][0]['law']=bad_id
 invalid=tmp/'invalid.json';invalid.write_text(json.dumps(damaged))
 assert subprocess.run([compiler,'check-selection',core,invalid],capture_output=True).returncode!=0
 store=Store.publish(tmp/'knowledge',[semantic_entry(l)for l in examples()]);snapshot=store.data/'snapshot.json'
 output=tmp/'parallel.json'
 subprocess.run([sys.executable,'-m','ink_planner.parallel_search','--compiler',compiler,'--core',core,'--knowledge-root',store.root,'--snapshot',snapshot,'--workers','2','--budget','8','-o',output],env=env,check=True,capture_output=True)
 receipt=json.loads(output.with_suffix('.receipt.json').read_text());assert receipt['attempts']<=8
 subprocess.run([compiler,'check-selection',core,output],check=True,capture_output=True)
 fallback=tmp/'fallback.json'
 subprocess.run([sys.executable,'-m','ink_planner.semantic_search','--compiler',compiler,'--core',core,'--knowledge-root',store.root,'--snapshot',snapshot,'--search-strategy','stochastic','--selfhost-endpoint','http://127.0.0.1:1/compute','--budget','8','-o',fallback],env=env,check=True,capture_output=True)
 subprocess.run([compiler,'check-selection',core,fallback],check=True,capture_output=True)
 print(json.dumps(dict(status='passed',checks=['source-bound synthesized proof','authenticated false theorem rejected','parallel global proof budget','final parallel proof replay','unavailable selfhost retains checked result'])))
