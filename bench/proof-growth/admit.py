"""Replay every reusable family on independent scalar and composite carriers."""
import argparse,json,subprocess,sys,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,semantic_entry
from ink_knowledge.law_templates import substitute_types,generate
from ink_knowledge.proposal_views import ProposalViews
from producers.pipeline_templates import templates
p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--output',type=Path,default=ROOT/'build/proof-growth-epoch3/admission-complete');a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
carriers=['U32','String','F32','Int','Bool',{'List':'U64'},{'Option':'U32'},{'Result':['String','Unit']}]
rows=[]
for index,ty in enumerate(carriers):
 for r in templates():
  names=r['object']['payload']['type_parameters'];bindings={n:carriers[(index+i)%len(carriers)]for i,n in enumerate(names)}
  rows.append(semantic_entry(substitute_types(r['object']['payload']['law'],bindings)))
st=Store.publish(a.output/'templates',[r['object']for r in templates()]);st.ensure_index();core=a.output/'core.json'
r=subprocess.run([str(a.compiler),'emit-core',str(Path(__file__).with_name('corpus.ink')),'-o',str(core)],capture_output=True,text=True);assert r.returncode==0,r.stderr
subject=dict(functions={str(i):r['payload']['from']for i,r in enumerate(rows)})
objects,receipts=generate(st,subject,json.loads(core.read_text()));view=a.output/'view.json';view.write_bytes(canonical(ProposalViews(st,objects,a.output/'views').bundle(list(objects))))
r=subprocess.run([str(a.compiler),'knowledge-check',str(core),str(view)],capture_output=True,text=True);assert r.returncode==0,r.stderr
report=dict(schema=1,carriers=carriers,instances=len(rows),compiler_sha256=hashlib.sha256(a.compiler.read_bytes()).hexdigest(),evidence=json.loads(r.stdout));(a.output/'result.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(dict(instances=len(rows),status='checked')))
