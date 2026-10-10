# General source-bound action values and native durability integration

The generic action-value bridge no longer requires an aggregate certificate.
`core/src/action_values.rs` binds the complete checked source/actions and three
exact general carrier definitions from an authenticated database view. An
independent Python producer in ink-knowledge supplies those entries and encodes
typed runtime values. No optimisation-specific or proof-kernel rule was added.
The shared 612-entry catalogue and its snapshot remain unchanged.

## Value contract and evidence

The flat postorder carrier preserves the current executable action value domain:
full U32/U64, signed binary exact Int, UTF-8 strings, 128-bit nominal IDs, enums,
records and recursive lists/options/results. Names are ranked within separate
nominal categories; enum variants and record fields retain declaration order.
Source declaration order for IDs is deliberately reversed in the independent
encoder test. Large integer cases include 4,096-bit magnitudes; recursive records
and lists through 1,024 elements roundtrip through the unchanged kernel.

Images use balanced transport and unique backwards child references. Alias,
forward, missing or unused nodes, noncanonical order, incorrect tree counts,
invalid UTF-8/padding, negative/redundant zero, oversized U32 and wrong nominal
identity fail. Both semantic and transport nesting are bounded. Argument budgets
cover the complete vector and actual bound action signatures. Unsupported types
also fail inside empty wrappers. No resource cap was enlarged.

Real reference action arguments, results, aborted changes and emitted payloads
agree with the independent producer. Authentic, generally well-typed counterfeit
carrier entries cannot establish correspondence. Changes to source/helper bodies
invalidate the old source witness. Library result/argument APIs and the CLI check
actual signatures. Failed CLI binding preserves existing output bytes.

Command-line replay exposed a pre-existing str/Path mismatch in the source-image
producer and the same issue in the new producer. Both were fixed. The final
focused tests invoke both standalone producers and bind their files, rather than
only importing producer functions. Inventory's documented producer/check sequence
also passes; `replay.log` retains that result.

## Integration and validation

Reviewed and merged parallel main d076dddd8d0f2f6b79352364fae606bc55ffbcae and
runtime a4e14c001571e4751e0f1f65b7441cd4a28ead9a. Native durable orchestration
adds no source semantics or proof authority. Final implementation is 78e6005;
knowledge is f3a84fb. Metadata records full hashes and exact pins.

- 223 broad distribution tests pass. Shared backend fixture tests and the
  expensive unchanged row/column continued-history migration test are excluded
  from this run; that migration test's earlier passing evidence remains archived.
- 12 explicitly enabled conformance/durability/module tests pass. The five CPU
  paths match 516 requests and exact snapshots; native wgpu logs 102 actual GPU
  calls, with resident shrinking/empty feedback checked separately.
- Generated JavaScript and both Wasm hosts pass recovery, retained-request retry,
  abort and durable-outbox checks. Native C/Rust processes die after durable
  publication and before reply; reopen/retry preserves one state change. Native
  tests check outbox acknowledgement, portable checkpoint equality and corruption
  rejection. Generic host tests cover ambiguous writes, stale writers, bounded
  receipt retention, receiver failure and structural limits.
- 33 tests pass in a byte-identical isolated core copied without the knowledge,
  planner, runtime or backend checkouts, using offline Cargo. The source hashes
  in `isolated-files.json` match the current core.
- Six final focused source/value/CLI tests and 12 Node runtime tests pass. The
  all-tests compile check is warning-free. Counts overlap across runs.

Broad/conformance runs started at merge 227a64c with knowledge 397d12f. The later
producer CLI Path fix and added standalone-CLI regression were checked in the
final focused run. Core semantics, the value codec and runtime are identical
across these validation scopes. CI now checks the independent core and source/
value admission alongside the existing backend/durability gates. No claim of a
completed remote CI run is made for this publication.

## Remaining boundary

This binds code/value data. It is not a logical interpreter, a proof of the codec
implementation, primitive arithmetic correspondence or universal stateful/native
candidate preservation. Binary integer data does not certify arithmetic over it.
Legacy specialised SourceValues/admission paths remain migration debt. Source
checking, codecs, lowering, toolchains, host adapters and devices remain trusted.

Native durability requires one writer process per file, atomic rename and file/
directory sync; no interprocess lock or power-cut simulation is claimed. Delivery
is at least once and request receipts expire. Incremental logging, mixed native
GPU durable orchestration, broader library/debugging, physical candidate proofs
and fair complete-execution benchmarking remain production work. No fresh browser
or speed measurement was made here. Editor support and schema evolution remain
excluded; all PLAN acceptance gates stay active.
