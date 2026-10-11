"""Use the existing database implementation selector across all three packages."""
import hashlib, json, os, pathlib, platform, subprocess, sys

root = pathlib.Path(__file__).resolve().parents[3]
sys.path[:0] = [str(root / 'knowledge'), str(root / 'planner')]
from ink_knowledge import Store, canonical
from ink_planner.implementation_selection import measurement_id
from ink_planner.representation_selection import phase_workload

report = root / 'reports/indexed-aggregate-durable'
fixture = root / 'knowledge/research/indexed-aggregate'
compiler = root / 'target/release/ink'
build = root / 'build/indexed-aggregate/implementation-selection'
build.mkdir(parents=True, exist_ok=True)
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
publication = json.loads((fixture / 'implementations.json').read_text())
store = Store(root / 'knowledge')
compiler_hash = digest(compiler)
frozen = {str(path.relative_to(root)): digest(path) for path in sorted((report / 'aggregate-sources').iterdir()) if path.is_file()}
provenance = dict(schema=1, hardware=subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string'], text=True).strip(),
    os=platform.platform(), compiler_sha256=compiler_hash,
    source_sha256=digest(root / 'examples/filtered-aggregate.ink'), program=publication['source'],
    node=subprocess.check_output(['node', '--version'], text=True).strip(),
    rustc=subprocess.check_output(['rustc', '--version'], text=True).strip(),
    candidates=publication['candidates'], frozen_files=frozen,
    execution_scope='Execution and migration samples acquired before the final storage integration; all six emissions verified byte-identical with the final compiler.',
    scope='Apple M2 shared host; 4000 rows; 16 separate-state warm calls; 96 measured calls; five alternating rounds; no peak-memory measurement',
    executed_artifact_acquisition_compiler_sha256='a9e3052dfcde378d1a641698e2a445415c57d87cfc39a8f1272de317fac4a788',
    executed_artifact_equality_receipt_sha256=digest(report / 'final-artifact-equality.json'),
    compiler_scope='Exact final integrated Release compiler; separately measured admission and JavaScript emission (emission includes its own admission).',
    native_compile_scope='Native programs are precompiled: compile count is zero. Admission is backend-independent.',
    migration_scope='Ordinary source checkpoint to candidate restore and old-state disposal; JavaScript forces GC. Checked encode/decode permits portable migration; a separately admitted direct-to-indexed bridge is retained.',
    observation_scope='Per-call integer nanoseconds: batch elapsed divided by call count, rounded down by less than one nanosecond.')
(report / 'aggregate-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
manifest = hashlib.sha256(canonical(provenance)).hexdigest()
compiler_costs = json.loads((report / 'compiler-measurements.json').read_text())
receipts = []
for backend, lane, toolchain in [('js', 'javascript', provenance['node']), ('rust', 'rust', provenance['rustc'])]:
    target = dict(hardware=provenance['hardware'], driver=provenance['os'], toolchain=toolchain,
                  backend=lane, bridge='frozen-benchmark:' + manifest)
    workload = dict(shape=dict(rows=4000, row='u64 value, Bool active'),
                    distribution='keys (i*37)%4000; initial value=i; active on even keys; restore per phase',
                    concurrency=1, residency='in-process preseeded table; JSON action/reply boundary')
    plans = {label: measurement_id(candidate, compiler_hash, lane) for label, candidate in publication['candidates'].items()}
    raw = json.loads((report / ('aggregate-' + backend + '-performance.json')).read_text())['measurements']
    for label, candidate in publication['candidates'].items():
        samples = [m for m in raw if m['label'] == label] + [m for m in compiler_costs if m['label'] == label]
        for phase in sorted({m['phase'] for m in samples}):
            if phase == 'compile' and backend == 'rust':
                continue
            store.observe(dict(schema=1, program=publication['source'], entries=[candidate], plan=plans[label], target=target,
                workload=phase_workload(workload, phase), metrics=dict(
                    complete_call_ns=[str(int(m['ns']) // m['calls']) for m in samples if m['phase'] == phase], peak_bytes=None)))
        if label != 'source':
            phase = 'migrate:' + plans['source'] + ':portable:' + plans[label]
            store.observe(dict(schema=1, program=publication['source'], entries=[candidate], plan=plans[label], target=target,
                workload=phase_workload(workload, phase), metrics=dict(
                    complete_call_ns=json.loads((report / ('migration-' + backend + '-ns.json')).read_text())[label], peak_bytes=None)))
    inputs = {'target': target, 'workload': workload,
              'candidates': [publication['candidates'][label] for label in ('direct', 'indexed')]}
    for name, value in inputs.items():
        (build / (backend + '-' + name + '.json')).write_text(json.dumps(value) + '\n')
    for name, query_count in [('short', 10), ('read-heavy', 1_000_000)]:
        profile = dict(initialise=1, teardown=1, check=1, compile=1 if backend == 'js' else 0,
            **{'action:put': 100, 'action:erase': 100, 'action:total_query': query_count, 'action:count_query': query_count})
        profile_path = build / (backend + '-' + name + '-profile.json')
        profile_path.write_text(json.dumps(profile) + '\n')
        output = build / (backend + '-' + name + '.json')
        result = subprocess.run([sys.executable, '-m', 'ink_planner.implementation_selection',
            '--compiler', str(compiler), '--source', str(root / 'examples/filtered-aggregate.ink'),
            '--baseline', publication['candidates']['source'], '--candidates', str(build / (backend + '-candidates.json')),
            '--knowledge-root', str(root / 'knowledge'), '--emit-target', lane,
            '--target', str(build / (backend + '-target.json')), '--workload', str(build / (backend + '-workload.json')),
            '--profile', str(profile_path), '--check-timeout-seconds', '60', '--migration-count', '1', '-o', str(output)],
            cwd=root, env=os.environ | {'PYTHONPATH': str(root / 'knowledge') + ':' + str(root / 'planner')},
            capture_output=True, text=True, check=True)
        receipt = json.loads(result.stdout)
        assert receipt['checked'] == 3 and not receipt['rejected']
        assert receipt['selected'] == publication['candidates']['source' if name == 'short' else 'indexed']
        (report / ('selection-' + backend + '-' + name + '.json')).write_text(json.dumps(receipt, indent=2) + '\n')
        # Exercise the existing replay path through actual literal emission.
        emitted = build / (backend + '-' + name + ('-project' if backend == 'rust' else '.mjs'))
        replay = subprocess.run([sys.executable, '-m', 'ink_planner.implementation_selection', '--compiler', str(compiler),
            '--source', str(root / 'examples/filtered-aggregate.ink'), '--knowledge-root', str(root / 'knowledge'),
            '--emit-target', lane, '--check-timeout-seconds', '60', '--replay', str(output), '-o', str(emitted)],
            cwd=root, env=os.environ | {'PYTHONPATH': str(root / 'knowledge') + ':' + str(root / 'planner')},
            capture_output=True, text=True, check=True)
        assert json.loads(replay.stdout)['status'] == 'checked'
        receipts.append(dict(backend=backend, profile=name, selected=receipt['selected'], total_ns=receipt['costs']['total_ns']))
print(json.dumps(receipts, indent=2))
