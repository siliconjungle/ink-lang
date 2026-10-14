#!/usr/bin/env python3
"""Replay a source loop embedding separately in both branches of a source guard."""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical
from producers.loop_state_embedding import guarded_proposals

def main():
 p=argparse.ArgumentParser(description=__doc__)
 for n in ['core','subject','compiler','embedding_store']:p.add_argument('--'+n.replace('_','-'),type=Path,required=True)
 p.add_argument('--left',required=True);p.add_argument('--right',required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 if a.o.exists():raise ValueError('refusing to overwrite proof output')
 core=json.loads(a.core.read_bytes());subject=json.loads(a.subject.read_bytes())
 parent=Store(a.embedding_store);key=json.loads((parent.root/'store/names.json').read_text())['until_embedding']
 generated,ident=guarded_proposals(core,subject,a.left,a.right,key)
 objects={**parent.bundle([key])['objects'],**generated};names={'guarded_loop_embedding':ident}
 for branch in generated[ident]['dependencies']:
  condition=generated[branch]['payload']['conditions'][0]['to']['node']['Bool'];names['branch_'+str(condition).lower()]=branch
 store=Store.publish(a.o,list(objects.values()),names);view=a.o/'view.json';view.write_bytes(canonical(store.bundle([ident])))
 r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.core.resolve(),view.resolve()],capture_output=True,text=True,timeout=120);(a.o/'admission.log').write_text(r.stdout+r.stderr)
 if r.returncode:raise ValueError(r.stderr[-3000:])
 (a.o/'checked-source.json').write_bytes(a.core.read_bytes());print(json.dumps(dict(status='checked',identity=ident,scope='Complete source equality; both guard branches and nested loop-state embeddings replayed.')))

if __name__=='__main__':main()
