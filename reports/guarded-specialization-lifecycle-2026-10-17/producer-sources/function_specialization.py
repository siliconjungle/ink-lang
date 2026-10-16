#!/usr/bin/env python3
"""Propose checked partial evaluation inside authored pure-function boundaries.

Closed call arguments may specialize a computation while other arguments remain
live. Generated chunks are conservative source extensions. Universal function
equalities authorize the replacement; the proposal never freezes mutable state
or establishes profitable automatic selection.
"""
import argparse
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity
from ink_knowledge.store import entry
from producers.frozen_composition import ChunkPartial
from producers.function_equality import produce
from producers.checked_core_image import write_checked_image


class FunctionPartial(ChunkPartial):
    def should_inline(self, name, args, original):
        if not args and self.value(self.functions[name]['body']):
            return True
        if name in self.helper_names:
            return super().should_inline(name, args, original)
        return any(self.value(a) for a in args)


def propose_source(source, names, *, owned_chunk_width=4):
    selected = copy.deepcopy(source)
    partial = FunctionPartial(selected['program'], owned_chunk_width=owned_chunk_width)
    functions = {f['name']: f for f in selected['program']['functions']}
    if not names or len(names) > 128 or any(name not in functions for name in names):
        raise ValueError('function specialization requires 1..128 existing function names')
    for name in sorted(set(names)):
        function = functions[name]
        partial.types = dict(function['params'])
        function['body'] = partial.expr(function['body'], {}, (name,), 0)
    selected['program']['functions'].extend(partial.helpers)
    changed = sorted(name for name in names if functions[name]['body'] !=
                     next(f['body'] for f in source['program']['functions'] if f['name'] == name))
    return selected, partial.helpers, changed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--functions', required=True)
    parser.add_argument('--ink', required=True, type=Path)
    parser.add_argument('-o', '--output', required=True, type=Path)
    parser.add_argument('--owned-chunk-width', type=int, choices=[1, 2, 4, 8], default=4)
    args = parser.parse_args()
    if args.source.stat().st_size > 16_000_000:
        raise ValueError('function specialization source byte limit')
    source = json.loads(args.source.read_bytes())
    selected, helpers, changed = propose_source(source, args.functions.split(','),
                                                owned_chunk_width=args.owned_chunk_width)
    if not changed:
        raise ValueError('no closed call argument specialization opportunity')
    with tempfile.TemporaryDirectory(prefix='ink-function-specialization-') as temporary:
        folder = Path(temporary)
        def run(*command):
            result = subprocess.run([str(args.ink.resolve()), *map(str, command)],
                                    capture_output=True, timeout=180)
            result.check_returncode()
            return result.stdout
        original = json.loads(run('check-core', args.source))['core_sha256']
        plan = dict(schema=1, semantics='ink-compiled-plan-v1', input_core_sha256=original, steps=[])
        extended = args.source
        packet = folder/'plan.json'
        if helpers:
            obj = entry('definition', 'ink-source-extension-v1', dict(functions=helpers))
            key = identity(obj); store = Store.publish(folder/'extensions', [obj])
            request = dict(schema=1, semantics='ink-source-extension-v1', input_core_sha256=original,
                           extension=key, knowledge=store.bundle([key]))
            plan['steps'].append(dict(kind='extension', package=request))
            packet.write_bytes(canonical(plan))
            state = folder/'state.json'
            run('check-plan', args.source, packet, '--core', '--state-out', state)
            extended = folder/'extended.json'
            extended.write_bytes(canonical(json.loads(state.read_bytes())['core']))
        candidate = folder/'selected.json'
        selected = write_checked_image(selected, candidate, args.ink)
        def model(path, name):
            output = folder/(name+'.json')
            run('emit-function-model', path, '--core', '--functions', ','.join(changed), '-o', output)
            return json.loads(output.read_bytes())
        replacement = produce(model(extended, 'before'), model(candidate, 'after'), selected,
                              folder/'equalities', owned_chunk_width=args.owned_chunk_width)
        plan['steps'].append(dict(kind='functions', package=replacement))
        packet.write_bytes(canonical(plan))
        run('check-plan', args.source, packet, '--core')
        args.output.parent.mkdir(parents=True, exist_ok=True)
        pending = None
        try:
            with tempfile.NamedTemporaryFile(prefix='.ink-specialization-', dir=args.output.parent,
                                             delete=False) as output:
                pending = Path(output.name)
                output.write(packet.read_bytes()); output.flush(); os.fsync(output.fileno())
            os.replace(pending, args.output); pending = None
        finally:
            if pending is not None:
                pending.unlink(missing_ok=True)
    print(json.dumps(dict(status='checked-proposal', functions=changed, helpers=len(helpers),
                          profitability='unmeasured; explicit selection only')))


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(error.stderr.decode(errors='replace').strip() or 'compiler rejected function specialization')
