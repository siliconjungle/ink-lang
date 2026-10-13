# Ordered parallel work, owned partitions and checked recursion

Ordered parallel work, owned partitions and checked recursion use Ink's small
semantic core and independently versioned knowledge database. Programs using
these mechanisms carry `ink-executable-core-v5`, or V7 when floats occur; older
non-floating programs retain their existing semantics identities. Core JSON replay checks the marker and the source.

## Ordered work

```ink
fn advance(xs: List<u32>) -> List<u32> {
  return parallel_map(xs, 256, fn(i) => fn(x) => x * 3 + i);
}
```

`parallel_map(xs, grain, fn(index) => fn(item) => body)` returns the indexed
mapping in source order. The callback is pure, may capture immutable values,
and may allocate its own local buffers/maps. It cannot capture owned temporary
storage, including through a record or a read-only borrow, or return an owner.
The checker enforces those restrictions independently of the scheduler.

Complete native Rust and C use bounded fork/join threads; C workers have private
value arenas. JavaScript and both Wasm paths use workers executing the same
literal compiled module and compiler-generated callback IDs. Captures contain
only free immutable values. No source strings or arbitrary callbacks cross the
worker ABI. `INK_THREADS` requests 1–32 workers; browser/default Node worker hosts
use at most four by default. `setParallelism` configures JavaScript workers.
Work smaller than two grains and nested requests stay sequential. Grain zero
means one. Browser parallel work uses `callAsync`, `pureAsync` or `invokeAsync`
with cross-origin-isolated shared memory; overlapping state mutation is rejected.
Async actions run against a captured checkpoint and publish a validated replacement
only after success. Worker/host errors leave the original instance unchanged.

Eligible WebGPU lists execute in output kernels. Grain is a CPU scheduling hint,
not a GPU workgroup size or correctness condition. Thread creation, copying and
join costs can exceed the saved computation; no general speedup is promised.

## Owned partitions and in-place updates

```ink
fn partitioned(xs: List<u32>, at: u32) -> List<u32> {
  let b = buffer(xs);
  let b = b.split_at(at, fn(left) => fn(right) =>
    left.map_parallel(256, fn(i) => fn(x) => x + i)
      .append(right.map_parallel(256, fn(i) => fn(x) => x + i)));
  return b.freeze();
}
```

`split_at` consumes its receiver and clamps the boundary to its length. Its
callback owns two distinct buffers and must return a buffer of the same element
type. `append` consumes both owners and joins their elements in order.
`map_parallel` consumes a buffer and returns the same element type. The native
Rust lowering updates disjoint mutable slices and retains the receiver's vector
allocation. Split/rejoin may allocate; zero-copy partition views are not claimed.
Each partition's callback indices start at zero. Affine checking rejects reuse of
any consumed owner, duplicate owners and borrowing a captured owner in parallel.

## GPU temporary storage

Eligible GPU scalar callbacks can use `buffer_fill` with a literal capacity of
0–64. Each invocation gets a private WGSL fixed-capacity buffer with an explicit
length. Supported operations include empty construction, length, lazy `at_or`, set, swap,
pop, truncate, bounded push, consuming split/append and `map_parallel`; the latter updates that invocation's private buffer
sequentially. Literal bounded repeats and stopping-condition loops are supported.
The emitter tracks upper length bounds and the common origin of complementary
partitions. A dynamic split followed by rejoining its halves fits the original
bound, including after mapping or shrinking. Independent appends and pushes must
fit 64; loops must preserve their initial bound and partition provenance. Branches
merge conservative bounds. Capacity growth, unbounded input-list construction,
freezing private buffers into lists, larger buffers, arbitrary record elements
and recursive calls retain the compiled CPU fallback. This is private scratch
storage, not cross-workgroup shared memory. `scratch_many` in
[the example](../examples/parallel-execution.ink) is exercised on a real wgpu device.

## Resident GPU graph feedback

Browser WebGPU and native wgpu stage graphs can feed results into later iterations
when every stage has a graph descriptor and each feedback edge preserves its declared type and
upper capacity. Logical list lengths remain in GPU headers, so stable filters
can shrink a resident list to zero. Integer rank-sort stages now have graph
descriptors for u32/i32, preserving stable duplicate ordering; this remains a
literal quadratic algorithm, with no performance claim.

The device allocates bounded temporary snapshots for feedback. Each iteration
first copies every feedback output into its own temporary, then copies all
snapshots into their destination inputs. This makes assignments simultaneous,
even when identity outputs alias inputs or two feedback edges swap buffers.
The final iteration does not publish feedback, so its exposed outputs cannot be
overwritten by a final assignment. Only initial input uploads and final output
readbacks cross the host boundary; `resident_copy_bytes` reports internal copies.

The capacity argument is an induction over iterations: graph capacities use
monotone `one`, `same`, `min` and `sum` operations; each feedback edge's output
upper bound equals its input's initial bound. Hence every subsequent input and
intermediate remains within the initial allocation. Headers carry actual lengths
independently of that bound. Type/capacity mismatches or growing feedback retain
compiled CPU execution. Existing dispatch, device and 256 MiB allocation limits
still apply, including the temporary snapshot buffers. This explains the safety
argument; it is not a formal verification of shader emission or the driver.

The native and browser residency regressions check three iterations of
filter/scan/sort, zero-length results, odd/even aliased swaps and growing-feedback fallback, including complete
values and exact transfer/dispatch/copy counters. CI retains the plans, replies,
manifest and shaders on failure.

## Checked recursion

```ink
fn total(xs: List<u32>) -> u32 {
  return choose(length(xs) == 0, 0,
    xs.at_or(0, 0) + total(xs.drop(1)));
}
fn countdown(n: u32, acc: u32) -> u32 {
  return choose(n > 0, countdown(n - 1, acc + 1), acc);
}
```

A recursive function must have one unsigned word or list parameter that decreases
at every self call. The checker accepts subtraction of a positive literal only
under a sufficient lower bound, or dropping a positive number of elements under
a nonempty-list guard. Facts come from exact comparisons in surrounding `choose`
branches. Shadowing and unproved aliases cannot establish descent. Mutual
recursion, signed descent and arbitrary unproved termination arguments are
rejected. `.drop(n)` and `.take(n)` clamp at list length.

Tail calls through bindings and `choose` use an iterative trampoline in the
reference, Rust, C and JavaScript execution paths. All arguments are evaluated
before rebinding parameters. Non-tail recursion still uses the ordinary stack;
termination does not guarantee that large inputs fit a host stack. The reference
retains its fuel, copy-work and nesting limits. GPU recursive functions fall back
to compiled CPU execution.

## Independent Boolean verdict

```sh
ink check-boolean-verdict theorem.json --lean /path/to/lean \
  -o build/certificate.lean
```

The command first checks the exact supplied equality with Ink's existing checker,
then asks the external knowledge producer to generate a typed Lean certificate
and runs Lean itself. It reports the input, kernel and generated source hashes.
Lean 4.19.0 checks the general soundness and closed-soundness theorems of
`knowledge/research/verified-kernel/BooleanKernel.lean`, then the certificate.
The kernel has no added axioms, `sorry` or `native_decide`; its printed dependencies
are Lean's standard `propext` and `Quot.sound` axioms.

The initial translator accepts at most eight Boolean parameters and the
refl/hypothesis/symmetry/transitivity/binary/closed-computation/Boolean-case proof
constructors. Resource bounds include 1 MiB input, depth 64 and 10,000 producer
steps. Unsupported domains and proof constructors fail explicitly. Tests check
both existing Boolean laws and show that altered endpoints are rejected by Ink
and by Lean independently.

**Trust scope:** soundness is proved for this separate Boolean calculus, not for
the full Rust equality/logic checker, arithmetic, source interpreter or backends.
The Python translation and its correspondence to source syntax are unverified.
Lean and its toolchain remain trusted. The command supplies an additional verdict
and reproducible certificate; it grants no new production optimisation authority.
The repository-owned knowledge workflow and snapshot selection are unchanged.
Database search keeps baseline execution for functions whose new primitives
lack a logical correspondence, reporting those functions as unavailable in
`emit-semantic`. Other supported functions can still use existing database laws.
This change does not silently grant rewrite authority for the new parallel-map and partition primitives.

## Evidence

`core/tests/bend_features.rs` checks ownership, ordering, wrapping arithmetic,
guarded descent, rejected aliases/captures and V5 replay. The integration fixture
compares independent expected values and exact snapshots on C, Rust, JavaScript,
C-Wasm and Rust-Wasm, plus eligible actual wgpu execution. The expanded fixture
compares 47 complete results/exact snapshots across five CPU/Wasm paths and exercises 29 actual wgpu calls, including all four scalar
private-buffer types. A separate packed C test runs under AddressSanitizer and
UndefinedBehaviorSanitizer, checking construction, freezing, stopping/push,
clamped splits, disjoint updates, append and input preservation. The browser
runner replays the same values and resident feedback plans through CPU Wasm,
JavaScript and actual WebGPU: the recorded Chrome run matched 181 comparisons
with 35 actual GPU calls, including independent packed C-Wasm fallback checks.
Device command mocks additionally test allocation failure cleanup and mismatched feedback bounds. All complete CPU fixtures require actual distinct worker receipts for the large
parallel case. The native Rust backend unit test checks worker count, sequential nested work, order and retained vector
pointer/capacity. CI enables both Wasm compilers, pinned Lean and wgpu replay.

`bench/parallel-execution/run.py` measures the same 1,024-step wrapping recurrence in
sequential and parallel native Rust, including input copies, output allocation and
destruction, with four requested workers. Raw paired samples and 95% bootstrap
intervals are in `bench/parallel-execution/results.json`. On the recorded machine,
the final run reports 3.69× at 4,096 elements and 3.87× at 65,536 elements.
The initial run (retained separately) reported 3.07× and 3.49× respectively.
The 64-element case stays sequential; its final interval includes parity.
This is one workload and an explicit parallel-source comparison, not a general
compiler performance claim. Compilation is excluded from runtime timing.
