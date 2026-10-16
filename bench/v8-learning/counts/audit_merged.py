#!/usr/bin/env python3
"""Check the merged context separately from historical count measurements."""
from pathlib import Path
import hashlib
import gzip
import json
import re
import subprocess
import tarfile

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    index = json.loads((HERE / 'merged-inputs-index.json').read_bytes())
    archive = HERE / 'merged-inputs.tar.gz'
    assert sha(archive.read_bytes()) == index['archive_sha256']
    assert sha((HERE / 'selected-inputs.tar.gz').read_bytes()) == index['historical_inputs_sha256']
    with tarfile.open(archive) as tar:
        blobs = {}
        for member in tar.getmembers():
            assert member.isfile() and re.fullmatch(r'blobs/[0-9a-f]{64}', member.name)
            raw = tar.extractfile(member).read()
            assert sha(raw) == member.name[6:] and member.name[6:] not in blobs
            blobs[member.name[6:]] = raw
    assert len(blobs) == index['blobs']
    for name, row in index['files'].items():
        assert not Path(name).is_absolute() and '..' not in Path(name).parts
        assert len(blobs[row['sha256']]) == row['bytes']

    def raw(name):
        return blobs[index['files'][name]['sha256']]

    def read(name):
        return json.loads(raw(name))

    pins = read('merged-source-pins.json')
    core = pins['core_package']
    for revision in [pins['distribution_source'], core['commit']]:
        assert subprocess.check_output(['git', 'rev-parse', revision + ':core'], cwd=ROOT, text=True).strip() == core['core_tree']
    assert all(pins['count_kernel_files_unchanged'].values())
    validation = read('merged-private-validation-readback.json')
    assert validation['tests'] == 501 and validation['files_checked'] == 232
    assert validation['core_tree'] == core['core_tree']
    assert b'Ran 4 tests' in raw('merged-knowledge-tests.log')
    assert raw('merged-knowledge-tests.log').rstrip().endswith(b'OK')
    emitted = read('merged-emission/receipt.json')
    assert emitted['compiler_sha256'] == pins['compiler_sha256']
    historical = json.loads((HERE / 'selected-inputs-index.json').read_bytes())
    assert len(emitted['files']) == 26 and emitted['all_byte_identical_to_measured_cohort']
    for name, digest in emitted['files'].items():
        assert sha(raw('merged-emission/' + name)) == digest
        assert historical['files']['count-conformance-final/' + name]['sha256'] == digest
    terminal = read('merged-corpus/terminal.json')
    report = read('merged-corpus/report.json')
    assert terminal['exit_status'] == 0 and terminal['final_source_context_check_passed']
    assert report['context'] == read('merged-corpus/context.json')
    assert report['context']['compiler_sha256'] == pins['compiler_sha256']
    records = read('merged-corpus/records.json')
    assert len(records) == 10 and all(row['status'] == 0 for row in records)
    assert terminal['new_count_roots_attributed'] == []
    from ink_knowledge import Store, identity, semantic_entry
    revision = pins['pins']['knowledge']
    def bank_bytes(name):
        return subprocess.check_output(['git', 'show', revision + ':producers/data/v8-count-laws/' + name], cwd=ROOT / 'knowledge')
    roots = set()
    for row in json.loads(bank_bytes('index.json'))['rows']:
        claim = json.loads(gzip.decompress(bank_bytes(row['sha256'] + '.json.gz')))
        roots.update([identity(claim), identity(semantic_entry(claim))])
    assert not roots & set(report['attribution'])
    store = Store(ROOT / 'knowledge')
    proposals = json.loads((HERE / 'observation-proposals.json').read_bytes())['objects']
    assert len(proposals) == 168
    for observation in proposals:
        assert json.loads((store.data / 'observations' / (identity(observation) + '.json')).read_bytes()) == observation
    print('PASS merged501-test receipt, four proof tests,26 unchanged emitted files, separate frozen10 corpus and168 canonical database observations; no timing-context transfer')


if __name__ == '__main__':
    main()
