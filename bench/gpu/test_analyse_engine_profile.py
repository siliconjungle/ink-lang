import copy
import unittest
from analyse_engine_profile import analyse, LIFECYCLE, MODES


def record(mode, process):
    names = MODES[:2] if mode == 'train' else MODES
    n, iterations = (2, 1) if mode == 'train' else (3, 2)
    orders = [[0, 1], [1, 0]] * 4 if len(names) == 2 else [[0, 1, 3, 2], [1, 2, 0, 3], [2, 3, 1, 0], [3, 0, 2, 1]] * 2
    cases = []
    for family in ('ecs', 'physics'):
        samples = {}
        for order, name in enumerate(names):
            backend = 'gpu' if name in ('gpu', 'profile') else 'cpu'
            ns = {'cpu': 100, 'gpu': 80, 'auto': 105, 'profile': 120}[name]
            samples[name] = [dict(round=r, order=orders[r].index(order), elapsed_ns=ns, backend=backend, decision=None,
                counters=dict(live_buffer_bytes=0, peak_buffer_bytes=64 if backend == 'gpu' else None, dispatches=1)) for r in range(8)]
        cases.append(dict(family=family, n=n, iterations=iterations, validated=True, core_sha256='program',
            context=dict(scope='["ink-resident-engine-v1"]', boundary='captured-owned'), samples=samples,
            complete_engine_ns={k: [s['elapsed_ns'] for s in v] for k, v in samples.items()},
            backends={k: v[-1]['backend'] for k, v in samples.items()},
            decisions={k: v[-1]['decision'] for k, v in samples.items()},
            counters={k: v[-1]['counters'] for k, v in samples.items()}))
    return dict(schema=1, mode=mode, lifecycle=LIFECYCLE, process_id=process,
        target_key='target', environment={}, device=dict(isFallbackAdapter=False), source_hashes={'shader': 'hash'},
        protocol_sha256='protocol', profile_sha256='profile' if mode == 'evaluation' else None,
        training_protocol=dict(sizes=[2], horizons=[1], seed=1),
        evaluation_protocol=dict(sizes=[3], horizons=[2], seed=2), cases=cases)


class EngineReportTests(unittest.TestCase):
    def setUp(self):
        self.training = [record('train', 't' + str(i)) for i in range(3)]
        self.evaluation = [record('evaluation', 'e' + str(i)) for i in range(3)]

    def test_losses_and_every_process_retained(self):
        result = analyse(self.training, self.evaluation, 'profile')
        self.assertEqual(result['profile_median_loss_cells'], 2)
        self.assertEqual(len(result['cases'][0]['processes']), 3)
        self.assertAlmostEqual(result['cases'][0]['speedup_vs_cpu']['profile']['median'], 100 / 120)

    def test_earlier_fallback_is_visible_even_when_last_sample_is_gpu(self):
        sample = self.evaluation[0]['cases'][0]['samples']['profile'][0]
        sample['backend'] = 'cpu'
        sample['counters']['peak_buffer_bytes'] = None
        result = analyse(self.training, self.evaluation, 'profile')
        self.assertEqual(result['cases'][0]['processes'][0]['profile_backend_counts'], {'cpu': 1, 'gpu': 7})

    def test_rotating_positions_do_not_balance_preceding_backends(self):
        for case in self.evaluation[0]['cases']:
            for index, name in enumerate(MODES):
                for r, sample in enumerate(case['samples'][name]):
                    sample['order'] = (index - r) % len(MODES)
        with self.assertRaisesRegex(ValueError, 'preceding backends'):
            analyse(self.training, self.evaluation, 'profile')

    def test_preparation_is_included_once_in_whole_workload_and_cannot_be_omitted(self):
        for r in self.training + self.evaluation:
            r['profile_mode'] = 'prepared'
            r['profile_preparation_ns'] = 400 if r['mode'] == 'evaluation' else 0
            r['common_setup_ns'] = 250
        result = analyse(self.training, self.evaluation, 'profile')
        total = result['workload_totals'][0]
        self.assertEqual(total['profile_calls'], 16)
        self.assertEqual(total['profile_complete_ns'], 250 + 400 + 16 * 120)
        self.assertAlmostEqual(total['profile_speedup_including_preparation'], (250 + 16 * 100) / (250 + 400 + 16 * 120))
        self.evaluation[0]['profile_preparation_ns'] = 0
        with self.assertRaisesRegex(ValueError, 'setup cost missing'):
            analyse(self.training, self.evaluation, 'profile')

    def test_rejects_omission_provenance_overlap_and_partial_samples(self):
        def change_sample(records, **changes):
            records[0]['cases'][0]['samples']['gpu'][0].update(changes)
        mutations = [
            lambda r: r[0]['cases'].pop(),
            lambda r: r[0]['cases'].append(copy.deepcopy(r[0]['cases'][0])),
            lambda r: r[0].update(process_id='t0'),
            lambda r: r[0].update(profile_sha256='wrong'),
            lambda r: r[0]['source_hashes'].update(shader='changed'),
            lambda r: r[0]['device'].update(isFallbackAdapter=True),
            lambda r: r[0]['evaluation_protocol'].update(sizes=[2]),
            lambda r: r[0]['cases'][0]['samples']['gpu'].pop(),
            lambda r: change_sample(r, elapsed_ns=0),
            lambda r: change_sample(r, backend='cpu'),
            lambda r: change_sample(r, order=0),
            lambda r: r[0]['cases'][0]['samples']['gpu'][0]['counters'].update(live_buffer_bytes=1),
        ]
        for mutate in mutations:
            with self.subTest(mutation=mutate):
                records = copy.deepcopy(self.evaluation)
                mutate(records)
                with self.assertRaises(ValueError):
                    analyse(self.training, records, 'profile')


if __name__ == '__main__':
    unittest.main()
