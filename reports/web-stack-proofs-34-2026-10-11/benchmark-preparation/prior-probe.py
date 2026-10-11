from pathlib import Path
import sys,json,subprocess,hashlib
ROOT=Path(__file__).resolve().parents[3];sys.path[:0]=[str(ROOT/'bench'),str(ROOT/'knowledge')]
from compact_selection28 import plan
from ink_knowledge import Store
from producers.web_pipeline33_laws import source_functions
P=Path(__file__).resolve().parent/'prior-probe';P.mkdir(exist_ok=True);compiler=ROOT/'reports/web-stack-proofs-32-2026-10-11/main-integration/ink-main-publish';model=ROOT/'reports/web-stack-proofs-32-2026-10-11/cpu-cost-model.json';store=Store(ROOT/'knowledge')
if store.snapshot_id!='3c78ba2b4059c318afafca2f087c774139c00dc666288c207598b7c91abb2957':raise RuntimeError('canonical prior changed')
tasks=[]
for name,t,source in source_functions(True):tasks.append((name,source,'exact_batch33_heldout'))
for side in ['left','right']:
 name='pipeline34_'+side+'_projection_u32';unused='xs'if side=='left'else'ys';selected='ys'if side=='left'else'xs';cb='fn(unused)=>fn(y)=>selected_word(y,seed,k)'if side=='left'else'fn(y)=>fn(unused)=>selected_word(y,seed,k)';expr=unused+'.map(fn(x)=>discarded_word(x,seed,k)).zip('+selected+','+cb+')'if side=='left'else selected+'.zip('+unused+'.map(fn(x)=>discarded_word(x,seed,k)),'+cb+')';src=f'pub fn {name}(xs:List<u32>,ys:List<u32>,seed:u32,k:u32)->List<u32>'+'{return '+expr+';}\nfn selected_word(x:u32,seed:u32,k:u32)->u32{return choose(x<seed,x+k,x-k);}\nfn discarded_word(x:u32,seed:u32,k:u32)->u32{return quot_or(x,k,0)+rem_or(x,k,0)+seed;}';tasks.append((name,src,'raw_map_only'))
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
