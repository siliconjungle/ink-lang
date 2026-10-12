"""Frozen-compiler discovery/storage scaling and composed algorithm ablation."""
import argparse,copy,hashlib,json,random,statistics,subprocess,sys,time
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,entry,identity,canonical,semantic_entry
from ink_knowledge.law_templates import generate
from ink_knowledge.object_pack import pack
from ink_knowledge.source_algorithms import propose
from ink_knowledge.law_templates import substitute_types
from producers.pipeline_templates import templates
from producers.composed_algorithms import templates as compositions
from producers.semantic_laws import value,op,term

def command(argv):
 start=time.perf_counter();r=subprocess.run(list(map(str,argv)),capture_output=True,text=True,timeout=600)
 if r.returncode:raise ValueError(r.stderr)
 return r.stdout,time.perf_counter()-start

def author(compiler,out,source):
 out.mkdir(parents=True,exist_ok=True);core=out/'core.json'
 stdout,_=command([compiler,'emit-core',source,'-o',core]);original=json.loads(core.read_bytes());sourceid=json.loads(stdout)['core_sha256']
 rows=json.loads((ROOT/'knowledge/libraries/source-algorithms.json').read_bytes());parents=compositions();st=Store.publish(out/'database',[r['object']for r in rows+parents]);st.rebuild()
 context=dict(core=original,source=sourceid,compiler=str(compiler),knowledge_root=str(st.root),knowledge_snapshot=st.snapshot_id)
 lanes={};receipts={};countid=identity(rows[2]['object']);partid=identity(rows[1]['object']);newid=identity(parents[0]['object'])
 for name,ids in [('prior-one',[countid]),('prior-chain',[countid,partid]),('composed',[newid])]:
  ctx=copy.deepcopy(context);steps=[];start=time.perf_counter()
  for desired in ids:
   candidates=list(propose(ctx));candidate=next(r for r in candidates if r['status']=='proposal'and r['label']==desired)
   steps.extend(candidate['steps']);packet=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=sourceid,steps=steps);path=out/(name+'.plan.json');path.write_bytes(canonical(packet))
   stdout,_=command([compiler,'check-plan',core,path,'--core']);ctx.update(json.loads(stdout)['state'])
  receipts[name]=dict(seconds=time.perf_counter()-start,steps=len(steps),snapshot=st.snapshot_id,plan_sha256=identity(packet))
  lanes[name]=out/(name+'.mjs');_,receipts[name]['emission_seconds']=command([compiler,'emit-plan',source,path,'--target','javascript','-o',lanes[name]])
 lanes['literal']=out/'literal.mjs';_,seconds=command([compiler,'build',source,'--target','javascript','-o',lanes['literal']]);receipts['literal']=dict(emission_seconds=seconds)
 return receipts,lanes

def discovery(compiler,out):
 source=ROOT/'bench/proof-growth/corpus.ink';corefile=out/'discovery-core.json';subjectfile=out/'subject.json'
 command([compiler,'emit-core',source,'-o',corefile]);command([compiler,'emit-semantic',corefile,'--core','-o',subjectfile]);core=json.loads(corefile.read_bytes());subject=json.loads(subjectfile.read_bytes())
 real=templates();base=next(r['object']for r in real if r['name']=='map-identity')
 rng=random.Random(831);results=[]
 for count in [18,128,512,2048]:
  objects=[r['object']for r in real]
  # Valid but inapplicable identity-map variants are stress fixtures, not newly
  # counted optimisation families or evidence of unseen-program coverage.
  for n in range(count-len(objects)):
   obj=copy.deepcopy(base);law=obj['payload']['law'];before=copy.deepcopy(law['from']);a=before['node']['Op'][1][1]['node']['Lambda'];u=value('U32');word=term(u,{'Word':n});b=value('Bool')
   law['from']['node']['Op'][1][1]['node']['Lambda']=op(a['sort'],'call:choose',op(b,'binary:==',word,word),a,a)
   law['proof']={'Trans':dict(middle=before,left='Normalize',right=law['proof'])};objects.append(entry('definition',obj['semantics'],obj['payload'],obj['dependencies']))
  st=Store.publish(out/('catalogue-'+str(count)),objects);start=time.perf_counter();st.rebuild();setup=time.perf_counter()-start
  all_ids=sorted(st.members());samples={'exhaustive':[],'indexed':[]};expected=None;read_counts={}
  for round_ in range(7):
   order=list(samples);rng.shuffle(order)
   for lane in order:
    with patch.object(st,'object',wraps=st.object)as reads:
     start=time.perf_counter()
     if lane=='exhaustive':
      with patch('ink_knowledge.template_index.candidates',return_value=all_ids):result,receipts=generate(st,subject,core)
     else:result,receipts=generate(st,subject,core)
     samples[lane].append(time.perf_counter()-start);read_counts[lane]=reads.call_count
    keys=set(result)
    if expected is None:expected=keys
    assert keys==expected,(count,lane)
  admission=None
  if count==2048:
   concrete=[semantic_entry(substitute_types(o['payload']['law'],{'A':'Bool'}))for o in objects[len(real):]]
   check=Store.publish(out/'stress-admission',concrete);packet=out/'stress-view.json';seconds=0
   for at in range(0,len(concrete),512):
    packet.write_bytes(canonical(check.bundle([identity(o)for o in concrete[at:at+512]])))
    _,elapsed=command([compiler,'knowledge-check',corefile,packet]);seconds+=elapsed
   admission=dict(concrete_instances=len(concrete),seconds=seconds,carrier='Bool',batch_size=512)
  results.append(dict(entries=count,real_families=len(real),stress_variants=count-len(real),index_setup_seconds=setup,samples_seconds=samples,median_seconds={k:statistics.median(v)for k,v in samples.items()},authenticated_objects=read_counts,generated_laws=len(expected),stress_admission=admission))
 return results

def storage(out):
 rng=random.Random(187);results=[]
 for count in [128,1024,4096]:
  objects=[];parent=None
  for n in range(count):
   obj=entry('definition','storage-fixture-v1',dict(item=n,body='x'*512),[]if parent is None else[parent]);objects.append(obj);parent=identity(obj)
   # Bound closure depth while still exercising dependency expansion.
   if n%16==15:parent=None
  st=Store.publish(out/('storage-'+str(count)),objects);st.rebuild();roots=[identity(o)for o in objects];baseline=canonical(st.bundle(roots));pack_receipt=pack(st)
  loose=st.data/'objects';hidden=st.data/'loose-disabled';samples={'loose':[],'packed':[]}
  for round_ in range(7):
   order=list(samples);rng.shuffle(order)
   for lane in order:
    if lane=='packed':loose.rename(hidden)
    try:
     start=time.perf_counter();actual=canonical(st.bundle(roots));samples[lane].append(time.perf_counter()-start)
     assert actual==baseline
    finally:
     if hidden.exists():hidden.rename(loose)
  results.append(dict(entries=count,samples_seconds=samples,median_seconds={k:statistics.median(v)for k,v in samples.items()},pack=pack_receipt,bundle_bytes=len(baseline)))
 return results

def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--output',type=Path,default=ROOT/'build/composable-knowledge');p.add_argument('--real-inputs',type=Path);p.add_argument('--source',type=Path,default=Path(__file__).with_name('corpus.ink'));p.add_argument('--author-only',action='store_true');a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve()
 if not a.author_only:
  frozen=out/'frozen-ink';frozen.write_bytes(compiler.read_bytes());frozen.chmod(0o755);compiler=frozen
 source=a.source;receipts,lanes=author(compiler,out,source)
 if a.author_only:print(json.dumps(receipts));return
 data=[]
 if a.real_inputs:data=json.loads(a.real_inputs.read_bytes())
 inputfile=out/'inputs.json';inputfile.write_text(json.dumps(data))
 stdout,_=command(['node','--expose-gc',Path(__file__).with_name('run.mjs'),out,inputfile]);execution=json.loads(stdout)
 producer_files=['ink_knowledge/store.py','ink_knowledge/template_index.py','ink_knowledge/template_matching.py','ink_knowledge/law_templates.py','ink_knowledge/source_algorithms.py','ink_knowledge/object_pack.py','producers/composed_algorithms.py']
 fingerprints={p:hashlib.sha256((ROOT/'knowledge'/p).read_bytes()).hexdigest()for p in producer_files}
 report=dict(schema=1,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),input_sha256=hashlib.sha256(a.real_inputs.read_bytes()).hexdigest()if a.real_inputs else None,producer_sha256=fingerprints,scope='Designed capability corpus; forced proposals and existing multi-step control, not ordinary automatic selection or unseen-source generalisation. Search growth uses clearly labelled synthetic, valid identity-map variants; they are not new optimisation families. Pack samples charge authenticated full dependency export and serialization.',authoring=receipts,execution=execution,discovery=discovery(compiler,out),storage=storage(out))
 (out/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items()if k in ['compiler_sha256','authoring']}))
if __name__=='__main__':main()
