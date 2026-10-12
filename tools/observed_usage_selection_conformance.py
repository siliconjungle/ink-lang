#!/usr/bin/env python3
"""Actual profile discovery and compiler replay; synthetic costs test policy only."""
import argparse,copy,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical
from ink_knowledge.usage_profiles import publish
from ink_knowledge.implementation_candidates import publish_candidates
from ink_planner.representation_selection import phase_workload

def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('--root',type=Path,required=True);p.add_argument('--graph',type=Path,required=True);p.add_argument('--recording',type=Path,required=True);a=p.parse_args();d=a.root.resolve();d.mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve();graph=a.graph.resolve()
 profile=json.loads(a.recording.read_bytes())['profile'];profile['target']['backend']='webgpu'
 original=json.loads((graph/'plan.json').read_bytes());route=dict(original,steps=original['steps'][:1]);store=Store.publish(d/'knowledge',[]);store=publish(store,profile);store,_=publish_candidates(store.root,[route]);store.refresh_index()
 registry=json.loads((ROOT/'knowledge/ink_knowledge/implementation-recipes.json').read_bytes());registry['recipes']=[r for r in registry['recipes'] if r['id'] in ['all-published-packages','graph-resources']];(d/'registry.json').write_bytes(canonical(registry))
 def run():
  command=[sys.executable,'-m','ink_planner.compiled_planning','--compiler',str(compiler),'--source',str(graph/'core.json'),'--core','--knowledge-root',str(store.root),'--registry',str(d/'registry.json'),'--target','webgpu','--budget','64','--state-limit','16','--time-seconds','120','--proposal-timeout','20','--check-timeout','20','-o',str(d/'selected.json')]
  result=subprocess.run(command,capture_output=True,text=True,timeout=300,env=dict(os.environ,PYTHONPATH=os.pathsep.join([str(ROOT/'knowledge'),str(ROOT/'planner')])))
  if result.returncode:raise AssertionError(result.stderr[-6000:])
  return json.loads((d/'selected.json.receipt.json').read_bytes())
 first=run();assert first['selection']['cohorts'],'recording was not automatically discovered';assert not json.loads((d/'selected.json').read_bytes())['steps'],'missing costs must retain baseline'
 # Measure-policy fixture: costs are deliberately synthetic. The source/target,
 # lifecycle phase and candidate identities still use the production protocol.
 store=Store(store.root);base=first['candidates'][0]['measurement'];chosen=None
 for candidate in first['candidates']:
  object_=store.object(candidate['candidate'])['payload']['package']
  selected_resource=next((s['package'] for s in reversed(object_['steps']) if s['kind']=='resources'),None)
  if selected_resource and selected_resource['admission'] and selected_resource['admission']['max_pending']==profile['peak_pending']:
   chosen=candidate['measurement'];break
 assert chosen
 for candidate in first['candidates']:
  for phase in profile['counts']:
   store.observe(dict(schema=1,program=profile['source'],entries=[],plan=candidate['measurement'],target=profile['target'],workload=phase_workload(profile['workload'],phase),metrics=dict(complete_call_ns=['10' if candidate['measurement']==chosen else '100'],peak_bytes=1000)))
 second=run();packet=json.loads((d/'selected.json').read_bytes());assert any(s['kind']=='resources' and s['package']['admission'] for s in packet['steps']),second['selection'];assert second['selection']['reason']=='observed usage with comparable measurements'
 result=dict(status='passed',source=profile['source'],observed_profile=first['selection']['cohorts'][0]['evidence'],candidates=len(second['candidates']),selected=second['selected'],scope='automatic observed usage and frozen compiler admission; synthetic cost policy, not a speed measurement')
 (d/'checks.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
if __name__=='__main__':main()
