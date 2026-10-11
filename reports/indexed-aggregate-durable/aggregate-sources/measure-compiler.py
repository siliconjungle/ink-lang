import json,subprocess,time,pathlib
root=pathlib.Path(__file__).resolve().parents[3];compiler=root/'target/release/ink';source=root/'examples/filtered-aggregate.ink';out=root/'reports/indexed-aggregate-durable/compiler-measurements.json';samples=[]
for round in range(3):
 for label in (['indexed','direct'] if round%2 else ['direct','indexed']):
  request=root/('knowledge/research/indexed-aggregate/request.json' if label=='indexed' else 'knowledge/research/indexed-aggregate/direct.json')
  for phase in ['check','compile']:
   command=[str(compiler),'check-representation' if phase=='check' else 'emit-representation',str(source),str(request)]
   if phase=='compile':command+=['--target','javascript','-o',str(root/'build/indexed-aggregate'/f'{label}-measurement.mjs')]
   start=time.perf_counter_ns();result=subprocess.run(command,capture_output=True,text=True,check=True);elapsed=time.perf_counter_ns()-start
   samples.append(dict(label=label,round=round,phase=phase,ns=str(elapsed),calls=1))
print('checker and literal emission measured');out.write_text(json.dumps(samples,indent=2)+'\n')
