# Reusing checked equalities during proof authoring

The database author can propose scalar equalities to help its SAT search. It
must also supply their proofs. `prove_with_equalities` reflects each proved
word/Boolean equality through ordinary Congruence and AssertEquality, in order,
then replays the strengthened goal. Original conditions stay explicit. Float
numeric equality is excluded because it does not imply stored-bit identity.
There is no new checker rule, inferred-range premise, theorem whitelist or limit.

This admits the two previously missing U64 laws: self remainder and remainder of
zero. Both proofs inline the existing checked quotient witness, so frozen
pattern discovery needs no dependency-loader change. The complete raw laws are
8,386,680 and 1,737,342 bytes; both fit existing 16 MB object/catalogue, 500,000
semantic-step and 20,000,000 shared circuit/RUP limits. The extra proof bodies
are 214 and 130 RUP steps. All 340 integer proposals now admit. All prior 338
proof identities remain unchanged; existing plans and measurements retain their
original identities. New proofs do not inherit their premises' profitability.

The V8 analogy is scoped established facts: information becomes available only
after a check and disappears outside its valid context. V8's branch/type/loop
metadata supplies no Ink premise. The database composes these facts with Ink's
existing general equality machinery.

## Complete compiled calls

The selected control applies both laws inside a wrapping U64 fold, then adds an
observed U32 cohort argument. Inputs include zero and full-width U64 boundaries;
complete U64 results are checked/consumed. This particular fold's results are
small; it does not claim nonzero high output bits. Independent source oracles
and input-mutation checks pass on JavaScript, native Rust and actual WebGPU.
Each split uses three fresh processes, eleven alternating rounds and normalized
disjoint input sets. No automatic placement or cost-policy change is made.

| Boundary | Training original / rewrite | Holdout original / rewrite |
|---|---:|---:|
| JavaScript compact values | 23.459 / 16.461 us | 36.534 / 26.640 us |
| Native JSON values | 11.774 / 10.968 us | 13.414 / 14.698 us |
| Explicit WebGPU | 5.590 / 0.578 ms | 4.693 / 0.602 ms |

CPU values are official weighted lifecycle totals. Both retain the baseline
under the unchanged 10% plus sample-extrema guard. GPU values are medians of
three process medians; paired holdout median ratio is 7.479. Every GPU process
passes the same extrema comparison with observed dispatch/submission/readback.
Warm complete async calls include upload, device work, readback, decoding and
full result consumption; setup/build/startup stay separate. Browser/GPU peak
memory is unknown. Shared-host controls establish a narrow explicit-device
rewrite gain, not broad CPU/application performance, cold latency or placement.

## Reproduce

Run `author.py --compiler PATH --scratch FRESH_PATH` with
`PYTHONPATH=knowledge:planner` and the pinned python-sat 1.9.dev5 environment.
The script reads the two frozen quotient witnesses, exports exact strengthened
CNFs, authors bounded RUP hints and independently checks the complete laws.
`prepare_program.py` and `measure_program.py --target javascript|rust` recreate
the selected complete-call control under `build/v8-remainder-acquisition`.
For GPU use the ordinary `python -m ink_planner.gpu_measurements` with both
plans, captured workloads, exact browser and a fresh owned scratch directory.
Source/package/tool hashes and exact emitted artifacts stay bound to their
original contexts; conformance and corpus observations never transfer timings.

Use local Cargo for generated dependency builds. Prepare sources outside any
measured interval, passing actual returned config arguments for direct toolchain
invocations. Preserve timing flags; untimed generated validation disables debug
and incremental output. Per-root retention manifests protect live workers and
selected inputs, and retire completed targets and duplicate publications.

The first device acquisition inherited a stale human workload label. It was
retired and rerun under the correct domain description; only the fresh corrected
context is retained or published. CPU acquisition already replaced that shape
with its correct protocol description.

## Validation and frozen corpus

All14 focused regression methods pass in563.352s, including replay of all340
integer laws, the independent integer oracle, source-site discovery, strict
repeated/unused work, lazy defaults and full-width U64 values. Rehashed unproved,
wrong-endpoint, missing-fact and wrong-body proofs reject for both new laws;
branch-local facts cannot escape the original conditions. Fresh authoring
reproduces both exact installed proof identities.

The final stable-context corpus compiles all ten frozen programs and admits
alternatives for all ten. It observes24 old law identities, six reused across
programs, with no new remainder-law attribution and zero selected alternatives
or representations. All ten stop at measurement evidence and exhaust quick
budgets; no near-miss reason is recorded. Median recorded compilation interval
is52.6435s, excluding private publication preparation. These unpaired saturated
shared-host results establish no causal compiler/runtime change. Exact inputs,
plans, terminal context and funnel are in `../corpus-remainder-facts`.

The36 immutable timing rows (24 CPU,12 corrected explicit-device) are published
and read back from knowledge without changing the proof snapshot or selection
policy. `selected-inputs.tar.gz` retains177 required proof/call/generated inputs
in3,821,377bytes; canonical laws live once in pinned knowledge. Redundant views,
private stores and build targets are retired. Run `audit.py` with
`PYTHONPATH=knowledge:planner` for the complete read-only integrity audit.
