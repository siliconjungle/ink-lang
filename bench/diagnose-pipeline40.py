"""Exact-source fusion controls and compiler evidence; never performance times."""
from pathlib import Path
import argparse, hashlib, json, re, shutil, subprocess

B = Path(__file__).resolve().parents[1]
P = B / 'reports/web-stack-proofs-38-2026-10-11/targets'
R = B / 'reports/web-stack-engine-40-2026-10-11/fusion'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
rd = lambda p: json.loads(p.read_text())

def write(p, data):
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open('x') as f:
        f.write(data)

def no_padding(primary):
    pat = re.compile(r'const (v\d+)=new Array\((v\d+)\+(v\d+)\);\nfor\(let (v\d+)=0;\4<\2;\4\+\+\)\{\1\[\4\]=(v\d+)\[\4\];\}\nfor\(let (v\d+)=0;\6<\3;\6\+\+\)\{\1\[\2\+\6\]=(v\d+)\[\6\];\}')
    out, count = pat.subn(lambda m: f'const {m[1]}={m[5]}; // diagnostic demand-erased suffix', primary)
    assert count == 1
    return out

def two_pass(primary):
    # Exact emitted single-loop shape. Assertions fail closed on changed lowering.
    head = re.match(r'(function __fn0\(v0,v1,v2,v3\)\{\nconst v4=v0;\nconst v5=v4.length;\nconst v6=new Array\(v5\);\n)(for\(let v7=0;v7<v5;v7\+\+\)\{\n)(const v8=v4\[v7\];\nconst v9=\(v7>>>0\);\n)', primary)
    assert head
    right = re.search(r'(const v\d+=v9;\nconst v\d+=v8;\nconst v\d+=v2;\nconst v\d+=v3;\n/\* inline right_word \*/)', primary)
    pair = re.search(r'/\* inline pair_word \*/\nconst v\d+=(v\d+);', primary)
    tail = re.search(r'(v6\[v7\]=v\d+;\n)\}\nreturn v6;\}\n$', primary)
    assert right and pair and tail
    left_result = pair[1]
    left = primary[head.end():right.start()]
    second = primary[right.start():tail.start()]
    return (head[1] + head[2] + head[3] + left + f'v6[v7]={left_result};\n}}\n'
            + head[2] + head[3] + f'const {left_result}=v6[v7];\n' + second
            + tail[1] + '}\nreturn v6;}\n')

def blocked(primary):
    loop = 'for(let v7=0;v7<v5;v7++){'
    assert primary.count(loop) == 1 and primary.endswith('}\nreturn v6;}\n')
    out = primary.replace(loop, 'for(let __diagnosticStart=0;__diagnosticStart<v5;__diagnosticStart+=64){\nconst __diagnosticEnd=Math.min(v5,__diagnosticStart+64);\nfor(let v7=__diagnosticStart;v7<__diagnosticEnd;v7++){')
    return out[:-len('return v6;}\n')] + '}\nreturn v6;}\n'

def prepare():
    meta = rd(P / 'metadata.json')
    for p, h in meta['bindings'].items():
        assert sha(P / p) == h, f'archive drift: {p}'
    fixtures = rd(P / 'fixtures.json')
    tasks = sorted({f['task'] for f in fixtures['frames']})
    rows = []
    for task in tasks:
        for version in ['prior', 'checked']:
            original = P / 'targets' / task / version / 'program.mjs'
            src = original.read_text()
            primary, rest = src.split('function __fn1', 1)
            changes = {'original': primary, 'clone': primary}
            if version == 'prior':
                staged = no_padding(primary)
                changes.update(no_padding=staged, no_padding_typed=staged.replace('new Array(', 'new Uint32Array('))
            else:
                assert primary.count('+0') == (4 if 'heldout' in task else 1)
                # Same total U32 values; exposes a different JIT integer representation.
                canonical, n = re.subn(r'=\((Math\.trunc\([^\n]+?\)|\([^\n]+?%[^\n]+?\))\+0\);', r'=(\1>>>0);', primary)
                assert n == primary.count('+0')
                staged = two_pass(primary)
                changes.update(no_pluszero=primary.replace('+0', ''), canonical_u32=canonical,
                               typed=primary.replace('new Array(', 'new Uint32Array('),
                               blocked64=blocked(primary), two_pass=staged,
                               two_pass_typed=staged.replace('new Array(', 'new Uint32Array('))
            for variant, changed in changes.items():
                text = changed + 'function __fn1' + rest
                name = version + '_' + variant
                path = original if variant == 'original' else R / 'modules' / task / name / 'program.mjs'
                if variant != 'original':
                    write(path, text)
                assert text.split('function __fn1', 1)[1] == rest
                if variant == 'clone':
                    assert sha(path) == sha(original)
                rows.append({'task': task, 'variant': name, 'path': str(path.relative_to(B)),
                             'sha256': sha(path), 'original_path': str(original.relative_to(B)),
                             'original_sha256': sha(original), 'rest_of_module_unchanged': True,
                             'esm_strict': True, 'output_kind': 'uint32array' if 'typed' in variant else 'array',
                             'primary_array_sites': changed.count('new Array(') + changed.count('new Uint32Array('),
                             'primary_loops': changed.count('for(')})
    pairs = [
        ('prior_original', 'prior_clone', 'unchanged module URL context'),
        ('checked_original', 'checked_clone', 'unchanged module URL context'),
        ('prior_clone', 'prior_no_padding', 'remove suffix allocation/copies; keep scalar stages'),
        ('prior_no_padding', 'prior_no_padding_typed', 'staged collection representation'),
        ('checked_clone', 'checked_no_pluszero', 'four/one neutral arithmetic operations'),
        ('checked_clone', 'checked_canonical_u32', 'quotient/remainder integer canonicalization'),
        ('checked_clone', 'checked_typed', 'output collection representation'),
        ('checked_clone', 'checked_blocked64', 'loop blocking; identical per-index computation'),
        ('checked_clone', 'checked_two_pass', 'two-pass scheduling; same one output allocation'),
        ('checked_two_pass', 'checked_two_pass_typed', 'two-pass collection representation'),
        ('checked_typed', 'checked_two_pass_typed', 'loop scheduling with typed storage'),
        ('prior_no_padding', 'checked_clone', 'fusion plus removed intermediates; multi-factor context only')]
    manifest = {'status': 'prepared_untimed', 'rows': rows,
                'fixture_path': str((P / 'fixtures.json').relative_to(B)), 'fixtures_sha256': sha(P / 'fixtures.json'),
                'expert_path': str((P / 'expert.mjs').relative_to(B)), 'expert_sha256': sha(P / 'expert.mjs'),
                'metadata_path': str((P / 'metadata.json').relative_to(B)), 'metadata_sha256': sha(P / 'metadata.json'),
                'timed_frames': [f['id'] for f in fixtures['frames'] if len(f['xs']) in [4096, 65536]],
                'primary_comparisons': [{'reference': a, 'current': b, 'factor': c} for a, b, c in pairs],
                'protocol': {'rounds': 9, 'processes': 3, 'calibration_ms': 4, 'maximum_iterations': 65536,
                             'warmups': 64, 'seed': 2026114001, 'randomized_variant_order_each_round': True},
                'boundaries': ['captured-js-owned', 'resident-wasm-destination'],
                'limits': ['Historical two source families/orientations; broad generalization requires independent families.',
                           'Typed arrays differ physically from emitted JS Array; diagnostic only, not admitted parity replacement.',
                           'Two-pass reorders independent pure per-index operations; no callback state/capture effects in this source.',
                           'No production rewrite authority, cost changes, forced selections, profiling or timing in preparation.',
                           'Output constructors and loop count are source facts, not allocator or machine-cost measurements.'],
                'bindings': {'preparer': sha(Path(__file__)), 'javascript_runner': sha(B / 'bench/diagnose-pipeline40.mjs')}}
    write(R / 'manifest.json', json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'status': 'prepared_untimed', 'modules': len(rows), 'timed_frames': len(manifest['timed_frames'])}))

def compiler_evidence():
    manifest = rd(R / 'manifest.json')
    original_commands = rd(P / 'commands.json')
    zigargs = next(row['argv'] for row in original_commands if '--zig' in row['argv'])
    zig = zigargs[zigargs.index('--zig') + 1]
    clang = shutil.which('clang')
    commands, records = [], []
    for task in sorted({row['task'] for row in manifest['rows']}):
        for version in ['prior', 'checked']:
            source = P / 'targets' / task / version / 'cpu.c'
            for target in ['native', 'wasm']:
                prefix = [clang, '-mcpu=native'] if target == 'native' else [zig, 'cc', '-target', 'wasm32-freestanding', '-msimd128', '-ffreestanding', '-nostdlib']
                for mode in ['ordinary', 'no_vectorizers']:
                    suffix = [] if mode == 'ordinary' else ['-fno-vectorize', '-fno-slp-vectorize']
                    stem = R / 'static' / task / f'{version}.{target}.{mode}'
                    assert not stem.with_suffix(stem.suffix + '.ll').exists()
                    output = Path(str(stem) + '.ll')
                    output.parent.mkdir(parents=True, exist_ok=True)
                    argv = prefix + ['-O3', '-std=c11', '-ffp-contract=off', '-Rpass=loop-vectorize', '-Rpass-missed=loop-vectorize', '-Rpass-analysis=loop-vectorize'] + suffix + ['-S', '-emit-llvm', str(source), '-o', str(output)]
                    run = subprocess.run(argv, text=True, capture_output=True)
                    log = Path(str(stem) + '.remarks.txt'); write(log, run.stderr)
                    commands.append({'argv': argv, 'exit_code': run.returncode, 'stdout': run.stdout, 'stderr_path': str(log.relative_to(B))})
                    assert run.returncode == 0, run.stderr
                    record = {'task': task, 'version': version, 'target': target, 'mode': mode, 'source_sha256': sha(source),
                              'ir_path': str(output.relative_to(B)), 'ir_sha256': sha(output), 'remarks_path': str(log.relative_to(B)), 'remarks_sha256': sha(log),
                              'whole_module_vector_i32_types': len(re.findall(r'<[0-9]+ x i32>', output.read_text()))}
                    if target == 'wasm':
                        wasm = Path(str(stem) + '.wasm')
                        exports = ['ink_compute_call', 'ink_compute_into', 'ink_compute_mark', 'ink_compute_rewind', 'ink_compute_scalar32', 'ink_compute_scalar64', 'ink_compute_reset', 'ink_alloc']
                        argv = prefix + ['-O3', '-std=c11', '-Wl,--no-entry', '-Wl,--export=__heap_base', '-Wl,--export-memory'] + suffix + ['-Wl,--export=' + s for s in exports] + [str(source), '-o', str(wasm)]
                        run = subprocess.run(argv, text=True, capture_output=True)
                        commands.append({'argv': argv, 'exit_code': run.returncode, 'stdout': run.stdout, 'stderr': run.stderr})
                        assert run.returncode == 0, run.stderr
                        record.update(wasm_path=str(wasm.relative_to(B)), wasm_sha256=sha(wasm))
                    records.append(record)
    evidence = {'status': 'compiled_untimed', 'records': records, 'commands': commands,
                'tools': {'clang': clang, 'zig': zig, 'zig_sha256': sha(Path(zig))},
                'preparer_sha256': sha(Path(__file__)), 'manifest_sha256': sha(R / 'manifest.json'),
                'scope': 'Static LLVM optimization evidence and untimed executable controls; vectorizer disabling affects the complete module, not solely primary loops. No dynamic performance or causality assertion.'}
    write(R / 'compiler-evidence.json', json.dumps(evidence, indent=2) + '\n')
    print(json.dumps({'status': 'compiled_untimed', 'records': len(records)}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--compile-static', action='store_true')
    args = parser.parse_args()
    if args.compile_static:
        compiler_evidence()
    else:
        prepare()
