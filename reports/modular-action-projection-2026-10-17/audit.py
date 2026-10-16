"""Check retained receipt relationships; no semantic or rewrite authority."""
import gzip
import hashlib
import json
import re
from pathlib import Path


def audit():
    root = Path(__file__).resolve().parent
    manifest = json.loads((root / 'manifest.json').read_text())
    for name, digest in manifest['files'].items():
        assert Path(name).name == name
        assert hashlib.sha256((root / name).read_bytes()).hexdigest() == digest, name
    summary = json.loads((root / 'summary.json').read_text())
    receipt = json.loads((root / 'private-core-validation.json').read_text())
    assert receipt['status'] == summary['status'] == 'passed'
    assert receipt['private_checkout'] and receipt['private_target']
    assert receipt['source_sha256'] == summary['source_sha256']
    assert hashlib.sha256(json.dumps(receipt['files'], sort_keys=True).encode()).hexdigest() == receipt['source_sha256']
    assert len(receipt['files']) == summary['private_source_files'] == 224
    assert receipt['completed_targets'] == summary['integration_targets'] == 80
    assert len(receipt['phases']) == summary['phases'] == 13
    count = 0
    for phase in receipt['phases']:
        assert phase['status'] == 0
        log = gzip.decompress((root / (phase['name'] + '.log.gz')).read_bytes())
        assert hashlib.sha256(log).hexdigest() == phase['log_sha256']
        count += sum(map(int, re.findall(rb'test result: ok\. (\d+) passed', log)))
    assert count == summary['test_count'] == 480
    model = gzip.decompress((root / 'neural-model.json.gz').read_bytes())
    expected = summary['neural_model']
    assert len(model) == expected['canonical_bytes'] == 5073076
    assert hashlib.sha256(model).hexdigest() == expected['canonical_sha256']
    parsed = json.loads(model)
    assert len(parsed['objects']) == expected['definitions'] == 316
    package = json.loads((root / 'core-package.json').read_text())
    assert package == summary['package']
    fixture = 'tests/fixtures/staged-neural-frozen.core.json'
    assert receipt['files'][fixture] == expected['source']
    replay = (root / 'retained-proof-replay.log').read_text()
    expected_ids = ['18d878fc8dbd8130b06a383658b175afeaa5b0c57cc476f2c7b753a3704f32a7',
                    'a1564b64d7501e1eba5d600fbecccb053fb582806bfb11b257ab4773a6fb745d',
                    'a4ff3fcb9ff8bb758d4a0d203990b24bc89792c48dcbfb17bd82a08303575c35']
    for name, identity in zip(summary['retained_artifacts'], expected_ids):
        assert f'/{name}/artifact {identity}' in replay
    return {'status': 'passed', 'tests': count, 'integration_targets': 80,
            'definitions': 316, 'scope': 'retained receipt consistency only'}


if __name__ == '__main__':
    print(json.dumps(audit()))
