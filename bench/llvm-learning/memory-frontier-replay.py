"""Use real checker states to test search past an oversized equivalent proof chain."""
import hashlib,json,subprocess,sys,tempfile
from pathlib import Path
from types import SimpleNamespace
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import canonical
from ink_knowledge.implementation_candidates import identity_selection
from ink_planner.compiled_planning import Planner,explore,fingerprint
compiler=Path(sys.argv[1]).resolve()
with tempfile.TemporaryDirectory(prefix='ink-memory-frontier-')as temporary:
 d=Path(temporary);source=d/'source.ink';core=d/'core.json'
 source.write_text('module memory_frontier;fn run(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}')
 result=subprocess.run([compiler,'emit-core',source,'-o',core],capture_output=True,text=True,check=True)
 sid=json.loads(result.stdout)['core_sha256']
 planner=Planner.__new__(Planner);planner.compiler=compiler;planner.original=core
 planner.compiler_hash=hashlib.sha256(compiler.read_bytes()).hexdigest();planner.options=SimpleNamespace(target='rust',check_timeout=60)
 planner.admissions={};planner.session=None;planner.reused_steps=0
 try:
  initial=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=sid,steps=[])
  physical=dict(kind='physical',package=dict(schema=1,semantics='ink-physical-plan-v1',input_core_sha256=sid,buffers='direct',tables='ordered',borrow_reads=[],borrow_rows=[],definitions='shared',packed_datatypes=[],memo_functions=[],columns=[]))
  noop=dict(kind='rewrite',package=identity_selection(sid))
  large=dict(initial,steps=[noop]*20+[physical]);small=dict(initial,steps=[physical])
  checked=[planner.check(p)for p in [initial,large,small]]
  assert fingerprint(checked[1])==fingerprint(checked[2])!=fingerprint(checked[0])
  sizes=[len(canonical(p))+len(canonical(s))for p,s in zip([initial,large,small],checked)]
  cap=sizes[0]+sizes[2];assert sizes[0]+sizes[1]>cap
  attempted=[]
  def expand(state,states):
   if state['source']==sid and not state.get('physical'):
    for name,p in [('large',large),('small',small)]:
     attempted.append(name);yield dict(status='proposal',label=name,steps=p['steps'])
  states,receipt=explore(initial,expand,planner.check,lambda _:0,memory_bytes=cap,time_seconds=30)
  result=dict(sizes=dict(baseline=sizes[0],large=sizes[1],small=sizes[2]),cap=cap,attempted=attempted,retained=len(states),shorter_retained=any(p==small for p,_ in states.values()),receipt=receipt,scope='Real plan-session proof replay; constructed search memory case, not runtime performance.')
  assert result['shorter_retained'] and receipt['retained_bytes']==cap
  assert receipt['memory_deferred']==1 and receipt['stop_reason']=='memory'
  print(json.dumps(result,indent=2))
 finally:planner.close()
