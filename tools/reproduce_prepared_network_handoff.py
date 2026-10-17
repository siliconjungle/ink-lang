#!/usr/bin/env python3
"""Reproduce the current full-network source/proof frontier on another host.

Transfer hashes check bytes only. Reference evaluation proposes literals only.
Only successful ordinary complete plan admission establishes a usable rewrite.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
HANDOFF = ROOT/'handoff/functionality-2026-10-17'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ink', type=Path, default=ROOT/'target/debug/ink')
    parser.add_argument('--output', type=Path, default=ROOT/'build/prepared-network-handoff')
    parser.add_argument('--verify-only', action='store_true', help='verify transferred bytes only')
    parser.add_argument('--source-only', action='store_true', help='regenerate/check source; skip plan attempt')
    parser.add_argument('--timeout', type=int, default=1800, help='complete plan authoring and replay timeout in seconds')
    args = parser.parse_args()
    if args.timeout <= 0:
        parser.error('--timeout must be positive')
    inventory = json.loads((HANDOFF/'manifest.json').read_bytes())
    for name, expected in inventory['files'].items():
        path = (HANDOFF/name).resolve()
        if not path.is_relative_to(HANDOFF.resolve()):
            raise SystemExit('invalid inventory path')
        content = path.read_bytes()
        if len(content) != expected['bytes'] or hashlib.sha256(content).hexdigest() != expected['sha256']:
            raise SystemExit('handoff byte mismatch: '+name)
    print('Verified handoff byte inventory; no proof verdict.', flush=True)
    if args.verify_only:
        return 0
    compiler = args.ink.resolve()
    if not compiler.is_file():
        raise SystemExit('Build the committed compiler with cargo build --locked --bin ink first.')
    sys.path.insert(0, str(ROOT/'knowledge'))
    from producers.closed_reference_calls import ReferenceCalls
    from producers.frozen_composition import propose_source
    source = HANDOFF/'network/authored-frozen.core.json'
    data = json.loads(source.read_bytes())
    evaluator = ReferenceCalls(source, compiler)
    selected, helpers = propose_source(data, closed_call=evaluator)
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    candidate = output/'proposal.core.json'
    candidate.write_text(json.dumps(selected))
    checked = subprocess.run([str(compiler), 'check-core', str(candidate)], capture_output=True, text=True)
    (output/'source-check.log').write_text(checked.stdout+checked.stderr)
    checked.check_returncode()
    summary = dict(status='source-checked-not-proof-admitted', helpers=len(helpers),
                   reference_calls=evaluator.calls, source_check=json.loads(checked.stdout),
                   scope='Explicit authored frozen source; no original checkpoint rebinding or migration.')
    print(json.dumps(summary), flush=True)
    if args.source_only:
        (output/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
        return 0
    command = [sys.executable, str(ROOT/'knowledge/producers/frozen_composition.py'), str(source),
               '--ink', str(compiler), '-o', str(output/'plan.json')]
    print('Attempting ordinary complete plan admission; source checking alone is insufficient.', flush=True)
    try:
        plan = subprocess.run(command, capture_output=True, text=True, timeout=args.timeout)
        log = plan.stdout+plan.stderr
        code = plan.returncode
    except subprocess.TimeoutExpired as error:
        def decode(value):
            return value.decode(errors='replace') if isinstance(value, bytes) else (value or '')
        log = decode(error.stdout)+decode(error.stderr)+f'\nHandoff reproduction timed out after {args.timeout} seconds.\n'
        code = 124
    (output/'plan.log').write_text(log)
    summary.update(plan_exit_code=code, plan_command=command,
                   status='checked-plan' if code == 0 else 'source-checked-not-proof-admitted')
    (output/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
    print(json.dumps(dict(status=summary['status'], plan_exit_code=code, log=str(output/'plan.log'))))
    return code


if __name__ == '__main__':
    sys.exit(main())
