"""Exact ordinary proposal-view transport, checked plans and disjoint controls."""
from pathlib import Path
import hashlib,json,subprocess
from ink_knowledge import Store,canonical,identity,semantic_entry
from ink_knowledge.proposal_views import ProposalViews
from producers.frozen_laws import specialize
from ink_planner.semantic_search import match,positions
b=Path('build/v8-variable-power-cases');out=b/'program';out.mkdir(exist_ok=False);compiler=Path('build/v8-proof-dependencies-final-cli/frozen/ink-integrated').resolve()
def save(name,v):(out/name).write_bytes(canonical(v))
def run(*args):
 r=subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True,timeout=180);assert not r.returncode,r.stderr;return r
source=out/'source.ink';source.write_text('module variable_remainder; fn reduce(xs:List<u32>,y:u32,fallback:u32)->u32{return foldl(xs,0,fn(x)=>fn(a)=>a+rem_or(x,y,fallback));}\npub fn score(xs:List<u32>,y:u32,fallback:u32,cohort:u32)->u32{return reduce(xs,y,fallback)+cohort;}\n')
run('emit-core',source,'-o',out/'core.json');run('emit-semantic',out/'core.json','--core','-o',out/'subject.json');subject=json.loads((out/'subject.json').read_bytes());rows=specialize(subject,'knowledge/producers/data/v8-integer-laws','v8-integer/');law=next(l for n,l in rows if n=='v8-integer/u32_rem_or_variable_power_guard');objects={identity(semantic_entry(l)):semantic_entry(l)for _,l in rows};root=identity(semantic_entry(law));empty=Store.publish(out/'empty-store',[]);views=ProposalViews(empty,objects,out/'proposal-transport');apps=[]
for f,body in subject['functions'].items():
 for path,target in positions(body):
  args={}
  if match(law['from'],target,law['params'],args):apps.append(dict(function=f,path=list(path),law=root,arguments=args,premises=[]))
assert len(apps)==1;selection=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=views.bundle([root]),applications=apps);save('selection.json',selection);assert (out/'selection.json').stat().st_size<16_000_000;run('check-selection',out/'core.json',out/'selection.json')
base=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=subject['input_core_sha256'],steps=[])
for name,pkg in [('baseline',base),('searched',dict(base,steps=[dict(kind='rewrite',package=selection)]))]:
 save(name+'.plan.json',pkg);r=run('check-plan',out/'core.json',out/(name+'.plan.json'),'--core');(out/(name+'.check.stdout')).write_text(r.stdout);(out/(name+'.check.stderr')).write_text(r.stderr)
for split,seed,powers,nonpowers,shapes in [('training',173,[8,1<<31],[3,0xffffffff],[257,4096]),('holdout',257,[1,1<<17],[65537,0x80000001],[263,4111])]:
 phases={k:[]for k in ['power','nonpower','zero','empty']}
 for i,n in enumerate(shapes):
  xs=[(j*seed*0x10001+0x81234567)&0xffffffff for j in range(n)]
  for phase,y in [('power',powers[i]),('nonpower',nonpowers[i]),('zero',0)]:phases[phase].append(dict(function='score',args=[xs,y,0xf1234567,seed+i]))
 phases['empty']=[dict(function='score',args=[[],seed,0xf1234567,seed])]
 spec=dict(schema=1,phases=phases,profile=dict(power=10000,nonpower=10000,zero=100,empty=1),workload=dict(shape={'protocol':'Variable U32 remainder wrapping fold; powers, nonpowers, zero fallback and empty complete-call controls; observed cohort'},distribution=split+' disjoint typed inputs, lengths, divisors and observed cohorts',concurrency=1,residency='resident complete generated calls with full U32 result consumption; build and loading excluded'))
 save(split+'.json',spec)
receipt=dict(schema=1,exit_status=0,source=subject['input_core_sha256'],entry=root,objects=len(objects),selection_bytes=(out/'selection.json').stat().st_size,plan_bytes=(out/'searched.plan.json').stat().st_size,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),scope='Ordinary producer discovery, unchanged16MB source-plan boundary, exact proof closure. No runtime or profitability claim.');save('terminal.json',receipt);print(json.dumps(receipt))
