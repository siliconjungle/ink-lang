"""Freeze upstream source identities, typed ports, inputs and execution pins before authoring."""
from pathlib import Path
import json,hashlib,subprocess,time,platform,urllib.request,tarfile,io,base64
ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'reports/knowledge-growth-2026-10-13';OUT.mkdir(parents=True,exist_ok=True)
if (OUT/'protocol.json').exists():raise SystemExit('Refusing to overwrite a frozen report. Reproduce in a separate checkout.')
def fetch(url):return subprocess.check_output(['curl','--fail','--location','--silent','--show-error',url])
def sha(b):return hashlib.sha256(b).hexdigest()
def save(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,indent=2)+'\n')
def cmd(*args):return subprocess.check_output(args,cwd=ROOT,text=True).strip()
packages={'lodash':'4.17.21','rbush':'4.0.1','typescript':'5.9.3','gl-matrix':'3.4.4','rxjs':'7.8.2'}
upstreams={}
for name,version in packages.items():
 dest=OUT/'upstream'/name;dest.mkdir(parents=True,exist_ok=True)
 meta=json.loads(fetch(f'https://registry.npmjs.org/{name}/{version}'));raw=fetch(meta['dist']['tarball']);expected=meta['dist']['integrity'];alg,encoded=expected.split('-',1);assert alg=='sha512' and base64.b64encode(hashlib.sha512(raw).digest()).decode()==encoded
 archive=dest/'source.tgz';archive.write_bytes(raw)
 with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as t:
  for m in t.getmembers():
   if m.isfile() and not any(x=='..'for x in Path(m.name).parts):
    p=dest/m.name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(t.extractfile(m).read())
 upstreams[name]=dict(version=version,tarball=meta['dist']['tarball'],integrity=expected,sha256=sha(raw),git_head=meta.get('gitHead'),license=meta.get('license'))
# Other upstreams are research, never advertised as full implementation controls.
research={'vscode':('microsoft/vscode','src/vs/editor/common/model/pieceTreeTextBuffer/pieceTreeBase.ts'),'tldraw':('tldraw/tldraw','packages/editor/src/lib/primitives/Box.ts'),'verlet-js':('subprotocol/verlet-js','js/verlet.js'),'roaring':('RoaringBitmap/CRoaring','src/containers/array.c'),'differential-dataflow':('TimelyDataflow/differential-dataflow','differential-dataflow/src/operators/arrange/arrangement.rs'),'flecs':('SanderMertens/flecs','src/entity.c')}
for name,(repo,path) in research.items():
 try:
  req=urllib.request.Request(f'https://api.github.com/repos/{repo}/commits?per_page=1',headers={'User-Agent':'Ink-research'});rev=json.loads(fetch(f'https://api.github.com/repos/{repo}/commits?per_page=1'))[0]['sha'];url=f'https://raw.githubusercontent.com/{repo}/{rev}/{path}';raw=fetch(url);p=OUT/'upstream'/name/Path(path).name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw);upstreams[name]=dict(repo=repo,revision=rev,path=path,url=url,sha256=sha(raw),role='source research only')
 except Exception as e:upstreams[name]=dict(repo=repo,path=path,status='acquisition failed',error=str(e))
save(OUT/'upstreams.json',upstreams)
header='''module frozen_software;
record Node { key:u32,label:String,active:Bool, }
record Box { minX:u32,minY:u32,maxX:u32,maxY:u32, }
record Particle { x:f32,y:f32,vx:f32,vy:f32,active:Bool, }
record Entity { id:u32,value:u32,active:Bool, }
record TextState { count:u32,previous:u32, }
record DistinctState { seen:Bool,last:u32,output:List<u32>, }
fn intersects(a:Box,b:Box)->Bool {return a.minX<=b.maxX && a.minY<=b.maxY && a.maxX>=b.minX && a.maxY>=b.minY;}
fn contains(xs:List<u32>,x:u32)->Bool {return foldl(xs,false,fn(y)=>fn(a)=>a || y==x);}
'''
programs=[
('sequence-every','sequence processing','lodash/every','full typed operation', 'pub fn run(xs:List<u32>,cut:u32)->Bool{return foldl(xs,true,fn(x)=>fn(a)=>a && x<cut);}'),
('ast-ancestor','parser/AST traversal','typescript/findAncestor','partial kernel: parent chain lookup; excludes parse/bind/AST allocation','pub fn run(xs:List<Node>,cut:u32)->String{return foldr(xs,"missing",fn(x)=>fn(a)=>choose(x.key==cut,x.label,a));}'),
('text-lines','editor text structures','vscode/pieceTreeBase','partial kernel: ASCII CR/LF line-break summary; excludes piece-tree edits/search','pub fn run(xs:List<u32>,unused:u32)->TextState{return foldl(xs,TextState{count:0,previous:0},fn(x)=>fn(a)=>TextState{count:a.count+choose(x==13 || (x==10 && a.previous!=13),1,0),previous:x});}'),
('drawing-hit','drawing/document models','tldraw/Box','partial kernel: selected shape visibility; excludes scene/geometry/rendering','pub fn run(xs:List<Box>,q:Box)->Bool{return foldl(xs.filter(fn(x)=>x.minX>=16).map(fn(x)=>intersects(x,q)),false,fn(x)=>fn(a)=>a || x);}'),
('particle-step','particle simulations','verlet-js/VerletJS.frame; gl-matrix/vec2.scaleAndAdd','partial kernel: simultaneous Euler position update for active rows; excludes Verlet constraints','pub fn run(xs:List<Particle>,dt:f32)->List<Particle>{return xs.map(fn(p)=>Particle{x:p.x+p.vx*dt,y:p.y+p.vy*dt,vx:p.vx,vy:p.vy,active:p.active});}'),
('spatial-collision','spatial queries','rbush/collides','complete query result by scan; upstream control includes building its index every call','pub fn run(xs:List<Box>,q:Box)->Bool{return foldl(xs,false,fn(x)=>fn(a)=>a || intersects(x,q));}'),
('index-membership','indexes','CRoaring/array_contains','partial kernel: arbitrary ID membership; no sortedness or maintained index assumed','pub fn run(xs:List<u32>,target:u32)->Bool{return contains(xs,target);}'),
('incremental-distinct','incremental views','rxjs/distinctUntilChanged','partial kernel: complete finite value trace; excludes stream subscription/errors/scheduling','pub fn run(xs:List<u32>,unused:u32)->List<u32>{return foldl(xs,DistinctState{seen:false,last:0,output:[]},fn(x)=>fn(a)=>choose(!a.seen || a.last!=x,DistinctState{seen:true,last:x,output:a.output.concat([x])},a)).output;}'),
('bulk-update','bulk state updates','flecs/entity bulk operations','partial pure kernel: complete replacement rows, no transaction/event authority','pub fn run(xs:List<Entity>,delta:u32)->List<Entity>{return xs.map(fn(x)=>Entity{id:x.id,value:choose(x.active,x.value+delta,x.value),active:x.active});}'),
('compact-set','compact collections','lodash/uniq','complete stable typed uniqueness; List baseline, no arbitrary JS equality','pub fn run(xs:List<u32>,unused:u32)->List<u32>{var out:List<u32>=[];for x in xs {if !contains(out,x){out=out.concat([x]);}}return out;}')]
rows=[]
for name,domain,upstream,scope,body in programs:
 p=OUT/'corpus'/f'{name}.ink';p.parent.mkdir(exist_ok=True);used={'ast-ancestor':['record Node'],'text-lines':['record TextState'],'drawing-hit':['record Box','fn intersects'],'particle-step':['record Particle'],'spatial-collision':['record Box','fn intersects'],'index-membership':['fn contains'],'incremental-distinct':['record DistinctState'],'bulk-update':['record Entity'],'compact-set':['fn contains']}.get(name,[])
 p.write_text('module frozen_software;\n'+'\n'.join(line for line in header.splitlines() if any(line.startswith(prefix) for prefix in used))+'\n'+body+'\n');rows.append(dict(name=name,domain=domain,upstream=upstream,scope=scope,source=str(p.relative_to(ROOT)),sha256=sha(p.read_bytes()),split='heldout source'))
save(OUT/'corpus.json',rows)
# Inputs chosen from task conditions, independently of catalogue/optimisations.
fixtures=[]
for row in rows:
 for split,sizes,regimes in [('development',[31,257],['periodic']),('evaluation',[0,7,1021,16381],['early','late','absent','alternating','clustered','adversarial'])]:
  for n in sizes:
   for regime in regimes:
    target=(0 if regime=='early' else n-1 if regime=='late' else -1) if n else -1
    nums=[(i*2654435761+17)&0xffffffff for i in range(n)]
    if row['name']=='sequence-every':args=[[0 if (i!=target and regime!='adversarial') else 0xffffffff for i in range(n)],0xffffffff]
    elif row['name']=='ast-ancestor':args=[[dict(key=99 if i==target else i%97,label='node-'+str(i)+'雪😀',active=i%3==0)for i in range(n)],99]
    elif row['name'] in ['drawing-hit','spatial-collision']:
     boxes=[dict(minX=32+i%17,minY=32+i%31,maxX=33+i%17,maxY=33+i%31)for i in range(n)]
     if target>=0:boxes[target]=dict(minX=64,minY=64,maxX=65,maxY=65)
     if regime=='alternating':boxes=[dict(minX=64,minY=64,maxX=65,maxY=65)if i%2==0 else b for i,b in enumerate(boxes)]
     args=[boxes,dict(minX=64,minY=64,maxX=65,maxY=65)]
    elif row['name']=='particle-step':args=[[dict(x=(i%71-35)/8,y=(i%53-26)/8,vx=(i%13-6)/4,vy=(i%17-8)/4,active=i%7!=0)for i in range(n)],0.5]
    elif row['name']=='bulk-update':args=[[dict(id=i,value=nums[i],active=i%7!=0)for i in range(n)],0xffffffff]
    elif row['name']=='text-lines':
     text_path=OUT/'upstream/vscode/pieceTreeBase.ts'
     codes=[ord(c) for c in text_path.read_text()] if text_path.exists() else [65,13,10,66,10]
     args=[([codes[i%len(codes)] for i in range(n)] if regime=='clustered' else [13 if i%17==0 else 10 if i%17==1 else 32 if i%3==0 else 65 for i in range(n)]),0]
    elif row['name']=='index-membership':
     xs=[x&0x7fffffff for x in nums]
     if target>=0:xs[target]=0xffffffff
     args=[xs,0xffffffff]
    elif row['name']=='compact-set':args=[[i%64 if regime!='adversarial' else i%257 for i in range(n)],0]
    else:args=[[i//16 if regime=='clustered' else i%2 if regime=='alternating' else i%64 for i in range(n)],0]
    path=OUT/'inputs'/split/row['name']/f'{n}-{regime}.json';save(path,args);fixtures.append(dict(program=row['name'],split=split,size=n,distribution=regime,path=str(path.relative_to(ROOT)),sha256=sha(path.read_bytes()),input_identity=sha(json.dumps(args,separators=(',',':')).encode())))
save(OUT/'fixtures.json',fixtures)
pins={'distribution':cmd('git','rev-parse','HEAD'),'core':'same repository as distribution'}
for p in ['knowledge','planner','runtime','abi','native-support','lowerings/c','lowerings/rust','lowerings/js','lowerings/wasm','lowerings/gpu']:pins[p]=cmd('git','-C',p,'rev-parse','HEAD')
files={}
for base in ['src','core','planner','runtime','abi','native-support','lowerings','knowledge/ink_knowledge','knowledge/producers']:
 for p in (ROOT/base).rglob('*'):
  if p.is_file() and not any(x in p.parts for x in ['target','.git','__pycache__','node_modules','reports','build']) and p.suffix in ['.rs','.py','.json','.toml','.lock','.mjs','.js','.wgsl','.h','.c']:files[str(p.relative_to(ROOT))]=sha(p.read_bytes())
save(OUT/'execution-files.json',files)
protocol=dict(schema=1,epoch='2026-10-13-E1',created_unix=time.time(),pins=pins,execution_files_sha256=sha((OUT/'execution-files.json').read_bytes()),source_manifest_sha256=sha((OUT/'corpus.json').read_bytes()),fixtures_sha256=sha((OUT/'fixtures.json').read_bytes()),upstreams_sha256=sha((OUT/'upstreams.json').read_bytes()),source_selection='Ten prespecified public operation/domain categories; ordinary typed ports frozen before law development. Upstream sources are independent software, but handwritten ports are kernels, not whole apps, and syntactic author bias remains. All included irrespective of measured outcome.',development='Synthetic controlled folds in a separate module; two development sizes/regime. Heldout sources and evaluation inputs never used to repair laws or profitability.',checkpoints='Pinned current complete catalogue, plus absorbing Boolean folds, plus controlled fold map/filter fusion; same epoch. Family removal ablations at full growth.',family_count='Incremental reusable mechanism count relative to frozen main. Support lemmas/type instances/adapters/duplicate endpoints are not families. No absolute count of the pre-existing catalogue asserted.',forced='Generic data-template discovery to fixed point, checked selection replay; lowest structural cost choice deliberately forced. No timings choose this lane.',automatic='Ordinary ink compile --optimise, fixed explicit budgets and default profitability. Development workload measurement only; heldout evaluation inputs unavailable to selection.',measurement=dict(target='javascript',boundary='complete trusted call including all result construction and recursive bit-aware consumption; immutable inputs constructed outside. Import/setup, source read, proof/search/compile recorded separately.',rounds=11,min_batch_ms=5,max_calls=1024,memory='Separate per-variant process: observed heap/RSS, retained heap after GC and OS high-water RSS. No allocation/peak-live-memory inference. Complete result byte length is a distinct logical metric.',statistics='Per-case paired bootstrap 95%, 10000 resamples; fixed equal domain/program weights then equal sizes/distributions. Empty cases retained; headline nonempty cohort prespecified separately. No adding overlapping speedups.',concurrency='Serial benchmark cohorts; shared desktop/system contention recorded; cannot guarantee exclusive machine.'),limits='No new JSON/CRDT/host primitives; binary32 order and wrapping words preserved. Pure kernels do not claim state/event/snapshot authority. Unsupported whole-system alternatives classified by exact limiting stage.',environment=dict(platform=platform.platform(),node=cmd('node','--version'),rustc=cmd('rustc','--version'),clang=cmd('clang','--version'),cpu=cmd('sysctl','-n','machdep.cpu.brand_string')))
save(OUT/'protocol.json',protocol);(OUT/'protocol.sha256').write_text(sha((OUT/'protocol.json').read_bytes())+'\n');print(json.dumps(dict(output=str(OUT),programs=len(rows),inputs=len(fixtures),pins=pins)))
