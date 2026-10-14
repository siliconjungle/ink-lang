"""Mechanism tests for staged lexical alias loan discovery."""
import importlib.util,json,os,subprocess,tempfile,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
import sys
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
spec=importlib.util.spec_from_file_location('alias_candidates',Path(__file__).with_name('readonly_borrow_candidates_alias.py'))
alias=importlib.util.module_from_spec(spec);spec.loader.exec_module(alias)
SOURCE='''module aliases;
record Row{value:u32,}
record Image{values:List<Row>,tag:u32,}
fn read(x:Image)->u32{let values=x.values;return values.at_or(0,Row{value:0}).value;}
fn shadow(x:Image)->u32{let x=x.values;return length(x);}
fn through(x:Image)->u32{return read(x);}
fn folded(x:Image)->u32{let values=x.values;return foldl(values,0,fn(row,n)=>n+row.value);}
fn escape(x:Image)->List<Row>{return x.values;}
fn alias_escape(x:Image)->List<Row>{let values=x.values;return values;}
fn mixed(x:Image)->List<Row>{let values=x.values;let first=values.at_or(0,Row{value:0});return buffer(x.values).push(first).freeze();}
'''
class AliasLoans(unittest.TestCase):
 def test_aliases_shadowing_transitive_calls_and_owning_escape(self):
  compiler=Path(os.environ['INK_COMPILER'])
  with tempfile.TemporaryDirectory()as tmp:
   p=Path(tmp);source=p/'source.ink';core=p/'core.json';source.write_text(SOURCE)
   r=subprocess.run([compiler,'emit-core',source,'-o',core],capture_output=True,text=True,timeout=120);self.assertEqual(r.returncode,0,r.stderr)
   checked=json.loads(r.stdout);c=json.loads(core.read_text());known=alias.readonly_parameters(c['program'])
   self.assertTrue({('read',0),('shadow',0),('through',0),('folded',0)}<=known)
   self.assertFalse({('escape',0),('alias_escape',0),('mixed',0)}&known)
   rows=list(alias.scoped_candidates(dict(core=c,source=checked['core_sha256'],emit_target='rust'),['all-observations']));self.assertEqual(len(rows),1)
   packet=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=checked['core_sha256'],steps=[rows[0]['step']]);plan=p/'plan.json';plan.write_text(json.dumps(packet))
   r=subprocess.run([compiler,'check-plan',source,plan,'--target','rust'],capture_output=True,text=True,timeout=120);self.assertEqual(r.returncode,0,r.stderr)
if __name__=='__main__':unittest.main()
