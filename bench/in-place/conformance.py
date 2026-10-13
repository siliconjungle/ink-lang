#!/usr/bin/env python3
"""In-place appends must not change results. JavaScript (and, with --c, the
C backend) emitted with ownership facts is compared with the reference
interpreter on random inputs, for functions whose storage is shared in every
way the analysis must refuse as well as the loops it should accelerate.

    python3 bench/in-place/conformance.py --compiler target/release/ink [--c]
"""
import argparse, json, random, subprocess, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
RUNNER = '''import {pathToFileURL} from 'node:url';import fs from 'node:fs';
const m=await import(pathToFileURL(process.argv[2]));const cases=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
console.log(JSON.stringify(cases.map(c=>{const before=JSON.stringify(c.args);const v=m.call(c.name,c.args);
if(JSON.stringify(c.args)!==before)throw Error('input mutated');return v;})));'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--cases', type=int, default=12)
    parser.add_argument('--c', action='store_true', help='also build and run the C backend (needs cargo and a C compiler)')
    args = parser.parse_args()
    source = HERE / 'aliasing.ink'
    rng = random.Random(7)
    with tempfile.TemporaryDirectory() as d:
        d = Path(d)
        core = d / 'core.json'
        subprocess.run([args.compiler, 'emit-core', source, '-o', core], check=True, capture_output=True)
        program = json.loads(core.read_text())['program']
        plan = d / 'plan.json'
        identity = json.loads(subprocess.check_output([args.compiler, 'check-core', core], text=True))['core_sha256']
        plan.write_text(json.dumps(dict(schema=1, semantics='ink-compiled-plan-v1', input_core_sha256=identity, steps=[])))
        subprocess.run([args.compiler, 'emit-plan', core, plan, '--core', '--target', 'javascript', '-o', d / 'p.mjs'], check=True, capture_output=True)
        js = (d / 'p.mjs').read_text()
        cases = []
        for f in program['functions']:
            if not f.get('public', True) and f['name'] in ('first', 'total'):
                continue
            if f['name'] in ('first', 'total'):
                continue
            for _ in range(args.cases):
                values = []
                for _, t in f['params']:
                    if t == 'U32':
                        values.append(rng.randrange(0, 8))
                    else:
                        values.append([rng.randrange(0, 6) for _ in range(rng.randrange(0, 9))])
                cases.append(dict(name=f['name'], args=values))
        (d / 'cases.json').write_text(json.dumps(cases))
        (d / 'run.mjs').write_text(RUNNER)
        backends = {'javascript': json.loads(subprocess.check_output(['node', d / 'run.mjs', d / 'p.mjs', d / 'cases.json'], text=True))}
        c_sites = None
        if args.c:
            subprocess.run([args.compiler, 'emit-plan', core, plan, '--core', '--target', 'c', '-o', d / 'c'], check=True, capture_output=True)
            c_sites = (d / 'c/program.c').read_text().count('/*in-place*/')
            subprocess.run(['cargo', 'build', '--release', '--quiet'], cwd=d / 'c', check=True, capture_output=True)
            (d / 'script.json').write_text(json.dumps([dict(pure=c['name'], args=c['args']) for c in cases]))
            backends['c'] = json.loads(subprocess.check_output([d / 'c/target/release/compiled-state', d / 'script.json'], text=True))
        failures = 0
        for i, case in enumerate(cases):
            (d / 'args.json').write_text(json.dumps(case['args']))
            expected = json.loads(subprocess.check_output([args.compiler, 'run', source, case['name'], d / 'args.json'], text=True))
            for backend, values in backends.items():
                if expected != values[i]:
                    failures += 1
                    print('MISMATCH', backend, case, expected, values[i])
        print(json.dumps(dict(cases=len(cases), backends=sorted(backends), failures=failures,
                              javascript_in_place_sites=js.count('.push('), c_in_place_sites=c_sites,
                              functions=sorted({c['name'] for c in cases}))))
        raise SystemExit(1 if failures else 0)


if __name__ == '__main__':
    main()
