import copy
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from types import SimpleNamespace
from check_feature_parity import run_test_partition
from check_ci_partitions import COUNTS, check
from check_feature_parity import partition


class Coverage(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads(Path('tests/feature-parity.json').read_text())
        self.receipts = []
        for shard, count in COUNTS.items():
            suites = ([s for s in self.catalog['cpu_suites'] if s not in ('source_contracts', 'representation_parity')] if shard == 'general' else ['source_contracts' if shard == 'contracts' else 'representation_parity'])
            for i in range(count):
                individual = shard != 'general'
                r = dict(suite_shard=shard, partition_index=i, partition_count=count, scope='cpu', inventory='passed', conformance='shard-passed', gaps=[], partition_tests=individual, all_suites=suites, suites=suites if individual else partition(suites, i, count))
                if individual:
                    names = [f'case_{n:02}' for n in range(13)]
                    r['test_partitions'] = {s: dict(all=names, selected=partition(names, i, count)) for s in suites}
                self.receipts.append(r)

    def test_complete_partition_coverage(self):
        check(self.receipts, self.catalog)

    def test_incomplete_duplicate_failed_and_changed_receipts_reject(self):
        variants = [self.receipts[:-1], self.receipts + [self.receipts[0]]]
        for key, value in [('conformance', 'failed'), ('partition_count', 1), ('suites', []), ('all_suites', [])]:
            changed = copy.deepcopy(self.receipts); changed[0][key] = value; variants.append(changed)
        changed = copy.deepcopy(self.receipts); changed[-1]['test_partitions']['representation_parity']['selected'] = []; variants.append(changed)
        for changed in variants:
            with self.assertRaises(ValueError): check(changed, self.catalog)

    def test_bounds_and_union(self):
        for count in range(1, 12):
            groups = [partition(range(23), i, count) for i in range(count)]
            self.assertEqual(sorted(x for g in groups for x in g), list(range(23)))
        for i, count in [(-1, 2), (2, 2), (0, 0)]:
            with self.assertRaises(ValueError): partition([], i, count)

    def test_runner_executes_only_exact_selected_tests_and_propagates_failures(self):
        build = SimpleNamespace(returncode=0, stdout=json.dumps({"reason":"compiler-artifact","target":{"name":"sample"},"executable":"/test-binary"}))
        listing = SimpleNamespace(returncode=0, stdout="a: test\nb: test\nc: test\n")
        success = SimpleNamespace(returncode=0)
        receipt = {}
        with patch('check_feature_parity.subprocess.run', side_effect=[build, listing, success]) as run:
            self.assertEqual(run_test_partition(['sample'], 1, 2, {}, receipt), 0)
            self.assertEqual(run.call_args_list[-1].args[0], ['/test-binary', 'b', '--exact', '--nocapture', '--test-threads=1'])
        self.assertEqual(receipt['test_partitions']['sample']['selected'], ['b'])
        with patch('check_feature_parity.subprocess.run', side_effect=[build, listing, SimpleNamespace(returncode=9)]):
            self.assertEqual(run_test_partition(['sample'], 0, 2, {}, {}), 9)
        with patch('check_feature_parity.subprocess.run', return_value=SimpleNamespace(returncode=7)):
            self.assertEqual(run_test_partition(['sample'], 0, 2, {}, {}), 7)
        with patch('check_feature_parity.subprocess.run', return_value=SimpleNamespace(returncode=0, stdout='')):
            with self.assertRaises(ValueError): run_test_partition(['sample'], 0, 2, {}, {})



if __name__ == '__main__': unittest.main()
