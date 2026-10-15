import json,subprocess,tempfile,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_planner.target_costs import TargetCostModel,COMPONENTS
compiler=Path(sys.argv[1]).resolve()
with tempfile.TemporaryDirectory(prefix='ink-agreeing-branch-')as tmp:
 d=Path(tmp);source=d/'source.ink';core=d/'core.json';subject=d/'subject.json'
 source.write_text('module AgreeingBranch;fn run(gate:Bool,xs:List<u32>,ys:List<u32>)->List<u32>{return choose(choose(gate,true,true),ys.map(fn(x)=>x+1),xs.map(fn(x)=>x+1));}')
 for command in [[compiler,'emit-core',source,'-o',core],[compiler,'emit-semantic',core,'--core','-o',subject]]:
  subprocess.run(command,capture_output=True,text=True,check=True)
 program=json.loads(core.read_text())['program'];bodies=json.loads(subject.read_text())['functions']
 model=TargetCostModel(dict(schema=2,target='javascript',boundary='owned',cardinality=dict(default=10,by_parameter={'xs':7,'ys':3}),weights={k:1 if k in ['unknown_work','traversal_elements'] else 0 for k in COMPONENTS}))
 result=model.estimate_function('run',bodies,program)
 assert result['components']['traversal_elements']==3
 for gate in [False,True]:
  args=d/'args.json';args.write_text(json.dumps([gate,list(range(7)),[10,20,30]]))
  run=subprocess.run([compiler,'run',core,'run',args,'--core'],capture_output=True,text=True,check=True)
  assert json.loads(run.stdout)==[11,21,31]
 print(json.dumps({'estimate':result,'subject':bodies,'core':json.loads(core.read_text()),'expected_traversal':3,'scope':'Actual checked source; unknown outer gate selects the same Bool value on both branches, so outer choose executes only ys traversal.'},indent=2))
