from pathlib import Path
import sys,json,subprocess,hashlib
ROOT=Path(__file__).resolve().parents[3];sys.path[:0]=[str(ROOT/'bench'),str(ROOT/'knowledge')]
from compact_selection28 import plan
from ink_knowledge import Store

P=Path(__file__).resolve().parent/'prior-probe-exact';P.mkdir(exist_ok=True);compiler=ROOT/'reports/web-stack-proofs-32-2026-10-11/main-integration/ink-main-publish';model=ROOT/'reports/web-stack-proofs-32-2026-10-11/cpu-cost-model.json';store=Store(ROOT/'knowledge')
if store.snapshot_id!='b7d979fd4861a1b82897f142737e9b8161f8c2946e9f7fa6514b50aefd45240b':raise RuntimeError('canonical prior changed')
helpers='\nfn word(x:u32,seed:u32,k:u32)->u32{return quot_or(x,k,0)+seed;}\nfn mix(x:u32,acc:u32,seed:u32,k:u32)->u32{return choose(acc<seed,x+acc*k,x-acc);}'
name='pipeline36_mapped_ordered_probe_u32'
source='pub fn '+name+'(xs:List<u32>,seed:u32,k:u32)->u32{return foldr(xs.map(fn(x)=>word(x,seed,k)),seed,fn(x)=>fn(acc)=>mix(x,acc,seed,k));}'+helpers
tasks=[(name,source,'arbitrary_mapper_and_ordered_reducer_helpers')]
commands=[];rows={};sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(argv):
 r=subprocess.run(list(map(str,argv)),capture_output=True,text=True,cwd=ROOT);commands.append(dict(argv=list(map(str,argv)),exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr));(P/'commands.json').write_text(json.dumps(commands,indent=2)+'\n')
 if r.returncode:raise RuntimeError(r.stderr)
for name,src,scope in tasks:
 td=P/name;td.mkdir(exist_ok=True);source=td/'source.ink';source.write_text('module ProofRecipe;\n'+src+'\n');core=td/'literal.core.json';run([compiler,'emit-core',source,'-o',core]);selection=td/'prior.selection.json';receipt=plan(compiler,core,store,model,selection,budget=4096);selected=td/'prior.core.json';run([compiler,'emit-core',core,'--core','--selection',selection,'-o',selected]);body=json.loads(selected.read_text())['program']['functions'][0]['body']
 def ops(v):
  if isinstance(v,dict):
   for k,x in v.items():
    if k in['method','name','callee','op']and isinstance(x,str):yield x
    yield from ops(x)
  elif isinstance(v,list):
   for x in v:yield from ops(x)
 rows[name]=dict(scope=scope,source_sha256=sha(source),prior_selection_sha256=sha(selection),selected_roots=receipt['selected_roots'],initial_cost=receipt['search']['initial_cost'],selected_cost=receipt['search']['selected_cost'],changed=json.loads(core.read_text())['program']['functions'][0]['body']!=body,body=body);(P/'summary.json').write_text(json.dumps(dict(status='running',prior_snapshot=store.snapshot_id,compiler_sha256=sha(compiler),model_sha256=sha(model),rows=rows),indent=2)+'\n');print(name,rows[name]['changed'],receipt['search']['initial_cost'],receipt['search']['selected_cost'],flush=True)
result=json.loads((P/'summary.json').read_text());result['status']='passed';(P/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
