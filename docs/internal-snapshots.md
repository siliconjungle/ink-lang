# Immutable snapshots and private updates

The public snapshot API returns logical values. Applications do not receive the
compiler's update records, field tags or replay buffers. Source record fields and
query results remain the contract; temporary patches can change without creating
a wire protocol to maintain.

Import `knowledge/libraries/snapshots.ink` to use `reconcile<T>(before,after)`.
It returns `after`'s exact logical value, retains equal previous elements, handles
growth and truncation, and returns the previous list when it is entirely equal.
`collect<T,U>(xs,keep,build)` checks each element before calling its builder and
uses one private output buffer. Neither entry returns a patch.

## Execution machinery

JavaScript buffers copy the outer slot array when acquiring ownership. Their
immutable elements, including nested records, lists and tagged values, share
references. Buffer reads, writes, fills and private maps retain those values.
The existing affine checker forbids owned storage inside an element and prevents
using a buffer after consuming it. Split ranges remain disjoint; growth detaches
partial ranges. Sharing an element grants no capability to mutate it.

JavaScript pure-value equality emits comparisons for the declared fields and
element types. Aggregate identity is a fast path; fresh records do not allocate
key arrays. Literal record operands evaluate their
fields eagerly, then compare without constructing wrappers. Scalar `f32`
equality remains IEEE equality. Aggregate float equality compares stored bits,
including signed zero and NaN payloads.

Pure JavaScript values are immutable views and can share reachable objects with
inputs and other results. Hosts that need mutable copies must clone them. This
is consistent with the trusted value ABI's existing identity-returning functions;
freezing is optional and remains the host's responsibility. State ingress captures
host values; state replies and outbox views detach their reachable objects so host
mutation cannot change stored values or pending events.

Float, exact-integer and ID conversion can still materialise boundary values.
An invocation-local conversion memo retains shared input identities across its
arguments, with separate keys for declared schemas. It is discarded after the
call. A persistent cache would be unsafe when a host reuses an object after
changing it. Conversion does not promise that a returned float-bearing record is
the original host object.

## Knowledge and checking

`collect_before_build` proposes the universal pure-list equality
`xs.map(f).filter(p) = xs.filter(x => p(f(x))).map(f)`. Its bounded, untrusted
simplifier unfolds literal lambdas and projects declared record fields, removing
construction from predicates that only inspect those fields. Ordinary induction,
Boolean cases and normalization check the resulting law. It is registered with
the installed knowledge producer catalogue; the compiler has no row-diff matcher.
Captures remain independent theorem parameters. A collector written as the
library's fused loop also avoids the filtered intermediate list. The rewrite does
not imply that every indexed map/filter program is automatically fused.

`knowledge/producers/field_snapshots.py` reads a checked record schema and authors
ordinary Ink source. It emits compact `{field,value}` entries in separate typed
carrier groups, constructs entries only for changed fields, and reconstructs each
changed row once while retaining unchanged field values. Growth inserts new rows;
truncation removes trailing rows. Its public function is `reconcile_fields`;
all delta builders and replay helpers accept or return owned buffers and are
excluded from the public value interface.

The producer emits canonical, universally quantified single-field replay laws.
They bind their declarations and helper definitions; nominal ID declarations are
included in portable proof contexts. Removing those declarations or changing a
replayed field invalidates the proof, even after rehashing the object. The laws
verify each field replay, not a universal end-to-end equivalence theorem between
arbitrary snapshot programs. The full generated algorithm is separately checked
as source and compared with the reference across backends.

The current producer accepts up to 64 fields, following the external law-authoring
bound, and uses groups of at most two fields to respect portable-context depth
limits. Checked source, type and transport limits still apply. It fails closed on
unsupported fields. The generic reconciliation library has no new field-count
limit. The compact algorithm is an available implementation, not a forced rewrite:
small JavaScript records can be cheaper to replace by their already available
immutable `after` reference. Proof validity does not establish profitability.

## Reproduce

```sh
cargo build --bin ink
python3 knowledge/producers/field_snapshots.py --compiler target/debug/ink \
  --source knowledge/research/internal-snapshots/row-schema.ink --record Row \
  -o build/internal-delta-sharing/fields.ink
target/debug/ink build examples/internal-snapshots.ink --target javascript -o build/internal-delta-sharing/snapshots.mjs
INK_PARITY_REQUIRE_ALL=1 INK_TEST_ZIG=/path/to/zig cargo test --test internal_snapshots --test collect_before_build
INK_TEST_WGPU=1 INK_TEST_ZIG=/path/to/zig cargo test --test collect_before_build
```

The GPU check requires actual eligible dispatch and rejects fallback. Owned
snapshot replay remains a CPU algorithm; no GPU speedup is claimed for it.
Performance evidence is recorded separately from conformance.
See [the saved comparison](../reports/internal-snapshots-2026-10-12/README.md).
