"""Measure authenticated export against the exact previous knowledge implementation.

Run from ink-lang: python3 reports/knowledge-export-performance/driver.py OUTPUT
"""
import importlib.util
import json
import statistics
import sys
import tempfile
import time
from pathlib import Path

sys.path.insert(0, str(Path('knowledge').resolve()))
from ink_knowledge import Store, canonical, entry, identity

spec = importlib.util.spec_from_file_location('baseline', Path(__file__).with_name('baseline-store.py'))
baseline = importlib.util.module_from_spec(spec)
spec.loader.exec_module(baseline)
PIN = '87357b19d8fdbe5832da67dd58d1fa1a1d35220efb264319708935fe9eb7defa'
REPRESENTATION = '5b5f097d999cd17946d829fa7737ac5806f95893e091f188cf1613d92fdbf4e5'


def sample(store, roots):
    start = time.perf_counter_ns()
    for _ in range(3):
        result = store.bundle(roots)
    return (time.perf_counter_ns() - start) // 3, result


def measure(label, directory, roots, snapshot=None):
    # Fresh objects use the indexed subset path, never a preloaded full tree.
    before = baseline.Store(directory, snapshot)
    after = Store(directory, snapshot)
    a = before.bundle(roots)
    b = after.bundle(roots)
    assert canonical(a) == canonical(b)
    for _ in range(3):
        sample(before, roots)
        sample(after, roots)
    old, new = [], []
    for round in range(9):
        if round % 2 == 0:
            x, _ = sample(before, roots)
            y, _ = sample(after, roots)
        else:
            y, _ = sample(after, roots)
            x, _ = sample(before, roots)
        old.append(x)
        new.append(y)
    assert before._members is None and after._members is None
    return dict(case=label, snapshot=after.snapshot_id, roots=roots,
                entries=len(a['objects']), bundle_sha256=identity(a),
                before=dict(samples_ns=old, median_ns=statistics.median(old)),
                after=dict(samples_ns=new, median_ns=statistics.median(new)))


measurements = []
with tempfile.TemporaryDirectory() as temporary:
    directory = Path(temporary)
    for count in (32, 256, 768):
        leaves = [entry('definition', 'synthetic-v1', dict(body=['leaf', i])) for i in range(count)]
        parents = [entry('definition', 'synthetic-v1', dict(body=['parent', i]),
                         [identity(x) for x in leaves[i:i + 128]])
                   for i in range(0, count, 128)]
        root = entry('theorem', 'synthetic-v1', dict(body='root'), [identity(x) for x in parents])
        store = Store.publish(directory, [*leaves, *parents, root])
        store.rebuild()
        measurements.append(measure(f'synthetic-{count}', directory, [identity(root)]))
    # Rebuild a separate disposable index for the real pinned catalog, leaving
    # the canonical source and its current index untouched.
    real = directory / 'real'
    real.mkdir()
    (real / 'store').symlink_to(Path('knowledge/store').resolve(), target_is_directory=True)
    snapshot = Path('knowledge/store/snapshots') / f'{PIN}.json'
    Store(real, snapshot).rebuild()
    measurements.append(measure('compact-query-representation', real, [REPRESENTATION], snapshot))

Path(sys.argv[1]).write_text(json.dumps(dict(schema=1, rounds=9, calls_per_round=3,
    kind='complete Store.bundle export; connection, closure traversal, membership and object hashing included',
    measurements=measurements), indent=2) + '\n')
