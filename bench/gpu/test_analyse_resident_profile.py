"""The report must expose lifecycle regressions and reject contaminated evidence."""
import json
from pathlib import Path
import tempfile
import unittest
from analyse_resident_profile import analyse, digest, REGIMES, METRICS


class LifecycleReport(unittest.TestCase):
    def experiment(self, directory):
        def write(name, value):
            (directory / name).write_text(json.dumps(value))
        protocol = dict(schema=1, training=dict(sizes=[1, 2, 3], horizons=[1, 2, 3], seed=37),
                        evaluation=dict(sizes=[4, 5, 6], horizons=[4, 5, 6], seed=733))
        source = 'bench/gpu/resident-profile-browser.mjs'
        (directory / 'sources' / source).parent.mkdir(parents=True)
        (directory / 'sources' / source).write_text('// fixture')
        (directory / 'ink').write_text('fixture compiler')
        write('protocol.json', protocol)
        hashes = {source: digest(directory / 'sources' / source), 'protocol': digest(directory / 'protocol.json')}
        write('registration.json', dict(protocol=protocol, training_processes_per_regime=3,
                                       evaluation_processes_per_regime=3, source_hashes={source: hashes[source]}))
        training_files = {}
        for regime in REGIMES:
            prefix = '' if regime == 'warm' else regime + '-'
            for split in ('train', 'evaluation'):
                spec = protocol['training' if split == 'train' else 'evaluation']
                backends = ('cpu', 'gpu') if split == 'train' else ('cpu', 'gpu', 'auto', 'profile')
                receipts = []
                for kernel in ('ecs', 'physics'):
                    for n in spec['sizes']:
                        for horizon in spec['horizons']:
                            row = dict(kernel=kernel, n=n, iterations=horizon, scope=kernel+regime,
                                       features=dict(input_elements=n, iterations=horizon), core_sha256='core',
                                       backends={b: ('cpu' if b == 'auto' else 'gpu' if b == 'profile' else b) for b in backends},
                                       validated=True)
                            for metric, field in METRICS.items():
                                values = ({'cpu': 100, 'gpu': 50, 'auto': 100, 'profile': 80} if metric == 'session' else
                                          {'cpu': 200, 'gpu': 150, 'auto': 200, 'profile': 300} if metric == 'complete_engine_lifetime' else
                                          {b: 3 for b in backends})
                                row[field] = {b: [None if regime == 'warm' and metric != 'session' else values[b]] * 3 for b in backends}
                            receipts.append(row)
                for i in range(3):
                    name = f'{prefix}{split}-{i}.json'
                    write(name, dict(mode=prefix+('train' if split == 'train' else 'test'), protocol=protocol,
                                     source_hashes=hashes, targetKey='target', device={'isFallbackAdapter': False},
                                     environment={'browser': 'fixture'}, receipts=receipts))
                    if split == 'train':
                        training_files[str(directory / name)] = digest(directory / name)
        write('profile.json', dict(target_key='target', models={}))
        write('fit-receipt.json', dict(training_files=training_files))
        self.seal(directory)

    def seal(self, directory):
        completion = dict(complete=True, compiler_sha256=digest(directory / 'ink'),
                          files={p.name: digest(p) for p in directory.glob('*.json') if p.name != 'complete.json'})
        (directory / 'complete.json').write_text(json.dumps(completion))

    def test_full_lifetime_losses_survive_session_wins(self):
        with tempfile.TemporaryDirectory() as temporary:
            directory = Path(temporary); self.experiment(directory)
            report = analyse(directory)
            for regime in REGIMES:
                result = report['regimes'][regime]
                self.assertEqual(len(result['rows']), 18)
                self.assertEqual(result['regressions']['session'], 0)
                if regime == 'warm':
                    self.assertIsNone(result['rows'][0]['metrics']['complete_engine_lifetime'])
                else:
                    self.assertEqual(result['regressions']['complete_engine_lifetime'], 18)

    def test_provenance_and_coverage_fail_closed(self):
        for corruption in ('bytes', 'fitting', 'target', 'missing-case', 'fallback', 'compiler', 'source'):
            with self.subTest(corruption=corruption), tempfile.TemporaryDirectory() as temporary:
                directory = Path(temporary); self.experiment(directory)
                path = directory / 'cold-evaluation-0.json'
                row = json.loads(path.read_text())
                if corruption == 'fitting':
                    path = directory / 'fit-receipt.json'; row = json.loads(path.read_text())
                    key = next(iter(row['training_files'])); value = row['training_files'].pop(key)
                    row['training_files'][str(directory / 'cold-evaluation-0.json')] = value
                elif corruption == 'target': row['targetKey'] = 'different'
                elif corruption == 'missing-case': row['receipts'].pop()
                elif corruption == 'fallback': row['receipts'][0]['backends']['gpu'] = 'cpu'
                elif corruption == 'bytes': row['receipts'][0]['validated'] = False
                elif corruption == 'compiler': (directory / 'ink').write_text('changed')
                elif corruption == 'source': (directory / 'sources/bench/gpu/resident-profile-browser.mjs').write_text('changed')
                if corruption not in ('compiler', 'source'):
                    path.write_text(json.dumps(row))
                if corruption not in ('bytes', 'compiler'):
                    self.seal(directory)
                with self.assertRaises(ValueError): analyse(directory)


if __name__ == '__main__':
    unittest.main()
