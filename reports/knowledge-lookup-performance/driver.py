"""Compare complete authenticated cost lookup on deterministic synthetic evidence.

Run from ink-lang: python3 reports/knowledge-lookup-performance/driver.py OUTPUT
The archived baseline module and schema are the previous committed implementation.
"""
import importlib.util
import json
import statistics
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path('knowledge').resolve()))
from ink_knowledge import Store, entry, identity

spec = importlib.util.spec_from_file_location('baseline', Path(__file__).with_name('baseline-store.py'))
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)

target = dict(hardware='synthetic', driver='synthetic', toolchain='synthetic', backend='cost-discovery', bridge='host')
workload = dict(shape=[48], distribution='synthetic evidence', concurrency=1, residency='host')
plans = [identity({'candidate': i}) for i in range(64)]


def sample(store):
    start = time.perf_counter_ns()
    for _ in range(3):
        result = store.observations('1' * 64, [plans[63]], target, workload)
    return (time.perf_counter_ns() - start) // 3, result


measurements = []
with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    canonical = root / 'canonical'
    definition = entry('definition', 'synthetic-v1', dict(body='fixture'))
    corpus = Store.publish(canonical, [definition])
    for label in ('before', 'after'):
        directory = root / label
        directory.mkdir()
        (directory / 'store').symlink_to(canonical / 'store', target_is_directory=True)
    before = baseline.Store(root / 'before')
    after = Store(root / 'after')
    existing = 0
    for count in (512, 1024):
        for index in range(existing, count):
            corpus.observe(dict(schema=1, program='1' * 64, entries=[identity(definition)],
                                plan=plans[index % 64], target=target, workload=workload,
                                metrics=dict(complete_call_ns=[str(index + 100)], peak_bytes=None)))
        existing = count
        before.rebuild()
        after.rebuild()
        # Both implementations return exactly the same requested canonical records.
        old_result = before.observations('1' * 64, [plans[63]], target, workload)
        new_result = after.observations('1' * 64, [plans[63]], target, workload)
        assert old_result == new_result and len(new_result) == count // 64
        for _ in range(3):
            sample(before)
            sample(after)
        a, b = [], []
        for round in range(9):
            if round % 2 == 0:
                x, _ = sample(before)
                y, _ = sample(after)
            else:
                y, _ = sample(after)
                x, _ = sample(before)
            a.append(x)
            b.append(y)
        measurements.append(dict(observations=count, selected_records=len(new_result),
                                 before=dict(samples_ns=a, median_ns=statistics.median(a)),
                                 after=dict(samples_ns=b, median_ns=statistics.median(b))))

Path(sys.argv[1]).write_text(json.dumps(dict(schema=1, rounds=9, calls_per_round=3,
    kind='complete Store.observations lookup, SQLite connection and canonical file validation included',
    synthetic=True, measurements=measurements), indent=2) + '\n')
