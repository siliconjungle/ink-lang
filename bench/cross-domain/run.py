#!/usr/bin/env python3
"""Cross-domain owned-call controls; no claim to benchmark complete upstreams."""
import argparse
import hashlib
import json
import os
import pathlib
import re
import statistics
import subprocess
import sys
import time

ROOT = pathlib.Path(__file__).resolve().parents[2]
HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'bench'))
import methodology


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run(argv, **kw):
    result = subprocess.run(list(map(str, argv)), **kw)
    if result.returncode:
        error = result.stderr or b''
        print(error.decode(errors='replace') if isinstance(error, bytes) else error, file=sys.stderr)
        result.check_returncode()
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=pathlib.Path, default=ROOT / 'target/release/ink')
    parser.add_argument('--name', default='baseline')
    parser.add_argument('--plan', type=pathlib.Path)
    parser.add_argument('--upstreams', type=pathlib.Path, help='pinned checkouts; enables actual pathfinding crate')
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--build-only', action='store_true')
    mode.add_argument('--measure-only', action='store_true')
    args = parser.parse_args()
    project = ROOT / 'build/cross-domain' / args.name
    lib = project / 'src/lib.rs'
    binary = project / 'target/release/compiled-state'
    metadata_path = project / 'measurement-build.json'
    inputs = [HERE / 'main.ink', HERE / 'driver.rs', ROOT / 'knowledge/libraries/workload_kernels.ink']
    source_hashes = {str(path.relative_to(ROOT)): digest(path) for path in inputs}
    if args.measure_only:
        report = json.loads(metadata_path.read_text())
        if report['source_hashes'] != source_hashes or report['generated_sha256'] != digest(lib) or report['binary_sha256'] != digest(binary):
            raise ValueError('benchmark source or executable changed since build')
    else:
        start = time.perf_counter_ns()
        cmd = ([args.compiler, 'emit-plan', HERE / 'main.ink', args.plan, '--target', 'rust-wasm', '-o', project]
               if args.plan else [args.compiler, 'build', HERE / 'main.ink', '--target', 'rust', '-o', project])
        run(cmd, cwd=ROOT, capture_output=True)
        source = lib.read_text()
        aliases = ''
        for alias, fn in {'Particle':'ecs', 'Transform':'game', 'Row':'database', 'Bounds':'rendering', 'Body':'physics'}.items():
            name = re.search(r'pub fn function_l_' + fn + r'\(&self,\w+:Vec<([^>]+)>', source)[1]
            aliases += f'type {alias}={name};\n'
        for alias, fn in [('Point','game'), ('Token','compiler')]:
            name = re.search(r'pub fn function_l_' + fn + r'\([^\n]+?\)->Vec<([^>]+)>', source)[1]
            aliases += f'type {alias}={name};\n'
        (project / 'src/main.rs').write_text('use compiled_state::*;\n' + aliases + (HERE / 'driver.rs').read_text())
        manifest = project / 'Cargo.toml'
        manifest.write_text(manifest.read_text().replace('["rlib","cdylib","staticlib"]', '["rlib"]') + '\n[profile.release]\nlto=false\n')
        flags, upstreams = '-C target-cpu=native', {}
        if args.upstreams:
            upstream = (args.upstreams / 'pathfinding').resolve()
            manifest.write_text(manifest.read_text().replace('[dependencies]', '[dependencies]\npathfinding={path=' + json.dumps(str(upstream)) + '}'))
            flags += ' --cfg upstream_pathfinding'
            upstreams['pathfinding'] = dict(repository='https://github.com/evenfurther/pathfinding', revision=subprocess.check_output(['git','-C',str(upstream),'rev-parse','HEAD'],text=True).strip())
        run(['cargo','build','--release','--manifest-path',manifest], env={**os.environ, 'RUSTFLAGS':flags}, capture_output=True)
        report = dict(schema=2, method=__doc__, variant=args.name, environment=methodology.environment(),
                      upstreams=upstreams, flags=flags, dependency_lock=(project / 'Cargo.lock').read_text(),
                      build_ns=time.perf_counter_ns()-start, compiler_sha256=digest(args.compiler),
                      generated_sha256=digest(lib), binary_sha256=digest(binary), source_hashes=source_hashes,
                      plan_sha256=digest(args.plan) if args.plan else None)
        metadata_path.write_text(json.dumps(report, indent=2)+'\n')
    if args.build_only:
        print('Built', project)
        return
    raw = subprocess.check_output([binary], text=True)
    rows = [json.loads(line) for line in raw.splitlines()]
    for row in rows:
        row['ink_median_ns'] = statistics.median(row['ink_ns'])
        row['rust_control_median_ns'] = statistics.median(row['rust_control_ns'])
        row['ink_over_rust'] = dict(zip(['ratio','ci_low','ci_high'], methodology.ratio_ci(row['ink_ns'],row['rust_control_ns'])))
        print(row['domain'], row['n'], round(row['ink_over_rust']['ratio'], 2), flush=True)
    report.update(measured_unix=time.time(), results=rows)
    out = ROOT / 'build/cross-domain' / (args.name+'.json')
    out.write_text(json.dumps(report, indent=2)+'\n')
    print('Saved', out)


if __name__ == '__main__':
    main()
