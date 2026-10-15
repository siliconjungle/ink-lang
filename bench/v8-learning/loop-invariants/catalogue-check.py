"""Check discovery through the installed catalogue, without publishing to it."""
import tempfile,json,subprocess,os
from pathlib import Path
from ink_knowledge.proposals import generate
from ink_knowledge import Store,canonical,semantic_entry,identity
from producers.loop_invariants import specialize
root=Path(__file__).resolve().parents[3];compiler=Path(os.environ.get('INK_COMPILER',root/'target/debug/ink')).resolve()
source=root/'knowledge/tests/fixtures/loop-invariants/source.ink'
with tempfile.TemporaryDirectory()as tmp:
 d=Path(tmp)
 for args in [('emit-core',source,'-o',d/'core.json'),('emit-semantic',d/'core.json','--core','-o',d/'semantic.json')]:
  subprocess.run([str(compiler),*map(str,args)],check=True,capture_output=True)
 core=json.loads((d/'core.json').read_bytes());subject=json.loads((d/'semantic.json').read_bytes());objects,receipts=generate(subject,core)
 receipt=next(r for r in receipts if r['module']=='producers.loop_invariants')
 assert receipt['candidates']==len(specialize(subject,core)) and not receipt['rejected'],receipt
 wanted={identity(semantic_entry(raw))for _,raw in specialize(subject,core)}
 selected={i:objects[i]for i in wanted};store=Store.publish(d/'knowledge',selected.values());view=d/'view.json';view.write_bytes(canonical(store.bundle(sorted(selected))))
 result=subprocess.run([str(compiler),'knowledge-check',str(d/'core.json'),str(view)],check=True,capture_output=True,text=True)
 report=dict(schema=1,module=receipt,total_catalogue_modules=len(receipts),selected_laws=len(selected),checker_output=json.loads(result.stdout),scope='Installed catalogue discovery and independent kernel admission; primitive-only laws remain universal typed equalities')
 Path(__file__).with_name('catalogue-validation.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(dict(module=receipt['module'],candidates=len(selected),status='checked')))
