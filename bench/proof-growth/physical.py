"""Discover checked lexical borrowing via the database's general place producer."""
import json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from producers.planning_recipes import lexical_reads

def packet(compiler,source,selection,out):
 out=Path(out);out.mkdir(parents=True,exist_ok=True)
 selection=json.loads(Path(selection).read_text());plan=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=selection['input_core_sha256'],steps=[dict(kind='rewrite',package=selection)])
 path=out/'plan.json';path.write_text(json.dumps(plan));state=out/'state.json'
 def invoke(*args):
  r=subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True);assert r.returncode==0,r.stderr;return json.loads(r.stdout)
 invoke('check-plan',source,path,'--state-out',state)
 current=json.loads(state.read_text());physical=dict(schema=1,semantics='ink-physical-plan-v1',input_core_sha256=current['source'],tables='ordered',borrow_reads=sorted(lexical_reads(current['core']['program'])),borrow_rows=[],definitions='shared',packed_datatypes=[],memo_functions=[])
 plan['steps'].append(dict(kind='physical',package=physical));path.write_text(json.dumps(plan));checked=invoke('check-plan',source,path,'--target','rust');(out/'receipt.json').write_text(json.dumps(checked,indent=2)+'\n');return path
if __name__=='__main__':
 root=ROOT/'build/proof-growth-epoch3'
 for count in [0,11,16]:print(packet(ROOT/'target/debug/ink',Path(__file__).with_name('corpus.ink'),root/('db'+str(count))/'selection.json',root/('physical'+str(count))))
