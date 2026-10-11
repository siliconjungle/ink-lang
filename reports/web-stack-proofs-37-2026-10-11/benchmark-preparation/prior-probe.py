from pathlib import Path
import sys,json,subprocess,hashlib,argparse
ROOT=Path(__file__).resolve().parents[3];sys.path[:0]=[str(ROOT/'bench'),str(ROOT/'knowledge')]
from compact_selection28 import plan
from ink_knowledge import Store
from producers.web_pipeline37_laws import source_functions
parser=argparse.ArgumentParser();parser.add_argument('--prior',type=Path,required=True);a=parser.parse_args()
P=Path(__file__).resolve().parent/'prior-probe-exact';P.mkdir(exist_ok=True)
compiler=ROOT/'reports/web-stack-proofs-32-2026-10-11/main-integration/ink-main-publish';model=ROOT/'reports/web-stack-proofs-32-2026-10-11/cpu-cost-model.json';store=Store(a.prior)
assert store.snapshot_id=='7f5e7a94b49db567af55f5d1129dd07c5e2b469ebd45cb6e5cbc53595782b2be' and len(store.members())==2512,'full canonical prior changed'
commands=[];rows={};sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(argv):
 r=subprocess.run(list(map(str,argv)),capture_output=True,text=True,cwd=ROOT);commands.append(dict(argv=list(map(str,argv)),exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr));(P/'commands.json').write_text(json.dumps(commands,indent=2)+'\n');assert r.returncode==0,r.stderr
for secondary in [False,True]:
 for name,t,src in source_functions(secondary):
  td=P/name;td.mkdir(exist_ok=True);source=td/'source.ink';source.write_text('module ProofRecipe;\n'+src+'\n');core=td/'literal.core.json';run([compiler,'emit-core',source,'-o',core]);selection=td/'prior.selection.json';receipt=plan(compiler,core,store,model,selection,budget=4096);selected=td/'prior.core.json';run([compiler,'emit-core',core,'--core','--selection',selection,'-o',selected]);body=json.loads(selected.read_text())['program']['functions'][0]['body']
  rows[name]=dict(source_sha256=sha(source),prior_selection_sha256=sha(selection),receipt_sha256=sha(selection.with_suffix('.receipt.json')),selected_roots=receipt['selected_roots'],initial_cost=receipt['search']['initial_cost'],selected_cost=receipt['search']['selected_cost'],exhausted=receipt['search'].get('exhausted'),changed=json.loads(core.read_text())['program']['functions'][0]['body']!=body,body=body)
  (P/'summary.json').write_text(json.dumps(dict(status='running',prior_snapshot=store.snapshot_id,prior_members=len(store.members()),compiler_sha256=sha(compiler),model_sha256=sha(model),rows=rows),indent=2)+'\n');print(name,rows[name]['changed'],receipt['search']['initial_cost'],receipt['search']['selected_cost'],flush=True)
result=json.loads((P/'summary.json').read_text());result['status']='passed';(P/'summary.json').write_text(json.dumps(result,indent=2)+'\n')
