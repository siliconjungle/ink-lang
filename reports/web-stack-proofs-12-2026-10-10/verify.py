"""Authenticate archived batch12 evidence; never invokes compiler/tests/timings."""
import collections, hashlib, importlib.util, json, math, random, re, statistics, sys
from pathlib import Path

P = Path(__file__).resolve().parent
ROOT = P.parents[1]
sys.path.insert(0, str(ROOT/'knowledge'))
from ink_knowledge import Store, canonical, identity


def read(path):
    return json.loads(Path(path).read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def checked_log(path, count):
    match = re.search(r'Ran (\d+) tests in ([\d.]+)s\s+OK\s*$', Path(path).read_text())
    assert match and int(match[1]) == count, path
    return float(match[2])


def ast_counts(node):
    counts = collections.Counter()
    if isinstance(node, dict):
        if 'Binary' in node:
            counts[node['Binary'][0]] += 1
        if 'Let' in node:
            counts['Let'] += 1
        for child in node.values():
            counts.update(ast_counts(child))
    elif isinstance(node, list):
        for child in node:
            counts.update(ast_counts(child))
    return dict(counts)


def paired_interval(a, b):
    assert len(a) == len(b) == 7
    rng = random.Random(0)
    draws = []
    for _ in range(4000):
        indices = [rng.randrange(7) for _ in range(7)]
        draws.append(statistics.median(a[i] for i in indices)/statistics.median(b[i] for i in indices))
    draws.sort()
    return [statistics.median(a)/statistics.median(b), draws[100], draws[3899]]


def verdict(interval):
    return 'faster' if interval[1] > 1 else 'slower' if interval[2] < 1 else 'inconclusive'


meta = read(P/'metadata.json')
pub = read(P/'publication.json')
imp = read(P/'observation-import.json')
interval_receipt = read(P/'root-interval-verification.json')
profit = read(P/'profitability.json')
assert sha(meta['compiler_path']) == meta['compiler_sha256'] == pub['compiler_sha256'] == '45670dbced0999e945278d7de7ed495cad9b43b1ab9d24c27182c9f9a5683e08'
assert sha(ROOT/'bench/methodology.py') == meta['methodology_sha256']
for name, digest in meta['artifact_hashes'].items():
    assert sha(P/name) == digest, name
boundary = read(P/'source-boundary-before.json')
for name, digest in boundary.items():
    assert sha(ROOT/name) == digest, name
assert len(meta['artifact_hashes']) == 81 and len(boundary) == 102
for name in ['literal.mjs','literal.rs','runner.mjs','node.mjs','browser.html','analyse.py','README.md','kernels.ink']:
    assert sha(ROOT/'bench/web-stack-proofs-12'/name) == sha(P/name), name
assert sha(ROOT/'bench/web-stack-proofs-12.py') == sha(P/'harness.py')
for producer in pub['producers']:
    assert sha(ROOT/'knowledge/producers'/f"{producer['producer']}.py") == producer['source_sha256']

store = Store(ROOT/'knowledge')
old = Store(ROOT/'knowledge', ROOT/'knowledge/store/snapshots'/f"{pub['previous_snapshot']}.json")
assert store.snapshot_id == pub['snapshot'] == meta['new_snapshot'] == imp['snapshot']
assert old.snapshot_id == meta['prior_snapshot'] == '42bb207446a7ea92fc099ef27d611201f39a1d660c36b147bd11f68fa61a3e90'
members, oldmembers = set(store.members()), set(old.members())
assert len(members) == 977 and len(oldmembers) == 956 and oldmembers <= members
assert members-oldmembers == set(pub['batch_entries']) and len(pub['batch_entries']) == 21
assert set(pub['admission']['entries']) == set(pub['batch_entries']) and pub['admission']['status'] == 'checked'
for identifier in members:
    assert identity(store.object(identifier)) == identifier
prior, new = read(P/'prior-selection.json'), read(P/'checked-selection.json')
assert prior['applications'] == [] and len(new['applications']) == 6
original = {f['name']: f['body'] for f in read(P/'core.json')['program']['functions']}
prior_bodies = {f['name']: f['body'] for f in read(P/'prior-selected.core.json')['program']['functions']}
new_bodies = {f['name']: f['body'] for f in read(P/'checked-selected.core.json')['program']['functions']}
assert len(original) == 6 and original == prior_bodies
assert all(new_bodies[name] != original[name] for name in original)
assert all(meta['prior_core_equals_original'].values()) and all(meta['prior_to_new_core_changed'].values())
for name in original:
    applications = [a['law'] for a in new['applications'] if a['function'] == name]
    assert len(applications) == 1 and applications == meta['new_laws_per_function'][name] == meta['selected_laws_per_function'][name]
    assert applications[0] in pub['batch_entries']
for kind, selection in [('prior', prior), ('checked', new)]:
    receipt = read(P/f'{kind}-selection-check.json')
    assert receipt['input_core_sha256'] == sha(P/'core.json')
    assert receipt['selected_core_sha256'] == sha(P/f'{kind}-selected.core.json')
    assert receipt['snapshot_sha256'] == (pub['previous_snapshot'] if kind == 'prior' else pub['snapshot'])
    assert set(receipt['applied_laws']) == set(a['law'] for a in selection['applications'])
    assert sha(P/f'{kind}-selection.json') == meta['selections'][kind]['sha256']

scope = read(P/'test-scope.json')
assert scope['status'] == 'passed' and scope['current_tests'] == 21
for item in scope['focused']:
    assert sha(item['path']) == item['sha256']
    checked_log(item['path'], item['tests'])
assert {i['lane']: i['tests'] for i in scope['focused']} == {'compute': 6, 'collection': 3}
regression = scope['regression']
assert sha(P/regression['path']) == regression['sha256'] and regression['tests'] == 12
checked_log(P/regression['path'], 12)
historical = scope['prior_full_suite']
assert historical['tests'] == 112 and sha(historical['path']) == historical['sha256']
checked_log(historical['path'], 112)
previous_verification = P.parent/'web-stack-proofs-11-2026-10-10/verification.json'
assert sha(previous_verification) == historical['verification_sha256']
assert read(previous_verification)['knowledge_tests'] == 112
pre_timing = read(P/'pre-timing.json')
assert pre_timing['status'] == 'passed' and pre_timing['current_tests'] == 21 and pre_timing['prior_full_suite_tests'] == 112
assert pre_timing['compiler_test_planner_prepare_jobs'] == []
preflight, validation = read(P/'control-preflight.json'), read(P/'node-validation.json')
assert preflight['comparisons'] == 78 and preflight['python_literal_checks'] == 276 and validation['validation']['comparisons'] == 858

fixture = read(P/'fixtures.json')
assert len(fixture['cells']) == 36
for cell in fixture['cells']:
    inp = fixture['inputs'][cell['input']]
    assert len(set(inp['expected'][cell['case']])) > 1
    gate_count = sum(x < inp['seed'] for x in inp['xs'])
    assert 0 < gate_count < len(inp['xs'])
assert {fixture['inputs'][c['input']]['seed'] < fixture['inputs'][c['input']]['factor'] for c in fixture['cells']} == {False, True}

spec = importlib.util.spec_from_file_location('batch12_harness', ROOT/'bench/web-stack-proofs-12.py')
harness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(harness)
raws, decisions, recomputed_counts, per_backend = [], [], collections.Counter(), collections.defaultdict(collections.Counter)
intervals = gpu_cells = fallbacks = 0
control_comparisons = collections.defaultdict(collections.Counter)
for host in ['node','browser']:
    _, _, data, _, groups = harness.audit(P, host)
    summary = read(P/f'{host}-summary.json')
    assert len(summary['measurements']) == 36
    raws.append(dict(run=host, path=f'{host}-results.json', sha256=sha(P/f'{host}-results.json'), samples=len(data['samples']), exact_comparisons=data['validation']['comparisons'], actual_gpu_samples=sum(r['variant'].endswith('_gpu') for r in data['samples'])))
    for row in summary['measurements']:
        group = groups[(row['case'], row['input'])]
        values = {v: [r['ns_per_call'] for r in sorted(rows, key=lambda r:r['round'])] for v, rows in group.items()}
        assert {v:statistics.median(a) for v,a in values.items()} == row['median_ns']
        for name, saved in row['paired_ratios_95pct'].items():
            if name.startswith(('prior_over_checked_', 'baseline_over_checked_')):
                left, _, right, backend = name.split('_', 3)
                left, right = f'ink_{left}_{backend}', f'ink_{right}_{backend}'
            else:
                left, right = name.split('_over_', 1)
            computed = paired_interval(values[left], values[right])
            assert computed == saved, (host, row['case'], name)
            intervals += 1
            if name.startswith('prior_over_checked_'):
                backend = name[len('prior_over_checked_'):]
                result = verdict(computed)
                recomputed_counts[result] += 1
                per_backend[backend][result] += 1
                decisions.append(dict(host=host,case=row['case'],input=row['input'],backend=backend,ratio_95pct=computed,verdict=result,measured_recommendation='new' if result=='faster' else 'prior',reason='new has supported latency benefit' if result=='faster' else 'retain prior: slower or unresolved'))
            if name in ('ink_checked_direct_js_over_js_literal','ink_checked_wasm_over_rust_literal_wasm'):
                result = 'new_faster' if computed[2]<1 else 'original_faster' if computed[1]>1 else 'inconclusive'
                control_comparisons[name][result] += 1
    if host == 'browser':
        gpu_cells = sum(a['variant'].endswith('_gpu') and a['actual_backend']=='gpu' for a in data['availability'])
        fallbacks = sum(a['variant'].endswith('_gpu') and a['actual_backend']!='gpu' for a in data['availability'])
assert sum(r['samples'] for r in raws) == 6048 and sum(r['exact_comparisons'] for r in raws) == 2616 and sum(r['actual_gpu_samples'] for r in raws) == 504
assert intervals == interval_receipt['intervals_recomputed'] == 828
assert gpu_cells == interval_receipt['actual_gpu_variant_cells'] == 72 and fallbacks == interval_receipt['gpu_fallback_variant_cells'] == 36
assert dict(recomputed_counts) == profit['counts'] == {'faster':153,'inconclusive':71,'slower':10}
assert decisions == profit['decisions']
assert dict(per_backend['js']) == dict(per_backend['direct_js']) == {'faster':66,'inconclusive':1,'slower':5}
assert dict(per_backend['wasm']) == {'faster':21,'inconclusive':51}
assert dict(per_backend['gpu']) == {'inconclusive':18}
assert not (P/'gpu-confirmation.json').exists()

assert len(imp['records']) == imp['imported'] == 288 and imp['before'] == 5310 and imp['after'] == 5598
report_store = Store(P/'report-store')
assert report_store.snapshot_id == store.snapshot_id
seen = set()
for record in imp['records']:
    source = P/record['source']
    assert record['id'] not in seen
    seen.add(record['id'])
    obj = read(source)
    canonical_path = store.data/'observations'/f"{record['id']}.json"
    assert sha(source) == record['source_sha256'] and identity(obj) == record['id']
    assert source.read_bytes() == canonical_path.read_bytes() == canonical(obj)+b'\n'
    assert obj['program'] == sha(P/'core.json')
    assert set(obj['entries']) <= members
    variant, name = obj['target']['backend'], obj['workload']['shape']['case']
    if variant.startswith('ink_checked_'):
        assert obj['plan'] == sha(P/'checked-selection.json') and obj['entries'] == meta['selected_laws_per_function'][name]
    elif variant.startswith('ink_prior_'):
        assert obj['plan'] == sha(P/'prior-selection.json') and obj['entries'] == []
    assert 'highwater only' in obj['target']['driver'] and 'host/GPU excluded' in obj['target']['driver']
assert len(list((store.data/'observations').glob('*.json'))) == 5598

compute = ROOT/'knowledge/research/web-stack-proofs-12/compute'
evidence = read(compute/'evidence.json')
assert len(evidence['artifact_hashes']) == 51
for name, digest in evidence['artifact_hashes'].items():
    assert sha(compute/name) == digest, name
assert evidence['compiler_sha256'] == pub['compiler_sha256'] and evidence['producer_sha256'] == pub['producers'][0]['source_sha256']
actual_counts = {'original':{}, 'selected':{}}
for name in ['cubic_odd_difference','quartic_odd_difference','quintic_odd_difference']:
    actual_counts['original'][name] = ast_counts(original[name])
    actual_counts['selected'][name] = ast_counts(new_bodies[name])
assert actual_counts == evidence['exact_core_ast_counts']
assert [actual_counts['original'][n]['*'] for n in actual_counts['original']] == [4,6,8]
assert [actual_counts['selected'][n]['*'] for n in actual_counts['selected']] == [5,5,8]
assert [sum(actual_counts['original'][n].get(op,0) for op in ['+','-']) for n in actual_counts['original']] == [8,10,12]
assert [sum(actual_counts['selected'][n].get(op,0) for op in ['+','-']) for n in actual_counts['selected']] == [2,2,3]
assert actual_counts['selected']['quintic_odd_difference']['Let'] == 2
for false in evidence['verification']['false_controls']:
    assert identity(read(compute/false['artifact'])) == false['false_object_id']
    assert 'semantic normal forms differ' in false['test_result']
collection = ROOT/'knowledge/research/web-stack-proofs-12/collection'
frames_path = collection/'tests/test_all_twelve_admit_default_select_and_reify_while_prior_retains_work/interpreter-results.json'
frames = read(frames_path)
assert len(frames) == 72 and len({r['function'] for r in frames}) == 12
# JSON can encode F32 exceptional values as bit objects; compare normalized bits.
import struct
for frame in frames:
    def key(values):
        return [x['F32Bits'] if isinstance(x,dict) else struct.unpack('<I',struct.pack('<f',x))[0] for x in values] if frame['function'].endswith('_f32') else values
    assert key(frame['original']) == key(frame['selected']) == key(frame['expected'])
negative = read(collection/'tests/test_hash_valid_wrong_gate_and_mode_comparison_rejected/commands.json')
rejected = [r for r in negative if r['exit_code'] != 0]
assert len(rejected) == 2 and all('semantic normal forms differ' in r['stderr'] and 'identity mismatch' not in r['stderr'] for r in rejected)

if '--preliminary' in sys.argv:
    print({'status':'preliminary checks passed','entries':len(members),'intervals':intervals,'current_tests':scope['current_tests'],'observations':imp['after']})
    sys.exit(0)

review = ROOT/'knowledge/research/web-stack-proofs-12/review.md'
assert 'Final review passes' in review.read_text(), 'final independent review required'
assert (P/'REPORT.md').is_file() and (P/'write-report.py').is_file()
receipts = ['publication.json','pre-timing.json','test-scope.json','knowledge-regression-tests.log','metadata.json','source-boundary-before.json','root-interval-verification.json','profitability.json','backend-routing.json','artifact-sizes.json','observation-import.json','control-preflight.json','prior-selection-check.json','checked-selection-check.json','REPORT.md','browser-evidence.jpg','write-report.py','verify.py','generate-controls.py','pre-timing.py','preflight.py','import-results.py','node-validation.json','node-summary.json','browser-summary.json']
result = dict(schema=1,status='passed',previous_snapshot=pub['previous_snapshot'],snapshot=store.snapshot_id,previous_entries=956,entries=977,added_entries=21,objects_authenticated=977,compiler_sha256=pub['compiler_sha256'],frozen_artifact_hashes_verified=81,source_boundary_hashes_verified=102,old956_bodies_preserved=True,fresh_default_applications=6,current_tests=21,current_test_breakdown={'compute':6,'collection':3,'store_publisher_performance':12},historical_full_suite_tests=112,complete_current_121_test_suite_rerun=False,hash_valid_false_controls=5,typed_interpreter_frames={'compute':36,'collection':72},numeric_author_artifact_hashes_verified=51,numeric_exact_core_ast_counts=actual_counts,timed_samples=6048,exact_backend_comparisons=2616,actual_gpu_samples=504,actual_gpu_variant_cells=72,gpu_fallback_variant_cells=36,paired_intervals_recomputed=828,profitability=dict(recomputed_counts),profitability_by_backend={k:dict(v) for k,v in per_backend.items()},new_observations=288,canonical_observations=5598,canonical_observations_byte_identical=True,gpu_confirmation=None,original_control_comparisons={k:dict(v) for k,v in control_comparisons.items()},raw_files=raws,receipt_hashes={name:sha(P/name) for name in receipts},independent_review={'path':str(review),'sha256':sha(review)},typed_collection_frames_sha256=sha(frames_path),analysis_sources={'bench/web-stack-proofs-12/analyse.py':sha(ROOT/'bench/web-stack-proofs-12/analyse.py')},scope='21 typed laws; six U32 finite-difference/conditional-pipeline representatives. 21 current focused/regression tests and historical112 full-suite receipt, not a current121 full-suite run. Exact full-call measurements retain adverse outcomes and GPU eligibility/fallback distinctions; no supported GPU performance gain. Compiler/runtime/backend source and caller contract unchanged; all local.')
(P/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print({k:result[k] for k in ['status','entries','current_tests','frozen_artifact_hashes_verified','source_boundary_hashes_verified','timed_samples','actual_gpu_samples','canonical_observations']})
