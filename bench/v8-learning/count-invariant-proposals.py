"""Separate exact callback-hoist discovery from the corpus's aggregate counts."""
import json,subprocess,tempfile,hashlib
from pathlib import Path
from ink_knowledge import identity,semantic_entry
from ink_knowledge.proposals import nominal_types
from producers.definition_context28 import bind,calls
from producers.loop_invariants import specialize
root=Path(__file__).resolve().parents[2];directory=root/'bench/v8-learning/corpus-invariants'
compiler=root/'target/debug/ink';context=json.loads((directory/'context.json').read_text())
report=json.loads((directory/'report.json').read_text());admitted=set(report['attribution'])
rows=[]
with tempfile.TemporaryDirectory()as tmp:
 for name,inputs in context['corpus_inputs'].items():
  path=directory/'inputs'/(inputs['core_sha256']+'.core.json');model=json.loads(path.read_bytes())
  semantic=Path(tmp)/'semantic.json'
  subprocess.run([str(compiler),'emit-semantic',str(path),'--core','-o',str(semantic)],check=True,capture_output=True)
  subject=json.loads(semantic.read_bytes());proposals=specialize(subject,model);ids=[]
  names={f['name']for f in model['program']['functions']}
  for label,law in proposals:
   if calls(law,names)or nominal_types(law):law=bind(law,model,subject)
   ident=identity(semantic_entry(law));ids.append(dict(label=label,law=ident,reported_admitted=ident in admitted))
  rows.append(dict(program=name,core_sha256=inputs['core_sha256'],proposals=ids))
result=dict(schema=1,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),producer_sha256=hashlib.sha256((root/'knowledge/producers/loop_invariants.py').read_bytes()).hexdigest(),scope='Post-run discovery diagnostic on the exact captured cores; does not change the frozen corpus report or supply runtime evidence',programs=rows)
(root/'bench/v8-learning/corpus-invariants-proposals.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({r['program']:len(r['proposals'])for r in rows}))
