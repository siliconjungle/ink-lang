import copy,json,subprocess,sys
from pathlib import Path
r=Path(__file__).resolve().parents[2];sys.path.insert(0,str(r/'knowledge'))
from ink_knowledge import Store,canonical,identity
from ink_knowledge.store import entry
from producers.frozen_composition import ChunkPartial
out=r/'build/function-projection/graph';out.mkdir(exist_ok=True)
ink=r/'build/function-projection/ink'
def run(*args):
 p=subprocess.run([str(x)for x in args],capture_output=True,text=True,timeout=240)
 if p.returncode:raise RuntimeError(p.stderr[-4000:])
 return p.stdout
code='['+','.join('Node{kind:Kind.'+('Multiply'if i%2 else'Add')+',wire:'+str(i)+',weight:'+str(i%2)+'}' for i in range(32))+']'
text=(r/'knowledge/tests/fixtures/owned-frozen-source.ink').read_text()
text=text.replace('return evaluate(Code.get', 'return adaptive(Code.get').replace('let result=evaluate(Code.get','let result=adaptive(Code.get')
text+='\nfn chosen(weights:List<f32>,input:List<f32>)->List<f32>{return evaluate('+code+',weights,input);}\n'
text+='fn adaptive(code:List<Node>,weights:List<f32>,input:List<f32>)->List<f32>{return choose(code=='+code+',chosen(weights,input),evaluate(code,weights,input));}\n'
text+='change recode(code:List<Node>)->Unit writes(Code){Code.put(0,code);return ();}\n'
(out/'source.ink').write_text(text);run(ink,'emit-core',out/'source.ink','-o',out/'core.json')
source=json.loads((out/'core.json').read_bytes());selected=copy.deepcopy(source)
p=ChunkPartial(selected['program']);chosen=next(f for f in selected['program']['functions']if f['name']=='chosen')
p.types=dict(chosen['params']);chosen['body']=p.inline_call(p.functions['evaluate'],chosen['body']['Call'][1],('evaluate',),0)
assert p.helpers
selected['program']['functions']+=p.helpers
(out/'selected.json').write_bytes(canonical(selected))
obj=entry('definition','ink-source-extension-v1',dict(functions=p.helpers));key=identity(obj);store=Store.publish(out/'extensions',[obj])
sid=json.loads(run(ink,'check-core',out/'core.json'))['core_sha256']
request=dict(schema=1,semantics='ink-source-extension-v1',input_core_sha256=sid,extension=key,knowledge=store.bundle([key]))
plan=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=sid,steps=[dict(kind='extension',package=request)])
(out/'extension.json').write_bytes(canonical(plan));run(ink,'check-plan',out/'core.json',out/'extension.json','--core','--state-out',out/'state.json')
(out/'extended.json').write_bytes(canonical(json.loads((out/'state.json').read_bytes())['core']))
print(json.dumps(dict(status='proposed',helpers=len(p.helpers))),flush=True)
print(run(sys.executable,r/'knowledge/producers/function_equality.py',out/'extended.json',out/'selected.json','--ink',ink,'-o',out/'functions.json'),flush=True)
plan['steps']+=json.loads((out/'functions.json').read_bytes())['steps'];(out/'plan.json').write_bytes(canonical(plan))
print(run(ink,'check-plan',out/'core.json',out/'plan.json','--core')[:300],flush=True)
