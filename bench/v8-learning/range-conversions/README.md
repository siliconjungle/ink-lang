# Range-guided word representation reuse

The V8 typed/representation/truncation review exposed a missing proposal in Ink's
unsigned range analysis. A U64 narrow-to-U32/widen-to-U64 round trip can return its
original value when the complete input range fits U32. The reverse U32 round trip
is lossless without that range restriction. These are database proposals; ordinary
whole-function bitvector proofs still establish each equation independently.

The change preserves branch scope, relational bounds and wrapping arithmetic.
A bound on `x+1` applies to that wrapped result and cannot be inverted into a bound
on `x`. Opposite branches and unrestricted U64 round trips remain unchanged.
Three reusable whole-branch laws are in the indexed V8 proof library. No type
annotation, host representation, profile or favorable structural price supplies
a proof premise. F64 proof terms and floating-point narrowing are unchanged.

The source input is V8 revision
`c4e049d3cbda775e2c3af9410f6e18b18388d68b`, particularly its
[representation changer](https://github.com/v8/v8/blob/c4e049d3cbda775e2c3af9410f6e18b18388d68b/src/compiler/representation-change.cc)
and [Maglev truncation](https://github.com/v8/v8/blob/c4e049d3cbda775e2c3af9410f6e18b18388d68b/src/maglev/maglev-truncation.h).
Their speculative checks, JavaScript coercions, zero identification and exactness
assumptions do not transfer to Ink.

## Validation

- 28 related knowledge tests passed, including all 83 frozen V8 word laws replayed
  independently, malformed proof/premise rejection, fact-query limits and scope.
- Three final range regressions passed: independent boundary/random values,
  renamed normal discovery and rejection of a transplanted branch application.
- Four acquired source equations and 88 reference/native/JavaScript/Rust-Wasm
  complete values and exact snapshots matched. The required CPU test also runs
  the three range regressions. No GPU execution or performance claim follows.
- Normal semantic discovery with 128 checks finds all three reusable whole-branch
  forms on renamed input names. The 32-check measurement control selects only
  `relational` and `wrapped`; `guarded` remains unchanged. This is a real search
  coverage limitation, not grounds for raising the production budget.
- A matched 32-check counterfactual removes only the three new frozen laws. It
  rewrites `wrapped` only (structural cost 29 to 21); the new library rewrites
  `wrapped` plus `relational` (29 to 11). Both finish their checker budgets
  without a wall-time timeout. This demonstrates improved bounded discovery,
  not measured runtime or compiler wall-time improvement. Exact overlay, core,
  selection and report are retained under `without-three-laws`.

## Complete-call measurements

Both targets retained the baseline under the unchanged 10% minimum-gain and
sample-extrema guard. These are useful rejected measurements, not a speedup claim.

| Boundary | Training baseline / candidate ns | Holdout baseline / candidate ns |
|---|---:|---:|
| JavaScript compact-wire call | 1415 / 1368 | 1340 / 1377 |
| Native generated JSON-value call | 63 / 64 | 64 / 65 |

Three fresh processes per split used eleven rounds and disjoint typed inputs,
covering both branch directions and U32 boundaries. The source interpreter supplies
expected results. Before and after timing, the ordinary adapter checks complete
outputs and unchanged inputs. JavaScript inputs are encoded once outside timing;
the timed compact call performs its normal decoding/execution/encoding and the
runner consumes the full returned bytes. Native uses its distinct generated
JSON-value boundary. Do not compare their absolute timings as a language contest.
Compilation, loading, preparation and oracle costs are recorded separately and
excluded from the resident-call objective. The shared host and very small scalar
workload do not establish whole-application profitability.

Reproduce from this exact distribution and pinned independent packages:

```sh
PYTHONPATH=knowledge:planner build/proof-python/bin/python \
  bench/v8-learning/range-conversions/measure.py \
  --target javascript --output build/range-js-reproduction
PYTHONPATH=knowledge:planner build/proof-python/bin/python \
  bench/v8-learning/range-conversions/measure.py \
  --target rust --output build/range-native-reproduction
PYTHONPATH=knowledge:planner build/proof-python/bin/python \
  bench/v8-learning/range-conversions/replay.py
```

The Rust measurement uses the ordinary native adapter and local Cargo/preflight
entry point; retain its timed build flags. Follow the repository storage policy
for optional reruns. `results.json` binds exact acquisition revisions/compiler;
`artifacts.json` binds retained proof packets, requests, generated source, locks,
observations and reports. Absolute paths inside original receipts describe the
acquisition workspace; reruns create fresh paths. Compiled targets and private
mutable stores are retired after required validation finishes.

## Frozen corpus

All ten unchanged programs compiled and produced checked rewrite alternatives.
There were 24 distinct admitted laws, six reused across programs, and no admitted
representation. Every quick search exhausted its time budget. No alternative
passed robust measured lifecycle improvement, so all ten retained the baseline.
There were no recorded near-miss reasons in these receipts. None of the three new
range laws was used by the corpus. This is a negative generalization result;
compiler/catalogue changes and shared-host timing preclude a causal comparison
with earlier batches. The exact context, original source captures, plans and
funnel are retained in `../corpus-range-conversions` and its summary JSON.

## Integrated validation

After merging the independent frozen-literal closure/core updates, 33 knowledge
regressions and the required 88-case CPU matrix passed again. The locked Cargo
fetch passed. `integration/validation.json` binds the tested source/package pins
and new compiler image. Timing receipts retain their original acquisition
context. Full remote CI is tracked separately and is not represented by these
local checks.
