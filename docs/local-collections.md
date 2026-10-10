# Owned invocation-local collections

Ink now admits owned temporary storage in expression-only pure functions. A
function can edit a collection, pass it to helpers and return it internally.
External functions still accept and return ordinary immutable values. This
implements the design draft's `Buffer<T>` foundation and a local owned `Map<K,V>`
subset; it does not implement the draft's complete borrow/reference calculus or
general immutable maps and sets.

These are general mechanisms. The source checker and executable semantics know
nothing about priority queues, heaps, A*, entities or particle systems. See
[the source example](../examples/local-pathfinding.ink) for an ordinary binary
min-heap and a four-neighbour A* search built from them.

## Source contract

```ink
fn append_until(xs:List<u32>,limit:u32)->List<u32> {
    let b=buffer(xs);
    let b=repeat_until(limit,b,fn(b)=>b.len()>=8,
        fn(i)=>fn(b)=>b.push(i));
    return b.freeze();
}
```

`repeat_until(limit, initial, stop, step)` takes a `u32` runtime bound, a stop
lambda over the accumulator, and nested index/accumulator step lambdas. It checks
stop before each step and returns the current accumulator on stopping or bound
exhaustion. Indices start at zero. A zero bound calls neither lambda. The stop
lambda borrows an owned accumulator; the step transfers ownership. Neither
callback may consume captured storage. This preserves bounded termination in
total functions. Put progress/completion fields in the accumulator when callers
need to distinguish exhaustion from completion. `length(xs)` returns a list's
`u32` length.

| Buffer operation | Meaning |
| --- | --- |
| `Buffer.empty()` | Empty buffer; requires a contextual type, e.g. `let b:Buffer<u32> = Buffer.empty();` |
| `buffer(xs)` | New owned copy of an immutable `List<T>` |
| `buffer_fill(n,value)` | `n` copies of an immutable value |
| `b.len()` | Borrow length |
| `b.at_or(i,fallback)` | Borrow an element; evaluate fallback only when out of bounds |
| `b.set(i,value)` | Consume and return the edited owner; out-of-bounds writes leave it unchanged |
| `b.swap(a,c)` | Consume and swap; unchanged if either index is out of bounds |
| `b.push(value)`, `b.pop()` | Consume and append/remove the last element; empty pop leaves it unchanged |
| `b.truncate(n)` | Consume and shorten to at most `n` elements |
| `b.freeze()` | Consume the owner and return an immutable `List<T>` |

`Map<K,V>` is an owned reusable local map, created with `Map.empty()` under a
contextual type. Keys currently admit `u32`, `u64`, `i32` and `Bool`; values are
ordinary immutable values.

| Map operation | Meaning |
| --- | --- |
| `m.len()`, `m.contains(k)` | Borrow length/presence |
| `m.get_or(k,fallback)` | Borrow a value; evaluate fallback only for an absent key |
| `m.set(k,v)` | Consume and upsert; replaces the existing value for the key |
| `m.remove(k)` | Consume and remove; absent key leaves it unchanged |
| `m.keys()`, `m.values()` | Borrow and return immutable snapshots in ascending key order; Bool orders false before true |

Mutators always return the owner. Rebinding with `let b=b.push(value);` is valid.
Moving the same owner twice, using it after a consuming operation, or consuming
it in a repeating captured callback is rejected. Exclusive branches may each
consume the owner. Records can group owners; consuming one owned field leaves
disjoint fields available. The first implementation excludes owned values inside
immutable containers or inside buffer elements/map values. No source reference,
address, alias, destructor or storage identity is observable.

Owned signatures are internal helpers and have no external value ABI. Storage
cannot enter state roots, keeps, events or action signatures. An ordinary query
may call a pure function whose public signature uses ordinary values and whose
body uses temporary storage. Actions cannot directly invoke owned helpers.

## Implementation, versioning and trust

New primitives/types select `ink-executable-core-v3`; existing v1/v2 programs
retain their existing bytes and identities. Core replay reruns typing, affine use
checking and version selection and rejects a forged version tag. The general
proof kernel is unchanged. This adds trusted source checking and reference
primitive meanings, not a new proof theorem or special optimisation rule.

The reference interpreter, complete C values backend, Rust backend, JavaScript
and C/Rust Wasm paths support these operations. The native Rust representation
moves a reusable vector and an ordered tree map directly; read methods and stop
predicates borrow them. JavaScript uses arrays and a Map,
sorting snapshots to preserve the key order. Complete C uses its existing opaque
value ABI and shared storage primitives. The reference interpreter and C ABI use internal handles which can be cloned by
trusted execution machinery; the source ownership checker prevents observable
aliasing. Backends must only accept checked modules.

GPU kernels and the packed numeric object ABI do not implement temporary
collections. CPU support does not imply GPU support. Runtime execution/allocation
budgets remain backend policies; they may reject a bounded program that exceeds
resources. Native Rust typed calls use native allocation. Values/errors and
termination belong to the language contract; physical speed remains measured
backend behaviour. [Checked observation/stopping laws](local-collection-laws.md) now cover the
documented read-only boundary. Owned mutation and map rewrites remain unproved.

## Validation and practical performance

Standalone core tests cover edits, empty/out-of-range behaviour, ordered upserts,
lazy reads, stop timing, zero limits, moves, captured owners, durable boundaries,
external handle rejection and version replay. `tests/local_algorithms.rs` checks
21 heap cases against sorting, 24 randomized grids against independent BFS,
and four explicit boundary/exhaustion cases. The suite adds ten primitive-operation cases and an external owned-helper
rejection case, and an ordinary query that calls the A* helper. The same 61 requests compare native
C, native Rust, JavaScript, C Wasm and Rust Wasm values and exact snapshots.

The standalone core suite passed 49 tests; the full distribution suite passed
267 tests. The final query addition was then checked by rerunning the focused
61-request suite with both Wasm paths enabled. Standalone backend builds also
check the published Git dependency pins rather than the distribution path overrides.

```sh
cargo test --manifest-path core/Cargo.toml --test local_collections
cargo test --test local_algorithms
INK_TEST_ZIG=/path/to/zig cargo test --test local_algorithms
python3 bench/local-collections/run.py
```

The benchmark compares generated native Rust for the Ink binary heap against an
Ink linear minimum-extraction queue and Rust's `BinaryHeap`, including input
copy, construction, extraction, output and destruction. It records raw samples,
environment and source. Nine rounds interleave all three methods. Speed gains
against a linear queue establish the benefit of supporting an efficient ordinary
library algorithm; they do not establish a compiler advantage over optimized
Rust or a performance gain for A* on every map. See
[recorded results](../bench/local-collections/results.json).
