#!/usr/bin/env python3
"""Replay a checked word law under source callbacks; no solver in compilation."""
import argparse,json,pathlib,subprocess,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,semantic_entry,identity
from ink_planner.semantic_search import positions,match
from producers.word_laws import specialize
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=pathlib.Path,required=True);p.add_argument('--source',type=pathlib.Path,required=True);p.add_argument('--output',type=pathlib.Path,required=True);p.add_argument('--unfold',action='store_true');a=p.parse_args();a.output.mkdir(parents=True,exist_ok=True)
 core=a.output/'core.json';subject=a.output/'subject.json'
 subprocess.run([a.compiler,'emit-core',a.source,'-o',core],check=True)
 subprocess.run([a.compiler,'emit-semantic',core,'--core','-o',subject],check=True)
 source=json.loads(subject.read_text());rows=dict(specialize(source,json.loads(core.read_text())))
 law=rows['word_case_ranges'];entry=semantic_entry(law);ident=identity(entry)
 store=Store.publish(a.output/'knowledge',[entry]);applications=[]
 for function,body in source['functions'].items():
  for path,target in positions(body):
   arguments={}
   if match(law['from'],target,law['params'],arguments):applications.append(dict(function=function,path=list(path),law=ident,arguments=arguments,premises=[]))
 if not applications:raise ValueError('no word law sites found')
 package=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=source['input_core_sha256'],knowledge=store.bundle([ident]),applications=applications)
 output=a.output/'selection.json';output.write_text(json.dumps(package,indent=2)+'\n')
 result=subprocess.run([a.compiler,'check-selection',core,output],check=True,capture_output=True,text=True)
 (a.output/'receipt.json').write_text(result.stdout)
 if a.unfold:
  selected=a.output/'word-core.json'
  subprocess.run([a.compiler,'emit-core',core,'--core','--selection',output,'-o',selected],check=True)
  unfolded=a.output/'unfolded'
  subprocess.run([sys.executable,ROOT/'bench/cross-domain/prepare.py','--compiler',a.compiler,'--source',selected,'--core','--scalar-calls','--output',unfolded],check=True)
  for name in ['plan.json','rewrite-plan.json']:
   plan=json.loads((unfolded/name).read_text())
   plan['input_core_sha256']=source['input_core_sha256']
   plan['steps'].insert(0,dict(kind='rewrite',package=package))
   (a.output/name).write_text(json.dumps(plan,indent=2)+'\n')
 print('Checked word-law applications:',len(applications))
if __name__=='__main__':main()
