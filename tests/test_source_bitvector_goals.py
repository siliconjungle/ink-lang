"""Imported source scalar goals bind definitions and retain their conditions."""
import json,os,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store
from producers.semantic_laws import value,var,op,word,term
class SourceBitvectorGoals(unittest.TestCase):
 def test_imported_function_and_overflow_counterexample(self):
  compiler=Path(os.environ.get('INK_COMPILER',ROOT/'target/debug/ink'))
  with tempfile.TemporaryDirectory()as td:
   d=Path(td);(d/'arithmetic.ink').write_text('module arithmetic;record Counter{count:u32,} fn increment(r:Counter)->u32{return r.count+1;}')
   source=d/'source.ink';source.write_text('module counter_example;import "arithmetic.ink" as arithmetic;fn counted(r:arithmetic.Counter)->u32{return arithmetic.increment(r);}')
   core=d/'core.json';r=subprocess.run([compiler,'emit-core',source,'-o',core],capture_output=True,text=True,timeout=180);self.assertEqual(r.returncode,0,r.stderr)
   program=json.loads(core.read_text())['program'];f=next(f for f in program['functions']if f['name']=='counted');rs=value(f['params'][0][1]);row=var(rs,'row');u=value('U32');b=value('Bool');count=op(u,'field:count',row);truth=term(b,{'Bool':True})
   goal=dict(params={'row':rs},conditions=[{'from':op(b,'binary:<',count,word('U32',4294967295)),'to':truth}],**{'from':op(b,'binary:>',op(u,'call:counted',row),count),'to':truth})
   goals=d/'goals.json';goals.write_text(json.dumps({'increment_with_room':goal}));out=d/'checked'
   def author(destination):return subprocess.run([sys.executable,ROOT/'tools/source_bitvector_goals.py','--compiler',compiler,'--core',core,'--goals',goals,'--seconds','2','-o',destination],capture_output=True,text=True,timeout=180)
   r=author(out);self.assertEqual(r.returncode,0,r.stderr);store=Store(out);names=json.loads((store.data/'names.json').read_text());bundle=store.bundle(list(names.values()));obj=next(iter(bundle['objects'].values()));self.assertEqual(len(obj['payload']['conditions']),1);self.assertGreaterEqual(len(obj['payload']['definition_context']['definitions']),2)
   goal['conditions']=[];goals.write_text(json.dumps({'increment_without_room':goal}));failed=d/'unchecked';r=author(failed);self.assertNotEqual(r.returncode,0);self.assertFalse(failed.exists())
if __name__=='__main__':unittest.main()
