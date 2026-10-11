# Database laws for collection observations and bounded stopping

The pinned optimisation store adds 45 replayable laws, with nine families for
u32, u64, i32, f32 and Bool. They use the existing general equality checker;
matching and measurements grant no authority.

| Family | Replacement | Proof |
| --- | --- | --- |
| Buffer round trip | `buffer(xs).freeze()` → `xs` | Fixed constructor/freeze computation |
| Buffer length read | `buffer(xs).len()` → `length(xs)` | Fixed observation computation |
| Buffer indexed read | `buffer(xs).at_or(i,d)` → `xs.at_or(i,d)` | Fixed observation computation, including absence |
| Successive filters | `xs.filter(p).filter(q)` → one filter with `p(x) && q(x)` | List induction and cases on `p(head)` |
| Identity filter | `xs.filter(fn(x)=>true)` → `xs` | List induction |
| Zero bound | `repeat_until(0,x,stop,step)` → `x` | Fixed stopping-loop computation |
| Initially true stop | A constant-true stop callback → initial value | Fixed stopping-loop computation |
| Proved initial stop | General stop callback → initial value | Requires a proof that `stop(initial)` is true |
| Guarded zero bound | General bound → initial value | Requires a proof that the bound equals zero |

The filter law preserves list order. For each element it evaluates `p` before
`q`, and evaluates `q` only if `p` is true. Predicates are pure and total;
reordering predicate work across different elements has no value observation.
The indexed-read law preserves the lazy fallback. Float payloads are preserved
as values/bits; no floating arithmetic rewrite or numeric-to-bit equality rule
is added.

An example conditional application is:

```ink
fn already_done(limit:u32,x:u32,goal:u32)->u32{
    return choose(x>=goal,
        repeat_until(limit,x,fn(a)=>a>=goal,fn(i)=>fn(a)=>a+i+1),x);
}
```

Only the first branch supplies the stopping premise. The ordinary query engine
produces its proof, and the checker derives the fact from the exact application
site. A false stop callback or an unproved zero bound cannot use these laws.
See [the executable example](../examples/local-collection-optimisation.ink).

## Fixed correspondence and trust

The core adds typed logical correspondence for buffer construction and
freeze/length/indexed observations, list length, and stopping loops with
ordinary accumulators. Logical buffer creation stores the immutable sequence;
observations project that sequence. This relies on the existing checked affine
source contract: aliases and storage identity cannot be observed.

Stopping-loop meaning checks zero remaining steps first, then stop, then performs
the step and advances the u32 index. A proof-only `until.from` describes the
remaining iteration; it cannot be reified into executable source. Lazy `choose`
normalisation avoids spending proof work on an unreachable branch. These are
trusted primitive/correspondence implementations, tested against the reference,
not a formally verified checker. No new proof rule, privileged theorem name,
heap primitive or optimiser pattern is added to the core.

Owned mutation, Map operations and owned loop accumulators are now covered by
[the additional fixed correspondence and database laws](owned-optimisation.md).
The equality domain is total result values. Fuel, allocation failure, host traps,
timing and physical code generation remain outside the proof. A rewrite can
therefore change resource consumption, and backend/toolchain correspondence
remains trusted. It does not prove A*, heap invariants or arbitrary future
persistent-table updates.

## Discovery and transport fixes

The planner previously marked the result of a rejected proposal as seen. A
conditional proposal could hide a valid proof of the same replacement. It now
marks accepted states only. Rejection and exhaustion still retain the baseline;
all accepted steps pass the independent checker.

The in-memory catalogue transport producer now supports the existing 1,024-entry
knowledge-view bound, using sorted 64-entry leaves and authenticated branches.
It preserves roots for old single-leaf catalogues. Odd branch nodes use the same
duplication as the canonical Python store. This extends transport construction,
not admission limits or proof authority. Boundary/corruption tests and a
129-entry cross-language comparison check exact roots and membership witnesses.

## Validation and measurement

Standalone core tests: 53 passed. Distribution tests: 270 passed. Planner tests:
5 passed. The final dedicated integration run includes all five CPU paths.

All 45 new proofs replay locally. Tests rehash incorrect indexed reads, filter
fusion and stopping laws and still reject them. Application tests reject missing
or false conditions. The same compiler binary selects the baseline from an empty
store and changes plans when these entries are present. The final selected suite
compares 66 requests and exact snapshots on native C/Rust, JavaScript and C/Rust
Wasm, including empty/out-of-range reads, large bounds, wrapping steps, NaN
payloads and unchanged running loops.

`bench/local-collection-laws/run.py` compares the same source, compiler and native
Rust backend before/after database selection. It verifies outputs, records the
exact proof package and compiler hash, and interleaves nine timing rounds.
Full typed calls include input copies and output construction/destruction;
compilation, search/proof checking and JSON are excluded from execution timings.
The recorded 65,536-element native Rust run gives 2.09× for length, 2.02×
for indexed reads and 1.46× for filter fusion. No reliable round-trip gain is
claimed. See [method and intervals](../bench/local-collection-laws/README.md)
and [raw results](../bench/local-collection-laws/results.json). Correctness,
applicability and measured profitability are separate.

```sh
python3 knowledge/producers/build_store.py --output /tmp/ink-store
cargo test --manifest-path core/Cargo.toml
INK_TEST_ZIG=/path/to/zig cargo test --test local_collection_optimisation
PYTHONPATH=planner:knowledge python3 -m unittest discover -s planner/tests
python3 bench/local-collection-laws/run.py
```
