"""Audit selected immutable device evidence without a browser, solver or build."""
import hashlib
import json
from pathlib import Path
import statistics
import tarfile

ROOT = Path(__file__).resolve().parent

def sha(data):
    return hashlib.sha256(data).hexdigest()

def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()

def audit():
    index = json.loads((ROOT/'selected-inputs-index.json').read_bytes())
    assert sha((ROOT/'selected-inputs.tar.gz').read_bytes()) == index['archive_sha256']
    summary = json.loads((ROOT/'summary.json').read_bytes())
    observations = []
    with tarfile.open(ROOT/'selected-inputs.tar.gz') as archive:
        assert set(archive.getnames()) == set(index['files'])
        for name, item in index['files'].items():
            member = archive.getmember(name)
            assert member.isfile() and member.size == item['bytes']
            assert sha(archive.extractfile(member).read()) == item['sha256']
        def read(name):
            return json.loads(archive.extractfile(name).read())
        comparison = read('execution-asset-comparison.json')
        assert len(comparison['rows']) == 2
        assert all(row['all_browser_execution_assets_equal'] for row in comparison['rows'])
        for name in ['validated-final', 'current-main']:
            r = read(name+'/receipt.json')
            assert json.loads((ROOT/(name+'.receipt.json')).read_bytes()) == r
            assert read(name+'/terminal.json')['exit_status'] == 0
            plans = summary['cohorts'][name]['plans']
            assert len(plans) == 2 and set(plans) == set(r['validated_measurements'])
            assert not set(r['phases']['training']['input_fingerprints']) & set(r['phases']['holdout']['input_fingerprints'])
            versions = {report['browserVersion'] for phase in r['phases'].values() for report in phase['reports']}
            assert len(versions) == 1 and next(iter(versions))
            for phase, data in r['phases'].items():
                process_values = []
                assert len(data['reports']) == 3 and data['peak_rss_bytes'] is None
                for process in data['reports']:
                    assert not process['rejected'] and process['device']['isFallbackAdapter'] is False
                    rows = {row['measurement']: row for row in process['rows']}
                    assert set(rows) == set(plans)
                    for row in rows.values():
                        assert row['phase'] == 'work' and len(row['complete_call_ns']) == 11
                        counters = row['counters']
                        actual, reported = counters['observed'], counters['reported']
                        assert actual['dispatches'] == reported['dispatches'] > 0
                        assert actual['submissions'] > 0 and actual['readbacks'] > 0
                        assert reported['readback_bytes'] > 0
                    values = [statistics.median(map(int, rows[p]['complete_call_ns'])) for p in plans]
                    assert max(map(int, rows[plans[1]]['complete_call_ns'])) < .9 * min(map(int, rows[plans[0]]['complete_call_ns']))
                    process_values.append(dict(baseline_ns=values[0], alternative_ns=values[1], ratio=values[0]/values[1]))
                expected = dict(processes=process_values,
                    median_baseline_ns=statistics.median(p['baseline_ns'] for p in process_values),
                    median_alternative_ns=statistics.median(p['alternative_ns'] for p in process_values),
                    median_paired_ratio=statistics.median(p['ratio'] for p in process_values))
                assert summary['cohorts'][name]['phases'][phase] == expected
            proposals = r['observation_proposals']
            assert len(proposals) == 12
            assert all(o['metrics']['peak_bytes'] is None and o['entries'] == [] for o in proposals)
            observations.extend(sha(canonical(o)) for o in proposals)
        rejection = read('rejection.json')
        assert {r['measurement'] for r in rejection['rows']} == {'baseline'}
        assert {r['measurement'] for r in rejection['rejected']} == {'wrong','rounded','mutation','cpu-fallback','counter-spoof','no-device'}
    assert len(set(observations)) == 24
    assert set(json.loads((ROOT/'database-readback.json').read_bytes())['observations']) == set(observations)
    assert json.loads((ROOT/'lifecycle-validation.json').read_bytes())['timed_measure_function_unchanged']
    merged = json.loads((ROOT/'merged-emission.json').read_bytes())
    assert merged['terminal']['exit_status'] == 0 and merged['terminal']['actual_device_calls'] == 8
    assert merged['terminal']['exact_original_oracles']
    assert sha((ROOT/'merged-emission-inputs.tar.gz').read_bytes()) == merged['archive_sha256']
    for name, expected in merged['harness_sha256'].items():
        assert sha((ROOT/name).read_bytes()) == expected
    with tarfile.open(ROOT/'merged-emission-inputs.tar.gz') as archive:
        assert set(archive.getnames()) == set(merged['files'])
        for name, expected in merged['files'].items():
            assert sha(archive.extractfile(name).read()) == expected
    assert len(merged['report']['results']) == 8
    for row in merged['report']['results']:
        assert row['observed']['dispatches'] == row['reported']['dispatches'] > 0
        assert row['observed']['submissions'] > 0 and row['observed']['readbacks'] > 0
    print('PASS two measured cohorts, immutable inputs/observations, six rejection controls, and eight exact merged-main device calls')

if __name__ == '__main__':
    audit()
