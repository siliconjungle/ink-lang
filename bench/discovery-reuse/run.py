"""Paired discovery ablations: frozen compiler, byte-identical generated laws."""
import argparse,copy,hashlib,importlib.util,json,random,statistics,subprocess,sys,time,tracemalloc
from pathlib import Path
from unittest.mock import patch
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical
from ink_knowledge.law_templates import generate
from ink_knowledge.template_matching import TemplateSites

def load(name,file):
 spec=importlib.util.spec_from_file_location('ink_knowledge.'+name,file);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module

def worker(out,lane,scale):
 baseline=load('_baseline_laws',out/'baseline-law_templates.py');sites=load('_baseline_sites',out/'baseline-template_matching.py');old_store=load('_baseline_store',out/'baseline-store.py')
 st=Store(out/'catalogue');subject=json.loads((out/'subject.json').read_bytes());core=json.loads((out/'core.json').read_bytes())
 original=subject['functions'];subject['functions']={**original,**{name+'_'+str(n):body for n in range(1,scale)for name,body in original.items()}}
 function=generate if lane in ('reuse','combined')else baseline.generate
 site_class=TemplateSites if lane in ('structure','combined')else sites.TemplateSites
 import ink_knowledge.store as current_store
 read=current_store._read_canonical if lane in ('bounded-read','combined')else old_store._read_canonical
 with patch('ink_knowledge.template_matching.TemplateSites',site_class),patch('ink_knowledge.store._read_canonical',read):
  start=time.perf_counter();objects,receipts=function(st,subject,core);seconds=time.perf_counter()-start
  digest=hashlib.sha256(canonical(objects)).hexdigest()
  if lane=='combined'and scale==1:(out/'generated.json').write_bytes(canonical(list(objects.values())))
  tracemalloc.start();function(st,subject,core);_,peak=tracemalloc.get_traced_memory();tracemalloc.stop()
 return dict(seconds=seconds,peak_python_bytes=peak,laws=len(objects),output_sha256=digest,inference_attempts=sum(r['inference_attempts']for r in receipts),cache_hits=sum(r.get('instantiation_cache_hits',0)for r in receipts))

def matching(out):
 from producers.pipeline_templates import templates
 from ink_knowledge.law_templates import substitute_types
 from producers.semantic_laws import value,op,term
 from ink_planner.semantic_search import key
 old=load('_baseline_matching',out/'baseline-template_matching.py').TemplateSites
 base=next(r['object']['payload']['law']for r in templates()if r['name']=='map-identity')
 rng=random.Random(638);results=[]
 for count in [32,128,256]:
  patterns=[]
  for n in range(count):
   pattern=copy.deepcopy(base['from']);body=pattern['node']['Op'][1][1]['node']['Lambda'];u=value('U32');word=term(u,{'Word':n})
   pattern['node']['Op'][1][1]['node']['Lambda']=op(body['sort'],'call:choose',op(value('Bool'),'binary:==',word,word),body,body);patterns.append(pattern)
  subject={'functions':{str(n):substitute_types(pattern,{'A':'U32'})for n,pattern in enumerate(patterns)}}
  samples={'baseline':[],'structure':[]};attempts={};expected=None
  for _ in range(7):
   order=list(samples);rng.shuffle(order)
   for lane in order:
    start=time.perf_counter();sites=(old if lane=='baseline'else TemplateSites)(subject)
    matches=[(i,name,path,bindings)for i,pattern in enumerate(patterns)for name,path,_,bindings in sites.matches(pattern,base['params'],['A'])]
    samples[lane].append(time.perf_counter()-start);attempts[lane]=sites.attempts
    digest=key(matches)
    if expected is None:expected=digest
    assert digest==expected
  medians={lane:statistics.median(values)for lane,values in samples.items()}
  results.append(dict(templates=count,sites=count,matches=len(matches),samples_seconds=samples,median_seconds=medians,inference_attempts=attempts,speedup=medians['baseline']/medians['structure']))
 return results

def main():
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'build/discovery-reuse');p.add_argument('--baseline',default='60f3603c5a69ffd27a7ddadef5668678fb277b64');p.add_argument('--worker',choices=['baseline','structure','reuse','bounded-read','combined']);p.add_argument('--matching-only',action='store_true');p.add_argument('--scale',type=int,default=1);a=p.parse_args();out=a.output.resolve();out.mkdir(parents=True,exist_ok=True)
 if a.worker:print(json.dumps(worker(out,a.worker,a.scale)));return
 if a.matching_only:
  rows=matching(out);(out/'matching.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps([{k:v for k,v in row.items()if k!='samples_seconds'}for row in rows],indent=2));return
 for name in ['law_templates','template_matching','store']:
  content=subprocess.check_output(['git','-C',str(ROOT/'knowledge'),'show',a.baseline+':ink_knowledge/'+name+'.py']);(out/('baseline-'+name+'.py')).write_bytes(content)
 compiler=ROOT/'target/debug/ink';source=ROOT/'bench/proof-growth/corpus.ink'
 for command in [[compiler,'emit-core',source,'-o',out/'core.json'],[compiler,'emit-semantic',out/'core.json','--core','-o',out/'subject.json']]:subprocess.run(list(map(str,command)),check=True,capture_output=True)
 from producers.pipeline_templates import templates
 st=Store.publish(out/'catalogue',[r['object']for r in templates()]);st.rebuild()
 rng=random.Random(318);rows=[]
 for scale in [1,4,16]:
  samples={lane:[]for lane in ['baseline','structure','reuse','bounded-read','combined']};expected=None
  for _ in range(7):
   lanes=list(samples);rng.shuffle(lanes)
   for lane in lanes:
    r=subprocess.run([sys.executable,__file__,'--output',str(out),'--worker',lane,'--scale',str(scale)],capture_output=True,text=True);
    if r.returncode:raise ValueError(r.stderr)
    sample=json.loads(r.stdout)
    if expected is None:expected=sample['output_sha256']
    assert expected==sample['output_sha256'],(scale,lane)
    samples[lane].append(sample)
  medians={lane:statistics.median(s['seconds']for s in values)for lane,values in samples.items()}
  rows.append(dict(scale=scale,functions=12*scale,samples=samples,median_seconds=medians,speedup={lane:medians['baseline']/value for lane,value in medians.items()}))
 report=dict(schema=1,baseline_knowledge_revision=a.baseline,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),snapshot=st.snapshot_id,scope='Existing designed typed corpus; 4x/16x repeat its functions to stress module growth, not independent unseen programs. Complete template discovery/instantiation, excluding compiler execution and process startup. All lanes produce byte-identical laws; memory is separately measured Python traced peak, not process RSS.',results=rows)
 report['same_head_matching']=matching(out)
 generated=json.loads((out/'generated.json').read_bytes());proofs=Store.publish(out/'admission',generated);view=out/'view.json';view.write_bytes(canonical(proofs.bundle(list(proofs.members()))));checked=subprocess.run(list(map(str,[compiler,'knowledge-check',out/'core.json',view])),capture_output=True,text=True,check=True)
 report['kernel_replay']=json.loads(checked.stdout)
 report['producer_sha256']={name:hashlib.sha256((ROOT/'knowledge/ink_knowledge'/name).read_bytes()).hexdigest()for name in ['law_templates.py','template_matching.py','template_index.py','store.py']}
 (out/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps([{k:v for k,v in row.items()if k not in ['samples']}for row in rows],indent=2))
if __name__=='__main__':main()
