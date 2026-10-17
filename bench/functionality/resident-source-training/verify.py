#!/usr/bin/env python3
"""Check retained byte integrity; execution evidence has its separately stated scope."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import tarfile

root = Path(__file__).resolve().parent
manifest = json.loads((root / 'manifest.json').read_text())
for name, expected in manifest['files'].items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, name
with tarfile.open(root / 'histories-and-images.tar.gz') as archive:
    members = archive.getmembers()
    assert all(m.isfile() and not PurePosixPath(m.name).is_absolute() and
               '..' not in PurePosixPath(m.name).parts for m in members)
    assert len({m.name for m in members}) == len(members)
    def read(name):
        return archive.extractfile(name).read()
    final = json.loads((root / 'artifact-equivalence.json').read_text())['final_files']
    for name, expected in final.items():
        assert hashlib.sha256(read('bundle/' + name)).hexdigest() == expected, name
    receipt = json.loads((root / 'complete-training-receipt.json').read_text())
    for name, expected in receipt['files'].items():
        assert hashlib.sha256(read('validation/' + name)).hexdigest() == expected, name
    browser = json.loads(read('required-browser-receipt.json'))
    assert browser['status'] == 'passed' and browser['comparisons'] == 105
    assert browser['resident_training']['javascript_initial_gradient_exact'] is True
    assert all(r['observed_transfers'] == {'uploads': 0, 'readbacks': 0}
               for r in browser['resident_training']['receipts']['gpu-required'])
print(json.dumps({'retained_files': len(manifest['files']), 'archive_files': len(members),
                  'final_generated_files': len(final), 'status': 'integrity passed'}))
