#!/usr/bin/env python3
"""Explicitly author a projected, frozen graph; replay the complete plan."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

from ink_knowledge import Store, canonical
from ink_knowledge.recipes import execute, load


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('source', type=Path)
    p.add_argument('--compiler', type=Path, required=True)
    p.add_argument('--function', default='evaluate')
    p.add_argument('--field', default='values')
    p.add_argument('-o', '--output', type=Path, required=True)
    a = p.parse_args()
    compiler = str(a.compiler.resolve())
    if a.source.stat().st_size > 16_000_000:
        raise ValueError('source byte bound')
    core = json.loads(a.source.read_bytes())
    def run(*args):
        result = subprocess.run([compiler, *map(str, args)], capture_output=True, text=True, timeout=180)
        if result.returncode:
            raise ValueError(result.stderr[-3000:])
        return json.loads(result.stdout)
    sid = run('check-core', a.source)['core_sha256']
    with tempfile.TemporaryDirectory(prefix='ink-compose-frozen-') as temporary:
        d = Path(temporary)
        store = Store.publish(d/'knowledge', [])
        recipe = next(r for r in load(store=store)[0]['recipes'] if r['id'] == 'fold-state-projection')
        rows = [r for r in execute(recipe, dict(core=core, source=sid, compiler=compiler,
            knowledge_root=str(store.root), knowledge_snapshot=store.snapshot_id, check_timeout=180))
            if r['status'] == 'proposal' and r['label'] == 'fold-state-projection/'+a.function+'/'+a.field]
        if len(rows) != 1:
            raise ValueError('expected one matching source projection')
        plan = dict(schema=1, semantics='ink-compiled-plan-v1', input_core_sha256=sid, steps=rows[0]['steps'])
        path = d/'plan.json'; path.write_bytes(canonical(plan))
        checked = run('check-plan', a.source, path, '--core')
        projected = d/'projected.json'; projected.write_bytes(canonical(checked['state']['core']))
        import producers.frozen_composition
        subprocess.run([sys.executable, producers.frozen_composition.__file__, str(projected),
            '--ink', compiler, '-o', str(d/'frozen.json')], check=True, timeout=180, stdout=subprocess.DEVNULL)
        plan['steps'] += json.loads((d/'frozen.json').read_bytes())['steps']
        path.write_bytes(canonical(plan))
        receipt = run('check-plan', a.source, path, '--core', '--target', 'javascript')
        a.output.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=a.output.parent, prefix='.composed-', delete=False) as output:
            staged = Path(output.name); output.write(path.read_bytes())
        try:
            os.replace(staged, a.output)
        finally:
            staged.unlink(missing_ok=True)
        print(json.dumps(dict(status='checked-proposal', steps=len(plan['steps']), selected=receipt['selected'],
            profitability='unmeasured explicit choice; no automatic selection')))


if __name__ == '__main__':
    main()
