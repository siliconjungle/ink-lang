# Frontier-inspired Ink extensions

This integration implements the scoped compiler/database upgrades. JSON, CRDTs,
approximation/LOD and new host capabilities remain excluded. The runtime and ABI
are retained: compiled standalone programs execute emitted code, while runtime
provides backend assembly, scheduling, transport and tooling. The core retains the
independent source evaluator; emitted standalone state owns invocation and portable
checkpoint/restore migration. The generic proof-aware representation executor was
retired by current main and is not restored here.

The original measurement and validation files below retain their exact pre-merge
cohort. Main integration additionally preserves shared ABI/native support, iterative
spine release and current collection-edit admission. Scratch storage now lives in
`ink-native-support`; migration histories run real compiled JavaScript state through
the portable contract. Current integration validation is recorded in
[`merged-main-validation.json`](merged-main-validation.json).

## Implemented capabilities

| Area | Implementation | Scope and limits |
| --- | --- | --- |
| Per-call state work | Standalone calls retain native physical values and use checked observation/next projections without encoding a checkpoint or reconstructing every logical root. | Checkpoint, restore and portable migration still materialize logical state. The former generic executor's prepared-value measurement caches are historical and are removed with that executor. |
| Direct physical changes | `--column-mutations` proves insert/remove/replace on columns and Boolean words. Generic emission removes the unused logical post-state observation after checking independent projections. | Unsupported action shapes use exact decode/encode. Reference execution may still reconstruct; native emission and codecs remain trusted. |
| Existing types/local computation | Fixed correspondence covers numerical/list/keep values, UTF-8 String, nominal 128-bit IDs, wider keys, Buffer/Map and bounded or early-stopping loops. | No JSON type, float algebraic rewrite authority or persistent owned handles. Existing source/resource bounds remain. |
| Field dependencies | Mapped fixed-key caches retain the old reply when the actual projection is universally proved unchanged. | Current tactic needs a fixed u64 key and a mapper without extra state captures; other cases repair or refresh. |
| Shared maintenance | Products can bind one complete checked source observation and distribute its projections to component maintainers. | Physical roots can still duplicate storage; this is not a complete dependency/storage deduplication engine. |
| Exact grouped results | Componentwise u64 sum/count deltas for a record of source-defined groups. | Bounded explicit group domain, not unbounded group discovery or every aggregate type. |
| Exact ordered results | Per-row list contributions are maintained as a data column and concatenated in source order. | Parameterless local filter/map queries; cross-row/global queries fail authoring. Ordering and duplicate rows are retained. |
| Aggregate fusion | Ordinary induction proves a scalar fold against the original complete query; singleton Boolean cases remove intermediate lists. | Source-defined scalar contributions; no optimizer-specific checker rule. |
| Point storage alternatives | Direct column search, stable even/odd buckets, and 1..16 prepared dense Option slots with exact fallback outside the prefix. | No sortedness, uniqueness or range premise. Auxiliary buckets/slots currently rebuild on mutation; sparse/dense profitability is workload-dependent. |
| Packed storage | Explicit Rust/RustWasm targets use u32-narrowed/exact-u64 word chunks, Boolean bits and chunks of shared data-headed cells. | Generic record contents remain shared data; indexing follows the literal algorithm. No default packing decision or native-emission theorem. |
| Allocation/sharing | C stable-address constructor arenas; Rust matched-owner reuse and closed literal interning. | Temporary arena lifetime and immutable sharing, not general ownership inference or inline variable-sized records. |
| Reusable scratch | Native scalar temporary maps use generation-stamped dense slots with exact ordered sparse fallback. Tests cover promotion, wraparound, simultaneous owners and oversized reclamation. | Dense keys below 4096 with guarded growth; bounded pool of eight buffers. Other key/value types remain sparse. |
| Identity computation cache | Explicit `rust-memo`/`rust-wasm-memo`: weak input identity, function identity and up to four scalar arguments; at most 64 scalar-result entries. | External calls to eligible recursive pure functions; internal recursion/leaves bypass. No strong input or data result retention; no automatic default. |
| Heap/grid computation | Existing source heap sort and A* participate in admission. Exact derived query caches preserve complete algorithm replies through future changes. Native scratch supports existing heap/grid execution. | A* path, expansion count and limit flag remain exact. No equivalence theorem between distinct pathfinders, sorting algorithms or spatial structures is claimed. Unsupported mutation shapes refresh the cache. |
| Native boundary | Typed `invoke_view_*` returns owned replies and borrowed newly published events; explicit `into_owned` retains events across later calls. | Portable JSON event payloads; compatibility/handle ABI remains available. |

The new action/query `Option.unwrap_or` method is eager: fallback effects and
failures occur even for Some and preserve transaction rollback. It is not a lazy
callback; this addition does not expand the pure-function method grammar.

Definitions, authoring tactics and ordinary proofs live in the independently
versioned knowledge package. Ten source-bound fixtures under
`knowledge/research/frontier-extensions` freeze both endpoint requests and checked
forward/reverse migrations. Producer recognition, archive hashes and package pins
do not grant replacement authority. Every request still passes the general checker;
no checking rule, trusted theorem flag or proof/resource limit was weakened.

## Recorded measurements and selection

Measurements alternate complete calls over seven rounds, with a separate counting
allocator run. Frozen source, model, exact requests/bridges, emitted code, driver and
dependency locks live under `benchmark-inputs`. Snapshot digests and replies match;
failed changes preserve state. Startup, population, read/update/abort, checkpoint,
restore including teardown, destruction and heap are recorded separately. Proof
checking/emission and combined driver compilation are recorded where applicable.
Shared driver compilation is not invented as a per-plan compile cost.

| Recorded workload | Before | After | Implication |
| --- | ---: | ---: | --- |
| 1024-row direct-column typed update + acknowledgement, ordinary vs packed | 406.5 us | 86.0 us | Packing and direct mutations help this workload; packed point reads remain slower. |
| 256-row complete grouped query, pipeline vs proved specialized fold | 141.4 us | 1.77 us | Avoiding intermediate lists is the largest measured query improvement. |
| 256-row fused query, ordinary vs bounded identity memo | 1.78 us | 0.81 us | Memo helps repeated eligible inputs; small cases and other phases can regress. |
| 64x64 grid, sparse vs dense native scratch, warm complete query | 2.35 ms | 0.352 ms | Reusing scratch helps the existing source algorithm; no alternate pathfinder is substituted. |
| 64-cell grid, recomputation vs exact derived cache, complete query | 1.56 ms | 2.24 us | Cache reads are cheap, but recorded updates and restore cost about 1.56/1.54 ms. |
| 64-element heap sort, recomputation vs exact derived cache, complete query | 2.54 ms | 2.51 us | Read benefit is accompanied by roughly 2.52 ms updates and 2.36 ms restore. |
| 256-row column point search vs two buckets, complete query | 1.26 us | 0.75 us | Update roughly doubles (43.2 to 88.0 us); setup/restore and state also grow. |

These are local workload results, not universal or cross-backend speed claims.
Concurrent host work can affect measurements; sub-microsecond differences deserve
particular caution. Dense slots are a measured prepared alternative, not a blanket
win. Four-field grouped delta repair does not beat refresh on the larger recorded
fixture. Losing memo, unfused contribution, traversal and earlier selection variants
remain archived rather than being removed from the evidence.

`selection-results.json` records 125 decisions across nine cases and five profiles:
read-heavy, write-heavy, frequent restore, missing compile, and missing migration.
The pinned planner checks exact endpoints; migration proofs are checked independently.
Profiles are scored by the pinned ranking API over the unchanged admitted bytes.
Target provenance binds hardware, toolchain, backend, boundary and the frozen emitted
artifact cohort. Missing compile or migration measurements retain the baseline in
all cases. Ordered/heap/grid caches win the recorded read-heavy profiles and lose
write-heavy profiles; grouped deltas mostly retain the baseline. No new candidate
or memo/packed target becomes a universal default or a live runtime adaptation.

Reproduce candidate/migration archives with
`knowledge/producers/freeze_frontier_extensions.py --workspace "$PWD"`, and replay
selection from frozen measurements with `bench/frontier-selection.py`. Both need
`INK_COMPILER` set to the exact compiler and the documented proof dependencies.
Existing older frontier fixture directories remain reproducible with default flags.

## Validation and integration

- Core independent suite: 71 tests pass without knowledge/backend dependencies.
- Root transition, semantic selection and standalone suites: 13, 18 and 4 tests pass.
- Rust lowering: 14 tests pass through an independent Git-pinned core checkout;
  runtime: 4 tests pass. Sharing, scratch, weak memo, narrowing, bits and drop are covered.
- Producer compatibility: 15 tests pass. Frontier archives/negative controls: 5 tests
  pass, including all ten fixture reproductions and authentic false fold, ordered,
  bucket and dense proposals rejected by mathematics.
- Complete standalone backend histories cover queries/updates/aborts, events,
  acknowledgement, exhaustion, malformed snapshots, exact checkpoint/restore and
  migrations. Actual C/Rust Wasm, explicit packed and memo lanes are enabled.
  The final 27-case matrix passes (827.97 seconds), recorded in `build/frontier-complete-parity-final.log`.
- Eager fallback effects/rollback, owned event lifetime and borrow rejection pass.
  Earlier heap/grid CPU/Wasm tests compare values and independent BFS distances;
  this is conformance evidence, not an A* equivalence theorem.

Independent package commits and exact dependency pins are integrated locally.
They have not been pushed. Package checks use local Git mirrors of those exact
commits; a remote-only fresh checkout requires publishing the same revisions first.
The final revision manifest is `package-revisions.json`; successful validation log hashes and counts are in `validation.json`. The 350 canonical observations used for scoring are frozen in `selection-observations.json.gz`. Build logs remain in ignored
`build/`; frozen proof, measurement and selection inputs are retained in Git.

The remaining general limits are explicit above: arbitrary dependency deduplication,
unbounded grouped/cross-row queries, general inline/contiguous record layouts and
universal equivalence of distinct heap/grid/spatial algorithms are not claimed by
these bounded extensions. Generated native code, host/ABI codecs and toolchains
remain trusted. Source-model and representation proofs do not prove machine code.
