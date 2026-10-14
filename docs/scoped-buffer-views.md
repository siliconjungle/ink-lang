# Scoped read-only buffer views

`owner.borrow_range(start, count, fn(view) => result)` executes its callback once,
including for an empty range. Start clips to the owner length; count clips to the
remaining length without wrapping. Indices inside the view are relative to that
range. The result must contain no temporary owner. The original owner remains
available afterwards.

The affine checker forbids consuming or mutating the view, consuming captured
owners inside the callback, and consuming the borrowed owner while evaluating
the range arguments. Nested views retain the same restrictions. Passing a view
to an ordinary consuming helper and returning it inside another owned value both
reject. This is a scoped source operation, not an externally serializable handle.
It binds executable-core V13; old modules without the operation retain their
previous version and bytes.

The independent reference evaluator copies the clipped logical slice and charges
that work before allocation. Literal Rust uses a lifetime-bound slice with no
payload copy; native dynamic handles and JavaScript share invocation-local ranges.
Direct Rust owners and selected flat column owners supply the same view methods.
Every result access retains clipping/fallback semantics unless its exact source
site carries a checked read certificate. The database producer proves the index
inside the bounded window-summing loop using the actual view length. Arbitrary
indices and empty nested reads produce counterexamples and retain safe access.
The Rust and Rust/Wasm physical plan checks its column codec and packing proofs
separately. Other targets explicitly reject that selected physical plan.

`knowledge/libraries/buffer-views.ink` contains generic window lookup and summing
algorithms. `buffer-view-laws.ink` states lookup, length and nested-range relations
to ordinary logical `drop`/`take`, checked in the existing semantic kernel. The
fixed primitive supplies no algorithm or representation-name whitelist.

Conformance covers empty/oversized ranges, nested relative indices, Unicode,
ordinary records, wrapping sums, owner reuse, committed state, ordered events,
abort and exact snapshots across C, Rust, JavaScript and both Wasm implementations.
The wgpu host exercises those calls on CPU and dispatches an unrelated eligible
numeric control on the device. These operations have no GPU device implementation.
Native support independently tests payload pointer identity, clipping, nested
views and partitioned owners. Selected Rust/Wasm checks also exercise packed
record views and widening a value beyond its selected narrow lane.

`bench/scoped-range/source.ink` and `run.mjs` compare whole copied-window and
borrowed-window calls with a handwritten implementation using identical wire
codecs. Input creation/encoding are outside call timing; encoding is recorded
separately and result consumption stays inside. Raw interleaved samples retain
all measured shapes and boundaries, including regressions. Small windows can
avoid repeated sequence copies; large windows and checked wire decoding can
dominate the call. These measurements do not authorize a rewrite or establish
general profitability. They were collected while other local work was active.

This completes a scoped read view, not the requested general storage substrate.
Typed allocation provenance, writes through disjoint borrowed regions, general
source-bound layouts, sparse indexes, tree codecs, strategy extraction and full
lifecycle evidence remain in the implementation programme.
