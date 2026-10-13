"""Freeze upstream ports and inputs; compile automatically without evaluation calls."""
import argparse,hashlib,json,os,re,shutil,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/real-software-delivery-2026-10-13';WORK=ROOT/'build/real-software-delivery'
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity
from ink_planner.compiled_planning import code_fingerprint
from producers.control_choice_templates import templates,concrete
COMPILER=Path(os.environ.get('INK_REAL_COMPILER',ROOT/'build/real-software-delivery/compiler/ink'))
def read(p):return json.loads(p.read_bytes())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def save(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2,allow_nan=False)+'\n')
def env():return dict(os.environ,INK_DISTRIBUTION=str(ROOT),PYTHONPATH=os.pathsep.join([str(ROOT/'knowledge'),str(ROOT/'planner')]))
def assert_frozen():
 p=read(OUT/'protocol.json');assert sha(COMPILER)==p['compiler_sha256'];assert code_fingerprint()==p['code_fingerprint']
 for name in ['corpus','fixtures','upstreams']:assert sha(OUT/(name+'.json'))==p[name+'_sha256']
 for row in read(OUT/'corpus.json'):assert sha(ROOT/row['source'])==row['sha256']
 for row in read(OUT/'fixtures.json'):assert sha(ROOT/row['path'])==row['sha256']
 return p

def freeze():
 if (OUT/'protocol.json').exists():assert_frozen();return
 OUT.mkdir(parents=True,exist_ok=True)
 upstream=read(ROOT/'bench/real-software-delivery/upstreams.json')
 for r in upstream:assert sha(ROOT/r['path'])==r['sha256']
 save(OUT/'upstreams.json',upstream)
 source=ROOT/'bench/real-software-delivery/upstream'
 vectors=[dict(zip(['x','y','z'],map(float,m))) for m in re.findall(r'new Vector3\(\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*\)',(source/'three/test/unit/src/math/Box3.tests.js').read_text())]
 assert vectors
 polygon=[dict(x=p[0],y=p[1]) for p in read(source/'earcut/test/fixtures/boxy.json')[0]]
 assert all(type(v)is int for p in polygon for v in p.values())
 corpus=[];fixtures=[]
 for path in sorted((ROOT/'bench/real-software-delivery/corpus').glob('*.ink')):
  name=path.stem;directory=OUT/'typecheck'/name;directory.mkdir(parents=True,exist_ok=True)
  r=subprocess.run([str(COMPILER),'emit-core',str(path),'-o',str(directory/'core.json')],capture_output=True,text=True)
  (directory/'stderr.txt').write_text(r.stderr)
  row=dict(name=name,source=str(path.relative_to(ROOT)),sha256=sha(path),split='development' if name in {'d3-min','d3-cumsum'} else 'held-out',supported=r.returncode==0,decline=r.stderr if r.returncode else None)
  corpus.append(row)
  if name.startswith('d3-'):
   original=(source/('earcut/src/earcut.js' if row['split']=='development' else 'codemirror-text/src/text.ts')).read_bytes().splitlines()
   seed=[len(line) for line in original];seed_source='upstream UTF-8 source line byte lengths'
  elif name=='earcut-area':seed=polygon;seed_source='Earcut boxy outer polygon, original integer coordinates'
  elif name=='gl-matrix-dot':seed=[dict(a=v,b=vectors[(i+1)%len(vectors)]) for i,v in enumerate(vectors)];seed_source='Adjacent pairs of literal Three.js Box3 unit-test vectors'
  elif name=='codemirror-text-length':seed=(source/'codemirror-text/src/text.ts').read_text().splitlines();seed_source='CodeMirror actual source lines; original string-length port retained as a capability test'
  else:seed=vectors;seed_source='Literal Three.js Box3 unit-test vectors'
  for label,n,order in [('empty',0,'original'),('original',len(seed),'original'),('small',16,'original'),('medium',128,'original'),('stress',512,'original'),('reversed',512,'reversed')]:
   xs=([seed[i%len(seed)] for i in range(n)] if n else [])
   if order=='reversed':xs=xs[::-1]
   if name.startswith('d3-'):assert sum(xs)<2**24
   if name=='earcut-area':
    a=0;previous=xs[-1] if xs else dict(x=0,y=0)
    for point in xs:
     a+=(previous['x']-point['x'])*(point['y']+previous['y']);assert -(2**31)<=a<2**31;previous=point
   file=OUT/'inputs'/name/(label+'.json');save(file,[xs]);fixtures.append(dict(program=name,label=label,size=n,seed_rows=len(seed),seed_source=seed_source,stress_repetition=label in {'small','medium','stress','reversed'},path=str(file.relative_to(ROOT)),sha256=sha(file)))
 save(OUT/'corpus.json',corpus);save(OUT/'fixtures.json',fixtures)
 objects=[r['object'] for r in templates()]+[o for _,o in concrete()]
 proposed=Store.publish(WORK/'checked-growth',objects)
 core=OUT/'typecheck/d3-min/core.json';view=OUT/'growth-view.json';view.write_bytes(canonical(proposed.bundle([identity(o) for _,o in concrete()])))
 checked=subprocess.run([str(COMPILER),'knowledge-check',str(core),str(view)],capture_output=True,text=True);(OUT/'growth-check.stdout').write_text(checked.stdout);(OUT/'growth-check.stderr').write_text(checked.stderr);assert checked.returncode==0,checked.stderr
 original=Store(ROOT/'knowledge');save(OUT/'original-snapshot.json',original.snapshot);base_ids=set(original.members());names=read(original.data/'names.json');growth_ids={identity(o) for o in objects};points=[]
 for label,extra in [('base',[]),('grown',objects)]:
  root=WORK/'databases'/label;data=root/'store';(data/'objects').mkdir(parents=True,exist_ok=True);(data/'trees').mkdir(exist_ok=True);(data/'snapshots').mkdir(exist_ok=True)
  for ident in base_ids:os.link(original.data/'objects'/(ident+'.json'),data/'objects'/(ident+'.json'))
  visited=set()
  def tree(ident):
   if ident in visited:return
   visited.add(ident);src=original.data/'trees'/(ident+'.json');os.link(src,data/'trees'/(ident+'.json'));v=read(src)
   if 'left' in v:tree(v['left']);tree(v['right'])
  tree(original.snapshot['root'])
  for target in ['snapshot.json','snapshots/'+original.snapshot_id+'.json']:(data/target).write_bytes(canonical(original.snapshot)+b'\n')
  save(data/'names.json',names)
  # Reuse only base discovery summaries; canonical bytes/pins remain checked.
  if label=='grown':shutil.copy2(WORK/'databases/base/index.sqlite',root/'index.sqlite')
  store=Store(root)
  if extra:
   ns={'real-software-control/'+r['name']:identity(r['object']) for r in templates()};ns.update({'real-software-control/instance/'+n:identity(o) for n,o in concrete()});store=store.extend(extra,ns)
  pin=root/'input-snapshot.json';pin.write_bytes(canonical(store.snapshot)+b'\n');store.ensure_index()
  points.append(dict(label=label,snapshot=store.snapshot_id,entries=len(store.members()),new_entries=len(set(store.members())-base_ids)))
  print('checkpoint',label,points[-1]['entries'],flush=True)
 save(OUT/'checkpoints.json',points)
 save(OUT/'protocol.json',dict(schema=1,created_unix=time.time(),compiler_sha256=sha(COMPILER),code_fingerprint=code_fingerprint(),distribution_base=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),pins={p:subprocess.check_output(['git','-C',p,'rev-parse','HEAD'],text=True).strip() for p in ['knowledge','planner','core','lowerings/js','runtime'] if (ROOT/p/'.git').exists()},corpus_sha256=sha(OUT/'corpus.json'),fixtures_sha256=sha(OUT/'fixtures.json'),upstreams_sha256=sha(OUT/'upstreams.json'),growth_objects=sorted(growth_ids),selection='Default automatic typed probes only; no held-out calls/results/workloads enter compilation; no forced plan. Existing quick/balanced policies compared separately.',scope='Human upstream selection before applicability/timing, literal loop ports; two development/six held-out sources. One unsupported string port retained. Related D3 siblings and bounded numeric subsets limit generalisation. Original seeds and controlled repetitions are separate.'))
 print('epoch frozen',flush=True)

def build(points=None):
 assert_frozen();programs=[r for r in read(OUT/'corpus.json') if r['supported']]
 # Acquire development and held-out builds without reading any execution results.
 for row in programs:
  name=row['name'];src=ROOT/row['source'];literal=OUT/'compiled/literal'/name;literal.mkdir(parents=True,exist_ok=True)
  if not (literal/'process.json').exists():
   t=time.monotonic();r=subprocess.run([str(COMPILER),'build',str(src),'--target','javascript','-o',str(literal/'output.mjs')],env=env(),capture_output=True,text=True)
   (literal/'stderr.txt').write_text(r.stderr);assert r.returncode==0,r.stderr;save(literal/'process.json',dict(seconds=time.monotonic()-t,status=r.returncode,artifact_sha256=sha(literal/'output.mjs')))
  for point in (points or ['base','grown']):
   for effort in (['quick'] if row['split']=='development' else ['quick','balanced']):
    directory=OUT/'compiled'/point/effort/name;directory.mkdir(parents=True,exist_ok=True)
    if (directory/'process.json').exists():continue
    assert_frozen();db=WORK/'databases'/point
    cmd=[sys.executable,'-m','ink_planner.compiled_planning','--compiler',str(COMPILER),'--source',str(src),'--knowledge-root',str(db),'--snapshot',str(db/'input-snapshot.json'),'--target','javascript','--planning-effort',effort,'--emit',str(directory/'output.mjs'),'-o',str(directory/'plan.json')]
    t=time.monotonic()
    with (directory/'stdout.txt').open('wb') as stdout,(directory/'stderr.txt').open('wb') as stderr:
     child=subprocess.Popen(cmd,env=env(),stdout=stdout,stderr=stderr);_,status,usage=os.wait4(child.pid,0)
    status=os.waitstatus_to_exitcode(status);result=dict(program=name,checkpoint=point,effort=effort,command=cmd,status=status,seconds=time.monotonic()-t,process_high_water_bytes=usage.ru_maxrss*(1 if sys.platform=='darwin' else 1024))
    if status==0:
     result['artifact_sha256']=sha(directory/'output.mjs');receipt=read(directory/'plan.json.receipt.json');result.update(selected=receipt['selected'],selected_alternative=receipt['diagnostics']['delivery']['baseline_retained'] is False,search_seconds=receipt['elapsed_seconds'],search_stop=receipt['stop_reason'],admitted=receipt['admitted_states'],selection=receipt['selection'].get('reason'),automatic_probe=receipt.get('automatic_probe'),measurement=receipt.get('measurement_acquisition'))
    save(directory/'process.json',result);print(name,point,effort,status,round(result['seconds'],2),flush=True)
    if status:raise RuntimeError((directory/'stderr.txt').read_text()[-2500:])

def reference():
 assert_frozen()
 for fixture in read(OUT/'fixtures.json'):
  row=next(r for r in read(OUT/'corpus.json') if r['name']==fixture['program'])
  if not row['supported']:continue
  path=OUT/'reference'/fixture['program']/(fixture['label']+'.json')
  if path.exists():continue
  r=subprocess.run([str(COMPILER),'run',str(ROOT/row['source']),'run',str(ROOT/fixture['path'])],env=env(),capture_output=True,text=True,timeout=180)
  if r.returncode:raise RuntimeError(r.stderr[-2000:])
  save(path,json.loads(r.stdout));print('reference',fixture['program'],fixture['label'],flush=True)

def transport_build():
 assert (OUT/'transport-protocol.json').exists()
 build(['packed-base','packed-grown'])

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['freeze','build','reference','transport-build']);a=p.parse_args();globals()[a.mode.replace('-','_')]()
