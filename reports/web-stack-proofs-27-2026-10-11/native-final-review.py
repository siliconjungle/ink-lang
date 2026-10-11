#!/usr/bin/env python3
"""Independent archived-native evidence audit. Never builds or runs algorithms.

Run only after the parent announces all timing jobs have stopped. The script
imports neither the benchmark harness nor its methodology/statistics helpers.
"""
import hashlib
import json
import math
import random
import struct
from pathlib import Path

REPORT = Path(__file__).resolve().parent
ROOT = REPORT.parents[1]
NATIVE = REPORT / 'native'
VARIANTS = ('ink_old_prior_native','ink_old_checked_native','ink_new_prior_native','ink_new_checked_native','rust_expert_native')
PAIRS = {
 'backend_prior':(VARIANTS[0],VARIANTS[2]),
 'backend_checked':(VARIANTS[1],VARIANTS[3]),
 'proof_old':(VARIANTS[0],VARIANTS[1]),
 'proof_new':(VARIANTS[2],VARIANTS[3]),
 'combined':(VARIANTS[0],VARIANTS[3]),
 'current_over_expert':(VARIANTS[3],VARIANTS[4]),
}

MASK = (1 << 64) - 1
COMPILER = '719fd6ff95ea7cd600d7f4078677b46c46fdd545ef2b21ae5643ca5eba085787'
PRIOR = 'a2a756dc7174ab62c2806e09dd0e3769e507f4ed5e455d687346c544cd788abd'


def check(condition, label):
    if not condition:
        raise AssertionError(label)


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read(path):
    return json.loads(Path(path).read_text())


def positive(value, label):
    check(type(value) in (float, int) and math.isfinite(value) and value > 0, label)


def integer(value, label, minimum=0):
    check(type(value) is int and value >= minimum, label)


def median(values):
    ordered = sorted(values)
    n = len(ordered)
    return ordered[n // 2] if n % 2 else (ordered[n // 2 - 1] + ordered[n // 2]) / 2


def independent_interval(numerator, denominator):
    """Same preregistered paired recipe, separately implemented without M."""
    check(len(numerator) == len(denominator) == 9, 'nine paired observations')
    rng = random.Random(0)
    distribution = []
    for _ in range(4000):
        indices = [rng.randrange(9) for _ in range(9)]
        top = sorted(numerator[i] for i in indices)[4]
        bottom = sorted(denominator[i] for i in indices)[4]
        distribution.append(top / bottom)
    distribution.sort()
    return [median(numerator) / median(denominator),
            distribution[100], distribution[3899]]


def observation(value, task):
    if task['output_kind'] != 'list_u32':
        scalar = int(value)
        check((type(value) is int or (task['output_kind']=='u64' and type(value) is str and value==str(scalar))) and 0 <= scalar <= (MASK if task['output_kind']=='u64' else 0xffffffff), 'exact scalar output range')
        return str(value), scalar
    check(type(value) is list and all(type(x) is int and 0 <= x < 2**32 for x in value),
          'complete vector oracle shape')
    total = sum(value) & 0xffffffff
    weighted = sum((i + 1) * x for i, x in enumerate(value)) & 0xffffffff
    return f'array:{len(value)}:{total}:{weighted}', (total + (weighted << 32) + len(value)) & MASK


def main():
    bindings = {}

    def bind(path, expected=None):
        actual = digest(path)
        check(expected is None or actual == expected, 'hash ' + str(path))
        resolved = Path(path)
        try:
            key = str(resolved.relative_to(ROOT))
        except ValueError:
            key = str(resolved.resolve())
        bindings[key] = actual
        return actual

    bind(REPORT / 'native-final-review.py')
    native_metadata_hash = bind(NATIVE / 'metadata.json')
    web_metadata_hash = bind(REPORT / 'metadata.json')
    meta = read(NATIVE / 'metadata.json')
    web = read(REPORT / 'metadata.json')
    driver = (NATIVE / 'driver.c').read_text()
    check('mach_absolute_time()' in driver and 'ticks()-start' in driver
          and 'timebase.numer/timebase.denom' in driver, 'integer tick delta and timebase clock')
    check(meta['status'] == 'prepared', 'native prepared metadata')
    check(web['compilers']['old']['sha256']==COMPILER,'archived compiler pin')
    for compiler in web['compilers'].values():bind(Path(compiler['path']),compiler['sha256'])
    bind(ROOT / 'planner/ink_planner/semantic_search.py', web['planner_policy_sha256'])
    check(web['prior_snapshot'] == PRIOR and web['new_snapshot'] not in (PRIOR,web['effective_prior_snapshot']),
          'historical prior1790 and fresh selected catalogue pins')
    bind(REPORT / 'spec.json', meta['spec_sha256'])
    bind(REPORT / 'fixtures.json', meta['fixtures_sha256'])
    spec = read(REPORT / 'spec.json')
    fixture = read(REPORT / 'fixtures.json')
    check(meta['tasks'] == spec['tasks'] and len(meta['tasks']) == len({t['name'] for t in spec['tasks']}), 'shared unique task spec')
    check(meta['artifact_hashes'] and len(meta['sources']) == 4*len(meta['tasks'])+2,
          'prepared artifact manifest and all four factorial emitted-C lanes plus two Rust controls')
    for name, expected in meta['artifact_hashes'].items():
        bind(NATIVE / name, expected)
    for name, expected in meta['sources'].items():
        bind(REPORT / name, expected)
    check(set(meta['libraries']) == set(VARIANTS)|{'rust_literal_native'}, 'five timed native lanes plus validation-only literal Rust')
    for path in meta['libraries'].values():
        check(str(Path(path).relative_to(NATIVE)) in meta['artifact_hashes'], 'library frozen')
    bind(ROOT / 'bench/web-stack-native-27.py', digest(NATIVE / 'harness.py'))
    bind(ROOT / 'bench/web-stack-proofs-27/literal.rs', digest(REPORT / 'literal.rs'))
    bind(ROOT / 'bench/web-stack-proofs-27/expert.rs', digest(REPORT / 'expert.rs'))

    scalar_abi=[]
    for mode in ('literal','expert'):
        path=NATIVE/f'rust-{mode}.rs';bind(path,meta['artifact_hashes'][path.name])
        source=(REPORT/f'{mode}.rs').read_text();compiled=path.read_text()
        check(compiled.startswith(source),'native Rust embeds exact shared algorithm source')
        adapter=compiled[len(source):]
        check('scalar:bench_scalar(task,xs,ys,seed,k)' in adapter,'native direct scalar return')
        check('data:std::ptr::null(),len:0,scalar:bench_scalar' in adapter,'native scalar no output buffer')
        check(adapter.count('bench_eval(')==1 and adapter.count('bench_scalar(')==1,'vector-only output wrapper and scalar-only direct helper')
        scalar_abi.append(dict(variant=mode,algorithm_source_sha256=digest(REPORT/f'{mode}.rs'),native_adapter_sha256=digest(path),direct_scalar=True,vector_uses_scratch=True))
    check('if(snapshot){sx=malloc' in driver and 'memcpy(sx,x,nx*4)' in driver
          and 'if(inputs==2){sy=malloc' in driver and 'memcpy(sy,y,ny*4)' in driver,
          'snapshot mode copies every declared list')
    check('if(snapshot){free(sx);if(inputs==2)free(sy);}' in driver,'snapshot frees copies inside timed loop')
    check('r=call(task,sx,nx,sy,ny,seed,k,out);acc+=consume' in driver,'complete result consumption in timed loop')

    tasks = {t['name']: t for t in meta['tasks']}
    inputs = {x['id']: x for x in fixture['inputs']}
    check(len(inputs) == len(fixture['inputs']), 'distinct validation fixtures')
    check(set(meta['binaries']) == set(inputs), 'one native binary per fixture')
    for name, x in inputs.items():
        path = Path(meta['binaries'][name])
        check(path.name == hashlib.sha256(name.encode()).hexdigest() + '.bin', 'binary name')
        expected = struct.pack('<QQII', len(x['xs']), len(x['ys']), x['seed'], x['factor'])
        expected += struct.pack('<' + 'I' * (len(x['xs']) + len(x['ys'])), *x['xs'], *x['ys'])
        check(path.read_bytes() == expected, 'frozen binary fixture bytes ' + name)

    validation_hash = bind(NATIVE / 'validation.json')
    validation = read(NATIVE / 'validation.json')
    check(validation['status'] == 'passed' and validation['exact_comparisons'] == len(fixture['inputs'])*(len(VARIANTS)+1)
          and validation['inputs'] == len(fixture['inputs']) and validation['metadata_sha256'] == native_metadata_hash,
          'complete pre-timing output validations bind prepared native bytes')
    raw_hash = bind(NATIVE / 'results.json')
    summary_hash = bind(NATIVE / 'summary.json')
    raw = read(NATIVE / 'results.json')
    summary = read(NATIVE / 'summary.json')
    check(raw['status'] == summary['status'] == 'passed', 'passed raw and summary')
    check(raw['metadata_sha256'] == native_metadata_hash and raw['validation_sha256'] == validation_hash,
          'raw metadata and validation hashes')
    check(summary['metadata_sha256'] == native_metadata_hash and summary['results_sha256'] == raw_hash
          and summary['validation'] == validation, 'summary binds raw and complete validation')
    check(raw['scope'] == summary['scope'] == meta['scope'], 'identical native scope')
    params = raw['parameters']
    check(params['repeats'] == 9 and params['warmup'] == 2 and params['seed'] == 20261105,
          'nine rounds, two warmups, fixed interleave seed')
    positive(params['seconds'], 'positive calibration budget')
    cells = []
    for c in fixture['cells']:
        x = fixture['inputs'][c['input']]
        check(c['case'] in x['expected'] and c['case'] == x['case'], 'cell-to-input linkage')
        cells.extend((c['case'], x['id'], mode) for mode in ('resident', 'snapshot'))
    check(len(cells) == len(set(cells)) == 2*len(fixture['cells']), 'distinct resident/snapshot native cells')
    expected_base = {cell + (v,) for cell in cells for v in VARIANTS}
    phases = {}
    for phase, field, rounds in [('calibration', None, 1), ('warmups', 'warmup', params['warmup']), ('samples', 'round', 9)]:
        expected_keys = {base + ((i,) if field else ()) for base in expected_base for i in range(rounds)}
        seen = {}
        for row in raw[phase]:
            base = tuple(row[k] for k in ('case', 'input', 'mode', 'variant'))
            if field:
                integer(row[field], phase + ' index')
            key = base + ((row[field],) if field else ())
            check(key in expected_keys and key not in seen, phase + ' exact unique coverage')
            integer(row['iterations'], phase + ' iterations', 1)
            check(row['iterations'] <= 5000000, phase + ' iteration cap')
            positive(row['seconds'], phase + ' finite positive seconds')
            positive(row['ns_per_call'], phase + ' finite positive ns')
            check(math.isclose(row['ns_per_call'], row['seconds'] * 1e9 / row['iterations'], rel_tol=1e-12),
                  phase + ' timing arithmetic')
            expected_single, code = observation(inputs[row['input']]['expected'][row['case']], tasks[row['case']])
            check(row['single'] == expected_single and row['code'] == str(code)
                  and row['checksum'] == str((code * row['iterations']) & MASK), phase + ' consumed output')
            seen[key] = row
        check(set(seen) == expected_keys, phase + ' complete coverage')
        phases[phase] = seen
    check(len(raw['samples']) == summary['samples'] == len(cells)*len(VARIANTS)*params['repeats']
          and len(raw['warmups']) == len(expected_base)*params['warmup']
          and len(raw['calibration']) == len(expected_base) and summary['cells'] == len(cells),
          'exact sample and phase totals')
    # Independent adaptive calibration audit: verify the complete sequence,
    # stopping decision and exact row consumed by subsequent calibration.
    calibration_policy = dict(initial_iterations=1,target_seconds=.001,
                              max_iterations=5000000,max_growth=16,
                              zero_seconds_calibration='grow by16; warmup/measured positive')
    check(raw['calibration_policy'] == calibration_policy, 'frozen adaptive calibration policy')
    trials = {base: [] for base in expected_base}
    trial_order = []
    for row in raw['calibration_trials']:
        base = tuple(row[k] for k in ('case','input','mode','variant'))
        check(base in trials, 'calibration trial cell coverage')
        integer(row['step'], 'trial step')
        integer(row['iterations'], 'trial iterations', 1)
        check(row['iterations'] <= 5000000, 'trial iteration cap')
        check(type(row['seconds']) in (int,float) and math.isfinite(row['seconds']) and row['seconds']>=0, 'trial finite nonnegative seconds')
        check(type(row['ns_per_call']) in (int,float) and math.isfinite(row['ns_per_call']) and row['ns_per_call']>=0, 'trial finite nonnegative ns')
        check(math.isclose(row['ns_per_call'],row['seconds']*1e9/row['iterations'],rel_tol=1e-12),
              'trial timing arithmetic')
        single, code = observation(inputs[row['input']]['expected'][row['case']],tasks[row['case']])
        check(row['single']==single and row['code']==str(code)
              and row['checksum']==str(code*row['iterations'] & MASK), 'trial consumed checksum')
        trials[base].append(row)
        trial_order.append(base+(row['step'],))
    expected_trial_order = []
    for cell in cells:
        for variant in VARIANTS:
            base=cell+(variant,)
            sequence=trials[base]
            check(sequence and sequence[0]['iterations']==1, 'trial starts at one call')
            check([r['step'] for r in sequence]==list(range(len(sequence))), 'contiguous unique trial steps')
            for before,after in zip(sequence,sequence[1:]):
                n=before['iterations']
                check(before['seconds']<.001 and n<5000000, 'nonfinal trial cannot satisfy stop')
                expected=min(5000000,n*16) if before['seconds']==0 else min(5000000,max(n+1,min(n*16,math.ceil(.001/(before['seconds']/n)))))
                check(after['iterations']==expected and n<expected<=min(5000000,n*16),
                      'exact growth formula, strictly growing, capped at sixteenfold')
            final=sequence[-1]
            check(final['seconds']>=.001 or final['iterations']==5000000, 'final trial stopping criterion')
            check({k:v for k,v in final.items() if k!='step'}==phases['calibration'][base],
                  'final trial exactly equals calibration row')
            expected_trial_order.extend(base+(r['step'],) for r in sequence)
    check(trial_order==expected_trial_order, 'exact complete calibration trial order')
    journal_path=NATIVE/'trials.jsonl';bind(journal_path)
    journal=[json.loads(line) for line in journal_path.read_text().splitlines()]
    expected_journal=[]
    for cell in cells:
        for variant in VARIANTS:
            expected_journal.extend(dict(phase='calibration_trials',phase_index=r['step'],calibrating=True,
                **{k:v for k,v in r.items() if k!='step'}) for r in trials[cell+(variant,)])
        for w in range(params['warmup']):
            for variant in VARIANTS:
                row=phases['warmups'][cell+(variant,w)]
                expected_journal.append(dict(phase='warmups',phase_index=w,calibrating=False,
                    **{k:v for k,v in row.items() if k!='warmup'}))
        expected_journal.extend(dict(phase='samples',phase_index=r['round'],calibrating=False,
            **{k:v for k,v in r.items() if k!='round'}) for r in raw['samples']
            if tuple(r[k] for k in ('case','input','mode'))==cell)
    check(journal==expected_journal, 'exact complete execution-ordered calibration/warmup/sample journal')

    check([tuple(r[k] for k in ('case','input','mode','variant')) for r in raw['calibration']]
          ==[cell+(v,) for cell in cells for v in VARIANTS], 'calibration phase order')
    check([tuple(r[k] for k in ('case','input','mode','variant','warmup')) for r in raw['warmups']]
          ==[cell+(v,w) for cell in cells for w in range(params['warmup']) for v in VARIANTS], 'warmup phase order')
    for base in expected_base:
        calibration = phases['calibration'][base]
        expected_iterations = max(1, min(5000000, math.ceil(params['seconds'] /
                                                         (calibration['seconds'] / calibration['iterations']))))
        for w in range(params['warmup']):
            check(phases['warmups'][base + (w,)]['iterations'] == expected_iterations,
                  'warmup uses calibrated iterations')
        for i in range(9):
            check(phases['samples'][base + (i,)]['iterations'] == expected_iterations,
                  'all rounds use calibrated iterations')
    rng = random.Random(20261105)
    ordered_keys = []
    for cell in cells:
        for i in range(9):
            order = list(VARIANTS)
            rng.shuffle(order)
            ordered_keys.extend(cell + (v, i) for v in order)
    actual_keys = [tuple(row[k] for k in ('case', 'input', 'mode', 'variant', 'round')) for row in raw['samples']]
    check(actual_keys == ordered_keys, 'exact shuffled sample order')

    measurements = {(m['case'], m['input'], m['mode']): m for m in summary['measurements']}
    check(len(measurements) == len(summary['measurements']) == len(cells)
          and set(measurements) == set(cells), 'summary exact cell coverage')
    intervals = 0
    for cell in cells:
        m = measurements[cell]
        check(m['ratio_variants'] == {k: list(pair) for k, pair in PAIRS.items()}, 'ratio orientation')
        values = {v: [phases['samples'][cell + (v, i)]['ns_per_call'] for i in range(9)] for v in VARIANTS}
        check(set(m['median_ns']) == set(VARIANTS) and set(m['paired_ratios_95pct']) == set(PAIRS),
              'all variant medians and six factorial/expert ratios')
        for v in VARIANTS:
            check(m['median_ns'][v] == median(values[v]), 'independent cell median')
        for name, (a, b) in PAIRS.items():
            calculated = independent_interval(values[a], values[b])
            check(m['paired_ratios_95pct'][name] == calculated, 'independent paired interval ' + name)
            intervals += 1
    check(intervals == len(cells)*len(PAIRS), 'all independently recomputed intervals')
    bind(Path(__file__))
    guard = read(REPORT / 'source-boundary-before.json')
    check(len(guard) == 102, '102-key source guard')
    bind(REPORT / 'source-boundary-before.json')
    after=read(REPORT/'source-boundary-after.json');bind(REPORT/'source-boundary-after.json')
    changed=sorted(p for p,h in guard.items() if after[p]!=h)
    check(changed==sorted(read(REPORT/'initial-pins.json')['expected_source_changes']),'only pinned expected C/JS helper-inlining source changes')
    for path,expected in after.items():bind(ROOT/path,expected)
    for path in changed:bind(REPORT/'original-source'/path,guard[path])
    bind(REPORT / 'policy-freeze.json')
    policy = read(REPORT / 'policy-freeze.json')
    for path, expected in policy['artifacts'].items():
        bind(ROOT / path, expected)
    check(meta['main_metadata_sha256'] == web_metadata_hash, 'native binds web metadata')
    check(meta['snapshots'] == {k:web[k] for k in ['prior_snapshot','effective_prior_snapshot','new_snapshot']}, 'all snapshot pins shared')
    check(meta['cpu_cost_model_sha256'] == web['cost_model_sha256'], 'same CPU policy')
    outcomes = {}
    for mode in ('resident','snapshot'):
        outcomes[mode] = {}
        for cohort, predicate in [('all',lambda x:True),('fresh',lambda x:tasks[x['case']]['fresh_proof_required']),('reference',lambda x:not tasks[x['case']]['fresh_proof_required']),('scalar_consumers',lambda x:tasks[x['case']]['output_kind']!='list_u32'),('vector_consumers',lambda x:tasks[x['case']]['output_kind']=='list_u32'),('primary_callbacks',lambda x:tasks[x['case']]['cohort']=='discovery'),('heldout_callbacks',lambda x:tasks[x['case']]['cohort']=='heldout')]:
            selected = [x for x in summary['measurements'] if x['mode']==mode and predicate(x)]
            result = {}
            for label,numerator_fast in [(k,k=='current_over_expert') for k in PAIRS]:
                ratios = [x['paired_ratios_95pct'][label] for x in selected]
                ink_wins = sum(v[2]<1 if numerator_fast else v[1]>1 for v in ratios)
                ink_losses = sum(v[1]>1 if numerator_fast else v[2]<1 for v in ratios)
                result[label] = dict(cells=len(ratios),ink_faster=ink_wins,inconclusive=len(ratios)-ink_wins-ink_losses,ink_slower=ink_losses,ratio_range=[min(v[0] for v in ratios),max(v[0] for v in ratios)] if ratios else None)
            outcomes[mode][cohort] = result
    bind(Path(__file__))
    receipt = dict(status='passed',native_cells=len(cells),variants=len(VARIANTS),rounds_per_cell_variant=params['repeats'],samples=len(raw['samples']),warmups=len(raw['warmups']),calibrations=len(raw['calibration']),complete_validation_comparisons=validation['exact_comparisons'],validation_inputs=len(inputs),prepared_native_artifacts=len(meta['artifact_hashes']),source_bindings=len(meta['sources']),calibration_policy=raw['calibration_policy'],calibration_trials=len(raw['calibration_trials']),zero_calibration_trials=sum(r['seconds']==0 for r in raw['calibration_trials']),journal_rows=len(journal),independently_recomputed_paired_intervals=intervals,bootstrap=dict(draws=4000,seed=0,paired_by='round',quantile_indices=[100,3899]),source_guard=dict(keys=102,unchanged=102-len(changed),changed=changed),interval_computation='independently recomputed this run',outcomes=outcomes,direct_scalar_abi=scalar_abi,bindings=bindings,scope='Archived authentication and independent intervals only; no tests, builds, algorithms or new timing runs.',limitations=['Each common driver invocation performs one result check and three untimed algorithm prewarm calls before its recorded clock interval; these are shared across variants and distinct from the two journaled warmup phases. The complete native prevalidation comparisons are authenticated, not rerun. Timed vectors use length/sum/weighted checksums rather than complete per-iteration comparisons.','Both generated C and Rust native scalar implementations return directly; Rust uses the identical shared bench_scalar algorithm helper rather than Wasm output stores. Native direct function timings bypass packed scalar result bridges. Resident borrows inputs; snapshot times malloc/copy/free of the task\'s declared input lists. Both consume outputs/reset arenas before finishing.','Declared input snapshots remain timed. Experts inline scalar helpers, hoist legal captures and fixed-modulus multipliers, fuse nested zip/filter-map, preserve exact reverse fold order. Independent two-list zip truncates to shorter length. Literal controls retain eager stages and validate only. Expert Rust reuses output destination; generated C allocates vector outputs. Wrapping U32 words and complete variable filtered vector outputs are retained. Startup/input generation/module loading excluded; one shared-library boundary each, no cross-library LTO.','Apple Clang14 and RustLLVM22 are different optimizer versions; one AppleM2/shared machine and synthetic fixture families do not establish a language ranking.','Confidence intervals reproduce registered paired recipe; shared-machine interference and multiple comparisons remain limitations.'])
    destination = REPORT / 'native-final-review.json'
    destination.write_text(json.dumps(receipt, indent=2) + '\n')
    lines=['# Independent native27 audit','',
           f'Passed: {len(raw["samples"])} samples, {len(cells)} cells, five variants, nine rounds; {intervals} paired intervals independently recomputed.',
           f'Authenticated {validation["exact_comparisons"]} complete pre-timing output comparisons; verified {len(raw["calibration_trials"])} adaptive calibration trial rows, final-row identity, exact phase iterations/order, checksums, all frozen native artifacts and the unchanged guards and pinned C/JS helper-inlining source changes.','',
           'Native backend/proof factorial and strong Rust outcomes (Ink faster / inconclusive / Ink slower):','']
    for mode, cohorts in outcomes.items():
        for cohort, values in cohorts.items():
            for label, value in values.items():
                lines.append(f'- {mode}, {cohort}, {label}: {value["ink_faster"]} / {value["inconclusive"]} / {value["ink_slower"]}; central ratio range {value["ratio_range"]}.')
    lines+=['','Scope limits:']+['- '+x for x in receipt['limitations']]
    (REPORT/'native-final-review.md').write_text('\n'.join(lines)+'\n')
    print(json.dumps({'status': 'passed', 'receipt': str(destination), 'sha256': digest(destination),
                      'samples': len(raw['samples']), 'intervals': intervals}))


if __name__ == '__main__':
    main()
