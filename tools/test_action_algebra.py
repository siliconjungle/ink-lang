"""Run with: python3 -m unittest discover -s tools -p 'test_action_algebra.py'"""
import os,tempfile,unittest
from pathlib import Path
from action_algebra import describe,analyse,certify
ROOT=Path(__file__).resolve().parents[1]
COMPILER=Path(os.environ.get('INK_COMPILER',ROOT/'target/debug/ink'))
SOURCE='''module algebra;
enum Error{Failed,}
state Rows:Table<u64,u64> = Table.empty();
state Other:Table<u64,u64> = Table.empty();
event seen:u64;
change put(key:u64,value:u64)->Result<Unit,Error> writes(Rows){if Rows.contains(key){Rows.replace(key,value);}else{Rows.insert(key,value);}return Ok(());}
change mark(key:u64)->Result<Unit,Error> writes(Other) emits(seen){Other.remove(key);emit seen(key);return Ok(());}
change note(key:u64)->Result<Unit,Error> writes(Other) emits(seen){Other.remove(key);emit seen(key);return Ok(());}
query get(key:u64)->Option<u64> reads(Rows){return Rows.get(key);}
query total()->u64 reads(Rows){return sum(Rows.values());}
'''
class ActionAlgebra(unittest.TestCase):
    def setUp(self):
        self.dir=tempfile.TemporaryDirectory();path=Path(self.dir.name)/'a.ink';path.write_text(SOURCE)
        self.report=describe(COMPILER,path)
        self.pairs={(r['first'],r['second']):r for r in self.report['pairs']}
    def tearDown(self):self.dir.cleanup()
    def test_disjoint_roots_commute(self):
        self.assertEqual(self.pairs[('mark','put')]['relation'],'commute')
    def test_point_writes_commute_when_keys_differ(self):
        row=self.pairs[('put','put')]
        self.assertEqual(row['relation'],'commute_when');self.assertIn('put#1.key != put#2.key',row['conditions'][0])
        self.assertEqual(self.pairs[('get','put')]['relation'],'commute_when')
    def test_scans_and_ordered_events_conflict(self):
        self.assertEqual(self.pairs[('put','total')]['relation'],'conflict')
        self.assertIn('ordered events',self.pairs[('mark','note')]['reasons'][0])
    def test_queries_alone_are_not_paired(self):
        self.assertNotIn(('get','total'),self.pairs)
        self.assertIn('no reordering',self.report['scope'])
class Certificates(unittest.TestCase):
    def test_disjoint_commutation_is_checked_and_conflicts_are_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'a.ink';path.write_text(SOURCE)
            ok=certify(COMPILER,path,'mark','put',ROOT/'knowledge',Path(d)/'certs')
            self.assertEqual(ok['certificate'],'checked',ok)
            # Forced attempts on pairs the analysis reports as conflicts.
            self.assertEqual(certify(COMPILER,path,'mark','note',ROOT/'knowledge',Path(d)/'certs')['certificate'],'rejected')
            self.assertEqual(certify(COMPILER,path,'put','put',ROOT/'knowledge',Path(d)/'certs')['certificate'],'rejected')
if __name__=='__main__':unittest.main()
