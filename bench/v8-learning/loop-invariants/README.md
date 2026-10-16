An explicit database law hoists a captured wrapping-word fold out of another
fold's strict callback. The generated source retains an empty-list guard, uses
ordinary lexical sharing and passes the existing source equality checker. No
core or backend optimization recognizer was added. Source work changes from a
repeated inner scan to one inner scan plus the outer traversal.

Three fresh processes per disjoint split measured complete calls and consumed
every output. Nonempty JavaScript medians improved 104.55x in training and
164.32x in holdout. Native medians improved 1.147x and 1.268x; all six nonempty
native process ratios exceeded one. Empty-input timings were approximately tied.
Native includes generated JSON input conversion; JavaScript uses its trusted
value entry. Compare lanes within each target. This is one workload on a shared
arm64 host, with no broad-program or automatic-selection claim.

`receipt.json` records exact package/compiler identities and methodology;
`summary.json` separates nonempty work from empty-call diagnostics. Raw requests,
all six process reports per target, source oracle inputs, generated programs and
the checked proof closure are retained. CPU conformance additionally covers 72
cases across U32/U64/I32/F32/Bool, nested and shadowed captures, both fold orders,
empty collections, NaNs and negative zero. The same mandatory suite also reruns
the earlier source laws and parameter-cache histories.

Reproduce from the pinned distribution root with the documented proof Python
environment and local Cargo entry point on PATH:

```sh
PYTHONPATH=knowledge:planner build/proof-python/bin/python bench/v8-learning/loop-invariants/prepare.py
node planner/ink_planner/measure_calls.mjs bench/v8-learning/loop-invariants/training-request.json
node planner/ink_planner/measure_calls.mjs bench/v8-learning/loop-invariants/holdout-request.json
PYTHONPATH=knowledge:planner build/proof-python/bin/python bench/v8-learning/loop-invariants/run-native.py --output build/invariant-reproduction
```

The native output directory must not exist. Run each JavaScript request in three
fresh processes to reproduce the retained cohort. Keep training and holdout
results separate; `summarise.py` aggregates the saved reports. Retained absolute
paths describe the original acquisition; preparation regenerates local paths.
Release build flags remain unchanged, and build/startup costs are excluded from
the steady-state headline. Frozen planning-corpus diagnostics are reported
separately and do not establish a runtime gain.

At the original acquisition, the unmeasured default structural score ranked the
source at 97 and this guarded target at 201, charging both branches and one loop
iteration. Later database prices account for repeated callbacks; the resumed
V8 pass additionally scopes empty-branch extents and maximum-arm work. See
`../branch-cardinality` for the current 2602/314 price control, ordinary discovery
and separately guarded native measurements. This original runtime control still
uses explicit checked selection; it establishes no arbitrary-workload choice.

The current catalogue is additionally restricted to reviewed numeric/list
operation trees. Nested string construction and unanalysed helper calls decline
hoisting. `scope-hardening.json` records unchanged numeric proposals and passing
CPU replay; `catalogue-check.py` independently checks installed discovery. The
frozen measurement producer is retained solely to reproduce this numeric control.
