"""Two independent lanes: checked forced capability and ordinary automatic selection."""
from common import *
import sys,copy,argparse
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity
from ink_knowledge.law_templates import generate
from ink_knowledge.proposal_views import ProposalViews
from ink_planner.semantic_search import positions,match,substitute,set_child,children,cost,selection_roots
parser=argparse.ArgumentParser();parser.add_argument('--lane',choices=['forced','automatic','automatic-default'],required=True);parser.add_argument('--repeat',type=int,default=0);args=parser.parse_args()
check_frozen();programs=read(OUT/'corpus.json');points=read(OUT/'checkpoints.json');rows=[]
def at(body,path,replacement):return replacement if not path else set_child(body,path[0],at(list(children(body))[path[0]],path[1:],replacement))
for point in points:
 root=ROOT/point['root']if 'root'in point else OUT/'database';snapshot=root/'store/snapshots'/f'{point["snapshot"]}.json'
 if args.lane.startswith('automatic') and 'ablation'in point:continue
 for p in programs:
  label=point['label'];name=p['name'];d=OUT/'compiled'/args.lane/label/name;d.mkdir(parents=True,exist_ok=True)
  d=d/(f'repeat-{args.repeat}'if args.repeat else '.');d.mkdir(parents=True,exist_ok=True);output=d/'output.mjs'
  if (d/'result.json').exists():rows.append(read(d/'result.json'));continue
  check_frozen();started=time.perf_counter();source=ROOT/p['source'];baseline=OUT/'baseline'/name
  if args.lane.startswith('automatic'):
   # These are explicit, fixed search resource bounds. No evaluation measurements
   # or development input profiles are passed to default automatic selection.
   cmd=[sys.executable,'-m','ink_planner.compiled_planning','--compiler',INK,'--source',source,'--knowledge-root',root,'--snapshot',snapshot,'--target','javascript','--budget','512','--state-limit','16','--time-seconds','8','--semantic-budget','512','--semantic-seconds','8','--proposal-timeout','8','--recipe-workers','1','--memory-bytes','256000000','--emit',output,'-o',d/'plan.json']
   if args.lane=='automatic-default':
    # Actual installed ordinary defaults, including balanced search resources.
    cmd=[sys.executable,'-m','ink_planner.compiled_planning','--compiler',INK,'--source',source,'--knowledge-root',root,'--snapshot',snapshot,'--target','javascript','--emit',output,'-o',d/'plan.json']
   result=process(cmd,d/'automatic-process')
   r=dict(program=name,checkpoint=label,lane=args.lane,process=result,seconds=result['seconds'],status=result['status'])
   receipt=d/'plan.json.receipt.json'
   if receipt.exists():r['receipt']=read(receipt)
  else:
   original=read(baseline/'core.json');current=read(baseline/'semantic.json');st=Store(root,snapshot);t=time.perf_counter();st.ensure_index();index_seconds=time.perf_counter()-t;objects={};applications=[];rounds=[];seen=set();admission_costs=[];discovered=[];rejections=[];template_families={identity(r['object']):r['family']for r in read(OUT/'growth/templates.json')}
   core_receipt=read(baseline/'stdout.txt')
   for iteration in range(12):
    t=time.perf_counter();proposed,receipts=generate(st,current,original);discovery=time.perf_counter()-t;objects.update(proposed);changed=0
    law_families={law:template_families.get(receipt['template'],'pre-existing')for receipt in receipts for law in receipt['laws']}
    for function,body in list(current['functions'].items()):
     candidates=[]
     for path,target in positions(body):
      for ident,o in proposed.items():
       v=o['payload'];bindings={}
       if not v['conditions'] and match(v['from'],target,v['params'],bindings)and set(bindings)==set(v['params']):
        replacement=substitute(v['to'],bindings);nextbody=at(body,path,replacement);key=(function,canonical(nextbody));
        if replacement!=target and key not in seen:candidates.append((cost(nextbody),ident,list(path),bindings,nextbody,key))
     candidates.sort(key=lambda x:(law_families.get(x[1],'pre-existing')=='pre-existing',x[0],x[1],x[2]));discovered.extend(dict(iteration=iteration,function=function,law=x[1],path=x[2],structural_cost=x[0],family=law_families.get(x[1],'pre-existing'))for x in candidates)
     for _,ident,path,bindings,nextbody,key in candidates:
      application=dict(function=function,path=path,law=ident,arguments=bindings,premises=[]);steps=applications+[application]
      view=ProposalViews(st,objects,d/'transport').bundle(selection_roots(steps));package=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=core_receipt['core_sha256'],knowledge=view,applications=steps);packet=d/'trial.json';packet.write_bytes(canonical(package));t=time.perf_counter()
      c=subprocess.run([str(INK),'check-selection',str(baseline/'core.json'),str(packet)],capture_output=True,text=True);seconds=time.perf_counter()-t;admission_costs.append(dict(iteration=iteration,function=function,law=ident,seconds=seconds,status=c.returncode,error=c.stderr))
      seen.add(key)
      if c.returncode:rejections.append(admission_costs[-1]);continue
      current['functions'][function]=nextbody;applications.append(application);changed+=1;break
    rounds.append(dict(iteration=iteration,discovery_seconds=discovery,generated=len(proposed),changed=changed,templates=receipts))
    if not changed:break
   package=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=core_receipt['core_sha256'],knowledge=ProposalViews(st,objects,d/'transport').bundle(selection_roots(applications)),applications=applications)
   packet=d/'selection.json';packet.write_bytes(canonical(package));result=process([INK,'build',source,'--selection',packet,'--target','javascript','-o',output],d/'build-process')
   save(d/'discovery.json',discovered);save(d/'applications.json',applications);save(d/'rounds.json',rounds);save(d/'admission-costs.json',admission_costs)
   r=dict(program=name,checkpoint=label,lane=args.lane,status=result['status'],seconds=time.perf_counter()-started,index_seconds=index_seconds,generated_laws=len(objects),alternatives_discovered=len(discovered),alternatives_admitted=len(admission_costs)-len(rejections),applications=len(applications),rejections=rejections,discovery_seconds=sum(x['discovery_seconds']for x in rounds),checking_seconds=sum(x['seconds']for x in admission_costs),build_process=result)
  if output.exists():r.update(output=str(output.relative_to(ROOT)),artifact_sha256=sha(output))
  save(d/'result.json',r);rows.append(r);save(OUT/(f'{args.lane}-compilation-repeat-{args.repeat}.json'if args.repeat else f'{args.lane}-compilation.json'),rows);print(label,name,r['status'],round(r['seconds'],3),r.get('applications'),flush=True)
check_frozen();save(OUT/(f'{args.lane}-compilation-repeat-{args.repeat}.json'if args.repeat else f'{args.lane}-compilation.json'),rows)
