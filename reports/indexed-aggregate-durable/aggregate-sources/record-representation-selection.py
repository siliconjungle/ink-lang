"""Record frozen costs, then invoke the existing checked lifecycle selector."""
import hashlib, json, pathlib, platform, subprocess, sys

root = pathlib.Path(__file__).resolve().parents[3]
sys.path[:0] = [str(root / 'knowledge'), str(root / 'planner')]
from ink_knowledge import Store, canonical
from ink_planner.representation_selection import phase_workload

report = root / 'reports/indexed-aggregate-durable'
fixture = root / 'knowledge/research/indexed-aggregate'
compiler = root / 'target/release/ink'
build = root / 'build/indexed-aggregate/selection'
build.mkdir(parents=True, exist_ok=True)
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()
migration = json.loads((report / 'migration-admission.json').read_text())
store = Store(root / 'knowledge')
pin = root / 'knowledge/store/snapshots' / (migration['view_snapshot'] + '.json')
packet = dict(root=migration['migration'], knowledge=Store(root / 'knowledge', snapshot=pin).bundle([migration['migration']]))
bridge = build / 'bridge.json'
bridge.write_bytes(canonical(packet) + b'\n')
assert digest(bridge) == migration['request_sha256']
requests = {'direct': fixture / 'direct.json', 'indexed': fixture / 'request.json'}
plans = {label: digest(path) for label, path in requests.items()}
program = json.loads(requests['indexed'].read_text())['input_core_sha256']
frozen = {str(path.relative_to(root)): digest(path) for path in sorted((report / 'aggregate-sources').iterdir()) if path.is_file()}
provenance = dict(schema=1, hardware=subprocess.check_output(['sysctl', '-n', 'machdep.cpu.brand_string'], text=True).strip(),
    os=platform.platform(), compiler_sha256=digest(compiler), source_sha256=digest(root / 'examples/filtered-aggregate.ink'),
    node=subprocess.check_output(['node', '--version'], text=True).strip(),
    rustc=subprocess.check_output(['rustc', '--version'], text=True).strip(),
    requests=plans, bridge_sha256=digest(bridge), frozen_files=frozen,
    scope='Apple M2 shared host; 4000 rows; 16 separate-state warm calls; 96 measured calls; five alternating rounds; no peak-memory measurement',
    compiler_scope='Release checker/emitter binary measured before the final projection work-cap tightening; exact binary hash above. Frozen generated programs are the executed artifacts.',
    native_compile_scope='Native programs are precompiled: compile count is zero. Checker costs are backend-independent; JavaScript compile phase includes its own admission.',
    migration_scope='Portable checkpoint/decode/encode/restore and old-state disposal; admitted abstract bridge is the eligibility proof. JavaScript also forces GC.',
    observation_scope='Integer per-call nanoseconds are batch elapsed nanoseconds divided by call count, rounded down by less than one nanosecond.')
(report / 'aggregate-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
manifest = hashlib.sha256(canonical(provenance)).hexdigest()
compiler_costs = json.loads((report / 'compiler-measurements.json').read_text())
receipts = []
for backend, toolchain in [('js', provenance['node']), ('rust', provenance['rustc'])]:
    target = dict(hardware=provenance['hardware'], driver=provenance['os'], toolchain=toolchain,
                  backend='javascript' if backend == 'js' else 'rust-native', bridge='frozen-benchmark:' + manifest)
    workload = dict(shape=dict(rows=4000, row='u64 value, Bool active'),
                    distribution='keys (i*37)%4000; initial value=i; active on even keys; restore per phase',
                    concurrency=1, residency='in-process preseeded table; JSON action/reply boundary')
    raw = json.loads((report / ('aggregate-' + backend + '-performance.json')).read_text())['measurements']
    for label in ('direct', 'indexed'):
        samples = [m for m in raw if m['label'] == label] + [m for m in compiler_costs if m['label'] == label]
        for phase in sorted({m['phase'] for m in samples}):
            if phase == 'compile' and backend == 'rust':
                continue
            values = [str(int(m['ns']) // m['calls']) for m in samples if m['phase'] == phase]
            store.observe(dict(schema=1, program=program, entries=[json.loads(requests[label].read_text())['representation']],
                               plan=plans[label], target=target, workload=phase_workload(workload, phase),
                               metrics=dict(complete_call_ns=values, peak_bytes=None)))
    migration_phase = 'migrate:' + plans['direct'] + ':' + digest(bridge)
    store.observe(dict(schema=1, program=program, entries=[migration['migration']], plan=plans['indexed'],
                       target=target, workload=phase_workload(workload, migration_phase),
                       metrics=dict(complete_call_ns=json.loads((report / ('migration-' + backend + '-ns.json')).read_text()), peak_bytes=None)))
    inputs = {'target': target, 'workload': workload, 'candidates': [dict(request=str(requests['indexed']), bridge=str(bridge))]}
    for name, value in inputs.items():
        (build / (backend + '-' + name + '.json')).write_text(json.dumps(value) + '\n')
    for name, query_count in [('short', 10), ('read-heavy', 1_000_000)]:
        profile = dict(initialise=1, teardown=1, check=1, compile=1 if backend == 'js' else 0,
                       **{'action:put': 100, 'action:erase': 100, 'action:total_query': query_count, 'action:count_query': query_count})
        profile_path = build / (backend + '-' + name + '-profile.json')
        profile_path.write_text(json.dumps(profile) + '\n')
        output = build / (backend + '-' + name + '.json')
        result = subprocess.run([sys.executable, '-m', 'ink_planner.representation_selection',
            '--compiler', str(compiler), '--source', str(root / 'examples/filtered-aggregate.ink'),
            '--baseline', str(requests['direct']), '--candidates', str(build / (backend + '-candidates.json')),
            '--knowledge-root', str(root / 'knowledge'), '--target', str(build / (backend + '-target.json')),
            '--workload', str(build / (backend + '-workload.json')), '--profile', str(profile_path),
            '--check-timeout-seconds', '60', '--migration-count', '1', '-o', str(output)],
            cwd=root, env=__import__('os').environ | {'PYTHONPATH': str(root / 'knowledge') + ':' + str(root / 'planner')},
            capture_output=True, text=True, check=True)
        receipt = json.loads(result.stdout)
        assert receipt['checked'] == 2 and not receipt['rejected']
        assert receipt['selected'] == json.loads(requests['direct' if name == 'short' else 'indexed'].read_text())['representation']
        receipt['bridge'] = 'regenerate from migration-admission view_snapshot' if receipt['bridge'] else None
        (report / ('selection-' + backend + '-' + name + '.json')).write_text(json.dumps(receipt, indent=2) + '\n')
        receipts.append(dict(backend=backend, profile=name, selected=receipt['selected'], total_ns=receipt['costs']['total_ns']))
print(json.dumps(receipts, indent=2))
