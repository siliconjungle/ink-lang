"""Required full transport-assembly controls; no theorem-name authority."""
from pathlib import Path
import argparse,hashlib,json,subprocess,sys,time
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import value,var,word,binary,law
from producers.frozen_laws import index,load,closure
p=argparse.ArgumentParser();p.add_argument('--variant',choices=['eager','adaptive'],required=True);p.add_argument('--case',choices=['ordinary','near-limit'],required=True);p.add_argument('--process',type=int,required=True);a=p.parse_args();b=Path('build/v8-variable-power-cases');sys.path.insert(0,str((b/'adaptive-transport').resolve()))
if a.variant=='eager':from eager_views import ProposalViews
else:from ink_knowledge.proposal_views import ProposalViews
out=b/'transport-controls'/f'{a.case}-{a.variant}-{a.process}';out.mkdir(parents=True);source=Store.publish(out/'source',[]);noise={hashlib.sha256(('unused/'+str(i)).encode()).hexdigest():dict(dependencies=[])for i in range(2048)}
if a.case=='ordinary':
 s=value('U32');x=var(s,'x');obj=semantic_entry(law({'x':s},binary('+',x,word('U32',0)),x));root=identity(obj);objects={**noise,root:obj}
else:
 data=Path('knowledge/producers/data/v8-integer-laws');claim=load(data,next(r for r in index(data)if r['name']=='u32_rem_or_variable_power_guard'));root=identity(semantic_entry(claim));objects={**noise,**{identity(semantic_entry(l)):semantic_entry(l)for _,l in closure(data,[('root',claim)])}}
start=time.monotonic();views=ProposalViews(source,objects,out/'transport');construction=time.monotonic()-start;start=time.monotonic();view=views.bundle([root]);bundle=time.monotonic()-start;start=time.monotonic();raw=canonical(view);export=time.monotonic()-start;assert views.bytes==len(raw);result=dict(schema=1,exit_status=0,case=a.case,variant=a.variant,process=a.process,identities=len(objects),exported_objects=len(view['objects']),construction_seconds=str(construction),bundle_seconds=str(bundle),export_seconds=str(export),complete_assembly_seconds=str(construction+bundle+export),view_bytes=len(raw),view_sha256=hashlib.sha256(raw).hexdigest(),tree_files=len(list((out/'transport').rglob('trees/*.json'))),scope='Fresh Python process, exact same selected proof body/closure and2048 unused deterministic discovery identities. Complete construction/bundle/export measured; no heap measurement, compiler-wide or application speed claim. Unused dummy bodies are never exported/admitted.')
(out/'terminal.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
