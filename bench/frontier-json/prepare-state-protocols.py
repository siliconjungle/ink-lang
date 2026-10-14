#!/usr/bin/env python3
"""Freeze database-proposed source-state protocol controls for paired measurement.

This is diagnostic preparation, not implementation selection. Every candidate
replays the ordinary plan checker; existing run.mjs supplies complete histories.
"""
import argparse
import hashlib
import importlib
import inspect
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / 'knowledge'), str(ROOT / 'planner')]
from ink_knowledge import canonical, identity
from ink_knowledge.recipes import execute, load


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--recipe', action='append', help='Installed recipe IDs; defaults to protocol recipes')
    parser.add_argument('--groupings', choices=['all', 'default'], default='default')
    parser.add_argument('--depth', type=int, default=2)
    parser.add_argument('--limit', type=int, default=32)
    parser.add_argument('--base-plan', type=Path, help='Checked starting plan; explore protocol choices over its other optimisation layers')
    args = parser.parse_args()
    if not 1 <= args.depth <= 8 or not 1 <= args.limit <= 128:
        raise ValueError('bounded preparation depth and candidate limit required')
    compiler = args.compiler.resolve()
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)
    source = ROOT / 'bench/frontier-json/state.ink'
    commands = []

    def invoke(*arguments):
        command = [str(compiler), *map(str, arguments)]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode:
            raise ValueError(result.stderr)
        commands.append(dict(arguments=command[1:], receipt=result.stdout))
        return json.loads(result.stdout) if result.stdout.strip() else None

    checked = invoke('emit-core', source, '-o', output / 'source.core.json')
    baseline = dict(schema=1, semantics='ink-compiled-plan-v1',
                    input_core_sha256=checked['core_sha256'], steps=[])
    if args.base_plan:
        baseline = json.loads(args.base_plan.read_bytes())
        if baseline.get('input_core_sha256') != checked['core_sha256']:
            raise ValueError('starting plan source mismatch')
        # Validate all existing layers before acquiring any derived alternative.
        invoke('check-plan', source, args.base_plan.resolve())
    base_steps = len(baseline['steps'])
    registry, registry_hash = load()
    requested = set(args.recipe or [])
    recipes = [dict(r) for r in registry['recipes'] if r['id'] in requested or not requested and r['stage'] == 'protocol']
    if requested - {r['id'] for r in recipes}:
        raise ValueError('unknown installed recipe IDs')
    if args.groupings == 'all':
        for recipe in recipes:
            producer = getattr(importlib.import_module(recipe['module']), recipe['function'])
            if 'groupings' in inspect.signature(producer).parameters:
                recipe['parameters'] = dict(recipe['parameters'], groupings=['all'])
    if not recipes:
        raise ValueError('installed database has no protocol recipes')
    queue = [baseline]
    seen = set()
    controls = []
    # Two independent choices (preflight and snapshot caching) must compose.
    # Bounds constrain preparation, never license a candidate or select a winner.
    while queue:
        packet = queue.pop(0)
        index = len(controls)
        plan = output / f'control-{index}.json'
        plan.write_bytes(canonical(packet) + b'\n')
        receipt = invoke('check-plan', source, plan)
        signature = identity({key: receipt['state'].get(key) for key in ['core', 'representation', 'physical', 'protocol', 'maintained']})
        if signature in seen:
            continue
        seen.add(signature)
        if len(controls) >= args.limit:
            raise ValueError('control preparation exceeded admitted alternative limit')
        (output / f'control-{index}.receipt.json').write_bytes(canonical(receipt) + b'\n')
        module = output / f'control-{index}.mjs'
        invoke('compile', source, '--plan', plan, '--target', 'javascript', '-o', module)
        controls.append(dict(index=index, plan=plan.name, module=module.name,
                             protocol=receipt['state'].get('protocol'), physical=receipt['state'].get('physical')))
        context = dict(receipt['state'], compiler=str(compiler), emit_target='javascript')
        if len(packet['steps']) - base_steps < args.depth:
            for recipe in recipes:
                for proposal in execute(recipe, context):
                    if proposal['status'] == 'proposal':
                        queue.append(dict(baseline, steps=[*packet['steps'], proposal['step']]))
    manifest = dict(schema=1, compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),
                    source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                    registry_sha256=registry_hash, recipes=recipes, depth=args.depth, limit=args.limit,
                    base_plan_sha256=hashlib.sha256(args.base_plan.read_bytes()).hexdigest() if args.base_plan else None,
                    controls=controls, commands=commands,
                    files={p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                           for p in output.iterdir() if p.is_file()},
                    scope='Database-proposed source-state protocol controls. No automatic profitability selection or performance claim. Measure complete paired histories with run.mjs.')
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(dict(controls=len(controls), output=str(output))))


if __name__ == '__main__':
    main()
