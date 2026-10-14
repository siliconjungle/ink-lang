#!/bin/zsh
export PYTHONPATH="$PWD/knowledge:$PWD/planner"
python3 - <<'PY'
import json
from pathlib import Path
x=json.load(open('knowledge/ink_knowledge/implementation-recipes.json'));x['recipes']=[r for r in x['recipes']if r['id']=='all-published-packages'];Path('build/state-lifecycle-gap/published-only-registry.json').write_text(json.dumps(x))
PY
python3 -m ink_planner.compiled_planning --compiler target/release/ink --source reports/planner-reliability-2026-10-14/filtered-input.core.json --core --knowledge-root build/state-lifecycle-gap/paired-lifecycles/knowledge --registry build/state-lifecycle-gap/published-only-registry.json --target javascript --cache off --planning-effort quick --time-seconds 180 --proposal-timeout 90 --check-timeout 90 --measure-timeout 600 --measure-processes 3 --recipe-workers 1 --state-limit 8 --measure-workload reports/planner-reliability-2026-10-14/filtered-workload.json --measure-holdout reports/planner-reliability-2026-10-14/filtered-holdout.json --keep-candidates build/state-lifecycle-gap/planner-candidates --emit build/state-lifecycle-gap/planner-selected.mjs -o build/state-lifecycle-gap/planner-selected.plan.json
