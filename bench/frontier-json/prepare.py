#!/usr/bin/env python3
"""Freeze fixtures and database-authored physical plans before measuring."""
import hashlib,json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import identity,canonical
from ink_knowledge.recipes import load,execute
D=ROOT/'build/frontier-json';D.mkdir(parents=True,exist_ok=True)
C=ROOT/'target/debug/ink';source=ROOT/'bench/frontier-json/state.ink'
def call(*args):
 at=time.perf_counter_ns();r=subprocess.run([str(C),*map(str,args)],capture_output=True,text=True)
 if r.returncode:raise ValueError(r.stderr)
 return dict(command=list(map(str,args)),elapsed_ns=time.perf_counter_ns()-at,receipt=r.stdout.strip())
phases=[call('emit-core',source,'-o',D/'core.json')]
core=json.loads((D/'core.json').read_bytes());source_id=identity(core)
# CLI receipt is the checked canonical core identity, not a filesystem hash.
source_id=json.loads(phases[0]['receipt'])['core_sha256']
registry,registry_hash=load();recipe=next(r for r in registry['recipes']if r['id']=='literal-physical-alternatives')
plans={}
for result in execute(recipe,dict(core=core,source=source_id,emit_target='rust')):
 plan=result['step']['package']
 if plan['buffers']!='scoped':continue
 label=plan['tables']+('-borrow'if plan['borrow_reads']or plan['borrow_rows']else'')
 if label in plans:continue
 packet=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=source_id,steps=[result['step']])
 path=D/(label+'.plan.json');path.write_bytes(canonical(packet)+b'\n')
 phases.append(call('check-plan',D/'core.json',path,'--core'))
 code=D/('native-'+label+'.rs')
 phases.append(call('compile',source,'--plan',path,'--target','rust','-o',code))
 directory=D/('native-'+label)
 if directory.is_file():directory.unlink() # only this script's recorded prior output
 (directory/'src').mkdir(parents=True,exist_ok=True)
 (directory/'src/lib.rs').write_bytes(code.read_bytes())
 package='ink-frontier-'+label.replace('indexed_slots','indexed')
 (directory/'Cargo.toml').write_text('[package]\nname="'+package+'"\nversion="0.1.0"\nedition="2021"\n[dependencies]\nnum-bigint="=0.4.8"\nsha2="=0.10.9"\nserde_json={version="=1.0.151",features=["float_roundtrip"]}\n[workspace]\n')
 plans[label]=dict(packet=packet,path=str(path.relative_to(ROOT)),directory='native-'+label)
phases.append(call('build',source,'--target','javascript','-o',D/'ink.mjs'))
phases.append(call('emit-action-model',source,'-o',D/'model.json'))
from producers.generic_indexed import generate
from producers.compact_observation import attach
os.environ['INK_COMPILER']=str(C)
at=time.perf_counter_ns()
indexed=generate(json.loads((D/'model.json').read_bytes()),D/'indexed-db')
request=attach(indexed['request'],D/'indexed-compact-db')
packet=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=source_id,
    steps=[dict(kind='representation',package=request)])
(D/'indexed.plan.json').write_bytes(canonical(packet)+b'\n')
(D/'indexed-discovery.json').write_bytes(canonical(indexed['discovery'])+b'\n')
phases.append(dict(command=['database-authoring','generic-indexed','compact-observer'],elapsed_ns=time.perf_counter_ns()-at))
phases.append(call('check-plan',D/'core.json',D/'indexed.plan.json','--core'))
phases.append(call('compile',source,'--plan',D/'indexed.plan.json','--target','javascript','-o',D/'ink-indexed.mjs'))
fixtures=[]
for n in [32,512,4096]:
 for mode in ['replace','mixed','read-heavy']:
  initial={f'k{i:05d}':dict(value=i%97,active=i%3!=0,metadata={'title':'row '+str(i),'tags':['a','雪'],'nested':{'keep':i,'enabled':True}})for i in range(n)}
  script=[]
  for i in range(32):
   key=f'k{(i*97+17)%n:05d}';old=initial[key];row={**old,'value':(old['value']+31)%101,'metadata':{**old['metadata'],'updated':True}}
   if mode=='replace':script.extend([dict(call='put',args=[key,row,False]),dict(call='put',args=[key,old,False])])
   elif mode=='mixed':script.extend([dict(call='put',args=[key,row,i%7==0]),dict(call='total',args=[]),dict(call='erase',args=[key,False]),dict(call='put',args=[key,old,False])])
   else:script.extend([dict(call='put',args=[key,row,False]),*[dict(call='total',args=[])for _ in range(7)],dict(call='put',args=[key,old,False])])
  fixtures.append(dict(id=f'{mode}-{n}',rows=n,mode=mode,initial=initial,script=script))
(D/'fixtures.json').write_text(json.dumps(fixtures,sort_keys=True,ensure_ascii=False,separators=(',',':'))+'\n')
bindings=dict(schema=1,compiler_sha256=hashlib.sha256(C.read_bytes()).hexdigest(),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),core=source_id,recipe=recipe,registry_sha256=registry_hash,plans=plans,indexed_discovery=indexed['discovery'],phases=phases)
(D/'preparation.json').write_text(json.dumps(bindings,indent=2)+'\n');print(json.dumps(dict(plans=list(plans),fixtures=len(fixtures),phases=len(phases))))
