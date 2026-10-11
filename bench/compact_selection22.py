"""External bounded catalogue admission, unchanged planner search and checker.

Every discovered root is checked in deterministic dependency-closed batches.
An aggregate work/depth failure is split; a failing singleton aborts. Discovery
and cost policy are unchanged. Each proposed/final selection independently
passes ordinary check-selection against its exact minimal closure/full snapshot.
"""
import hashlib,json,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store
from ink_planner.semantic_search import SEMANTICS,key,search,load_cost_model,selection_roots

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def encoded(v):return json.dumps(v,separators=(',',':')).encode()+b'\n'
def digest(v):return hashlib.sha256(encoded(v)).hexdigest()
def plan(compiler,core,store,model,out,budget=4096):
 compiler,core,model,out=map(lambda p:Path(p).resolve(),(compiler,core,model,out));store=store if isinstance(store,Store) else Store(store)
 if not 0<=budget<=4096:raise ValueError('budget must be between0and4096')
 compiler_hash=sha(compiler);policy_hash=sha(ROOT/'planner/ink_planner/semantic_search.py');helper_hash=sha(__file__);model_hash=sha(model);receipt_path=out.with_suffix('.receipt.json');failure_path=out.with_suffix('.admission-failure.json')
 if out.exists() and receipt_path.exists():
  r=json.loads(receipt_path.read_text())
  if r['compact_selection_sha256']!=sha(out) or r['search']['compiler_sha256']!=compiler_hash or r['search']['database']['snapshot_sha256']!=store.snapshot_id or r['search']['cost_model']['sha256']!=model_hash or r['orchestration']['helper_sha256']!=helper_hash or r['orchestration']['planner_sha256']!=policy_hash:raise ValueError('cached bytes/policy/catalogue drift')
  c=subprocess.run([str(compiler),'check-selection',str(core),str(out)],capture_output=True,text=True)
  if c.returncode:raise RuntimeError(c.stderr)
  return r
 prices=load_cost_model(model);out.parent.mkdir(parents=True,exist_ok=True);admissions=[];proposals=[]
 with tempfile.TemporaryDirectory(prefix='ink-compact22-') as tmp:
  tmp=Path(tmp);subject_path=tmp/'subject.json'
  command=[str(compiler),'emit-semantic',str(core),'--core','-o',str(subject_path)];c=subprocess.run(command,capture_output=True,text=True)
  if c.returncode:raise RuntimeError(c.stderr)
  subject=json.loads(subject_path.read_text());sorts={}
  def walk(v):
   if isinstance(v,dict):
    if 'sort' in v:sorts[key(v['sort'])]=v['sort']
    for x in v.values():walk(x)
   elif isinstance(v,list):
    for x in v:walk(x)
  walk(subject);roots=set();queries=[]
  for sort in sorts.values():
   found=store.query(kind='rewrite',semantics=SEMANTICS,result=sort,limit=min(1024,max(1,budget)));roots.update(found);queries.append(dict(sort=sort,roots=found))
  roots=sorted(roots);view=store.bundle(roots)
  catalogue=dict(roots=view['roots'],objects={i:dict(schema=1,semantics=e['semantics'],dependencies=e['dependencies'],**e['payload']) for i,e in view['objects'].items()})
  def admit(part,level=0):
   bundle=store.bundle(part);path=tmp/f'admission-{len(admissions)}.json';path.write_bytes(encoded(bundle));argv=[str(compiler),'knowledge-check',str(core),str(path)];r=subprocess.run(argv,capture_output=True,text=True)
   row=dict(roots=part,closure=sorted(bundle['objects']),view_sha256=sha(path),view_bytes=path.stat().st_size,argv=argv,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr,split_depth=level);admissions.append(row)
   if r.returncode:
    if 'semantic proof work/depth limit' in r.stderr and len(part)>1:
     row['action']='split aggregate budget';half=len(part)//2;admit(part[:half],level+1);admit(part[half:],level+1)
    else:
     row['action']='abort; no candidate excluded';failure_path.write_bytes(encoded(dict(status='failed',snapshot=store.snapshot_id,queries=queries,all_roots=roots,admissions=admissions)));raise RuntimeError('ordinary checker rejected dependency-closed catalogue batch:\n'+r.stderr)
   else:row['action']='accepted'
  for offset in range(0,len(roots),64):admit(roots[offset:offset+64])
  admitted=set().union(*(set(r['roots']) for r in admissions if r['exit_code']==0));assert admitted==set(roots)
  def check(applications):
   selected=selection_roots(applications);package=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=store.bundle(selected),applications=applications);path=tmp/'candidate-selection.json';path.write_bytes(encoded(package));argv=[str(compiler),'check-selection',str(core),str(path)];r=subprocess.run(argv,capture_output=True,text=True);proposals.append(dict(applications_sha256=digest(applications),roots=selected,closure=sorted(package['knowledge']['objects']),package_sha256=sha(path),exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr));return r.returncode==0
  if not check([]):raise RuntimeError('checker rejected empty selection')
  applications,stats=search(subject,catalogue,check,budget,operation_costs=prices)
  if not check(applications):raise RuntimeError('checker rejected final selected application list')
  full=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=view,applications=applications);package=dict(full,knowledge=store.bundle(selection_roots(applications)));out.write_bytes(encoded(package));argv=[str(compiler),'check-selection',str(core),str(out)];r=subprocess.run(argv,capture_output=True,text=True)
  if r.returncode:raise RuntimeError(r.stderr)
  if sha(compiler)!=compiler_hash or sha(ROOT/'planner/ink_planner/semantic_search.py')!=policy_hash or sha(model)!=model_hash or sha(__file__)!=helper_hash:raise ValueError('compiler/planner/model/helper changed during preparation')
  result=dict(status='passed',command=command,search=dict(compiler_sha256=compiler_hash,database=dict(snapshot_sha256=store.snapshot_id,entries=len(roots),loaded_objects=len(view['objects'])),cost_model=dict(path=str(model),sha256=model_hash,operation_costs=prices,scope='Untrusted compile-time hypothesis, not runtime evidence'),**stats),full_selection_sha256=digest(full),full_selection_bytes=len(encoded(full)),full_roots=len(roots),full_objects=len(view['objects']),applications_sha256=digest(applications),compact_selection_sha256=sha(out),compact_selection_bytes=out.stat().st_size,selected_roots=selection_roots(applications),loaded_dependency_objects=len(package['knowledge']['objects']),check=json.loads(r.stdout),orchestration=dict(schema=1,helper_sha256=helper_hash,planner_sha256=policy_hash,discovery='Exact unchanged semantic_search type-indexed query, root ordering, budget, search and operation prices',queries=queries,discovery_roots=roots,discovery_closure=sorted(view['objects']),discovery_view_sha256=digest(view),discovery_view_bytes=len(encoded(view)),admission_initial_max_roots=64,admissions=admissions,selection_checks=proposals,scope='All discovered candidates retained. Ordinary dependency-closed admission batches avoid aggregate work limit; failing singleton aborts. Every proposed/final application list checked through exact minimal closure/full snapshot. No compiler/planner policy or authority change.'))
  receipt_path.write_text(json.dumps(result,indent=2)+'\n');return result
