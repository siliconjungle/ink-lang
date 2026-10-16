# Shared checked proof dependencies

The V8-inspired equality-assisted remainder proofs exposed a composition limit:
selecting self quotient, self remainder and zero-numerator remainder in the same
source produced an 18,432,155-byte selection. Ordinary `check-selection` rejected
it at the unchanged 16 MB input limit. This rejection is a capability boundary,
not a successful-check timing baseline.

The generic frozen-library loader now supports an optional V2 index mapping
semantic entry identities to immutable proof files. It loads only matching roots
and their exact declared dependency closure, orders supporting objects before
consumers, deduplicates shared entries and bounds closure size/depth. This order
also permits ordinary portable definition-context rebinding to retarget both
objects and dependent uses. V1 libraries retain their existing behaviour.
Metadata and content hashes transport candidates; ordinary kernel replay remains
mandatory. No checker, source semantics, circuit budget or selection policy changes.

The two new remainder proofs use the existing quotient objects through ordinary
`Use` rather than repeating their proof trees. Their own canonical bytes fall
from 8,386,680 to 82,955 and from 1,737,342 to 23,453; the supporting quotient
proofs still travel and replay. The same three-rewrite source now checks at
10,130,196 bytes, with four objects and three roots. All original 338 proof
identities are preserved. The first remainder batch and its timings keep their
original inline proof identities in Git and its retained evidence.

The upstream analogy is scoped established facts and reusable graph nodes.
V8 type, map, deoptimisation and feedback assumptions supply no Ink premises.
This change belongs in the knowledge database's generic loading/authoring layer.

## Complete compiled calls

The selected source folds the three operations over U64 inputs and adds an
observed U32 cohort. Inputs include zero and full-width U64 boundaries. Complete
U64 outputs are independently checked and consumed; this fold's results are
small, so this is not a claim of nonzero high output bits. Each split uses three
fresh processes, eleven alternating rounds and normalized disjoint inputs.

| Boundary | Training original / rewrite | Holdout original / rewrite |
|---|---:|---:|
| JavaScript compact values | 29.318 / 19.270 us | 45.231 / 27.303 us |
| Native JSON values | 9.573 / 9.986 us | 14.392 / 14.667 us |
| Explicit WebGPU | 7.825 / 0.602 ms | 7.223 / 0.634 ms |

CPU values are the official weighted lifecycle totals. Both CPU acquisitions
retain the baseline under the unchanged 10% plus sample-extrema guard. GPU values
are medians of three process medians; the held-out median paired ratio is 12.083.
All six GPU processes pass the extrema guard, with actual device dispatch,
submission and readback observed. Warm complete async calls include upload,
device work, readback, decoding and result consumption; build/startup/setup are
separate. Whole-browser/GPU peak memory is unknown. This is a narrow explicit
GPU rewrite gain on a shared host, with no automatic placement or broad CPU gain.
The proof-sharing change enables the previously oversized plan; it does not
change execution of a given checked rewritten program.

## Reproduce

Use `PYTHONPATH=knowledge:planner` and the pinned python-sat 1.9.dev5 environment.
`author.py --compiler PATH --scratch FRESH_PATH` exports the exact strengthened
CNFs, authors bounded proof hints and checks both complete dependent laws.
`boundary.py --compiler PATH --scratch FRESH_PATH` reconstructs the old oversized
selection from full Git revision `f53f223f008a15cbd620c3f62f1f34ecd84d50c9`.
`composed.py` checks the installed shared closure. `prepare_program.py` and
`measure_program.py --target javascript|rust` recreate the exact selected control
under `build/v8-proof-dependencies`. For GPU use the ordinary
`python -m ink_planner.gpu_measurements` with both plans and captured workloads,
the exact browser and fresh owned scratch:

```sh
PYTHONPATH=knowledge:planner CARGO_BUILD_JOBS=2 CARGO_PROFILE_DEV_DEBUG=0 CARGO_INCREMENTAL=0 \
  python -m ink_planner.gpu_measurements \
  --compiler build/v8-proof-transport/frozen/ink-integrated \
  --source build/v8-proof-dependencies/program/core.json \
  --plan build/v8-proof-dependencies/program/baseline.plan.json \
  --plan build/v8-proof-dependencies/program/searched.plan.json \
  --training build/v8-proof-dependencies/program/training.json \
  --holdout build/v8-proof-dependencies/program/holdout.json \
  --browser '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --scratch FRESH_GPU_PATH
```

Exact tool/source/package hashes and
emitted artifacts remain bound to their own contexts.

Use local Cargo for dependency builds; prepare outside measured intervals and
pass returned config arguments to any direct toolchain invocation. Preserve
timed flags. Untimed generated validation disables debug/incremental output.
Retain selected proof and performance inputs, and retire completed duplicate
publications and targets only after the owning workers finish.

## Validation

All 28 focused regressions pass in 672.141 seconds: every admitted integer,
word and float proof replays, the independent integer oracle and strict/lazy
source controls pass, and altered proof bytes or false supporting claims reject.
Eight loader/index methods separately pass, including metadata rejection,
load-only-needed dependencies, preserved partial updates and portable definition
context rebinding. Fresh authoring reproduces both exact installed proof IDs.
The baseline boundary recipe reproduces the exact original selection hash and
size from pinned Git inputs. The final stable-context frozen corpus compiles all ten programs and admits
alternatives for every program. It observes 22 old law identities, all present in
the preceding 24-law report; six are reused across programs. No new remainder-law
attribution, selected alternative or representation occurs. All ten finish at
the measurement-evidence gate and exhaust quick budgets, with no recorded near
miss reason. The 51.696-second median excludes private publication preparation;
these unpaired saturated runs establish no causal speedup or regression.

The 36 immutable timing observations (24 CPU, 12 explicit-device) publish and
read back without changing the proof snapshot or selection policy. The exact
186-file reproduction archive is 3,824,293 bytes; canonical proof objects and the
old inline baseline remain in knowledge/Git. Completed duplicate proof views,
private stores and build targets are retired after their workers finish. The
complete read-only audit, including the stable corpus and exact database
readback, passes with `audit.py` under `PYTHONPATH=knowledge:planner`.
