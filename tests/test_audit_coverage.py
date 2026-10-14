"""File coverage cannot be obtained from inventory, partial reads or new revisions."""
import contextlib
import io
import subprocess
import tempfile
import unittest
from pathlib import Path
from tools.audit_coverage import connect, inventory, show, review, summary, advance


class Coverage(unittest.TestCase):
    def test_advancement_follows_pinned_submodule_and_retains_other_roots(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp); parent = d/'parent'; child = parent/'child'; other = d/'other'
            def git(root,*args):
                return subprocess.check_output(['git','-C',str(root),*args],stderr=subprocess.DEVNULL)
            for root in [parent,child,other]:
                root.mkdir(parents=True,exist_ok=True)
                git(root,'init');git(root,'config','user.name','Audit test')
                git(root,'config','user.email','audit@example.invalid')
                (root/'file').write_text(root.name)
                git(root,'add','file');git(root,'commit','-m','fixture')
            old_child = git(child,'rev-parse','HEAD').decode().strip()
            git(parent,'update-index','--add','--cacheinfo','160000',old_child,'child')
            git(parent,'commit','-m','pin child')
            evidence=d/'evidence';evidence.write_text('review')
            with connect(d/'old.sqlite') as db:
                inventory(db,'project',parent);inventory(db,'other',other)
                with contextlib.redirect_stdout(io.StringIO()):show(db,'project/child','file')
                review(db,'project/child','file','Read old child',evidence)
                (child/'file').write_text('changed child')
                git(child,'add','.');git(child,'commit','-m','child update')
                new_child=git(child,'rev-parse','HEAD').decode().strip()
                git(parent,'update-index','--cacheinfo','160000',new_child,'child')
                git(parent,'commit','-m','update child pin')
                # Changing another checkout cannot silently change its audit pin.
                (other/'new').touch();git(other,'add','.');git(other,'commit','-m','unrequested change')
                advance(db,d/'next.sqlite',{'project':'HEAD'})
                with connect(d/'next.sqlite') as current:
                    self.assertEqual(summary(current)['total_files'],3)
                    self.assertEqual(summary(current)['reviewed_files'],0)
                    self.assertEqual(current.execute('SELECT revision FROM repos WHERE name="project/child"').fetchone()[0],new_child)
                    self.assertEqual(summary(db)['reviewed_files'],1)
                with self.assertRaisesRegex(ValueError,'top-level'):
                    advance(db,d/'bad.sqlite',{'project/child':'HEAD'})

    def test_advancement_preserves_only_exact_content_and_intact_evidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp); repo = d/'repo'; repo.mkdir()
            def git(*args):
                return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.DEVNULL)
            git('init'); git('config','user.email','audit@example.invalid'); git('config','user.name','Audit test')
            for name in ['unchanged', 'changed', 'removed', 'mode', 'bad-evidence', 'partial']:
                (repo/name).write_text('abcdef')
            (repo/'empty').touch()
            git('add','.'); git('commit','-m','original')
            original = git('rev-parse','HEAD').decode().strip()
            evidence = d/'evidence.json'; evidence.write_text('review evidence')
            bad = d/'bad.json'; bad.write_text('original evidence')
            with connect(d/'old.sqlite') as db:
                inventory(db,'fixture',repo)
                for name in ['unchanged', 'changed', 'removed', 'mode', 'bad-evidence', 'empty']:
                    with contextlib.redirect_stdout(io.StringIO()): show(db,'fixture',name)
                    review(db,'fixture',name,'Reviewed complete file',bad if name == 'bad-evidence' else evidence)
                with contextlib.redirect_stdout(io.StringIO()): show(db,'fixture','partial',0,2)
                self.assertEqual(summary(db)['reviewed_files'],6)
                (repo/'changed').write_text('new content')
                (repo/'removed').unlink()
                (repo/'mode').chmod(0o755)
                (repo/'new.bin').write_bytes(b'\x00\xff')
                git('add','.'); git('commit','-m','new snapshot')
                bad.write_text('replaced evidence')
                self.assertEqual(summary(db)['reviewed_files'],5)
                self.assertEqual(summary(db)['invalid_reviews'],1)
                new = d/'new.sqlite'
                result = advance(db,new,{'fixture':'HEAD'})
                self.assertEqual(result['carried_reviews'],2)
                self.assertEqual(db.execute('SELECT revision FROM repos').fetchone()[0],original)
                self.assertEqual(summary(db)['total_files'],7)
                with self.assertRaisesRegex(ValueError,'must not exist'):
                    advance(db,new,{'fixture':'HEAD'})
                with connect(new) as current:
                    report = summary(current)
                    self.assertEqual(report['total_files'],7)
                    self.assertEqual(report['reviewed_files'],2)
                    self.assertEqual(report['invalid_reviews'],0)
                    self.assertFalse(report['complete'])
                    for name in ['changed','mode','new.bin']:
                        row = current.execute('SELECT bytes,reviewed FROM files WHERE path=?',(name,)).fetchone()
                        self.assertEqual(tuple(row),(None,0))
                    self.assertEqual(current.execute('SELECT count(*) FROM files WHERE path="removed"').fetchone()[0],0)
                    self.assertEqual(current.execute('SELECT source_revision FROM provenance WHERE path="unchanged"').fetchone()[0],original)
                    with self.assertRaisesRegex(ValueError,'complete recorded'):
                        review(current,'fixture','partial','Still missing bytes',evidence)
                    with contextlib.redirect_stdout(io.StringIO()): show(current,'fixture','partial',2,4)
                    review(current,'fixture','partial','Finished reading remaining bytes',evidence)
                    self.assertEqual(summary(current)['reviewed_files'],3)
                    evidence.unlink()
                    self.assertEqual(summary(current)['reviewed_files'],0)
                    self.assertEqual(summary(current)['invalid_reviews'],3)
                failed = d/'failed.sqlite'
                with self.assertRaises(subprocess.CalledProcessError):
                    advance(db,failed,{'fixture':'does-not-exist'})
                self.assertFalse(failed.exists())
                self.assertEqual(list(d.glob('failed.sqlite.*')),[])

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
