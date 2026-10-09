#!/usr/bin/env python3
"""Validate source/core compilation and pinned replacement against a u64 oracle.

No timings: this checks admission and code generation, not a speed claim.
Reports require a fresh directory so historical evidence cannot be overwritten.
"""
import argparse
import ctypes
import hashlib
import json
import platform
import random
import shutil
import subprocess
from pathlib import Path

MASK = (1 << 64) - 1
CASES = ['mapped_filter_sum', 'filter_map_sum', 'mapped_filter_count', 'constant_filter_sum']


def reference(case, xs, a, b, limit):
    ys = [(x * a + b) & MASK for x in xs]
    if case == 'mapped_filter_sum':
        return sum(y for y in ys if y < limit) & MASK
    if case == 'filter_map_sum':
        return sum(y for x, y in zip(xs, ys) if x < limit) & MASK
    if case == 'mapped_filter_count':
        return sum(y < limit for y in ys)
    return (b * len(xs) & MASK) if b < limit else 0


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--knowledge', type=Path, required=True)
    parser.add_argument('--report-dir', type=Path, required=True)
    args = parser.parse_args()
    compiler, knowledge, out = [p.resolve() for p in (args.compiler, args.knowledge, args.report_dir)]
    out.mkdir(parents=True, exist_ok=True)
    if any(out.iterdir()):
        parser.error('report directory must be empty')
    commands = []

    def run(argv):
        argv = list(map(str, argv))
        result = subprocess.run(argv, capture_output=True, text=True)
        commands.append(dict(argv=argv, exit_code=result.returncode, stdout=result.stdout, stderr=result.stderr))
        result.check_returncode()
        return result.stdout

    compiler_hash = sha(compiler)
    shutil.copy2(knowledge / 'filtered/kernels.lang', out / 'source.lang')
    run(['python3', knowledge / 'tools/replacement_package.py', out / 'source.lang',
         knowledge / 'filtered/proposal.json', '--compiler', compiler, '--output-dir', out / 'package'])
    libs = {}
    for kind in ('source_base', 'core_base', 'source_checked', 'core_checked'):
        core = kind.startswith('core')
        source = out / 'package/core.json' if core else out / 'source.lang'
        flags = ['--core'] if core else []
        if kind.endswith('checked'):
            flags += ['--replacement', out / 'package/replacement.json']
        run([compiler, 'emit-c', source, *flags, '-o', out / f'{kind}.c'])
        run(['clang', '-O3', '-std=c11', '-Wall', '-Wextra', '-dynamiclib',
             out / f'{kind}.c', '-o', out / f'{kind}.dylib'])
        libs[kind] = ctypes.CDLL(str(out / f'{kind}.dylib'))
    for suffix in ('base', 'checked'):
        assert (out / f'source_{suffix}.c').read_bytes() == (out / f'core_{suffix}.c').read_bytes()
    rng = random.Random(918244)
    vectors = [[], [0], [MASK], [0, 1, MASK, 1 << 63, (1 << 63) - 1]]
    vectors += [[rng.getrandbits(64) for _ in range(rng.randrange(150))] for _ in range(128)]
    vectors += [[rng.randrange(1024) for _ in range(rng.randrange(150))] for _ in range(128)]
    count = 0
    for i, xs in enumerate(vectors):
        a, b = (3, 11) if i % 3 == 0 else (rng.getrandbits(64), rng.getrandbits(64))
        buf = (ctypes.c_uint64 * max(1, len(xs)))(*xs)
        for case in CASES:
            limit = [0, MASK, 512, 1 << 63][i % 4] if i % 5 else rng.getrandbits(64)
            expected = reference(case, xs, a, b, limit)
            for kind, lib in libs.items():
                fn = getattr(lib, 'lang_fn_' + case)
                fn.argtypes = [ctypes.POINTER(ctypes.c_uint64), ctypes.c_size_t,
                               ctypes.c_uint64, ctypes.c_uint64, ctypes.c_uint64]
                fn.restype = ctypes.c_uint64
                actual = fn(buf, len(xs), a, b, limit)
                assert actual == expected, (kind, case, i, actual, expected)
                count += 1
    assert sha(compiler) == compiler_hash, 'compiler changed during validation'
    # Do not preserve machine-specific binaries as portable evidence.
    for kind in libs:
        (out / f'{kind}.dylib').unlink()
    for path in out.rglob('*.plan.json'):
        plan = json.loads(path.read_text())
        if plan.get('checked_replacement'):
            assert plan['input_core_sha256'] == plan['checked_replacement']['input_core_sha256']
            assert plan['selected_core_sha256'] == plan['checked_replacement']['selected_core_sha256']
    result = dict(status='passed', fixtures=len(vectors), native_comparisons=count,
        seed=918244, compiler_sha256=compiler_hash, platform=platform.platform(),
        clang=run(['clang', '--version']), commands=commands,
        scope='source and core inputs, with and without pinned pure replacements; full-width modular u64; no performance or stateful-replacement claim')
    result['artifact_hashes'] = {str(p.relative_to(out)): sha(p) for p in out.rglob('*') if p.is_file()}
    (out / 'validation.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: result[k] for k in ('status', 'fixtures', 'native_comparisons', 'compiler_sha256', 'scope')}))


if __name__ == '__main__':
    main()
