#!/usr/bin/env python3
"""Replay ordinary definition laws for helper calls inside callbacks.

This creates an explicit experiment, not a default profitability decision. No
function name, source hash, or benchmark result grants equality authority.
"""
import argparse
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / 'knowledge'), str(ROOT / 'planner')]
from ink_knowledge import Store, identity, semantic_entry
from producers.inline_laws import specialize
from ink_planner.semantic_search import positions, children, match


def write(path, value):
    path.write_text(json.dumps(value, indent=2) + '\n')


def prepare(compiler, source, output, rounds=3, scalar_calls=False):
    compiler, source, output = map(lambda p: pathlib.Path(p).resolve(), (compiler, source, output))
    output.mkdir(parents=True, exist_ok=True)
    def run(*args):
        result = subprocess.run([str(compiler), *map(str, args)], capture_output=True, text=True)
        if result.returncode:
            raise RuntimeError(result.stderr)
        return result.stdout
    original = output / 'core-0.json'
    run('emit-core', source, '-o', original)
    current = original
    steps, receipts, rejections = [], [], []
    original_id = None
    for iteration in range(rounds):
        subject_path = output / f'subject-{iteration}.json'
        run('emit-semantic', current, '--core', '-o', subject_path)
        core, subject = json.loads(current.read_text()), json.loads(subject_path.read_text())
        sid = subject['input_core_sha256']
        if original_id is None:
            original_id = sid
        functions = {f['name']: f for f in core['program']['functions']}
        laws = dict(specialize(subject, core))
        store = Store.publish(output / f'knowledge-{iteration}', [semantic_entry(law) for law in laws.values()])
        applications, ids = [], []
        for name, body in subject['functions'].items():
            for path, target in positions(body):
                parent = body
                in_callback = False
                for child in path:
                    in_callback |= 'Lambda' in parent['node']
                    parent = children(parent)[child]
                if not in_callback:
                    continue
                op = target['node'].get('Op', [''])[0]
                if not op.startswith('call:'):
                    continue
                callee = functions.get(op[5:])
                if not callee or (not scalar_calls and not any(isinstance(t, dict) and 'List' in t for _, t in callee['params'])):
                    continue
                law = laws.get('unfold_' + callee['name'])
                bindings = {}
                if law is None or not match(law['from'], target, law['params'], bindings):
                    continue
                ident = identity(semantic_entry(law))
                ids.append(ident)
                applications.append(dict(function=name, path=list(path), law=ident, arguments=bindings, premises=[]))
        if not applications:
            break
        # Deeper disjoint sites first; overlapping proposals must still replay.
        applications.sort(key=lambda app: (-len(app['path']), app['function'], app['path']))
        package = dict(schema=1, semantics='ink-evidence-v1', input_core_sha256=sid,
                       knowledge=store.bundle(ids), applications=applications)
        package_path = output / f'selection-{iteration}.json'
        write(package_path, package)
        try:
            receipt = json.loads(run('check-selection', current, package_path))
        except RuntimeError:
            # A valid law can still produce an inadmissibly deep combined core.
            # Replay cumulative subsets against the same source; never bypass
            # the checker or silently turn an observation into rewrite authority.
            admitted = []
            receipt = None
            for application in applications:
                trial = dict(package, applications=admitted + [application])
                trial['knowledge'] = store.bundle([a['law'] for a in trial['applications']])
                write(package_path, trial)
                try:
                    candidate_receipt = json.loads(run('check-selection', current, package_path))
                except RuntimeError as error:
                    rejections.append(dict(iteration=iteration, application=application, reason=str(error)))
                else:
                    admitted.append(application)
                    receipt = candidate_receipt
            if not admitted:
                break
            package = dict(package, applications=admitted,
                           knowledge=store.bundle([a['law'] for a in admitted]))
            write(package_path, package)
        receipts.append(receipt)
        steps.append(dict(kind='rewrite', package=package))
        selected = output / f'core-{iteration + 1}.json'
        run('emit-core', current, '--core', '--selection', package_path, '-o', selected)
        current = selected
    final_id = receipts[-1]['selected_core_sha256'] if receipts else original_id
    physical = dict(schema=1, semantics='ink-physical-plan-v1', input_core_sha256=final_id, buffers='direct')
    write(output / 'rewrite-plan.json', dict(schema=1, semantics='ink-compiled-plan-v1', input_core_sha256=original_id, steps=steps))
    write(output / 'plan.json', dict(schema=1, semantics='ink-compiled-plan-v1', input_core_sha256=original_id,
                                    steps=steps + [dict(kind='physical', package=physical)]))
    write(output / 'receipts.json', receipts)
    write(output / 'rejections.json', rejections)
    print(f'{sum(len(r["applied_laws"]) for r in receipts)} checked applications in {len(receipts)} rounds: {output / "plan.json"}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=pathlib.Path, default=ROOT / 'target/debug/ink')
    parser.add_argument('--source', type=pathlib.Path, default=ROOT / 'bench/cross-domain/main.ink')
    parser.add_argument('--output', type=pathlib.Path, default=ROOT / 'build/cross-domain/prepared')
    parser.add_argument('--scalar-calls', action='store_true', help='also expand scalar and record helpers in callbacks')
    args = parser.parse_args()
    prepare(args.compiler, args.source, args.output, scalar_calls=args.scalar_calls)
