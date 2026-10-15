"""Run with: python3 -m unittest discover -s tools -p 'test_action_algebra.py'"""
import json,os,subprocess,tempfile,unittest
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
change erase(key:u64)->Result<Unit,Error> writes(Rows){Rows.remove(key);return Ok(());}
change set(key:u64,value:u64)->Result<Unit,Error> writes(Rows){if Rows.contains(key){Rows.replace(key,value);}return Ok(());}
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
class ConstantKeyRelations(unittest.TestCase):
    def source(self, ty, left, right):
        return f"""module constant_keys;
        enum Error{{Failed,}}
        state Rows:Table<{ty},u32> = Table.empty();
        change first()->Result<Unit,Error> writes(Rows){{Rows.put({left},1);return Ok(());}}
        change second()->Result<Unit,Error> writes(Rows){{Rows.put({right},2);return Ok(());}}
        query value()->Option<u32> reads(Rows){{return Rows.get({left});}}
        """

    def test_different_closed_expressions_retain_key_conditions_and_order(self):
        # Actual checked symbols are different, but the independently executed
        # source writes one key in both orders. No arithmetic evaluator in the
        # report may infer disjointness from those different trees.
        for ty, expression in [('u32','1-1'),('u32','4294967295+1'),
                               ('u64','18446744073709551615+1'),('i32','-0')]:
            with self.subTest(ty=ty, expression=expression), tempfile.TemporaryDirectory() as directory:
                d=Path(directory);source=d/'keys.ink';source.write_text(self.source(ty,'0',expression))
                report=describe(COMPILER,source)
                row=next(r for r in report['pairs'] if (r['first'],r['second'])==('first','second'))
                self.assertEqual(row['relation'],'commute_when',row)
                self.assertTrue(row['conditions'])
                self.assertNotIn('key_parameters',row)
                observed=[]
                for order in [('first','second'),('second','first')]:
                    script=d/'script.json';script.write_text(json.dumps([dict(call=n,args=[])for n in (*order,'value')]))
                    run=subprocess.run([str(COMPILER),'execute',str(source),str(script)],capture_output=True,text=True,check=True)
                    observed.append(json.loads(run.stdout)[-1]['result'])
                self.assertEqual(observed,[{'Some':2},{'Some':1}])

    def test_distinct_literal_keys_keep_disjoint_reporting(self):
        # Adjacent U64 values above 2^53 must stay distinct without a float
        # conversion, as must Bool and String literals and typed small words.
        for ty,left,right in [('u32','0','1'),('u64','9007199254740992','9007199254740993'),
                              ('i32','0','1'),('Bool','false','true'),('String','"left"','"right"')]:
            with self.subTest(ty=ty), tempfile.TemporaryDirectory() as directory:
                source=Path(directory)/'keys.ink';source.write_text(self.source(ty,left,right))
                report=describe(COMPILER,source)
                row=next(r for r in report['pairs'] if (r['first'],r['second'])==('first','second'))
                self.assertEqual(row['relation'],'commute',row)

class Certificates(unittest.TestCase):
    def test_disjoint_commutation_is_checked_and_conflicts_are_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'a.ink';path.write_text(SOURCE)
            ok=certify(COMPILER,path,'mark','put',ROOT/'knowledge',Path(d)/'certs')
            self.assertEqual(ok['certificate'],'checked',ok)
            # Forced attempts on pairs the analysis reports as conflicts.
            self.assertEqual(certify(COMPILER,path,'mark','note',ROOT/'knowledge',Path(d)/'certs')['certificate'],'rejected')
            self.assertEqual(certify(COMPILER,path,'put','put',ROOT/'knowledge',Path(d)/'certs')['certificate'],'rejected')
    def test_two_removals_commute_even_for_equal_keys(self):
        # Analysis reports commute_when (point writes of one root); the
        # two-key removal lemma certifies the stronger, unconditional fact.
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'a.ink';path.write_text(SOURCE)
            report=describe(COMPILER,path)
            row=next(r for r in report['pairs'] if r['first'].startswith('erase') and r['second'].startswith('erase'))
            self.assertEqual(row['relation'],'commute_when')
            ok=certify(COMPILER,path,'erase','erase',ROOT/'knowledge',Path(d)/'certs')
            self.assertEqual(ok['certificate'],'checked',ok)
            # A replacement guarded by a presence test needs distinct keys
            # (the lookup moves past the removal), which is not certified.
            self.assertEqual(certify(COMPILER,path,'erase','set',ROOT/'knowledge',Path(d)/'certs')['certificate'],'rejected')
class ConditionalCertificates(unittest.TestCase):
    def test_two_puts_commute_when_their_keys_differ_on_sorted_tables(self):
        # Unconditionally rejected (equal keys); with the key guard and the
        # checked sorted-table invariant, the conditional fact is admitted.
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'a.ink';path.write_text(SOURCE)
            report=describe(COMPILER,path)
            row=next(r for r in report['pairs'] if r['first']=='put' and r['second']=='put')
            self.assertEqual(row['key_parameters'],[[0,0]])
            ok=certify(COMPILER,path,'put','put',ROOT/'knowledge',Path(d)/'certs',row['key_parameters'])
            self.assertEqual(ok['certificate'],'checked when keys differ',ok)
if __name__=='__main__':unittest.main()
