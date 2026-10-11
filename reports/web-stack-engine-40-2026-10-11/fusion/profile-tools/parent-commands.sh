#!/bin/sh
# Parent-only recipe. Prepared but never executed by the benchmark agent.
# Run after ordinary three-process audit, under a parent-owned exclusive gate.
set -eu
cd /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang
: "${FUSION40_PROFILE_AUTHORIZED:?Set to yes only after parent grants exclusive profiling}"
test "$FUSION40_PROFILE_AUTHORIZED" = yes
python3 - <<'PY_CHECK'
import json,pathlib,hashlib
r=pathlib.Path('/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion')
p=r/"profile-tools"
d=json.loads((p/"commands.json").read_text())
for name,h in [("manifest-final.json",d["manifest_sha256"]),(d["runner_path"],d["runner_sha256"])]:
 q=pathlib.Path(name);q=q if q.is_absolute() else r/q
 assert hashlib.sha256(q.read_bytes()).hexdigest()==h,"frozen binding drift"
g=json.loads((r/"serial-gate.json").read_text())
assert g.get("authorized") is True and g.get("manifest_sha256")==d["manifest_sha256"] and g.get("harness_sha256")==d["runner_sha256"],"bound exclusive gate required"
PY_CHECK

mkdir /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-prior_original
node --trace-opt --trace-deopt --prof --logfile=/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-prior_original/v8.log /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/bench/diagnose-pipeline40.mjs --mode=profile --manifest=manifest-final.json --frame=pipeline38_left_padded_zip_u32-high-65536 --variant=prior_original --warmups=64 --calls=256 --seed=2026114001 --output=/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-prior_original/profile-result.json > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-prior_original/trace.stdout.log 2> /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-prior_original/trace.stderr.log &
profile_pid=$!
printf '%s\n' "$profile_pid" > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-prior_original/pid.txt
set +e
wait "$profile_pid"
profile_exit=$?
set -e
printf '%s\n' "$profile_exit" > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-prior_original/exit-code.txt
test "$profile_exit" -eq 0

mkdir /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-checked_original
node --trace-opt --trace-deopt --prof --logfile=/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-checked_original/v8.log /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/bench/diagnose-pipeline40.mjs --mode=profile --manifest=manifest-final.json --frame=pipeline38_left_padded_zip_u32-high-65536 --variant=checked_original --warmups=64 --calls=256 --seed=2026114001 --output=/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-checked_original/profile-result.json > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-checked_original/trace.stdout.log 2> /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-checked_original/trace.stderr.log &
profile_pid=$!
printf '%s\n' "$profile_pid" > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-checked_original/pid.txt
set +e
wait "$profile_pid"
profile_exit=$?
set -e
printf '%s\n' "$profile_exit" > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/plain-checked_original/exit-code.txt
test "$profile_exit" -eq 0

mkdir /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-prior_original
node --trace-opt --trace-deopt --prof --logfile=/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-prior_original/v8.log /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/bench/diagnose-pipeline40.mjs --mode=profile --manifest=manifest-final.json --frame=pipeline38_left_padded_zip_heldout_u32-high-65536 --variant=prior_original --warmups=64 --calls=256 --seed=2026114001 --output=/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-prior_original/profile-result.json > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-prior_original/trace.stdout.log 2> /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-prior_original/trace.stderr.log &
profile_pid=$!
printf '%s\n' "$profile_pid" > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-prior_original/pid.txt
set +e
wait "$profile_pid"
profile_exit=$?
set -e
printf '%s\n' "$profile_exit" > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-prior_original/exit-code.txt
test "$profile_exit" -eq 0

mkdir /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-checked_original
node --trace-opt --trace-deopt --prof --logfile=/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-checked_original/v8.log /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/bench/diagnose-pipeline40.mjs --mode=profile --manifest=manifest-final.json --frame=pipeline38_left_padded_zip_heldout_u32-high-65536 --variant=checked_original --warmups=64 --calls=256 --seed=2026114001 --output=/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-checked_original/profile-result.json > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-checked_original/trace.stdout.log 2> /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-checked_original/trace.stderr.log &
profile_pid=$!
printf '%s\n' "$profile_pid" > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-checked_original/pid.txt
set +e
wait "$profile_pid"
profile_exit=$?
set -e
printf '%s\n' "$profile_exit" > /Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang/reports/web-stack-engine-40-2026-10-11/fusion/profile-tools/composed-checked_original/exit-code.txt
test "$profile_exit" -eq 0

# Fill receipt.template.json into a NEW receipt file, hash all raw logs, then
# process each actual *v8.log with the SAME Node binary using --prof-process.
# Never overwrite original trace, raw V8 logs, result JSON, or frozen modules.
