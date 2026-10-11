"""Import the real repeated samples into the existing implementation selector.

Usage: PYTHONPATH=knowledge:planner python select-benchmark.py COMPILER SOURCE
       INDEXED_REQUEST GROUPED_REQUEST SCRATCH_DATABASE OUTPUT_DIRECTORY
Read profiles price precompiled setup, reads and clean-state checkpoint/GC.
Write profiles price warm calls in independent restored cohorts; dirty teardown
was not acquired. Offline proof/search/compiler costs and memory are unmeasured;
no live migration is requested.
"""
import hashlib,json,subprocess,sys
from pathlib import Path
from ink_knowledge import canonical
from ink_knowledge.implementation_candidates import identity_selection,publish_candidates
from ink_planner.implementation_selection import measurement_id
from ink_planner.representation_selection import phase_workload

compiler,source,indexed,grouped,database,output=map(lambda p:Path(p).resolve(),sys.argv[1:])
report=Path(__file__).resolve().parent
manifest=json.loads((report/'provenance.json').read_bytes())
samples=json.loads((report/'javascript.json').read_bytes())
compiler_hash=hashlib.sha256(compiler.read_bytes()).hexdigest()
assert compiler_hash==manifest['acquisition_compiler_sha256'],'reacquire samples for this compiler'
requests=[json.loads(p.read_bytes()) for p in [indexed,grouped]]
program=requests[0]['input_core_sha256']
assert program==manifest['program']==requests[1]['input_core_sha256']
store,ids=publish_candidates(database,[identity_selection(program),*requests])
target=dict(hardware=manifest['hardware'],driver=manifest['node'],toolchain=compiler_hash,
            backend='javascript',bridge='host')
workload=dict(shape={'rows':samples['rows'],'row':'general-indexed'},
              distribution='repeated exact histories; 96 calls; independent restored states',
              concurrency=1,residency='restored')
observations=[]
for label,candidate in zip(['ordinary','indexed','grouped'],ids):
 for phase in sorted({s['phase'] for s in samples['measurements']}):
  values=[str(int(s['ns'])//s['calls']) for s in samples['measurements'] if s['label']==label and s['phase']==phase]
  observation=dict(schema=1,program=program,entries=[candidate],
    plan=measurement_id(candidate,compiler_hash,'javascript'),target=target,
    workload=phase_workload(workload,phase),metrics=dict(complete_call_ns=values,peak_bytes=None))
  store.observe(observation);observations.append(observation)
output.mkdir(parents=True,exist_ok=True)
for name,value in [('target',target),('workload',workload),('candidates',ids[1:]),('observations',observations)]:
 (output/(name+'.json')).write_bytes(canonical(value)+b'\n')
profiles={
 'writes':{'action:'+a:96 for a in ['edits','replace_remove','remove_replace','erase']},
 'cached-reads':{'initialise':1,'teardown':1,**{'action:'+a:10000 for a in ['weighted_query','labelled','any_mark','joined']}},
 'dynamic-reads':{'initialise':1,'teardown':1,**{'action:'+a:96 for a in ['dynamic','for_owner','floating']}},
 'indexed-erases':{'action:erase':96},
}
receipts={}
for name,profile in profiles.items():
 path=output/(name+'.profile.json');path.write_bytes(canonical(profile))
 command=[sys.executable,'planner/select_implementation.py','--compiler',str(compiler),'--source',str(source),
  '--knowledge-root',str(database),'--baseline',ids[0],'--candidates',str(output/'candidates.json'),
  '--emit-target','javascript','--check-timeout-seconds','600','--target',str(output/'target.json'),
  '--workload',str(output/'workload.json'),'--profile',str(path),'-o',str(output/(name+'.package.json'))]
 if name=='indexed-erases':
  command[command.index('--baseline')+1]=ids[1]
 result=subprocess.run(command,capture_output=True,text=True,timeout=1800)
 assert result.returncode==0,result.stderr
 receipts[name]=json.loads(result.stdout)
 assert receipts[name]['checked']==3 and not receipts[name]['rejected']
assert receipts['writes']['selected']==ids[0]
assert receipts['dynamic-reads']['selected']==ids[0]
assert receipts['cached-reads']['selected']!=ids[0]
assert receipts['indexed-erases']['selected']==ids[2]
(output/'selection-summary.json').write_bytes(canonical(dict(
 compiler_sha256=compiler_hash,program=program,candidates=dict(zip(['ordinary','indexed','grouped'],ids)),
 scope=__doc__,receipts=receipts))+b'\n')
print('Real measured writes and dynamic queries retain baseline; cached reads select a checked physical candidate.')
