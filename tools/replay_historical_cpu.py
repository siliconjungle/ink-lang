#!/usr/bin/env python3
"""Replay a historical mutable-function study with today's literal emitter.

Historical audit.py retains its exact-compiler reproduction contract. This tool
checks today's proof admission and complete reference history separately, without
rewriting historical source images, identities, measurements or receipts.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('report', type=Path)
parser.add_argument('--ink', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
report, compiler, out = args.report.resolve(), args.ink.resolve(), args.out.resolve()
assert not out.exists(), 'Use a fresh output directory.'
out.mkdir(parents=True)
def run(*command):
    result = subprocess.run(list(map(str, command)), capture_output=True, text=True, timeout=180)
    if result.returncode:
        (out/'failure.json').write_text(json.dumps(dict(command=list(map(str, command)),
            returncode=result.returncode, stdout=result.stdout, stderr=result.stderr), indent=2)+'\n')
        raise RuntimeError(result.stderr)
    return result.stdout
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

# Validate immutable historical evidence before using its finite controls.
audit = run('python3', report/'audit.py')
(out/'historical-audit.log').write_text(audit)
checked = json.loads(run(compiler, 'check-plan', report/'proof/source.core.json', report/'proof/plan.json', '--core'))
saved = json.loads((report/'publication-replay.json').read_bytes())
for key in ['input', 'selected', 'plan_sha256']:
    assert checked[key] == saved['results']['plan'][key]
knowledge = run(compiler, 'knowledge-check', report/'staged/source.core.json', report/'staged-function-bundle.json')
(out/'knowledge-check.log').write_text(knowledge)
images = {}
for target, filename, historical in [('javascript', 'program.mjs', report/'parity/program.mjs'),
                                     ('rust', 'current.rs', report/'parity/rust/src/lib.rs')]:
    output = out/filename
    log = run(compiler, 'compile', report/'proof/source.core.json', '--core', '--plan', report/'proof/plan.json',
              '--target', target, '-o', output)
    (out/(target+'-compile.log')).write_text(log)
    data = output.read_bytes()
    images[target] = dict(current_sha256=digest(output), historical_sha256=digest(historical),
        same_emitted_prefix=historical.read_bytes().startswith(data))
for name in ['check.mjs', 'script.json', 'expected.json', 'state-wasm.mjs']:
    shutil.copy2(report/'parity'/name, out/name)
execution = run('node', out/'check.mjs')
assert '335 JS outcomes matched with exact portable snapshots' in execution
(out/'javascript-reference-history.log').write_text(execution)
receipt = dict(schema=1, status='passed-current-reference-history',
    compiler_sha256=digest(compiler), proof={key:checked[key] for key in ['input','selected','plan_sha256']},
    javascript_outcomes=335, restores=6, images=images,
    scope='Historical proof replay and staged laws admitted by current core. Both current source images retained; current JS executes all reference values/errors/events/snapshots/restores. Native/Wasm execution is covered separately by mandatory current function_specialization conformance, not inferred from Rust source emission. No byte-reproduction or performance claim.',
    files={p.name:dict(bytes=p.stat().st_size,sha256=digest(p)) for p in sorted(out.iterdir()) if p.is_file()})
(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(dict(status=receipt['status'],javascript_outcomes=335,restores=6,
    historical_javascript_reproduced=images['javascript']['same_emitted_prefix'])))
