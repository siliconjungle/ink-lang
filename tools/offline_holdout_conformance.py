#!/usr/bin/env python3
"""Exercise public compilation, proof replay and measured holdout rejection.

Fresh inputs are never offered to candidate search. Timing determines acceptance
on this host; this test checks the protocol, not a required speedup.
"""
import argparse,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,semantic_entry,canonical

def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('--root',type=Path,required=True);a=p.parse_args()
 d=a.root.resolve();d.mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve()
 # Explicit isolated snapshot: one general map/take law, no recorded programs
 # or incumbent measurements. Every concrete use still needs compiler proof.
 law=json.loads((ROOT/'core/tests/fixtures/list-slice-laws.json').read_bytes())[0]
 store=Store.publish(d/'knowledge',[semantic_entry(law)])
 registry=json.loads((ROOT/'knowledge/ink_knowledge/implementation-recipes.json').read_bytes())
 registry['recipes']=[r for r in registry['recipes']if r['id']=='semantic-laws']
 (d/'registry.json').write_bytes(canonical(registry))
 cases=[]
 for index,(name,n,cut)in enumerate([('odd_prefix',4096,1),('renamed_window',8192,3)]):
  run=d/str(index);run.mkdir(exist_ok=True)
  source=run/'program.ink';source.write_text(f'module measured_{index}; pub fn {name}(xs:List<u32>,n:u32)->List<u32>{{return xs.map(fn(x)=>(x*13)+7).take(n);}}\n')
  def workload(rows,shift,take,distribution):
   return dict(schema=1,phases={f'call:{name}':[dict(function=name,args=[[(i*17+shift)&0xffffffff for i in range(rows)],take])]},
    profile={f'call:{name}':100},workload=dict(shape={'rows':rows,'take':take},distribution=distribution,concurrency=1,residency='owned JSON inputs and consumed output'))
  train=run/'train.json';holdout=run/'holdout.json'
  train.write_text(json.dumps(workload(n,0,cut,'selection increasing values')))
  holdout.write_text(json.dumps(workload(n*2,4294967000,cut+1,'held-out size and wrapping values')))
  output=run/'selected.mjs'
  command=[str(compiler),'compile',str(source),'--optimise',str(store.root),'--target','javascript','--registry',str(d/'registry.json'),
   '--search-budget','32','--state-limit','4','--planning-seconds','40','--semantic-seconds','20',
   '--measure-workload',str(train),'--measure-holdout',str(holdout),'--measure-processes','3','--measure-timeout','60',
   '--minimum-measured-gain-ppm','100000','-o',str(output)]
  result=subprocess.run(command,capture_output=True,text=True,timeout=180,env=dict(os.environ,PYTHONPATH=os.pathsep.join([str(ROOT/'knowledge'),str(ROOT/'planner')])));
  (run/'compile.log').write_text(result.stdout+'\n'+result.stderr)
  if result.returncode:raise AssertionError(result.stderr[-6000:])
  receipt=json.loads(Path(str(output)+'.planning.json.receipt.json').read_bytes())
  assert receipt['status']=='checked' and len(receipt['candidates'])>=2,receipt
  selection=receipt['selection'];assert selection['uncertainty_guard']['minimum_gain_ppm']==100000
  held=selection['holdout'];assert held['acquisition']['workload_sha256']!=receipt['measurement_acquisition']['workload_sha256']
  assert receipt['measurement_acquisition']['acquisition']['processes']==held['acquisition']['acquisition']['processes']==3
  # Holdout acquisition is restricted to baseline + one frozen incumbent.
  assert 1<=len(held['acquisition']['artifacts'])<=2
  packet=json.loads(Path(str(output)+'.planning.json').read_bytes())
  if not held['accepted']:assert packet['steps']==[]
  if packet['steps']:assert held['accepted']
  replay=subprocess.run([str(compiler),'check-plan',str(source),str(output)+'.planning.json','--target','javascript'],capture_output=True,text=True)
  assert replay.returncode==0,replay.stderr
  # Input formatting must not make training data pass as independent evidence.
  overlap=run/'overlapping.json';overlap.write_text(json.dumps(json.loads(train.read_text()),indent=4))
  negative=list(command);negative[negative.index('--measure-holdout')+1]=str(overlap)
  rejected=subprocess.run(negative,capture_output=True,text=True,timeout=30)
  assert rejected.returncode and 'overlap' in rejected.stderr,rejected.stderr
  cases.append(dict(name=name,source=receipt['source'],candidates=len(receipt['candidates']),selected=receipt['selected'],selected_steps=len(packet['steps']),holdout_accepted=held['accepted'],selection=selection))
 report=dict(status='passed',cases=cases,scope='Public compiler and proof-checked candidates on fresh programs/inputs; empirical timing gate, no framework or generalisation claim')
 (d/'checks.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(dict(status='passed',cases=len(cases),selected_steps=[c['selected_steps']for c in cases])))
if __name__=='__main__':main()
