import copy
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'producers'))
from representation_bridge import generate
from ink_knowledge.store import read


class BridgeProducerTests(unittest.TestCase):
    def test_authoring_rejects_different_source_layout_and_relations(self):
        before = read(ROOT / 'research/compact-queries/previous.json')
        after = read(ROOT / 'research/compact-queries/cached.json')
        with tempfile.TemporaryDirectory() as directory:
            wrong = copy.deepcopy(after)
            wrong['input_core_sha256'] = '0' * 64
            with self.assertRaisesRegex(ValueError, 'source mismatch'):
                generate(before, wrong, directory)
            wrong = read(ROOT / 'research/compact-queries/direct.json')
            with self.assertRaisesRegex(ValueError, 'physical_state'):
                generate(before, wrong, directory)
            wrong = copy.deepcopy(after)
            wrong['knowledge']['objects'][wrong['representation']]['payload']['relations'] = []
            with self.assertRaisesRegex(ValueError, 'relations'):
                generate(before, wrong, directory)


if __name__ == '__main__':
    unittest.main()
