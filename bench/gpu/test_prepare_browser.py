"""Browser consumers must have their CPU bundles prepared before replay."""
import json
import os
from pathlib import Path
import runpy
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
PREPARE = Path(os.environ.get('INK_BROWSER_PREPARATION', HERE / 'prepare-lowering-parity-browser.py'))
WORDS = json.loads((HERE / 'word-fixtures.json').read_text())
BASE = ['generated-parity-bend', 'generated-parity-u64', 'generated-parity-f32',
        'source-contracts-parity', 'total-changes-parity', 'state-contracts-parity',
        'action-contract-refinement', 'lowering-residency']


class Preparation(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.previous = Path.cwd()
        os.chdir(self.temp.name)
        self.addCleanup(os.chdir, self.previous)
        self.names = BASE + WORDS + [f'contract-refinement-{i}' for i in range(10)]
        self.projects = {}
        for name in self.names:
            bundle = Path('build') / name
            if name != 'lowering-residency':
                bundle /= 'gpu-module'
            project = bundle / 'cpu/Cargo.toml'
            project.parent.mkdir(parents=True)
            project.write_text('[package]\nname="ink-packed-cpu"\n')
            self.projects[name] = project
        report = Path('build/contract-candidates/candidates.json')
        report.parent.mkdir()
        report.write_text(json.dumps({'candidates': [{} for _ in range(10)]}))
        self.built = []

    def run_preparation(self):
        builder = types.ModuleType('build_gpu_wasm')
        builder.build = lambda bundle: self.built.append(Path(bundle))
        with patch.dict(sys.modules, {'build_gpu_wasm': builder}):
            runpy.run_path(str(PREPARE), run_name='__main__')

    def test_all_consumed_words_and_discovered_candidates_are_built(self):
        self.run_preparation()
        built = {p.parent.name if p.name == 'gpu-module' else p.name for p in self.built}
        self.assertEqual(built, set(self.names))
        self.assertEqual(len(self.built), len(self.names))

    def test_missing_word_cpu_project_fails_before_any_compilation(self):
        self.projects[WORDS[0]].unlink()
        with self.assertRaisesRegex(ValueError, WORDS[0]):
            self.run_preparation()
        self.assertEqual(self.built, [])

    def test_empty_candidate_report_does_not_silently_skip_contracts(self):
        Path('build/contract-candidates/candidates.json').write_text('{"candidates":[]}')
        with self.assertRaisesRegex(ValueError, 'missing checked contract candidates'):
            self.run_preparation()
        self.assertEqual(self.built, [])


if __name__ == '__main__':
    unittest.main()
