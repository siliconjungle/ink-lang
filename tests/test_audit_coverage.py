"""File coverage cannot be obtained from inventory, partial reads or new revisions."""
import contextlib
import io
import subprocess
import tempfile
import unittest
from pathlib import Path
from tools.audit_coverage import connect, inventory, show, review, summary


class Coverage(unittest.TestCase):
    def test_exact_denominator_gaps_and_immutable_snapshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            d=Path(tmp); repo=d/'repository'; repo.mkdir()
            def git(*args):
                return subprocess.run(['git','-C',str(repo),*args],check=True,capture_output=True)
            git('init');git('config','user.email','audit@example.invalid');git('config','user.name','Audit test')
            (repo/'text.txt').write_text('abcdef')
            (repo/'data.bin').write_bytes(b'\x00\xff')
            (repo/'empty').touch()
            git('add','.');git('commit','-m','fixture')
            evidence=d/'review.json';evidence.write_text('{"finding":"test fixture review"}')
            with connect(d/'coverage.sqlite') as db:
                inventory(db,'fixture',repo)
                self.assertEqual(summary(db)['total_files'],3)
                self.assertEqual(summary(db)['reviewed_files'],0)
                with self.assertRaisesRegex(ValueError,'complete recorded'):
                    review(db,'fixture','text.txt','Reviewed text',evidence)
                with contextlib.redirect_stdout(io.StringIO()):
                    show(db,'fixture','text.txt',0,2)
                    show(db,'fixture','text.txt',4,2)
                with self.assertRaisesRegex(ValueError,'complete recorded'):
                    review(db,'fixture','text.txt','Middle gap remains',evidence)
                with contextlib.redirect_stdout(io.StringIO()):show(db,'fixture','text.txt',2,2)
                review(db,'fixture','text.txt','All six bytes reviewed',evidence)
                self.assertEqual(summary(db)['reviewed_files'],1)
                self.assertFalse(summary(db)['complete'])
                (repo/'text.txt').write_text('changed');git('add','.');git('commit','-m','changed')
                with self.assertRaisesRegex(ValueError,'immutable'):
                    inventory(db,'fixture',repo)
                # Reading the pinned blob remains reproducible after checkout changes.
                with contextlib.redirect_stdout(io.StringIO()) as result:show(db,'fixture','text.txt')
                self.assertIn('abcdef',result.getvalue())


if __name__ == '__main__':unittest.main()
