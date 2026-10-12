"""Instantiate the database pipeline templates and replay concrete selections.

A conformance authoring tool, not a profitability policy. The installed planner
can explore the same entries and uses measured evidence to select deployment.
"""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical
from ink_knowledge.law_templates import generate
from ink_knowledge.proposal_views import ProposalViews
from producers.pipeline_templates import publish
from ink_planner.semantic_search import positions,match,substitute,cost,selection_roots

def generate_selection(compiler,directory):
    directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
    def invoke(*args):
        r=subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True,timeout=120)
        if r.returncode:raise ValueError(r.stderr)
        return json.loads(r.stdout)if r.stdout.lstrip().startswith('{')else r.stdout
    source=ROOT/'tests/fixtures/pipeline-templates.ink';core=directory/'core.json';subject=directory/'subject.json'
    receipt=invoke('emit-core',source,'-o',core);invoke('emit-semantic',core,'--core','-o',subject)
    original=json.loads(core.read_bytes());semantic=json.loads(subject.read_bytes());Store.publish(directory/'database',[],{})
    store=publish(directory/'database');store.ensure_index();objects,receipts=generate(store,semantic,original)
    view=ProposalViews(store,objects,directory/'generated');applications=[]
    for name,body in semantic['functions'].items():
        proposals=[]
        for path,target in positions(body):
            for ident,obj in objects.items():
                law=obj['payload'];args={}
                if match(law['from'],target,law['params'],args)and set(args)==set(law['params']):
                    proposals.append((cost(substitute(law['to'],args)),ident,dict(function=name,path=list(path),law=ident,arguments=args,premises=[])))
        if proposals:applications.append(min(proposals,key=lambda x:(x[0],x[1]))[2])
    package=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=receipt['core_sha256'],knowledge=view.bundle(selection_roots(applications)),applications=applications)
    path=directory/'selection.json';path.write_bytes(canonical(package));checked=invoke('check-selection',core,path)
    report=dict(schema=1,templates=len(receipts),generated_laws=len(objects),source_functions=len(semantic['functions']),applied_functions=[a['function']for a in applications],receipts=receipts,evidence=checked,scope='Designed conformance coverage, not a held-out performance estimate or a measured deployment choice')
    (directory/'report.json').write_bytes(canonical(report));return report
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--compiler',required=True);p.add_argument('--root',required=True);args=p.parse_args();print(json.dumps(generate_selection(args.compiler,args.root)))
