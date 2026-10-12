"""Author checked traversal-elimination plans; optionally benchmark JS execution."""
import argparse,json,subprocess,sys,time,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity
from ink_knowledge.law_templates import generate
from ink_knowledge.proposal_views import ProposalViews
from ink_planner.semantic_search import match
from producers.traversal_templates import templates

def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--output',type=Path,default=ROOT/'build/traversal-elimination');p.add_argument('--author-only',action='store_true');a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve();source=Path(__file__).with_name('traversals.ink')
 def run(*args):
  r=subprocess.run(list(map(str,[compiler,*args])),capture_output=True,text=True,check=True);return json.loads(r.stdout)if r.stdout.lstrip().startswith('{')else r.stdout
 receipt=run('emit-core',source,'-o',out/'core.json');run('emit-semantic',out/'core.json','--core','-o',out/'subject.json');core=json.loads((out/'core.json').read_bytes());subject=json.loads((out/'subject.json').read_bytes())
 st=Store.publish(out/'database',[r['object']for r in templates()]);st.rebuild();start=time.perf_counter();objects,receipts=generate(st,subject,core);authoring=time.perf_counter()-start
 applications=[];roots=[]
 for name,body in subject['functions'].items():
  for ident,obj in sorted(objects.items()):
   args={};law=obj['payload']
   if match(law['from'],body,law['params'],args):
    applications.append(dict(function=name,path=[],law=ident,arguments=args,premises=[]));roots.append(ident);break
 assert len(applications)==6,applications
 view=ProposalViews(st,objects,out/'views').bundle(roots)
 package=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=receipt['core_sha256'],knowledge=view,applications=applications)
 packet=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=receipt['core_sha256'],steps=[dict(kind='rewrite',package=package)])
 (out/'plan.json').write_bytes(canonical(packet));run('check-plan',out/'core.json',out/'plan.json','--core')
 (out/'proofs.json').write_bytes(canonical(view));run('knowledge-check',out/'core.json',out/'proofs.json')
 if a.author_only:print(json.dumps(dict(applications=6,laws=len(objects))));return
 run('build',source,'--target','javascript','-o',out/'literal.mjs');run('emit-plan',source,out/'plan.json','--target','javascript','-o',out/'selected.mjs')
 result=json.loads(subprocess.check_output(['node','--expose-gc',Path(__file__).with_name('traversals.mjs'),out],text=True))
 result.update(compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),template_ids=[identity(r['object'])for r in templates()],generated_laws=len(objects),authoring_seconds=authoring,receipts=receipts,scope='Designed applicability corpus, forced checked selection; no claim of automatic profitability selection or held-out program generalisation.')
 (out/'results.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['summary'],indent=2))
if __name__=='__main__':main()
