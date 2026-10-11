import json,subprocess,time,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[3];compiler=root/'target/release/ink';source=root/'examples/filtered-aggregate.ink';out=root/'reports/indexed-aggregate-durable/compiler-measurements.json';samples=[]
sys.path.insert(0,str(root/'knowledge'))
from ink_knowledge.implementation_candidates import identity_selection
from ink_knowledge import canonical
core=root/'build/indexed-aggregate/measurement-core.json'
program=json.loads(subprocess.run([str(compiler),'emit-core',str(source),'-o',str(core)],capture_output=True,text=True,check=True).stdout)['core_sha256']
baseline=root/'build/indexed-aggregate/identity-selection.json';baseline.write_bytes(canonical(identity_selection(program))+b'\n')
for round in range(3):
 for label in (['indexed','direct','source'] if round%2 else ['source','direct','indexed']):
  request=root/('knowledge/research/indexed-aggregate/request.json' if label=='indexed' else 'knowledge/research/indexed-aggregate/direct.json')
  for phase in ['check','compile']:
   if label=='source':
    command=[str(compiler),'check-selection',str(core),str(baseline)] if phase=='check' else [str(compiler),'build',str(source),'--selection',str(baseline),'--target','javascript','-o',str(root/'build/indexed-aggregate/source-measurement.mjs')]
   else:
    command=[str(compiler),'check-representation' if phase=='check' else 'emit-representation',str(source),str(request)]
    if phase=='compile':command+=['--target','javascript','-o',str(root/'build/indexed-aggregate'/f'{label}-measurement.mjs')]
   start=time.perf_counter_ns();result=subprocess.run(command,capture_output=True,text=True,check=True);elapsed=time.perf_counter_ns()-start
   samples.append(dict(label=label,round=round,phase=phase,ns=str(elapsed),calls=1))
print('checker and literal emission measured');out.write_text(json.dumps(samples,indent=2)+'\n')
