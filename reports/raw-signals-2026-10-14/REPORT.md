# Raw signals comparison, 14 October 2026

The selected Ink implementation beats the original raw Preact signals control in
both measured state updates and connected publication. It also improves on the
stronger guarded Map control in the primary 4,096-row observation. This is a
state benchmark, with full-width wrapping U64 arithmetic and one grouped consumer;
it makes no DOM/framework or universal language performance claim.

| 4,096 rows, warmed, update plus two reads | Ink | Raw signals | Guarded raw signals |
|---|---:|---:|---:|
| Unconnected | 172.2 ns | 257.7 ns | 203.1 ns |
| One connected consumer | 210.8 ns | 285.5 ns | 228.0 ns |

Ink retains commit versions, ordered events, failure handling, general host
transactions and portable checkpoints. Raw controls omit those contracts. The
commits/events control measures 308.3 / 350.5 ns, but does not implement general
transactions or portable restore. Results are medians of three fresh-process
medians, each with 15 measured rounds of 16,384 operations after 120,000 warm calls.
The host was shared with other development work; full sample extrema and process
medians are retained. These observations are not statistical confidence bounds.

After integrating concurrent main changes (including captured preflight inputs,
checked boundary readers and binder-safe facts), the merged compiler was checked
again in three fresh processes at 4,096 rows. Ink measured **216.4 / 262.9 ns**,
original raw signals **313.1 / 368.6 ns**, and guarded raw signals **235.3 / 267.6 ns**.
The connected guarded comparison is close. This second run had different shared
host load; the complete process/sample data is retained rather than interpreting
absolute timing differences as a compiler regression. The integrated tree passed
305 standalone core tests, 34 standalone JavaScript tests, the state/ledger suites,
188 planner tests, recipe tests and mandatory CPU/Wasm/eligible GPU parity.

## What changed

* The knowledge recipe proposes ordinary, equality-guarded and zero-guarded word
  replacement functions, with map or configurable dense prefixes. Universal
  64-bit RUP certificates contain 12,446 and 19,467 steps. Existing factorisation,
  group and source/action proofs remain mandatory. No backend algebra matcher
  authorizes skipping arithmetic.
* Single-root preflight actions bind their admitted maintenance entry once and
  install affected keeps with emitted fixed indexes.
* Subscription slots and two reusable queues replace delivery IDs, temporary
  sets/arrays and repeated subscription lookups. A single committed scalar
  consumer has a compiled root schedule: read both current keep slots once,
  publish directly, and queue reentrant/held work. It does not reconstruct
  changed-output flags. Multiple/unknown consumers retain ordered snapshot-before-
  delivery evaluation, changed-output generations and ordinary ownership codecs.
* Boxed dense prefixes use packed object arrays, Number indexing inside the checked
  small prefix, and exact full-width sparse fallback. Replacement avoids redundant
  membership updates. Prefixes remain offline plan choices, including setup and
  memory costs; aggregate arithmetic remains BigInt.

## Curve and limits

| Rows | Ink update | Raw update | Guarded raw update | Ink connected | Raw connected | Guarded raw connected |
|---:|---:|---:|---:|---:|---:|---:|
| 256 | 161.8 ns | 213.3 ns | 161.8 ns | 206.5 ns | 289.8 ns | 229.4 ns |
| 4,096 | 172.2 ns | 257.7 ns | 203.1 ns | 210.8 ns | 285.5 ns | 228.0 ns |
| 16,384 | 210.9 ns | 294.7 ns | 223.8 ns | 240.2 ns | 337.8 ns | 279.2 ns |

The selected prefix has capacity 16,384 (`bench/state-protocols/prepare.py
--dense-capacity 16384` reproduces this plan family). The 256-row update is effectively tied
with the guarded control; some individual process comparisons reverse. Unchanged
scalar reads still favor raw signals. A supplemental 65,536-operation window retains
four times as many events before acknowledgement: at 4,096 rows Ink measures
199.2 / 371.8 ns versus original raw 239.2 / 401.5 ns, and guarded raw
197.2 / 355.8 ns. At 16,384 rows it measures 180.3 / 318.8 ns versus original
raw 296.8 / 380.7 ns and guarded raw 253.5 / 286.4 ns. Thus the stronger control
still wins connected publication in that longer retained-event window. Event
retention and GC remain material costs; the primary win does not establish
superiority over every manual signals representation or workload.

Frozen training/holdout lifecycle histories validate all three candidates against
independent source outcomes and exact snapshots. The guarded map's weighted median
cost is about 15% lower in training and 24% lower on holdout; the dense choice is
about 15% / 18% lower. The existing uncertainty guard retains the general map
baseline. The hot dense winner is an admitted selectable implementation, not a
forced universal planner default. Training/holdout receipts include setup, module
load, memory, updates, reads, checkpoints and restore.

## Measurement correction and verification

The earlier harness added an Ink-only wrapper around the bound action. Several
candidate modules shared its call site and inhibited V8 inlining. The corrected
harness invokes the bound action directly and supplies its four declared arguments.
Both the wrapper results and corrected four-argument results are retained, along
with the earlier publication implementation and the long event-retention window.
This correction changes no Ink API or action meaning.

Validation passed: 32 standalone JavaScript tests against its actual Git-pinned
core/ABI; 188 planner tests; 11 knowledge recipe tests; existing subscription,
ownership and arbitrary-schema ledger suites; 240 independent source steps across
eight implementations with results/errors/versions/events/exact snapshots,
full-width and boundary keys, rollback, restore, grouping, direct publication,
listener isolation, reentry, typed deltas and forged-proof rejection. Mandatory
native C/Rust, JavaScript and both Wasm comparisons matched exact portable state;
the eligible GPU lane executed one real GPU call over eight observations.

The fixed emitters, storage and publication controllers remain trusted. These
algebraic proofs and conformance tests are not a whole-compiler correctness proof.
The implementation/proof alternatives belong to independently pinned JavaScript
and knowledge repositories. No workflow file is changed in this round.
