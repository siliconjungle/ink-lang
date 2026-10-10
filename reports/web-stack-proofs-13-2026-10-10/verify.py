"""Authenticate archived batch13 evidence; never invokes compiler/tests/timings."""
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
    assert sha(ROOT/'bench/web-stack-proofs-13'/name) == sha(P/name), name
assert sha(ROOT/'bench/web-stack-proofs-13.py') == sha(P/'harness.py')
for producer in pub['producers']:
    assert sha(ROOT/'knowledge/producers'/f"{producer['producer']}.py") == producer['source_sha256']

store = Store(ROOT/'knowledge')
old = Store(ROOT/'knowledge', ROOT/'knowledge/store/snapshots'/f"{pub['previous_snapshot']}.json")
assert store.snapshot_id == pub['snapshot'] == meta['new_snapshot'] == imp['snapshot'] == '30e427bcb8524fe3760881a3a5722c7445f9fdab3d2818a707b8d8508e80c110'
assert old.snapshot_id == meta['prior_snapshot'] == 'a7ca4c89c1f610ee997319a7e13601b263ee187515ecb5e0f7a506cb40c6636c'
members, oldmembers = set(store.members()), set(old.members())
assert len(members) == 998 and len(oldmembers) == 977 and oldmembers <= members
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
previous_verification = Path(historical['verification_path'])
assert sha(previous_verification) == historical['verification_sha256']
assert read(previous_verification)['knowledge_tests'] == 112
pre_timing = read(P/'pre-timing.json')
assert pre_timing['status'] == 'passed' and pre_timing['current_tests'] == 21 and pre_timing['prior_full_suite_tests'] == 112
assert pre_timing['compiler_test_planner_prepare_jobs'] == []
preflight, validation = read(P/'control-preflight.json'), read(P/'node-validation.json')
assert preflight['comparisons'] == 78 and preflight['python_literal_checks'] == 276 and validation['validation']['comparisons'] == 858
rerun = read(P/'validation-rerun.json')
assert rerun['status'] == 'passed' and rerun['comparisons'] == 858
assert rerun['archive'] != rerun['valid_receipt'] == 'node-validation.json'
assert sha(P/rerun['archive']) == rerun['archive_sha256']
assert sha(P/rerun['valid_receipt']) == rerun['receipt_sha256']
assert validation['status'] == 'validation-passed'
# Collision bytes are authenticated historical diagnostics, never parsed as validation.


fixture = read(P/'fixtures.json')
profile = read(P/'fixture-profile.json')
assert len(fixture['cells']) == len(profile['cells']) == 36
assert profile['status'] == 'passed' and profile['fixtures_sha256'] == sha(P/'fixtures.json')
profile_lookup = {(r['case'],r['input']):r for r in profile['cells']}
for cell in fixture['cells']:
    inp = fixture['inputs'][cell['input']]
    distinct = len(set(inp['expected'][cell['case']]))
    assert distinct > 1
    mapped_gate = cell['case'].startswith('value_gated_')
    gate_count = sum(((x-inp['seed'])&0xffffffff)<inp['seed'] if mapped_gate else x<inp['seed'] for x in inp['xs'])
    assert 0 < gate_count < len(inp['xs'])
    archived = profile_lookup[(cell['case'],inp['id'])]
    assert archived['distinct_outputs'] == distinct and archived['gate_true'] == gate_count
    assert archived['gate_false'] == len(inp['xs'])-gate_count
    assert ('wrapped(x-seed)<seed' in archived['gate_predicate']) == mapped_gate

spec = importlib.util.spec_from_file_location('batch13_harness', ROOT/'bench/web-stack-proofs-13.py')
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
assert dict(recomputed_counts) == profit['counts'] == {'faster':155,'inconclusive':61,'slower':18}
assert decisions == profit['decisions']
assert dict(per_backend['js']) == {'faster':61,'inconclusive':3,'slower':8}
assert dict(per_backend['direct_js']) == {'faster':60,'inconclusive':4,'slower':8}
assert dict(per_backend['wasm']) == {'faster':33,'inconclusive':39}
assert dict(per_backend['gpu']) == {'faster':1,'inconclusive':15,'slower':2}

# Separate archived GPU repeat: independently recompute; do not pool or import.
confirmation = read(P/'gpu-confirmation.json')
repeat = Path(confirmation['path'])
assert confirmation['status'] == 'passed' and not confirmation['pooled']
assert confirmation['canonical_observations_imported'] == 0
assert confirmation['samples'] == 196 and confirmation['exact_comparisons'] == 171
assert confirmation['actual_gpu_samples'] == 42 and confirmation['intervals_recomputed'] == 30
assert confirmation['frozen_artifacts_verified'] == 69 and len(confirmation['identical_gpu_artifacts']) == 9
for name,digest in confirmation['receipt_hashes'].items():
    assert sha(repeat/name) == digest, name
repeat_meta = read(repeat/'metadata.json')
assert len(repeat_meta['artifact_hashes']) == 69
for name,digest in repeat_meta['artifact_hashes'].items():
    assert sha(repeat/name) == digest, name
for name in ['compiler_sha256','new_snapshot','prior_snapshot']:
    assert repeat_meta[name] == meta[name]
main_inputs = {r['id']:r for r in fixture['inputs']}
repeat_fixture = read(repeat/'fixtures.json')
assert repeat_fixture['cases'] == ['mixed_prefix24'] and len(repeat_fixture['inputs']) == 13
for inp in repeat_fixture['inputs']:
    same = main_inputs[inp['id']]
    for field in ['xs','seed','factor']:
        assert canonical(inp[field]) == canonical(same[field])
    for case,expected in inp['expected'].items():
        assert canonical(expected) == canonical(same['expected'][case])
for match in confirmation['identical_gpu_artifacts']:
    assert sha(P/match['main_path']) == sha(repeat/match['repeat_path']) == match['sha256']
confirm_pre = read(P/'gpu-confirmation-preflight.json')
assert confirm_pre['status'] == 'passed' and confirm_pre['identical_inputs'] == 13 and confirm_pre['frozen_artifacts'] == 69
assert confirm_pre['identical_gpu_artifacts'] == confirmation['identical_gpu_artifacts']
_,_,repeat_raw,_,repeat_groups = harness.audit(repeat,'browser')
assert len(repeat_raw['samples']) == 196 and repeat_raw['validation']['comparisons'] == 171
assert sum(r['variant'].endswith('_gpu') for r in repeat_raw['samples']) == 42
repeat_decisions, repeat_intervals = [], 0
for row in read(repeat/'browser-summary.json')['measurements']:
    values = {v:[r['ns_per_call'] for r in sorted(rows,key=lambda r:r['round'])] for v,rows in repeat_groups[(row['case'],row['input'])].items()}
    assert {v:statistics.median(a) for v,a in values.items()} == row['median_ns']
    for name,saved in row['paired_ratios_95pct'].items():
        if name.startswith(('prior_over_checked_','baseline_over_checked_')):
            left,_,right,backend = name.split('_',3)
            left,right = f'ink_{left}_{backend}',f'ink_{right}_{backend}'
        else:
            left,right = name.split('_over_',1)
        assert paired_interval(values[left],values[right]) == saved
        repeat_intervals += 1
    ci = row['paired_ratios_95pct']['prior_over_checked_gpu']
    repeat_decisions.append(dict(case=row['case'],input=row['input'],ratio_95pct=ci,verdict=verdict(ci)))
assert repeat_intervals == 30 and repeat_decisions == confirmation['decisions']
assert all(d['verdict'] == 'inconclusive' for d in repeat_decisions)
assert confirmation['replicated'] == [] and len(confirmation['unreplicated']) == 1
main_wins = [d for d in decisions if d['backend'] == 'gpu' and d['verdict'] == 'faster']
assert len(main_wins) == 1
assert {k:v for k,v in confirmation['unreplicated'][0].items() if k!='confirmation'} == main_wins[0]
repeat_lookup = {(d['case'],d['input']):d for d in repeat_decisions}
assert confirmation['unreplicated'][0]['confirmation'] == repeat_lookup[('mixed_prefix24','full-32')]
assert repeat_lookup[('mixed_prefix24','full-32')]['ratio_95pct'] == [0.9975654290868479,0.935483870967742,1.0109555692754586]

assert len(imp['records']) == imp['imported'] == 288 and imp['before'] == 5598 and imp['after'] == 5886
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
assert len(list((store.data/'observations').glob('*.json'))) == 5886

compute = ROOT/'knowledge/research/web-stack-proofs-13/compute'
evidence = read(compute/'evidence.json')
assert len(evidence['artifact_hashes']) == 85
for name, digest in evidence['artifact_hashes'].items():
    assert sha(compute/name) == digest, name
assert evidence['compiler_sha256'] == pub['compiler_sha256'] and evidence['producer_sha256'] == pub['producers'][0]['source_sha256']
actual_counts = {'original':{}, 'selected':{}}
for name in ['mixed_prefix6','mixed_prefix12','mixed_prefix24']:
    actual_counts['original'][name] = ast_counts(original[name])
    actual_counts['selected'][name] = ast_counts(new_bodies[name])
assert actual_counts == evidence['exact_core_ast_counts']
assert [actual_counts['original'][n]['*'] for n in actual_counts['original']] == [11,56,254]
assert [actual_counts['selected'][n]['*'] for n in actual_counts['selected']] == [4,6,8]
assert [sum(actual_counts['original'][n].get(op,0) for op in ['+','-']) for n in actual_counts['original']] == [6,12,24]
assert [sum(actual_counts['selected'][n].get(op,0) for op in ['+','-']) for n in actual_counts['selected']] == [4,5,6]
assert [actual_counts['selected'][n]['Let'] for n in actual_counts['selected']] == [2,3,4]
numeric_receipts = read(compute/evidence['typed_command_receipts'])
numeric_commands = numeric_receipts['commands']
assert len(numeric_receipts['interpreter_frames']) == 36
for frame in numeric_receipts['interpreter_frames']:
    assert frame['original'] == frame['selected'] == frame['expected']
for false in evidence['verification']['false_controls']:
    bundle = read(compute/false['artifact'])
    assert identity(bundle['objects'][false['false_object_id']]) == false['false_object_id']
    command = numeric_commands[false['command_index']]
    assert command['exit_code'] != 0 and 'semantic normal forms differ' in command['stderr']
    assert 'identity mismatch' not in command['stderr'] and 'semantic normal forms differ' in false['rejection']
assert evidence['verification']['interpreter_frames'] == 36
collection = ROOT/'knowledge/research/web-stack-proofs-13/collection'
frames_path = collection/'tests/test_all_twelve_admit_default_select_and_reify_while_prior_retains_work/interpreter-results.json'
frames = read(frames_path)
assert len(frames) == 72 and len({r['function'] for r in frames}) == 12
# JSON can encode F32 exceptional values as bit objects; compare normalized bits.
import struct
for frame in frames:
    def key(values):
        return [x['F32Bits'] if isinstance(x,dict) else struct.unpack('<I',struct.pack('<f',x))[0] for x in values] if frame['function'].endswith('_f32') else values
    assert key(frame['original']) == key(frame['selected']) == key(frame['expected'])
negative = read(collection/'tests/test_hash_valid_wrong_mapped_gate_and_weighted_order_rejected/commands.json')
rejected = [r for r in negative if r['exit_code'] != 0]
assert len(rejected) == 2 and all('semantic normal forms differ' in r['stderr'] and 'identity mismatch' not in r['stderr'] for r in rejected)
comparison_scope = read(P/'comparison-scope.json')
assert comparison_scope['status'] == 'scoped_comparison'
assert sha(P/'comparison-scope.json') == '1367e461e27b049610cf2a7c32c4b24bc881b0969775ec6b48aa6be04b8e67e2'
for host,scoped in comparison_scope['hosts'].items():
    summary_path = P/f'{host}-summary.json'
    assert sha(summary_path) == scoped['summary_sha256']
    rows = read(summary_path)['measurements']
    for control,claim in scoped['controls'].items():
        cis = [row['paired_ratios_95pct'][control] for row in rows]
        counts = collections.Counter()
        for ci in cis:
            if control.endswith('_over_ink_checked_gpu'):
                result = 'cpu_faster' if ci[2]<1 else 'gpu_faster' if ci[1]>1 else 'inconclusive'
            else:
                result = 'ink_faster' if ci[2]<1 else 'control_faster' if ci[1]>1 else 'inconclusive'
            counts[result] += 1
        assert dict(counts) == claim['all36_interval_verdicts']
        full = [row['paired_ratios_95pct'][control][0] for row in rows if row['input']=='full-65536']
        assert len(full) == 6 and [min(full),max(full)] == claim['largest_full_width_latency_ratio_range']
for field in ['native_rust_measured_this_batch','expert_already_fused_factored_controls_measured','gpu_resident_pipeline_measured','general_language_speed_ranking_established','ordinary_application_workloads_measured_this_batch']:
    assert comparison_scope[field] is False
methodology_doc = comparison_scope['methodology_document']
assert sha(ROOT/methodology_doc['path']) == methodology_doc['sha256']
auto = comparison_scope['runtime_selection']
assert auto['existing'] is True and auto['policy_language'] == 'JavaScript host runtime'
assert auto['general_load_aware_state_migration_optimizer'] is False
assert auto['defaults'] == {'expected_calls':32,'recheck_every_uses':32,'minimum_saving_fraction':0.1,'max_cached_keys':32}
for name,digest in auto['sources'].items():
    assert sha(ROOT/name) == digest
    if name in boundary:
        assert boundary[name] == digest
assert 'batch forces explicit backends' in auto['scope'] and 'does not measure the auto policy' in auto['scope']
assert 'compile time' in auto['scope']
assert 'prepared execution' in auto['scope'].lower() and 'shared input capture' in auto['scope'].lower()

sharing = read(collection/'sharing.json')
assert sharing['status'] == 'passed' and len(sharing['functions']) == 8
for name,claim in sharing['functions'].items():
    functions = read(ROOT/claim['reified_core'])['program']['functions']
    body = next(f['body'] for f in functions if f['name'] == name)
    actual = ast_counts(body)
    assert actual == claim['primitive_counts']
    assert actual['-'] == 1 and actual['<'] == 1 and actual['*'] == 2
    assert 'Let' in body['Method'][2][0]['Lambda'][1] and claim['outer_shared_typed_let']
for name in ['value_gated_left','value_gated_right']:
    actual = ast_counts(new_bodies[name])
    assert actual['-'] == 1 and actual['<'] == 1 and actual['*'] == 2


if '--preliminary' in sys.argv:
    print({'status':'preliminary checks passed','entries':len(members),'intervals':intervals,'current_tests':scope['current_tests'],'observations':imp['after']})
    sys.exit(0)

review = ROOT/'knowledge/research/web-stack-proofs-13/review.md'
assert 'Final review passes' in review.read_text(), 'final independent review required'
assert (P/'REPORT.md').is_file() and (P/'write-report.py').is_file()
receipts = ['publication.json','pre-timing.json','test-scope.json','knowledge-regression-tests.log','metadata.json','source-boundary-before.json','root-interval-verification.json','profitability.json','backend-routing.json','artifact-sizes.json','observation-import.json','control-preflight.json','prior-selection-check.json','checked-selection-check.json','REPORT.md','browser-evidence.jpg','write-report.py','verify.py','generate-controls.py','pre-timing.py','preflight.py','import-results.py','node-validation.json','node-summary.json','browser-summary.json','fixture-profile.json','validation-rerun.json','node-validation-stdout-collision.json','gpu-confirmation.json','gpu-confirmation-preflight.json','final-confirm.py','confirmation-preflight.py','comparison-scope.json']
result = dict(schema=1,status='passed',previous_snapshot=pub['previous_snapshot'],snapshot=store.snapshot_id,previous_entries=977,entries=998,added_entries=21,objects_authenticated=998,compiler_sha256=pub['compiler_sha256'],frozen_artifact_hashes_verified=81,source_boundary_hashes_verified=102,old977_bodies_preserved=True,fresh_default_applications=6,current_tests=21,current_test_breakdown={'compute':6,'collection':3,'store_publisher_performance':12},historical_full_suite_tests=112,complete_current_130_test_suite_rerun=False,hash_valid_false_controls=5,typed_interpreter_frames={'compute':36,'collection':72},numeric_author_artifact_hashes_verified=85,numeric_exact_core_ast_counts=actual_counts,timed_samples=6048,exact_backend_comparisons=2616,actual_gpu_samples=504,actual_gpu_variant_cells=72,gpu_fallback_variant_cells=36,paired_intervals_recomputed=828,profitability=dict(recomputed_counts),profitability_by_backend={k:dict(v) for k,v in per_backend.items()},new_observations=288,canonical_observations=5886,canonical_observations_byte_identical=True,gpu_confirmation=confirmation,original_control_comparisons={k:dict(v) for k,v in control_comparisons.items()},raw_files=raws,receipt_hashes={name:sha(P/name) for name in receipts},independent_review={'path':str(review),'sha256':sha(review)},typed_collection_frames_sha256=sha(frames_path),collection_sharing_sha256=sha(collection/'sharing.json'),fixture_profile_verified=True,validation_rerun_authenticated=True,confirmation_intervals_independently_recomputed=30,confirmation_inputs_identical=13,comparison_scope_authenticated=True,runtime_selection=auto,analysis_sources={'bench/web-stack-proofs-13/analyse.py':sha(ROOT/'bench/web-stack-proofs-13/analyse.py')},scope='21 typed laws; six U32 mixed-radix-prefix/mapped-value conditional-pipeline representatives. 21 current focused/regression tests and historical112 full-suite receipt, not a current130 full-suite run. Exact full-call measurements retain adverse outcomes and GPU eligibility/fallback distinctions; one nominal main GPU gain failed separate same-input confirmation; no confirmed GPU performance gain. Existing bounded pure auto backend selector is JavaScript host policy, measuring prepared execution/setup after shared input capture and plan preparation; this batch forces explicit backends and does not measure auto policy. Proof admission/rewrite selection are compile time; no general state/load/per-stage adaptive optimizer is established. Current original-stage comparisons do not establish broad language rankings. Compiler/runtime/backend source and caller contract unchanged; all local.')
(P/'verification.json').write_text(json.dumps(result,indent=2)+'\n')
print({k:result[k] for k in ['status','entries','current_tests','frozen_artifact_hashes_verified','source_boundary_hashes_verified','timed_samples','actual_gpu_samples','canonical_observations']})
