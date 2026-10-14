"""Bounded guard discovery never authorizes a changed field or bad conclusion."""
import copy,importlib.util,json,os,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store,canonical,identity,semantic_entry
SOURCE='''module source_preservation;
record Frame{data:Buffer<u32>,index:u32,flag:Bool,}
fn keep(s:Frame,value:u32)->Frame{
 let ahead=s.data.at_or(s.index,0);
 if s.flag{if value>ahead{return Frame{..s,index:value};}return Frame{..s,index:ahead};}
 return Frame{..s,index:s.index+1};
}
fn changed(s:Frame,value:u32)->Frame{
 if s.flag{return Frame{..s,data:s.data.push(value)};}return s;
}
'''
class SourceFieldPreservation(unittest.TestCase):
 def test_source_guards_false_branch_and_rehashed_conclusion(self):
  compiler=Path(os.environ.get('INK_COMPILER',ROOT/'target/debug/ink'))
  spec=importlib.util.spec_from_file_location('field',ROOT/'tools/source_field_preservation.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory()as td:
   d=Path(td);source=d/'source.ink';source.write_text(SOURCE)
   def run(*args,success=True):
    r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=180);self.assertEqual(r.returncode==0,success,r.stderr[-3000:]);return r
   corefile=d/'core.json';subjectfile=d/'subject.json';run(compiler,'emit-core',source,'-o',corefile);run(compiler,'emit-semantic',corefile,'--core','-o',subjectfile);core=json.loads(corefile.read_text());subject=json.loads(subjectfile.read_text())
   def check(obj,label,success=True):
    lid=identity(obj);store=Store.publish(d/label,[obj]);view=d/(label+'.json');view.write_bytes(canonical(store.bundle([lid])));run(compiler,'knowledge-check',corefile,view,success=success)
   obj,_=module.author(core,subject,'keep','s',['data']);check(obj,'preserved')
   for function,field in [('changed','data'),('keep','index')]:
    bad,_=module.author(core,subject,function,'s',[field]);check(bad,function+'-'+field,False)
   bad=copy.deepcopy(obj['payload']);original=bad['to'];bad['to']={'sort':original['sort'],'node':{'Op':['method:push',[original,{'sort':{'Value':'U32'},'node':{'Word':7}}]]}}
   forged=semantic_entry(dict(schema=1,semantics=obj['semantics'],dependencies=obj['dependencies'],**bad));check(forged,'rehash-pushed-value',False)
   with self.assertRaises(ValueError):module.author(core,subject,'keep','s',['data'],0)
if __name__=='__main__':unittest.main()
