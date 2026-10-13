import json
import tempfile
import unittest
from pathlib import Path

from work_model import program_data


class FractionalWork(unittest.TestCase):
    def test_fitting_reads_exact_phase_means(self):
        receipt = dict(
            work_acquisition=dict(rows=[
                dict(measurement='base', weighted='25/3', weighted_iterations='35/3', steps=[]),
                dict(measurement='pick', weighted='10/3', weighted_iterations='7/3', steps=['rewrite']),
            ]),
            measurement_acquisition=dict(artifacts=[dict(measurement='base')], acquisition=dict(rows=[
                dict(measurement='base', complete_call_ns=['100', '100']),
                dict(measurement='pick', complete_call_ns=['50', '50']),
            ])),
            candidates=[dict(measurement='base'), dict(measurement='pick')],
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'plan.json.receipt.json').write_text(json.dumps(receipt))
            pairs = program_data(root, None)['pairs']
        self.assertEqual(pairs['reference_fuel'][0]['work_ratio'], 2.5)
        self.assertEqual(pairs['target_iterations'][0]['work_ratio'], 5.0)
        self.assertEqual(pairs['reference_fuel'][0]['speedup'], 2.0)


if __name__ == '__main__':
    unittest.main()
