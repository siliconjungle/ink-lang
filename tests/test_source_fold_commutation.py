"""General source decoder induction, including changed state types and rebasing."""
import copy,importlib.util,json,os,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
import sys
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store,canonical,identity,semantic_entry
SOURCE='''module source_commutation;
record Accum{values:Buffer<u32>,base:u32,index:u32,}
fn physical(state:Accum,value:u32)->Accum{return Accum{..state,values:state.values.push(state.base+state.index+value),index:state.index+1};}
fn reversed(value:u32,state:Accum)->Accum{return physical(state,value);}
fn rebase(state:Accum)->Accum{return Accum{..state,base:state.base+state.index,index:0};}
fn reset(state:Accum)->Accum{return Accum{..state,base:0};}
record Stream{values:Buffer<u32>,}
fn append(state:Stream,value:u32)->Stream{return Stream{values:state.values.push(value)};}
fn decode(state:Stream)->List<u32>{return state.values.freeze();}
fn logical(state:List<u32>,value:u32)->List<u32>{return state.concat([value]);}
fn forget(state:List<u32>,value:u32)->List<u32>{return state;}
'''
class SourceFoldCommutation(unittest.TestCase):
 def test_type_changing_decoders_composed_rebase_and_false_controls(self):
  compiler=Path(os.environ.get('INK_COMPILER',ROOT/'target/debug/ink'))
  spec=importlib.util.spec_from_file_location('commutation',ROOT/'tools/source_fold_commutation.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
  with tempfile.TemporaryDirectory()as td:
   d=Path(td);source=d/'source.ink';source.write_text(SOURCE)
   def run(*args,success=True):
    r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=180);self.assertEqual(r.returncode==0,success,r.stderr[-3000:]);return r
   corefile=d/'core.json';subjectfile=d/'subject.json';run(compiler,'emit-core',source,'-o',corefile);run(compiler,'emit-semantic',corefile,'--core','-o',subjectfile)
   core=json.loads(corefile.read_text());subject=json.loads(subjectfile.read_text())
   def check(obj,label,success=True):
    lid=identity(obj);store=Store.publish(d/label,[obj]);view=d/(label+'.json');view.write_bytes(canonical(store.bundle([lid])));run(compiler,'knowledge-check',corefile,view,success=success)
   for physical in ['physical','reversed']:
    obj,_=module.author(core,subject,physical,'rebase',physical,'state','state',True);check(obj,'good-'+physical)
   good,_=module.author(core,subject,'append','decode','logical','state','state');check(good,'changed-type')
   for physical,decoder,logical,compose in [('physical','reset','physical',True),('append','decode','forget',False)]:
    obj,_=module.author(core,subject,physical,decoder,logical,'state','state',compose);check(obj,'bad-'+decoder,False)
   bad=copy.deepcopy(good['payload']);bad['to']=bad['to']['node']['Op'][1][1]
   forged=semantic_entry(dict(schema=1,semantics=good['semantics'],dependencies=good['dependencies'],**bad));check(forged,'rehash-dropped-input',False)
   with self.assertRaises(ValueError):module.author(core,subject,'physical','decode','logical','state','state')
if __name__=='__main__':unittest.main()
