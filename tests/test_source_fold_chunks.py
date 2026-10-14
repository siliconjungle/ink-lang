"""Concrete source transitions instantiate chunk laws without weakening replay."""
import copy,importlib.util,json,os,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store,canonical,identity,semantic_entry
SOURCE='''module source_chunks;
record Stream{values:Buffer<u32>,index:u32,}
fn append(state:Stream,value:u32)->Stream{return Stream{values:state.values.push(value),index:state.index+1};}
fn reversed(value:u32,state:Stream)->Stream{return Stream{values:state.values.push(value),index:state.index+1};}
'''
class SourceFoldChunks(unittest.TestCase):
 def test_actual_context_and_false_suffix_control(self):
  compiler=Path(os.environ.get('INK_COMPILER',ROOT/'target/debug/ink'))
  spec=importlib.util.spec_from_file_location('author',ROOT/'tools/source_fold_chunks.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory()as td:
   d=Path(td);source=d/'source.ink';source.write_text(SOURCE)
   def run(*args,success=True):
    r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=180);self.assertEqual(r.returncode==0,success,r.stderr[-3000:]);return r
   corefile=d/'core.json';subjectfile=d/'semantic.json';run(compiler,'emit-core',source,'-o',corefile);run(compiler,'emit-semantic',corefile,'--core','-o',subjectfile)
   core=json.loads(corefile.read_text());subject=json.loads(subjectfile.read_text());store=Store(ROOT/'knowledge/libraries/proofs/chunks');lid=store.names()['rewrite/source/foldl_append'] if callable(getattr(store,'names',None)) else json.loads((store.data/'names.json').read_text())['rewrite/source/foldl_append']
   dependencies=store.bundle([lid])['objects']
   for name in ['append','reversed']:
    obj,oid=module.author(core,subject,name,'state','value',lid,dependencies)
    published=Store.publish(d/name,list(dependencies.values())+[obj]);view=d/(name+'.json');view.write_bytes(canonical(published.bundle([oid])));run(compiler,'knowledge-check',corefile,view)
   bad=copy.deepcopy(obj);bad['payload']['to']=bad['payload']['to']['node']['Op'][1][1]
   forged=semantic_entry(dict(schema=1,semantics=bad['semantics'],dependencies=bad['dependencies'],**bad['payload']));oid=identity(forged)
   published=Store.publish(d/'bad',list(dependencies.values())+[forged]);view=d/'bad.json';view.write_bytes(canonical(published.bundle([oid])));run(compiler,'knowledge-check',corefile,view,success=False)
   with self.assertRaises(ValueError):module.author(core,subject,'append','value','state',lid,dependencies)
if __name__=='__main__':unittest.main()
