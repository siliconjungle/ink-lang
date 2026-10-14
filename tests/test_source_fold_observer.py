"""Source-bound induction rejects noncommuting decoders and forged conclusions."""
import copy,importlib.util,json,os,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store,canonical,identity,semantic_entry
SOURCE='''module source_observer;
record Payload{values:Buffer<u32>,}
record Stream{payload:Payload,epoch:u32,index:u32,}
fn append(state:Stream,value:u32)->Stream{return Stream{..state,payload:Payload{values:state.payload.values.push(value)},index:state.index+1};}
fn reversed(value:u32,state:Stream)->Stream{return Stream{..state,payload:Payload{values:state.payload.values.push(value)},index:state.index+1};}
fn forget(state:Stream,value:u32)->Stream{return Stream{..state,payload:Payload{values:Buffer.empty()}};}
fn reset(state:Stream,value:u32)->Stream{return Stream{..state,epoch:0};}
'''
class SourceFoldObserver(unittest.TestCase):
 def test_nested_decoders_parameter_order_and_adversarial_controls(self):
  compiler=Path(os.environ.get('INK_COMPILER',ROOT/'target/debug/ink'))
  spec=importlib.util.spec_from_file_location('observer',ROOT/'tools/source_fold_observer.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory()as td:
   d=Path(td);source=d/'source.ink';source.write_text(SOURCE)
   def run(*args,success=True):
    r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=180);self.assertEqual(r.returncode==0,success,r.stderr[-3000:]);return r
   corefile=d/'core.json';subjectfile=d/'semantic.json';run(compiler,'emit-core',source,'-o',corefile);run(compiler,'emit-semantic',corefile,'--core','-o',subjectfile)
   core=json.loads(corefile.read_text());subject=json.loads(subjectfile.read_text())
   def check(obj,label,success=True):
    lid=identity(obj);store=Store.publish(d/label,[obj]);view=d/(label+'.json');view.write_bytes(canonical(store.bundle([lid])));run(compiler,'knowledge-check',corefile,view,success=success)
   for name in ['append','reversed']:
    for fields,append in [(['payload','values'],True),(['epoch'],False)]:
     obj,_=module.author(core,subject,name,'state','value',fields,append);check(obj,name+'-'+fields[-1])
   for name,fields,append in [('forget',['payload','values'],True),('reset',['epoch'],False),('append',['index'],False)]:
    obj,_=module.author(core,subject,name,'state','value',fields,append);check(obj,'wrong-'+name+'-'+fields[-1],False)
   good,_=module.author(core,subject,'append','state','value',['payload','values'],True)
   bad=copy.deepcopy(good['payload']);bad['to']=bad['to']['node']['Op'][1][1]
   forged=semantic_entry(dict(schema=1,semantics=good['semantics'],dependencies=good['dependencies'],**bad));check(forged,'rehash-dropped-input',False)
   with self.assertRaises(ValueError):module.author(core,subject,'append','value','state',['epoch'])
   with self.assertRaises(ValueError):module.author(core,subject,'append','state','value',['epoch'],True)
if __name__=='__main__':unittest.main()
