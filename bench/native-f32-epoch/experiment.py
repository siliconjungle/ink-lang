"""Frozen code, separate development/held-out sources and automatic selection."""
import hashlib,json,os,re,shutil,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];WORK=ROOT/'build/native-f32-epoch';OUT=ROOT/'reports/native-f32-epoch-2026-10-13'
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner'),str(Path(__file__).parent)]
from ink_knowledge import Store,identity,canonical
from producers.invariant_choice_templates import templates,concrete
from ink_planner.compiled_planning import code_fingerprint
from store_cost import clone,old_class
COMPILER=WORK/'compiler/after'
def read(p):return json.loads(p.read_bytes())
def save(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2)+'\n')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def fixtures():
 vectors=[dict(zip(['x','y','z'],map(float,m)))for m in re.findall(r'new Vector3\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)',(ROOT/'bench/real-software-delivery/upstream/three/test/unit/src/math/Box3.tests.js').read_text())]
 lines=(ROOT/'bench/real-software-delivery/upstream/earcut/src/earcut.js').read_bytes().splitlines();rows=[]
 for row in read(OUT/'corpus-registration.json')['programs']:
  name=row['name']
  if read(OUT/'fresh/after'/(name+'.status.json'))['status']:continue
  vs=[{k:v[k]for k in ['x','y']}for v in vectors]if name in ['gl-vec2-distance','earcut-equals']else vectors
  seed=[len(x)for x in lines]if name=='d3-extent'else[dict(a=v,b=vs[(i+1)%len(vs)])for i,v in enumerate(vs)]
  if name=='earcut-equals':
   vs=[{k:int(v[k])for k in ['x','y']}for v in vs];seed=[dict(a=v,b=vs[(i+1)%len(vs)])for i,v in enumerate(vs)]+[dict(a=v,b=v)for v in vs]
  for label,size in [('empty',0),('original',len(seed)),('small',16),('medium',512),('stress',4096),('reversed',4096)]:
   xs=[seed[i%len(seed)]for i in range(size)]
   if label=='reversed':xs.reverse()
   args=[xs,0.25]if name=='gl-vec3-lerp'else[xs];p=OUT/'fresh-inputs'/name/(label+'.json');save(p,args)
   r=subprocess.run([str(COMPILER),'run',str(ROOT/row['path']),'run',str(p)],capture_output=True,text=True);assert r.returncode==0,r.stderr
   ref=OUT/'fresh-reference'/name/(label+'.json');save(ref,json.loads(r.stdout))
   rows.append(dict(program=name,label=label,size=size,path=str(p.relative_to(ROOT)),reference=str(ref.relative_to(ROOT)),sha256=sha(p),seed='Pinned Three.js Box3 test vectors / upstream Earcut source-line byte lengths',stress_repetition=label not in ['empty','original']))
 save(OUT/'fresh-fixtures.json',rows)
def freeze():
 objects=[r['object']for r in templates()]+[o for _,o in concrete()];base=WORK/'catalogue';old=set(Store(base).members());new={identity(o)for o in objects};assert not old&new
 points=[]
 for label in ['base','grown']:
  root=clone(base,WORK/'databases'/label)
  store=Store(root)
  if label=='grown':store=store.extend(objects);store.ensure_index()
  pin=root/'input-snapshot.json';pin.write_bytes(canonical(store.snapshot)+b'\n')
  points.append(dict(label=label,entries=len(store.members()),snapshot=store.snapshot_id,new_entries=len(set(store.members())-old)))
 save(OUT/'checkpoints.json',points)
 sources=read(OUT/'corpus-registration.json')['programs']+[dict(name=n,path='bench/native-f32-epoch/corpus/'+n+'.ink',split='development')for n in ['particle-mode','selection-mode']]
 for row in sources:row['sha256']=sha(ROOT/row['path'])
 save(OUT/'protocol.json',dict(time_unix=time.time(),compiler_sha256=sha(COMPILER),code_fingerprint=code_fingerprint(),before_store_sha256=sha(WORK/'before-store.py'),store_sha256=sha(ROOT/'knowledge/ink_knowledge/store.py'),sources=sources,fixtures_sha256=sha(OUT/'fresh-fixtures.json'),upstreams_sha256=sha(OUT/'upstreams.json'),new_objects=sorted(new),selection='Ordinary quick effort and automatic typed offline probes; no held-out inputs, outputs or supplied plan enter compilation. Stores mutate only by source-derived candidate publication; input checkpoints stay explicitly pinned. Cold builds disable compiled-plan cache; index setup recorded separately.'))
def assert_frozen():
 p=read(OUT/'protocol.json');assert sha(COMPILER)==p['compiler_sha256'];assert code_fingerprint()==p['code_fingerprint']
 for row in p['sources']:assert sha(ROOT/row['path'])==row['sha256']
 assert sha(OUT/'fresh-fixtures.json')==p['fixtures_sha256'];assert sha(OUT/'upstreams.json')==p['upstreams_sha256']
 for row in read(OUT/'upstreams.json'):assert sha(ROOT/row['path'])==row['sha256']
 return p

def build():
 p=assert_frozen()
 for row in p['sources']:
  name=row['name']
  if row['split']=='held-out'and read(OUT/'fresh/after'/(name+'.status.json'))['status']:continue
  for checkpoint in ['base','grown']:
   assert_frozen();directory=OUT/'automatic'/checkpoint/name;directory.mkdir(parents=True,exist_ok=True)
   if (directory/'process.json').exists():continue
   db=WORK/'databases'/checkpoint
   cmd=[sys.executable,'-m','ink_planner.compiled_planning','--compiler',str(COMPILER),'--source',str(ROOT/row['path']),'--knowledge-root',str(db),'--snapshot',str(db/'input-snapshot.json'),'--target','javascript','--planning-effort','quick','--cache','off','--emit',str(directory/'output.mjs'),'-o',str(directory/'plan.json')]
   t=time.monotonic();env=dict(os.environ,INK_DISTRIBUTION=str(ROOT),PYTHONPATH=os.pathsep.join([str(ROOT/'knowledge'),str(ROOT/'planner')]))
   with (directory/'stdout.txt').open('wb')as stdout,(directory/'stderr.txt').open('wb')as stderr:r=subprocess.run(cmd,env=env,stdout=stdout,stderr=stderr)
   result=dict(status=r.returncode,seconds=time.monotonic()-t,command=cmd)
   if not r.returncode:
    receipt=read(directory/'plan.json.receipt.json');result.update(artifact_sha256=sha(directory/'output.mjs'),selected=receipt['selected'],alternative=receipt['diagnostics']['delivery']['baseline_retained']is False,search_seconds=receipt['elapsed_seconds'],admitted=receipt['admitted_states'],selection=receipt['selection'],diagnostics=receipt['diagnostics'])
   save(directory/'process.json',result);print(name,checkpoint,r.returncode,round(result['seconds'],2),flush=True)
   if r.returncode:raise RuntimeError((directory/'stderr.txt').read_text()[-2000:])
if __name__=='__main__':globals()[sys.argv[1]]()
