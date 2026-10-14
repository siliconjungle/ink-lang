# Cross-domain performance corpus

Eight source kernels establish a reproducible performance floor for further ports.
`corpus.json` defines their deliberately limited semantics. They are development
cases, not evidence that Ink implements or outperforms whole engines. The source
algorithms live in the independently pinned knowledge repository. No syntax was
added for them.

`upstreams.json` records the source-study candidates and exact fetched revisions.
These projects are workload-dependent performance candidates, not a universal
ranking. Only the pathfinding crate currently has executable upstream adapters
in this harness; the other comparators are independent handwritten Rust controls.
The existing `bench/competitive-workloads` separately covers actual Flecs,
block-mesh, LZ4 and Zstd workloads.

## Reproduction

Use an Ink compiler built from the distribution's exact submodule pins, with
Rust, Python and Clang available. Preserve a baseline compiler before changing
emitted support. Resolve the pathfinding checkout to the recorded revision.

```sh
cargo build --release --locked
python3 bench/cross-domain/prepare.py --compiler target/release/ink --scalar-calls
python3 bench/cross-domain/run.py --compiler path/to/baseline-ink --name baseline --upstreams path/to/upstreams --build-only
python3 bench/cross-domain/run.py --compiler target/release/ink --name expanded --plan build/cross-domain/prepared/plan.json --upstreams path/to/upstreams --build-only
python3 bench/cross-domain/compare.py baseline expanded --rounds 8
```

Run timing without other builds or planning evaluations. Build metadata contains
compiler, source, generated code and executable hashes, upstream revision,
Cargo.lock, flags and toolchain information. `compare.py` rejects changed inputs.
It alternates fresh processes across variants; each process also alternates
Ink/control order. Bootstrap intervals use process medians. Empty/submicrosecond
cases mainly diagnose boundaries and should not support speed claims.

Scalar and collection inputs cross black-box barriers on both sides to prevent
control-only specialization of constants across the separate crate boundary.
Each timed invocation includes owned-input cloning, complete computation and
output destruction. Complete outputs are compared before and after timing. The
strict physics control canonicalizes arithmetic NaNs after every operation;
a separate finite-input native-float control exposes that semantic cost. Neither
control enables fast-math. Paths compare full distance fields, including invalid
and unreachable sentinels. The actual BFS adapter adds a dense distance field to
`bfs_reach`; Dijkstra is shown separately and is not the preferred unit-cost
algorithm. Successor arrays avoid per-node heap allocations in both adapters.

## What the optimized experiment selects

`prepare.py` uses existing knowledge definition-unfolding laws for calls inside
callbacks. It optionally includes scalar and record arguments. Every application
replays through `check-selection`, followed by an explicit existing direct-buffer
physical choice. This is an experiment; it neither installs default selection nor
claims profitability for arbitrary inputs. Inlining is bounded, and all selected
proof bytes and receipts are retained under the output directory. If a combined
expansion exceeds checker limits, smaller cumulative subsets are replayed; only
admitted subsets enter the plan, and rejected applications are recorded.

The fixes exposed by this corpus are general: preserve lexical bindings when a
bounds image crosses an opaque callback, transport collection element types into
nested folds, expose strict f32 canonicalization to the host optimizer, and
reserve planner checks for different premise classes. No function identity or
benchmark observation grants proof authority.

`cargo test --test physical_capabilities cross_domain` checks independent edge oracles and
reference/C/Rust/JavaScript/both-Wasm results before and after checked unfolding.
The Rust-only direct-buffer physical capability has separate conformance tests.
The numeric primitive suite exercises raw float edges and eligible GPU calls.
Broader planning reuse is evaluated on the unchanged `bench/planning-corpus`
using private knowledge copies.

## Owned scalar-record map emission

`scalar-record-map-results.json` isolates a Rust lowering change against distribution
`1a4f7634` and its exact pins. Both variants use the same checked helper unfolding
and direct-buffer plan. The changed emitter uses an explicit ordered loop over
private owned storage for same-type maps of flat fixed-width scalar records.
Borrowed traversals, column carriers and explicit reservations retain their paths.
There is no algorithm substitution, reassociation or new language syntax.

Eight balanced fresh-process rounds on an Apple M4 Pro measured new/old time
ratios of 0.3803 (95% bootstrap interval 0.3786–0.3836) for 16,384 physics rows
and 0.9424 (0.9367–0.9465) for 16,384 ECS rows. Their matched Rust-control ratios
were 0.9935 and 1.0031 respectively. Other large kernels were unchanged within
the reported intervals. This is incremental to the earlier inline/direct-buffer
experiment, not a comparison with complete physics or ECS engines.

The lowering regression checks allocation reuse, captured-source isolation,
ordered branch results, wrapping arithmetic and raw float payload preservation.
The existing cross-domain and numeric suites check reference, C, Rust, JavaScript,
both Wasm targets and eligible numeric GPU work. Conformance does not establish
a speed claim outside the measured host and workload.

## Remaining work

Real engine lifecycle workloads, additional language implementations, hot and
cold storage, input distributions, allocation counts, peak memory, and held-out
scaling still need measurement. Integer matrices cannot substantiate BLAS claims;
the micro lexer cannot substantiate Oxc claims; integration cannot substantiate
rigid-body engine claims. Default profitability selection still needs comparable
held-out lifecycle evidence. Faster kernel timings alone do not close those gaps.
