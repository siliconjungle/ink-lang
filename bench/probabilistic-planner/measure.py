#!/usr/bin/env python3
"""Real compiler planning and exact discovery timing; retain all losses."""
import bisect,hashlib,json,os,random,statistics,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];BUILD=ROOT/'build/probabilistic-planner';OUT=ROOT/'reports/probabilistic-planner-2026-10-12'
sys.path[:0]=[str(ROOT/'planner'),str(ROOT/'knowledge')]
from ink_knowledge import Store,entry
from ink_knowledge.discovery_accelerator import enable,LearnedIndex
env={**os.environ,'PYTHONPATH':str(ROOT/'planner')+':'+str(ROOT/'knowledge')};OUT.mkdir(parents=True,exist_ok=True)
compiler=ROOT/'target/debug/ink';source=BUILD/'heldout.ink'
source.write_text('module HeldoutPlanner;\nfn scalar(x:u32)->u32{return '+'+'.join(['x']*17)+'+2;}\nfn many(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>scalar(x));}\n')
subprocess.run([compiler,'emit-core',source,'-o',BUILD/'heldout-core.json'],cwd=ROOT,check=True,capture_output=True)
samples=[];receipts=[]
for round in range(7):
 labels=['baseline','stochastic','learned','parallel','accelerated-discovery','hnsw']
 for label in reversed(labels) if round%2 else labels:
  output=BUILD/f'{label}-{round}.json'
  command=[sys.executable,'-m','ink_planner.parallel_search' if label=='parallel' else 'ink_planner.semantic_search','--compiler',str(compiler),'--core',str(BUILD/'heldout-core.json'),'--snapshot',str(BUILD/'knowledge/store/snapshot.json'),'--knowledge-root',str(BUILD/'knowledge'),'--budget','64','-o',str(output)]
  if label in ('stochastic','learned'):command+=['--search-strategy',label,'--search-seed',str(811+round),'--search-restarts','4']
  if label=='learned':command+=['--search-model',str(BUILD/'search-model.json')]
  if label=='parallel':command+=['--workers','2','--seed',str(811+round),'--search-model',str(BUILD/'search-model.json')]
  if label=='accelerated-discovery':command+=['--discovery-accelerator']
  if label=='hnsw':command+=['--ann-hints']
  start=time.perf_counter_ns();run=subprocess.run(command,cwd=ROOT,env=env,capture_output=True,text=True,timeout=300);elapsed=time.perf_counter_ns()-start
  if run.returncode:raise RuntimeError(run.stderr)
  receipt=json.loads(run.stdout.splitlines()[-1]);assert receipt['attempts']<=64
  subprocess.run([compiler,'check-selection',BUILD/'heldout-core.json',output],cwd=ROOT,check=True,capture_output=True)
  sample=dict(label=label,round=round,ns=elapsed,attempts=receipt['attempts'],selected_cost=receipt['selected_cost'],initial_cost=receipt['initial_cost'],package_sha256=hashlib.sha256(output.read_bytes()).hexdigest())
  samples.append(sample);receipts.append(dict(sample=sample,receipt=receipt));print(f'Checked {label} round {round}: {elapsed/1e6:.1f} ms; structural cost {receipt["selected_cost"]}',flush=True)
database=[];rng=random.Random(173)
for n in [2048,8192]:
 start=time.perf_counter_ns();store=Store.publish(BUILD/f'db-{n}',[entry('definition','benchmark',{'name':str(i)},result={'Value':'U32' if i%2 else 'Bool'}) for i in range(n)]);store.rebuild();publish_ns=time.perf_counter_ns()-start
 plain=Store(store.root);fast=Store(store.root);start=time.perf_counter_ns();enable(fast);setup_ns=time.perf_counter_ns()-start
 ids=sorted(store.members());queries=[dict(kind='definition',result={'Value':'U32'},limit=16),dict(operation='not-present',limit=16),dict(after=ids[n//2],limit=16)]*64
 expected=[plain.query(**q) for q in queries]
 for round in range(7):
  for label,s in [('sqlite',plain),('accelerated',fast)] if round%2 else [('accelerated',fast),('sqlite',plain)]:
   start=time.perf_counter_ns();actual=[s.query(**q) for q in queries];elapsed=time.perf_counter_ns()-start;assert actual==expected
   database.append(dict(n=n,label=label,round=round,ns=elapsed/len(queries),queries=len(queries),setup_ns=setup_ns if label=='accelerated' else publish_ns,snapshot=store.snapshot_id))
 keys=sorted(rng.randrange(1<<32) for _ in range(n));index=LearnedIndex(keys);probes=[rng.randrange(1<<32) for _ in range(4096)];expected=[bisect.bisect_left(keys,q) for q in probes]
 for label,find in [('bisect',lambda q:bisect.bisect_left(keys,q)),('learned',index.lower_bound)]:
  start=time.perf_counter_ns();actual=[find(q) for q in probes];elapsed=time.perf_counter_ns()-start;assert actual==expected
  database.append(dict(n=n,label=label,ns=elapsed/len(probes),queries=len(probes),fallbacks=index.fallbacks,scope='single pass; exact lower-bound result'))
result=dict(schema=1,date='2026-10-12',samples=samples,receipts=receipts,database=database,
 source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),training='13-term source, independent random seeds',heldout='17-term source plus constant; seeds 811..817',
 scope='complete planner subprocess; proof replay separately confirmed; structural cost is not execution speed; discovery setup separately charged')
(OUT/'planning.json').write_text(json.dumps(result,indent=2)+'\n')
print('Wrote complete planning and discovery results',flush=True)
