# Ink Rust lowering

Rust emission for Ink's current stateful subset and checked first-order database
definitions. `definition_native::lower` accepts a core-owned `CheckedDefinition`;
`machine_native::lower` accepts a core-owned `CheckedMachine`. Neither witness can
be deserialised or constructed by assigning public fields. Proof checking and
selection authority live in ink-core.

`cargo run --release -- DEFINITIONS.json -o program.rs` rechecks an
`ink-definition-lowering-input-v1` request, emits Rust and prints its receipt.
The request contains schema 1, semantics, bundle, exports and optional selection.
Generated definitions use boxed algebraic data. Generated Machine keeps physical
state private across calls, supports logical snapshots/restoration and rejects
malformed requests before mutation. These are total-value sequential contracts,
not a proof of native memory layout, durability, concurrency or host failures.

The legacy state emitter still consumes admitted maintenance/storage choices and
contains bounded-representation analysis. That is documented migration debt;
putting it in this repository does not turn it into database proof authority.
Rust lowering, codecs, protocol control, num-bigint and Rust/LLVM remain trusted.

Part of the personal siliconjungle Ink repositories. The distribution pins this
repository as a submodule. Core schema/toolchain compatibility must be explicit;
repository identities do not establish correctness.
