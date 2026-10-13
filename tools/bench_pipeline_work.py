#!/usr/bin/env python3
"""Paired fresh-process engine benchmarks; timings never authorise a rewrite.

Use source archives for --baseline and --candidate, each containing planner/,
knowledge/ and an optional ink executable. Stores are private generated fixtures.
Search uses an independent structural oracle, not a substitute proof checker;
the checker case exercises real plan-session admission separately.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import random
import resource
import sqlite3
import statistics
import subprocess
import sys
import tempfile
import time


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def term(name, *args):
    return {'sort': {'Value': 'U32'}, 'node': {'Op': [name, list(args)]}}


def variable(name):
    return {'sort': {'Value': 'U32'}, 'node': {'Free': name}}


def search_case(size):
    from ink_planner.semantic_search import search
    x = variable('x')
    source = term('call:example', x)
    law = dict(params={'x': x['sort']}, conditions=[], **{'from': source, 'to': x})
    objects = {'best': law}
    for i in range(size):
        objects[f'other{i}'] = dict(law, to=term(f'other:{i}', x))
    subject = {'functions': {f'f{i:02}': source for i in range(1 if size == 1 else 15)}}
    # Only the identity replacement is admitted by this synthetic oracle.
    attempted = []
    def check(applications):
        attempted.append(digest(applications))
        return all(step['law'] == 'best' for step in applications)
    apps, receipt = search(subject, {'roots': list(objects), 'objects': objects}, check,
                           budget=64, width=1, rounds=32, strategy='beam', time_seconds=600)
    assert len(apps) == len(subject['functions'])
    return [apps, attempted, receipt['selected_cost'], receipt['generated_proposals']]


def matching_case(misses):
    from ink_planner.semantic_search import children, key, match, positions, substitute
    from ink_planner.term_matching import Matcher
    x = variable('x')
    law = dict(params={'x': x['sort']}, conditions=[], **{'from': term('id', x), 'to': x})
    target = variable('input')
    for _ in range(80):
        target = term('unrelated' if misses else 'id', target)
    matcher = Matcher({'id': law}, ['id'], key, children, match, substitute, 16_000_000)
    result = []
    for _ in range(20):
        for _, subtree in positions(target):
            result.append(matcher.matches(subtree))
    assert sum(bool(x) for x in result) == (0 if misses else 1600)
    return digest(result)


def discovery_case(root, count, mode='rare'):
    from ink_knowledge import Store
    store = Store(root / str(count))
    if mode == 'eager':
        from ink_knowledge.discovery_accelerator import enable
        enable(store)
    result = []
    for i in range(64):
        result.append(store.query(operation='call:common' if mode == 'common' else f'call:op{i % 16}', limit=1024))
    expected = json.loads((root / f'{count}.json').read_text())
    assert result == [expected['call:common' if mode == 'common' else f'call:op{i % 16}'][:1024] for i in range(64)]
    return result


def checker_case(compiler, root):
    from ink_knowledge.implementation_candidates import identity_selection
    source = root / 'source.ink'
    source.write_text('module pipeline;fn value(x:u32)->u32{return x;}')
    core = root / 'core.json'
    source_id = json.loads(subprocess.check_output([compiler, 'emit-core', source, '-o', core]))['core_sha256']
    base = dict(schema=1, semantics='ink-compiled-plan-v1', input_core_sha256=source_id)
    step = dict(kind='rewrite', package=identity_selection(source_id))
    packets = [dict(base, steps=[step] * n) for n in range(1, 25)]
    # Repeated, growing and sibling chains exercise bounded prefix lookup.
    requests = packets + [packets[i % len(packets)] for i in range(96)]
    bad = dict(packets[-1], input_core_sha256='0' * 64)
    requests.insert(30, bad)
    process = subprocess.Popen([compiler, 'plan-session', core, '--target', 'javascript'],
                               stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    states = []
    try:
        assert json.loads(process.stdout.readline())['ready']
        for packet in requests:
            process.stdin.write(json.dumps(packet) + '\n'); process.stdin.flush()
            reply = json.loads(process.stdout.readline())
            if packet is bad:
                assert 'error' in reply
                states.append('rejected')
            else:
                assert reply['status'] == 'checked', reply
                states.append(reply['state'])
        process.stdin.close()
        assert process.wait(timeout=30) == 0, process.stderr.read()
    finally:
        if process.poll() is None: process.kill(); process.wait()
        process.stdout.close(); process.stderr.close()
    return states


def worker(args):
    root = args.root.resolve()
    sys.path[:0] = [str(root / 'knowledge'), str(root / 'planner')]
    start = time.perf_counter()
    if args.case.startswith('search-'):
        result = search_case(1 if args.case == 'search-small' else 300)
    elif args.case.startswith('matching-'):
        result = matching_case(args.case == 'matching-misses')
    elif args.case.startswith('discovery-'):
        parts = args.case.split('-')
        result = discovery_case(args.fixtures, int(parts[-1]), parts[1] if len(parts) == 3 else 'rare')
    else:
        with tempfile.TemporaryDirectory() as tmp:
            compiler = root / 'ink'
            if not compiler.exists(): compiler = root / 'target/release/ink'
            result = checker_case(str(compiler), Path(tmp))
    elapsed = time.perf_counter() - start
    rss = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    child_rss = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
    print(json.dumps(dict(seconds=elapsed, digest=digest(result), peak_rss_bytes=rss if sys.platform == 'darwin' else rss * 1024,
                          child_peak_rss_bytes=child_rss if sys.platform == 'darwin' else child_rss * 1024)))


def fixtures(root, candidate):
    sys.path[:0] = [str(candidate / 'knowledge'), str(candidate / 'planner')]
    from ink_knowledge import Store, entry, identity
    for count in [256, 4096]:
        objects = [entry('definition', 'pipeline-bench-v1', term('call:common', term(f'call:op{i}', variable('x'))), result='U32') for i in range(count)]
        store = Store.publish(root / str(count), objects)
        store.rebuild()
        expected = {f'call:op{i}': [identity(objects[i])] for i in range(16)}
        expected['call:common'] = sorted(map(identity, objects))
        (root / f'{count}.json').write_text(json.dumps(expected))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline', type=Path)
    parser.add_argument('--candidate', type=Path)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--rounds', type=int, default=7)
    cases = ['search-small', 'search-wide', 'matching-misses', 'matching-hits',
             'discovery-256', 'discovery-4096', 'discovery-common-256',
             'discovery-common-4096', 'discovery-eager-4096', 'checker']
    parser.add_argument('--cases', nargs='+', choices=cases, default=cases[:-1])
    parser.add_argument('--root', type=Path)
    parser.add_argument('--fixtures', type=Path)
    parser.add_argument('--case')
    args = parser.parse_args()
    if args.case: return worker(args)
    assert args.baseline and args.candidate and args.output and args.rounds > 0
    rows = []
    with tempfile.TemporaryDirectory(prefix='ink-pipeline-bench-') as tmp:
        root = Path(tmp)
        fixtures(root, args.candidate.resolve())
        for case in args.cases:
            for repeat in range(args.rounds):
                for label in (['baseline', 'candidate'] if repeat % 2 == 0 else ['candidate', 'baseline']):
                    command = [sys.executable, __file__, '--case', case, '--root', str(getattr(args, label).resolve()), '--fixtures', str(root)]
                    env = dict(os.environ, PYTHONHASHSEED='0')
                    row = json.loads(subprocess.check_output(command, env=env, text=True, timeout=600))
                    rows.append(dict(case=case, repeat=repeat, variant=label, **row))
            selected = [r for r in rows if r['case'] == case]
            assert len({r['digest'] for r in selected}) == 1, f'{case}: output changed'
            print(case, 'outputs match', flush=True)
    summary = {}
    for case in args.cases:
        a = [r['seconds'] for r in rows if r['case'] == case and r['variant'] == 'baseline']
        b = [r['seconds'] for r in rows if r['case'] == case and r['variant'] == 'candidate']
        ratios = [y/x for x,y in zip(a,b)]
        rng = random.Random(731)
        samples = sorted(statistics.median(rng.choices(ratios, k=len(ratios))) for _ in range(5000))
        summary[case] = dict(baseline_median_seconds=statistics.median(a), candidate_median_seconds=statistics.median(b),
                             paired_median_ratio=statistics.median(ratios), paired_bootstrap_95=[samples[125], samples[4874]])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fingerprints = {}
    for label in ['baseline', 'candidate']:
        source = getattr(args, label).resolve()
        fingerprints[label] = {name: hashlib.sha256((source / name).read_bytes()).hexdigest() for name in
                               ['planner/ink_planner/semantic_search.py', 'planner/ink_planner/term_matching.py',
                                'knowledge/ink_knowledge/store.py', 'knowledge/ink_knowledge/cost_models.py']}
    args.output.write_text(json.dumps(dict(schema=1, python=sys.version, platform=platform.platform(),
        machine=platform.machine(), sqlite=sqlite3.sqlite_version, source_fingerprints=fingerprints, rounds=args.rounds,
        scope='Engine mechanisms, not compiled application speed. Fresh processes, alternating order, exact output digests.',
        summary=summary, rows=rows), indent=2)+'\n')
    print(json.dumps(summary, indent=2))


if __name__ == '__main__': main()
