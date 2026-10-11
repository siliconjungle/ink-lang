# Ordered parallel work, owned partitions and checked recursion

These mechanisms borrow useful ideas from Bend while preserving Ink's small
semantic core and independently versioned knowledge database. They do not adopt
Bend's interaction-net runtime or implicit parallel scheduling. Programs using
these mechanisms carry `ink-executable-core-v5`; older programs retain their
existing semantics identities. Core JSON replay checks the marker and the source.

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

The native Rust backend uses scoped fork/join threads. `INK_THREADS` requests
1–32 workers; the default uses available parallelism, capped at 32. Work smaller
than the requested grain stays sequential; grain zero means one. Nested requests
and Rust-Wasm stay sequential. C, C-Wasm and JavaScript currently execute the same
ordered work sequentially. Eligible WebGPU lists execute in the existing output
kernel. Grain is a CPU scheduling hint, not a GPU workgroup size or a correctness
condition. Thread creation, input copying and join costs mean parallelism is not
profitable for every function or input size.

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
length. Supported operations include length, lazy `at_or`, set, swap, pop,
truncate and `map_parallel`; the latter updates that invocation's private buffer
sequentially. Literal bounded repeats and stopping-condition loops are supported.
Dynamic allocation, push, split/append, larger buffers, arbitrary record elements
and recursive calls retain the compiled CPU fallback. This is private scratch
storage, not cross-workgroup shared memory. `scratch_many` in
[the example](../examples/bend-inspired.ink) is exercised on a real wgpu device.

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

## Evidence

`core/tests/bend_features.rs` checks ownership, ordering, wrapping arithmetic,
guarded descent, rejected aliases/captures and V5 replay. The integration fixture
compares independent expected values and exact snapshots on C, Rust, JavaScript,
C-Wasm and Rust-Wasm, plus eligible actual wgpu execution. The native backend
unit test checks worker count, sequential nested work, order and retained vector
pointer/capacity. CI enables both Wasm compilers, pinned Lean and wgpu replay.

`bench/bend-inspired/run.py` measures the same 1,024-step wrapping recurrence in
sequential and parallel native Rust, including input copies, output allocation and
destruction, with four requested workers. Raw paired samples and 95% bootstrap
intervals are in `bench/bend-inspired/results.json`. On the recorded machine,
the final run reports 3.69× at 4,096 elements and 3.87× at 65,536 elements.
The initial run (retained separately) reported 3.07× and 3.49× respectively.
The 64-element case stays sequential; its final interval includes parity.
This is one workload and an explicit parallel-source comparison, not a general
compiler or Bend performance claim. Compilation is excluded from runtime timing.
