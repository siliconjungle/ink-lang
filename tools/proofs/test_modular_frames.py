"""Adversarial kernel replay for optional source-frame reuse and context pruning."""
import copy,json,os,subprocess,sys,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.definitional_frames import propose
from producers.semantic_laws import value,var,op
from portable_context import prune

class ModularFrames(unittest.TestCase):
 def test_exact_reuse_pruned_types_false_proof_and_cycles(self):
  compiler=Path(os.environ.get('INK_COMPILER',ROOT/'build/compiler-projected-item-fields-frozen/ink')).resolve()
  frame=Store(ROOT/'knowledge/libraries/proofs/until-frame');key=frame.names['until_frame']
  with tempfile.TemporaryDirectory(prefix='ink-modular-frames-')as directory:
   d=Path(directory);source=d/'source.ink';source.write_text('''module modular_frame_test;
record Row{value:u32,}record Frame{rows:List<Row>,tag:u32,}record Unrelated{data:List<u64>,}
fn untouched(f:Frame)->Frame{return f;}fn another(f:Frame)->Frame{return f;}
fn observed(f:Frame)->Frame{return untouched(f);}
''');core=d/'core.json';subject=d/'subject.json'
   subprocess.run([compiler,'emit-core',source,'-o',core],check=True,capture_output=True)
   subprocess.run([compiler,'emit-semantic',core,'--core','-o',subject],check=True,capture_output=True)
   c=json.loads(core.read_text());s=json.loads(subject.read_text());rule=prune(propose(c,s,'untouched','f',key));self.assertEqual(set(rule['definition_context']['records']),{'Frame','Row'})
   def check(rule,suffix):
    obj=semantic_entry(rule);rid=identity(obj);main=semantic_entry(propose(c,s,'observed','f',key,source_frames=[(rid,rule)]));out=Store.publish(d/suffix,[frame.object(key),obj,main],{'observed':identity(main)});view=d/(suffix+'.json');view.write_bytes(canonical(out.bundle([identity(main)])));return subprocess.run([compiler,'knowledge-check',core,view],capture_output=True,text=True)
   self.assertEqual(check(rule,'valid').returncode,0)
   bad=copy.deepcopy(rule);bad['proof']={'Hypothesis':0};bad['semantics']='ink-conditional-laws-v1'
   result=check(bad,'false-proof');self.assertNotEqual(result.returncode,0);self.assertIn('condition index',result.stderr)
   # Even semantically interchangeable call endpoints may form a cycle in the
   # untrusted proposal rules. Stop within the explicit proposal budget.
   f=var(value({'Named':'Frame'}),'f');a=op(f['sort'],'call:untouched',f);b=op(f['sort'],'call:another',f)
   first=copy.deepcopy(rule);first['from']=a;first['to']=b
   second=copy.deepcopy(rule);second['from']=b;second['to']=a
   with self.assertRaisesRegex(ValueError,'work/depth budget'):
    propose(c,s,'observed','f',key,steps=24,source_frames=[('a'*64,first),('b'*64,second)])

if __name__=='__main__':unittest.main()
