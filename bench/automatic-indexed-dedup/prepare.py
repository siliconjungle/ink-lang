#!/usr/bin/env python3
"""Prepare the exact checked alternative; this does not force normal planning."""
import argparse,json,pathlib,subprocess,sys
R=pathlib.Path(__file__).resolve().parents[2];sys.path[:0]=[str(R/'knowledge'),str(R/'planner')]
from producers.indexed_dedup import write
p=argparse.ArgumentParser();p.add_argument('--compiler',type=pathlib.Path,default=R/'target/debug/ink');p.add_argument('--output',type=pathlib.Path,required=True);args=p.parse_args()
D=args.output.resolve();compiler=args.compiler.resolve();source,proofs=write(D)
def run(*arguments):
 result=subprocess.run(list(map(str,[compiler,*arguments])),capture_output=True,text=True,check=True);return result
receipt=json.loads(run('emit-laws',source,'--proofs',proofs,'-o',D/'bundle.json').stdout);(D/'authoring.json').write_text(json.dumps(receipt,indent=2)+'\n')
helper=(R/'knowledge/libraries/indexed-dedup-u32.ink').read_text().split('law index_membership')[0].split('\n',1)[1]
program='module indexed_words;\n'+helper+'\npub fn run(xs:List<u32>)->List<u32>{return foldl(xs,empty_words(),fn(item,acc)=>dedup_step(item,acc));}\n'
(D/'program.ink').write_text(program);run('emit-core',D/'program.ink','-o',D/'core.json');run('emit-semantic',D/'core.json','--core','-o',D/'subject.json')
subject=json.loads((D/'subject.json').read_text());bundle=json.loads((D/'bundle.json').read_text())
selection=dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=subject['input_core_sha256'],knowledge=bundle,applications=[dict(function='run',path=[],law=receipt['names']['dedup_indexed'],arguments={'xs':dict(sort={'Value':{'List':'U32'}},node={'Free':'xs'})},premises=[])])
(D/'selection.json').write_text(json.dumps(selection));run('check-selection',D/'core.json',D/'selection.json')
for name,extra in [('baseline',[]),('selected',['--selection',D/'selection.json'])]:run('build',D/'core.json','--core','--target','javascript',*extra,'-o',D/(name+'.mjs'))
print(json.dumps({'status':'checked','directory':str(D),'law':receipt['names']['dedup_indexed'],'scope':'Explicit checked selection; automatic discovery is separate'}))
